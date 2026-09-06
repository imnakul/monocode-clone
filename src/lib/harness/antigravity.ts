import { nativeModelId } from "../models";
import type { UserQuestion, UserQuestionReply } from "../userQuestion";
import {
  asRecord,
  permissionRequestFromAcp,
  type ClinePermissionRequest,
} from "./clineProtocol";
import { killChild } from "./child";
import {
  antigravityConfigs,
  antigravityEvents,
  antigravityMode,
  antigravityPrompt,
  type AntigravityConfig,
} from "./antigravityAcpProtocol";
import {
  acquireAntigravityRuntime,
  retireAntigravityRuntime,
  type AntigravitySessionHandlers,
  type AntigravitySharedRuntime,
} from "./antigravityRuntimeHost";
import { type JsonRpcId } from "./jsonRpc";
import type {
  ApprovalDecision,
  HarnessEvent,
  SendTurnInput,
  SteerTurnInput,
} from "./types";

/** Versioned IDs deliberately cannot resume legacy headless conversations. */
export const ANTIGRAVITY_ACP_SESSION_PREFIX = "agy-acp:v1:";

/** Continuing a pre-ACP conversation is a product decision, not a resume. */
export const ANTIGRAVITY_LEGACY_CHAT_ERROR =
  "This conversation used the retired Antigravity CLI. Its transcript stays readable here, " +
  "but the ACP runtime cannot continue it — start a new chat to use Antigravity ACP.";

const CONTROL_TIMEOUT_MS = 30_000;
const SESSION_TIMEOUT_MS = 90_000;
const PROMPT_TIMEOUT_MS = 30 * 60_000;
/** T3's researched default: wait for the prompt to finish after session/cancel. */
const CANCEL_GRACE_MS = 15_000;

const CANCELLED_OUTCOME = { outcome: { outcome: "cancelled" } } as const;

type AcpPermissionOption = { optionId: string; name?: string; kind?: string };

type PendingApproval = {
  nativeId: JsonRpcId;
  options: AcpPermissionOption[];
};

type PendingQuestion = {
  nativeId: JsonRpcId;
  question: UserQuestion;
};

type ActivePrompt = { settled: Promise<void> };

type Resume =
  | { kind: "acp"; id: string; cwd: string }
  | { kind: "legacy"; cwd: string };

type Live = {
  runtime: AntigravitySharedRuntime;
  cwd: string;
  nativeId: string;
  configOptions: AntigravityConfig[];
  promptCapabilities: Record<string, unknown>;
  onEvent: (event: HarnessEvent) => void;
  approvals: Map<number, PendingApproval>;
  questions: Map<number, PendingQuestion>;
  nextRequestId: number;
  cancelled: boolean;
  /** True after a cancellation until the next turn starts, so late provider
   * output from the retired turn never reaches the conversation. */
  muteUpdates: boolean;
  activePrompt: ActivePrompt | null;
  turns: Promise<void>;
};

const sessions = new Map<string, Live>();
const resumes = new Map<string, Resume>();
const cancelledThreads = new Set<string>();

export async function sendAntigravityTurn(input: SendTurnInput): Promise<void> {
  const stored = resumes.get(input.sessionId);
  if (stored?.kind === "legacy") throw new Error(ANTIGRAVITY_LEGACY_CHAT_ERROR);

  let live = sessions.get(input.sessionId);
  if (live && live.cwd !== input.cwd) {
    // The conversation moved to another working directory; the native session
    // belongs to the old one and must not be resumed there.
    resumes.delete(input.sessionId);
    await stopAntigravitySession(input.sessionId);
    live = undefined;
  }
  if (cancelledThreads.delete(input.sessionId)) return;

  if (!live) live = await createLive(input);
  live.onEvent = input.onEvent;

  const active = live;
  active.turns = active.turns
    .catch((): void => {})
    .then(async (): Promise<void> => {
      active.cancelled = false;
      active.muteUpdates = false;
      await applyModelSelection(active, input);
      await applyRuntimeMode(active, input.runtimeMode);
      await prompt(active, input);
    });
  try {
    await active.turns;
  } catch (error) {
    // A failed turn leaves the runtime's process state unknowable. Keep the
    // native session reference so the next turn resumes instead of starting
    // over, but recycle the child itself.
    if (sessions.get(input.sessionId) === active) {
      await stopAntigravitySession(input.sessionId);
    }
    throw error;
  }
}

