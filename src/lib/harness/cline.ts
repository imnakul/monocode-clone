import { nativeModelId } from "../models";
import type { RuntimeMode } from "../session";
import { promptBlocks } from "../attachments";
import type { UserQuestionReply } from "../userQuestion";
import { AcpClient, type AcpHandlers } from "./acp";
import {
  killChild,
  resolveClineBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "./child";
import {
  autoApproveForMode,
  clineAutoOption,
  clineModeId,
  clineStartupError,
  eventsFromAcpUpdate,
  extractModelConfigId,
  permissionOptionId,
  permissionRequestFromAcp,
  readConfigOptions,
  sessionIdFromResult,
  type SessionConfigOption,
} from "./clineProtocol";
import type {
  ApprovalDecision,
  HarnessEvent,
  SendTurnInput,
  SteerTurnInput,
} from "./types";

type SessionSetupResult = {
  sessionId?: string;
  session_id?: string;
  configOptions?: unknown;
};

type Live = {
  acp: AcpClient;
  acpSessionId: string;
  cwd: string;
  modelConfigId: string;
  configOptions: SessionConfigOption[];
  muteUpdates: boolean;
  cancelled: boolean;
  runtimeMode: RuntimeMode;
  onEvent: (event: HarnessEvent) => void;
  approvals: Map<number, (decision: ApprovalDecision) => void>;
  questions: Map<number, (reply: UserQuestionReply) => void>;
  turns: Promise<void>;
};

type Resume = {
  acpSessionId: string;
  cwd: string;
};

const INIT_TIMEOUT_MS = 12_000;
const SESSION_TIMEOUT_MS = 45_000;
const CONTROL_TIMEOUT_MS = 15_000;
const PROMPT_TIMEOUT_MS = 30 * 60_000;

const CLIENT_CAPABILITIES = {
  fs: { readTextFile: false, writeTextFile: false },
  terminal: false,
};

const liveByThread = new Map<string, Live>();
const resumeByThread = new Map<string, Resume>();
const cancelledThreads = new Set<string>();

/**
 * Live Cline adapter. Spawns `cline --acp` and talks Agent Client Protocol.
 * Cline's ACP endpoint supports image prompt blocks; audio is not accepted.
 */
export async function sendClineTurn(input: SendTurnInput): Promise<void> {
  let live: Live;
  try {
    live = await ensureLive(input);
  } catch (error) {
    cancelledThreads.delete(input.sessionId);
    throw error;
  }
  if (cancelledThreads.delete(input.sessionId)) return;

  live.onEvent = input.onEvent;
  live.runtimeMode = input.runtimeMode;
  live.turns = live.turns
    .catch(() => undefined)
    .then(async () => {
      live.cancelled = false;
      live.muteUpdates = false;
      try {
        await applyModelSelection(live, input);
        if (live.cancelled) return;
        await applyRuntimeMode(live, input.runtimeMode);
        if (live.cancelled) return;
        await prompt(live, input);
      } catch (error) {
        if (live.cancelled) return;
        throw error;
      }
    });
  try {
    await live.turns;
  } catch (error) {
    // A timed-out or failed turn leaves the child's process state unknowable.
    // Keep its provider session id, but recycle the child so the next turn can
    // resume instead of inheriting a permanently wedged transport.
    if (liveByThread.get(input.sessionId) === live) {
      await stopClineSession(input.sessionId);
    }
    throw error;
  }
}

export async function steerClineTurn(_input: SteerTurnInput): Promise<void> {
  throw new Error("Cline does not support steering an in-flight turn");
}

export function respondClineApproval(
  sessionId: string,
  requestId: number,
  decision: ApprovalDecision,
) {
  liveByThread.get(sessionId)?.approvals.get(requestId)?.(decision);
}

export function respondClineQuestion(
  sessionId: string,
  requestId: number,
  reply: UserQuestionReply,
) {
  liveByThread.get(sessionId)?.questions.get(requestId)?.(reply);
}

export async function cancelClineTurn(sessionId: string): Promise<void> {
  const live = liveByThread.get(sessionId);
  if (!live) {
    cancelledThreads.add(sessionId);
    return;
  }
  live.cancelled = true;
  live.muteUpdates = true;
  for (const [, resolve] of live.approvals) resolve("deny");
  live.approvals.clear();
  for (const [, resolve] of live.questions) resolve({ kind: "skipped" });
  live.questions.clear();
  await live.acp
    .notify("session/cancel", { sessionId: live.acpSessionId })
    .catch(() => undefined);
  live.acp.rejectPending(new Error("cancelled"));
}

export async function stopClineSession(sessionId: string): Promise<void> {
  cancelledThreads.delete(sessionId);
  const live = liveByThread.get(sessionId);
  liveByThread.delete(sessionId);
  if (live) {
    live.muteUpdates = true;
    for (const [, resolve] of live.approvals) resolve("deny");
    live.approvals.clear();
    for (const [, resolve] of live.questions) resolve({ kind: "skipped" });
    live.questions.clear();
  }
  live?.acp.close();
  unwatchChild(sessionId);
  await killChild(sessionId).catch(() => undefined);
}

export async function forgetClineSession(sessionId: string): Promise<void> {
  resumeByThread.delete(sessionId);
  await stopClineSession(sessionId);
}

export function bindClineSession(
  threadId: string,
  acpSessionId: string,
  cwd: string,
): void {
  const sessionId = acpSessionId.trim();
  if (!threadId || !sessionId || !cwd.trim()) return;
  resumeByThread.set(threadId, { acpSessionId: sessionId, cwd });
}

async function ensureLive(input: SendTurnInput): Promise<Live> {
  const existing = liveByThread.get(input.sessionId);
  if (existing && existing.cwd === input.cwd) {
    existing.onEvent = input.onEvent;
    existing.runtimeMode = input.runtimeMode;
    return existing;
  }
  if (existing) {
    resumeByThread.delete(input.sessionId);
    await stopClineSession(input.sessionId);
  }

  const resume = resumeByThread.get(input.sessionId);
  const canLoad = resume != null && resume.cwd === input.cwd;
  if (resume && resume.cwd !== input.cwd) {
    resumeByThread.delete(input.sessionId);
  }

  const { path } = await resolveClineBinary();
  const handlers: AcpHandlers = {};
  const acp = new AcpClient(input.sessionId, handlers);
  const liveRef: { current: Live | null } = { current: null };
  const muteGate = { current: false };

  handlers.onNotification = (method, params) => {
    if (muteGate.current) return;
    const live = liveRef.current;
    if (!live || live.muteUpdates) return;
    handleNotification(live, method, params);
  };
  handlers.onRequest = (id, method, params) => {
    const live = liveRef.current;
    if (!live) {
      void acp
        .respondError(id, {
          code: -32601,
          message: `Method not found: ${method}`,
        })
        .catch(() => undefined);
      return;
    }
    void handleRequest(live, id, method, params);
  };

  // ensureLive runs once per session, so these handlers outlive the turn that
  // created them. Routing through the live record keeps them on the *current*
  // turn's listener.
  const emit = (event: HarnessEvent) => {
    (liveRef.current?.onEvent ?? input.onEvent)(event);
  };

  watchChild(
    input.sessionId,
    (line) => acp.pushLine(line),
    (code) => {
      acp.close(new Error("Cline CLI exited"));
      liveByThread.delete(input.sessionId);
      emit({ type: "session.ended", code });
    },
    (line) => {
      console.debug("[monocode] cline stderr", line);
      if (/not authenticated|auth|login|credential|api key/i.test(line)) {
        emit({ type: "session.error", message: line.trim() });
      }
    },
  );

  await spawnChild(input.sessionId, path, ["--acp"], input.cwd);

  try {
    try {
      await acp.request(
        "initialize",
        {
          protocolVersion: 1,
          clientCapabilities: CLIENT_CAPABILITIES,
          clientInfo: { name: "monocode", version: "0.1.0" },
        },
        INIT_TIMEOUT_MS,
      );
    } catch (error) {
      throw clineStartupError(error);
    }

    let setup: SessionSetupResult | undefined;
    let acpSessionId: string | undefined;
    let didLoad = false;

    if (canLoad && resume) {
      muteGate.current = true;
      try {
        setup = await acp.request<SessionSetupResult>(
          "session/load",
          {
            sessionId: resume.acpSessionId,
            cwd: input.cwd,
            mcpServers: [],
          },
          SESSION_TIMEOUT_MS,
        );
        acpSessionId = sessionIdFromResult(setup) ?? resume.acpSessionId;
        didLoad = true;
      } catch {
        setup = undefined;
        acpSessionId = undefined;
        didLoad = false;
      } finally {
        muteGate.current = false;
      }
    }

    if (!acpSessionId) {
      setup = await acp.request<SessionSetupResult>(
        "session/new",
        { cwd: input.cwd, mcpServers: [] },
        SESSION_TIMEOUT_MS,
      );
      acpSessionId = sessionIdFromResult(setup);
    }
    if (!acpSessionId) throw new Error("Cline did not return a session id");

    const configOptions = readConfigOptions(setup?.configOptions);
    const live: Live = {
      acp,
      acpSessionId,
      cwd: input.cwd,
      modelConfigId: extractModelConfigId(configOptions),
      configOptions,
      muteUpdates: didLoad,
      cancelled: false,
      runtimeMode: input.runtimeMode,
      onEvent: input.onEvent,
      approvals: new Map(),
      questions: new Map(),
      turns: Promise.resolve(),
    };
    liveRef.current = live;
    liveByThread.set(input.sessionId, live);
    resumeByThread.set(input.sessionId, {
      acpSessionId,
      cwd: input.cwd,
    });
    live.onEvent({
      type: "session.providerBound",
      providerSessionId: acpSessionId,
    });
    live.onEvent({ type: "session.started" });
    return live;
  } catch (error) {
    acp.close(error instanceof Error ? error : new Error(String(error)));
    await stopClineSession(input.sessionId);
    throw error;
  }
}

async function applyModelSelection(
  live: Live,
  input: SendTurnInput,
): Promise<void> {
  const base = nativeModelId(input.model);
  await setConfigOption(live, live.modelConfigId, base).catch(
    (error: unknown) => {
      ignoreUnsupportedControl("set_config_option", error);
    },
  );
}

async function applyRuntimeMode(
  live: Live,
  runtimeMode: RuntimeMode,
): Promise<void> {
  // Unsupported mode control is non-fatal because handlePermission remains a
  // backstop. Transport failures and timeouts are rethrown so the wedged child
  // is recycled rather than leaving this turn pending forever.
  await setModeOption(live, "mode", clineModeId(runtimeMode)).catch(
    (error: unknown) => {
      ignoreUnsupportedControl("set_mode", error);
    },
  );
  await setAutoApprove(live, autoApproveForMode(runtimeMode)).catch(
    (error: unknown) => {
      ignoreUnsupportedControl("set_auto_approve", error);
    },
  );
}

async function setConfigOption(
  live: Live,
  configId: string,
  value: string,
): Promise<void> {
  const current = live.configOptions.find((option) => option.id === configId);
  if (current && String(current.currentValue ?? "") === value) return;

  const result = await live.acp.request<SessionSetupResult>(
    "session/set_config_option",
    {
      sessionId: live.acpSessionId,
      configId,
      value,
    },
    CONTROL_TIMEOUT_MS,
  );
  if (result?.configOptions) {
    live.configOptions = readConfigOptions(result.configOptions);
    live.modelConfigId = extractModelConfigId(live.configOptions);
  }
}

async function setModeOption(
  live: Live,
  configId: string,
  value: string,
): Promise<void> {
  const current = live.configOptions.find((option) => option.id === configId);
  if (current && String(current.currentValue ?? "") === value) return;
  await live.acp.request(
    "session/set_mode",
    { sessionId: live.acpSessionId, modeId: value },
    CONTROL_TIMEOUT_MS,
  );
  await live.acp
    .request(
      "session/set_config_option",
      { sessionId: live.acpSessionId, configId, value },
      CONTROL_TIMEOUT_MS,
    )
    .catch(() => undefined);
}

async function setAutoApprove(live: Live, approved: boolean): Promise<void> {
  const current = live.configOptions.find(
    (option) => option.id === "auto_approve",
  );
  if (current && current.currentValue === approved) return;
  await live.acp.request(
    "session/set_config_option",
    { sessionId: live.acpSessionId, configId: "auto_approve", value: approved },
    CONTROL_TIMEOUT_MS,
  );
  if (current) current.currentValue = approved;
}

async function prompt(live: Live, input: SendTurnInput): Promise<void> {
  try {
    const blocks = promptBlocks(input.text, input.attachments);
    if (blocks.length === 0) return;
    await live.acp.request(
      "session/prompt",
      {
        sessionId: live.acpSessionId,
        prompt: blocks,
      },
      PROMPT_TIMEOUT_MS,
    );
    if (live.cancelled) return;
    live.onEvent({ type: "message.completed" });
    live.onEvent({ type: "reasoning.completed" });
  } catch (error) {
    if (live.cancelled) return;
    live.onEvent({
      type: "session.error",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function ignoreUnsupportedControl(method: string, error: unknown): void {
  console.debug(`[monocode] cline ${method} failed`, error);
  const detail = error instanceof Error ? error.message : String(error);
  if (/timed out|not running|exited|closed|pipe/i.test(detail)) throw error;
}

function handleNotification(live: Live, method: string, params: unknown) {
  if (method !== "session/update") return;
  for (const event of eventsFromAcpUpdate(params)) {
    live.onEvent(event);
  }
}

async function handleRequest(
  live: Live,
  id: number,
  method: string,
  params: unknown,
) {
  if (method === "session/request_permission") {
    await handlePermission(live, id, params);
    return;
  }
  await live.acp
    .respondError(id, {
      code: -32601,
      message: `Method not found: ${method}`,
    })
    .catch(() => undefined);
}

async function handlePermission(
  live: Live,
  id: number,
  params: unknown,
) {
  const request = permissionRequestFromAcp(params);
  if (request.callId) {
    live.onEvent({
      type: "tool.updated",
      callId: request.callId,
      title: request.title,
      kind: request.kind,
      preview: request.preview,
    });
  }

  const auto = clineAutoOption(live.runtimeMode, request.kind, request.optionIds);
  if (auto) {
    await live.acp.respond(id, {
      outcome: { outcome: "selected", optionId: auto },
    });
    return;
  }

  live.onEvent({
    type: "approval.requested",
    requestId: id,
    title: request.title,
    kind: request.kind,
    callId: request.callId,
    preview: request.preview,
  });

  const decision = await new Promise<ApprovalDecision>((resolve) => {
    live.approvals.set(id, resolve);
  });
  live.approvals.delete(id);
  live.onEvent({ type: "approval.resolved", requestId: id, decision });

  await live.acp.respond(id, {
    outcome: {
      outcome: "selected",
      optionId: permissionOptionId(decision, request.optionIds),
    },
  });
}