export async function steerAntigravityTurn(_input: SteerTurnInput): Promise<void> {
  throw new Error("Cancel the Antigravity turn before sending another message.");
}

export function respondAntigravityApproval(
  sessionId: string,
  requestId: number,
  decision: ApprovalDecision,
): void {
  const live = sessions.get(sessionId);
  const pending = live?.approvals.get(requestId);
  if (!live || !pending) return;
  live.approvals.delete(requestId);
  const optionId = permissionOptionByKind(decision, pending.options);
  void live.runtime.rpc
    .respond(pending.nativeId, optionId ? { outcome: { outcome: "selected", optionId } } : CANCELLED_OUTCOME)
    .catch((): void => {});
  live.onEvent({ type: "approval.resolved", requestId, decision });
}

/** Answers a native fixed-choice question with exactly one offered option ID. */
export function respondAntigravityQuestion(
  sessionId: string,
  requestId: number,
  reply: UserQuestionReply,
): void {
  const live = sessions.get(sessionId);
  const pending = live?.questions.get(requestId);
  if (!live || !pending) return;
  if (reply.kind === "skipped") {
    live.questions.delete(requestId);
    void live.runtime.rpc.respond(pending.nativeId, CANCELLED_OUTCOME).catch((): void => {});
    live.onEvent({ type: "question.resolved", requestId, decision: "skipped" });
    return;
  }
  const answers = reply.answers[pending.question.id] ?? [];
  const custom = reply.custom?.[pending.question.id];
  const value = answers[0] ?? (custom?.trim() || undefined);
  // No complete answer yet: the question stays open instead of guessing.
  if (value === undefined) return;
  const exact = pending.question.options.find((option) => option.id === value);
  const byLabel = exact ? [] : pending.question.options.filter((option) => option.label === value);
  const option = exact ?? (byLabel.length === 1 ? byLabel[0] : undefined);
  if (!option) return;
  live.questions.delete(requestId);
  void live.runtime.rpc
    .respond(pending.nativeId, { outcome: { outcome: "selected", optionId: option.id } })
    .catch((): void => {});
  live.onEvent({ type: "question.resolved", requestId, decision: "answered" });
}

export async function cancelAntigravityTurn(sessionId: string): Promise<void> {
  const live = sessions.get(sessionId);
  if (!live || !live.activePrompt) {
    cancelledThreads.add(sessionId);
    return;
  }
  live.cancelled = true;
  live.muteUpdates = true;
  // Release pending provider requests so the agent can wrap the turn up.
  for (const [, pending] of live.approvals) {
    void live.runtime.rpc.respond(pending.nativeId, CANCELLED_OUTCOME).catch((): void => {});
  }
  live.approvals.clear();
  for (const [, pending] of live.questions) {
    void live.runtime.rpc.respond(pending.nativeId, CANCELLED_OUTCOME).catch((): void => {});
  }
  live.questions.clear();
  await live.runtime.rpc
    .notify("session/cancel", { sessionId: live.nativeId })
    .catch((): void => {});
  const settled = live.activePrompt;
  if (!settled) return;
  const finished = await Promise.race([
    settled.settled.then((): boolean => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), CANCEL_GRACE_MS)),
  ]);
  if (!finished) {
    // The runtime ignored session/cancel; its process state is unknown, so
    // retire the shared runtime instead of reusing a wedged transport. Every
    // attached session reports the exit and resumes on its next turn.
    await stopAntigravitySession(sessionId);
    await retireAntigravityRuntime();
  }
}

export async function stopAntigravitySession(sessionId: string): Promise<void> {
  cancelledThreads.delete(sessionId);
  const live = sessions.get(sessionId);
  sessions.delete(sessionId);
  if (live) {
    live.muteUpdates = true;
    live.activePrompt = null;
    // Detach only: the shared runtime keeps serving the other sessions.
    live.runtime.detach(live.nativeId);
    for (const [, pending] of live.approvals) {
      void live.runtime.rpc.respond(pending.nativeId, CANCELLED_OUTCOME).catch((): void => {});
    }
    live.approvals.clear();
    for (const [, pending] of live.questions) {
      void live.runtime.rpc.respond(pending.nativeId, CANCELLED_OUTCOME).catch((): void => {});
    }
    live.questions.clear();
  }
  if (!live) {
    await killChild(sessionId).catch((): void => {});
  }
}

export async function forgetAntigravitySession(sessionId: string): Promise<void> {
  resumes.delete(sessionId);
  await stopAntigravitySession(sessionId);
}

/**
 * Seeds resume state from a restored MonoCode conversation. ACP references are
 * stored for native resume; anything else (old CLI conversation IDs) is kept
 * as a legacy marker so continuing that chat explains the ACP transition
 * instead of silently starting over.
 */
export function bindAntigravitySession(
  threadId: string,
  providerSessionId: string,
  cwd: string,
): void {
  const value = providerSessionId.trim();
  if (!threadId.trim() || !value || !cwd.trim()) return;
  if (value.startsWith(ANTIGRAVITY_ACP_SESSION_PREFIX)) {
    const nativeId = value.slice(ANTIGRAVITY_ACP_SESSION_PREFIX.length).trim();
    if (nativeId) {
      resumes.set(threadId, { kind: "acp", id: nativeId, cwd });
      return;
    }
  }
  resumes.set(threadId, { kind: "legacy", cwd });
}

async function createLive(input: SendTurnInput): Promise<Live> {
  const resume = resumes.get(input.sessionId);
  const canResume = resume?.kind === "acp" && resume.cwd === input.cwd;
  if (resume && resume.cwd !== input.cwd) resumes.delete(input.sessionId);

  // Spawning the onefile runtime costs a ~500 MB self-extraction, so chats
  // attach to the shared long-lived runtime instead of owning a process.
  const host = await acquireAntigravityRuntime();

  const liveRef: { current: Live | null } = { current: null };
  const handlers: AntigravitySessionHandlers = {
    onNotification: (method, params): void => {
      const current = liveRef.current;
      if (current) handleNotification(current, method, params);
    },
    onRequest: (id, method, params): void => {
      const current = liveRef.current;
      if (method === "session/request_permission" && current?.nativeId) {
        void handlePermissionRequest(current, id, params);
        return;
      }
      void host.rpc
        .respondError(id, { code: -32601, message: `Method not found: ${method}` })
        .catch((): void => {});
    },
    onExit: (code): void => {
      // Process death keeps the resume reference; the next turn respawns and
      // resumes instead of silently starting a new conversation.
      const dying = liveRef.current;
      liveRef.current = null;
      if (!dying) return;
      for (const [requestId] of dying.approvals) {
        dying.onEvent({ type: "approval.resolved", requestId, decision: "cancelled" });
      }
      dying.approvals.clear();
      for (const [requestId] of dying.questions) {
        dying.onEvent({ type: "question.resolved", requestId, decision: "cancelled" });
      }
      dying.questions.clear();
      if (sessions.get(input.sessionId) === dying) sessions.delete(input.sessionId);
      dying.onEvent({ type: "session.ended", code });
    },
  };

  const live: Live = {
    runtime: host,
    cwd: input.cwd,
    nativeId: "",
    configOptions: [],
    promptCapabilities: {},
    onEvent: input.onEvent,
    approvals: new Map(),
    questions: new Map(),
    nextRequestId: 1,
    cancelled: false,
    muteUpdates: false,
    activePrompt: null,
    turns: Promise.resolve(),
  };
  liveRef.current = live;
  sessions.set(input.sessionId, live);

  let attachedId: string | null = null;
  try {
    live.promptCapabilities = host.promptCapabilities;

    let nativeId: string;
    let setup: unknown;
    if (canResume && resume?.kind === "acp") {
      const sessionCapabilities = asRecord(host.sessionCapabilities);
      if (!sessionCapabilities?.resume) {
        throw new Error(
          "The installed Antigravity runtime does not support session/resume. Update the official ACP runtime or start a new chat.",
        );
      }
      // A failed resume must surface, never fall back to a fresh conversation.
      // Attach before the request so replayed updates are never missed.
      attachedId = resume.id;
      host.attach(resume.id, handlers);
      setup = await host.rpc.request(
        "session/resume",
        { sessionId: resume.id, cwd: input.cwd, mcpServers: [] },
        SESSION_TIMEOUT_MS,
      );
      nativeId = resume.id;
    } else {
      setup = await host.rpc.request(
        "session/new",
        { cwd: input.cwd, mcpServers: [] },
        SESSION_TIMEOUT_MS,
      );
      const created = asRecord(setup)?.sessionId;
      if (typeof created !== "string" || !created.trim()) {
        throw new Error("Antigravity did not return a session ID.");
      }
      nativeId = created;
      attachedId = nativeId;
      host.attach(nativeId, handlers);
      for (const params of host.takeBuffered(nativeId)) {
        handleNotification(live, "session/update", params);
      }
    }

    live.nativeId = nativeId;
    live.configOptions = antigravityConfigs(setup);
    resumes.set(input.sessionId, { kind: "acp", id: nativeId, cwd: input.cwd });
    live.onEvent({ type: "session.started" });
    live.onEvent({
      type: "session.providerBound",
      providerSessionId: ANTIGRAVITY_ACP_SESSION_PREFIX + nativeId,
    });
    return live;
  } catch (error) {
    liveRef.current = null;
    host.detach(attachedId ?? "");
    if (sessions.get(input.sessionId) === live) sessions.delete(input.sessionId);
    throw error;
  }
}

function handleNotification(live: Live, method: string, params: unknown): void {
  if (method !== "session/update") return;
  // One MonoCode conversation projects one native session; child sessions and
  // neighbors must never leak into this transcript.
  if (asRecord(params)?.sessionId !== live.nativeId) return;
  if (live.muteUpdates) return;
  for (const event of antigravityEvents(params)) live.onEvent(event);
}

async function handlePermissionRequest(
  live: Live,
  id: JsonRpcId,
  params: unknown,
): Promise<void> {
  const request = permissionRequestFromAcp(params);
  const options = permissionOptions(params);
  if (request.callId?.startsWith("interaction_")) {
    // Native fixed-choice questions share the permission method, but they are
    // never approvals and are never answered automatically.
    const question = questionFromPermission(request, options);
    if (!question) {
      void live.runtime.rpc.respond(id, CANCELLED_OUTCOME).catch((): void => {});
      live.onEvent({
        type: "session.error",
        message: "Antigravity asked a question MonoCode could not read. It was cancelled — resend your request.",
      });
      return;
    }
    const requestId = live.nextRequestId++;
    live.questions.set(requestId, { nativeId: id, question });
    live.onEvent({
      type: "question.asked",
      requestId,
      title: request.title,
      questions: [question],
      callId: request.callId,
    });
    return;
  }

  if (request.callId) {
    live.onEvent({
      type: "tool.updated",
      callId: request.callId,
      title: request.title,
      kind: request.kind,
      preview: request.preview,
    });
  }
  const requestId = live.nextRequestId++;
  live.approvals.set(requestId, { nativeId: id, options });
  live.onEvent({
    type: "approval.requested",
    requestId,
    title: request.title,
    kind: request.kind,
    callId: request.callId,
    preview: request.preview,
  });
}

async function applyModelSelection(live: Live, input: SendTurnInput): Promise<void> {
  const native = nativeModelId(input.model);
  // The "Default" entry carries no native ID: the runtime's current selection
  // stands, so a cold resume never overwrites a model the agent chose.
  if (!native || native === "default") return;
  const modelConfig = live.configOptions.find((config) => config.id === "model");
  if (modelConfig?.currentValue === native) return;
  if (modelConfig && modelConfig.options.length > 0 && !modelConfig.options.some((option) => option.value === native)) {
    throw new Error(
      `Antigravity model '${native}' is unavailable for this account. Choose another model in Settings > Providers.`,
    );
  }
  await setConfigOption(live, "model", native);
}

async function applyRuntimeMode(live: Live, runtimeMode: SendTurnInput["runtimeMode"]): Promise<void> {
  const value = antigravityMode(runtimeMode);
  const modeConfig = live.configOptions.find((config) => config.id === "mode");
  if (modeConfig?.currentValue === value) return;
  if (!modeConfig) return;
  await setConfigOption(live, modeConfig.id, value);
}

async function setConfigOption(live: Live, configId: string, value: string): Promise<void> {
  const result = await live.runtime.rpc.request(
    "session/set_config_option",
    { sessionId: live.nativeId, configId, value },
    CONTROL_TIMEOUT_MS,
  );
  const next = antigravityConfigs(result);
  if (next.length > 0) live.configOptions = next;
}

async function prompt(live: Live, input: SendTurnInput): Promise<void> {
  const blocks = await antigravityPrompt(input.text, input.attachments ?? [], live.promptCapabilities);
  let resolveSettled!: () => void;
  const settled = new Promise<void>((resolve) => {
    resolveSettled = resolve;
  });
  live.activePrompt = { settled };
  try {
    await live.runtime.rpc.request(
      "session/prompt",
      { sessionId: live.nativeId, prompt: blocks },
      PROMPT_TIMEOUT_MS,
    );
    live.onEvent({ type: "message.completed" });
    live.onEvent({ type: "reasoning.completed" });
  } catch (error) {
    if (!live.cancelled) {
      live.onEvent({
        type: "session.error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  } finally {
    resolveSettled();
    live.activePrompt = null;
  }
}

/** Reverse-request options with their native kinds; selection matches kinds, never ID spelling. */
function permissionOptions(params: unknown): AcpPermissionOption[] {
  const raw = Array.isArray(asRecord(params)?.options) ? (asRecord(params)?.options as unknown[]) : [];
  return raw.flatMap((item): AcpPermissionOption[] => {
    const option = asRecord(item);
    const optionId =
      typeof option?.optionId === "string"
        ? option.optionId
        : typeof option?.option_id === "string"
          ? option.option_id
          : "";
    if (!optionId.trim()) return [];
    return [
      {
        optionId,
        ...(typeof option?.name === "string" ? { name: option.name } : {}),
        ...(typeof option?.kind === "string" ? { kind: option.kind } : {}),
      },
    ];
  });
}

function permissionOptionByKind(decision: ApprovalDecision, options: AcpPermissionOption[]): string | null {
  const preferred = decision === "allow" ? ["allow_once", "allow_always"] : ["reject_once", "reject_always"];
  for (const kind of preferred) {
    const exact = options.find((option) => option.kind === kind);
    if (exact) return exact.optionId;
  }
  const family = decision === "allow" ? "allow" : "reject";
  const loose = options.find((option) => (option.kind ?? "").toLowerCase().startsWith(family));
  return loose?.optionId ?? null;
}

function questionFromPermission(
  request: ClinePermissionRequest,
  options: AcpPermissionOption[],
): UserQuestion | null {
  if (!request.callId || options.length === 0) return null;
  const seen = new Set<string>();
  for (const option of options) {
    if (!option.optionId.trim() || seen.has(option.optionId)) return null;
    seen.add(option.optionId);
  }
  const promptText = request.title?.trim() || "Choose an option.";
  return {
    id: request.callId,
    header: "Question",
    prompt: promptText.length > 512 ? `${promptText.slice(0, 509)}...` : promptText,
    multiSelect: false,
    allowCustom: false,
    options: options.map((option) => ({
      id: option.optionId,
      label: option.name?.trim() || option.optionId,
    })),
  };
}
