import { nativeModelId } from "../models";
import {
  killChild,
  resolveAntigravityBinary,
  spawnChild,
  unwatchChild,
  watchChild,
  writeChild,
} from "./child";
import {
  buildAgyArgs,
  conversationIdFromResumeCursor,
  getAgyEffort,
  makeAgyUserInput,
  parseAgyStream,
  parseAgyToolUpdate,
} from "./antigravityProtocol";
import type { ApprovalDecision, HarnessEvent, SendTurnInput, SteerTurnInput } from "./types";

type Live = {
  cwd: string;
  runtimeMode: SendTurnInput["runtimeMode"];
  onEvent: (event: HarnessEvent) => void;
  conversationId: string | undefined;
  activeTurn: boolean;
  cancelled: boolean;
  muteUpdates: boolean;
  turns: Promise<void>;
  turnDone: (() => void) | null;
  turnFailed: ((error: Error) => void) | null;
  turnEndPending: boolean;
  resultSeen: boolean;
  initSeen: boolean;
  emittedText: string;
  /** step_index -> callId, to distinguish started vs updated. */
  toolsSeen: Map<number, string>;
  stderrLines: string[];
};

type Resume = {
  conversationId: string;
  cwd: string;
};

const INIT_TIMEOUT_MS = 30_000;

const liveByThread = new Map<string, Live>();
const resumeByThread = new Map<string, Resume>();
const cancelledThreads = new Set<string>();

let resolveAntigravityBinaryImpl: () => Promise<{ path: string }> =
  resolveAntigravityBinary;

/** Test seam. */
export function setAntigravityBinaryResolver(
  fn: () => Promise<{ path: string }>,
): void {
  resolveAntigravityBinaryImpl = fn;
}

export async function sendAntigravityTurn(input: SendTurnInput): Promise<void> {
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
  live.turns = live.turns.catch(() => undefined).then(async () => {
    live.cancelled = false;
    live.muteUpdates = false;
    try {
      await runTurn(live, input);
    } catch (error) {
      if (live.cancelled) return;
      throw error;
    }
  });
  await live.turns;
}

export async function steerAntigravityTurn(input: SteerTurnInput): Promise<void> {
  const live = liveByThread.get(input.sessionId);
  if (!live?.activeTurn) throw new Error("No active turn to steer");
  // Headless AGY runs one user message per process; mid-turn steering has no
  // protocol surface. Fail honestly instead of writing bytes the CLI ignores.
  throw new Error(
    "Antigravity headless mode does not support steering an active turn. Cancel it and send a new turn instead.",
  );
}

/**
 * Headless AGY exposes no interactive approval callbacks (same limitation as
 * the HARI reference). Full Access maps to `--dangerously-skip-permissions`;
 * restricted modes surface the CLI's permission error honestly.
 */
export function respondAntigravityApproval(
  _sessionId: string,
  _requestId: number,
  _decision: ApprovalDecision,
): void {}

export async function cancelAntigravityTurn(sessionId: string): Promise<void> {
  const live = liveByThread.get(sessionId);
  if (!live) {
    cancelledThreads.add(sessionId);
    return;
  }
  live.cancelled = true;
  live.muteUpdates = true;
  live.activeTurn = false;
  live.turnDone?.();
  live.turnDone = null;
  live.turnFailed = null;
  live.turnEndPending = false;
  live.onEvent({ type: "message.completed" });
  live.onEvent({ type: "reasoning.completed" });
  unwatchChild(sessionId);
  await killChild(sessionId).catch(() => undefined);
}

export async function stopAntigravitySession(sessionId: string): Promise<void> {
  cancelledThreads.delete(sessionId);
  const live = liveByThread.get(sessionId);
  liveByThread.delete(sessionId);
  if (live) {
    live.muteUpdates = true;
    live.activeTurn = false;
    live.turnDone?.();
    live.turnDone = null;
    live.turnFailed = null;
  }
  unwatchChild(sessionId);
  await killChild(sessionId).catch(() => undefined);
}

export async function forgetAntigravitySession(sessionId: string): Promise<void> {
  resumeByThread.delete(sessionId);
  await stopAntigravitySession(sessionId);
}

export function bindAntigravitySession(
  threadId: string,
  providerSessionId: string,
  cwd: string,
): void {
  const conversationId =
    conversationIdFromResumeCursor(providerSessionId) ??
    (providerSessionId.trim() || undefined);
  if (!threadId || !conversationId || !cwd.trim()) return;
  resumeByThread.set(threadId, { conversationId, cwd });
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
    await stopAntigravitySession(input.sessionId);
  }

  const resume = resumeByThread.get(input.sessionId);
  const canResume = resume != null && resume.cwd === input.cwd;
  if (resume && resume.cwd !== input.cwd) {
    resumeByThread.delete(input.sessionId);
  }

  const live: Live = {
    cwd: input.cwd,
    runtimeMode: input.runtimeMode,
    onEvent: input.onEvent,
    conversationId: canResume && resume ? resume.conversationId : undefined,
    activeTurn: false,
    cancelled: false,
    muteUpdates: false,
    turns: Promise.resolve(),
    turnDone: null,
    turnFailed: null,
    turnEndPending: false,
    resultSeen: false,
    initSeen: false,
    emittedText: "",
    toolsSeen: new Map(),
    stderrLines: [],
  };
  liveByThread.set(input.sessionId, live);
  live.onEvent({ type: "session.started" });
  if (live.conversationId) {
    live.onEvent({
      type: "session.providerBound",
      providerSessionId: live.conversationId,
    });
  }
  return live;
}

async function runTurn(live: Live, input: SendTurnInput): Promise<void> {
  if ((input.attachments?.length ?? 0) > 0) {
    throw new Error("Antigravity headless mode does not support attachments yet.");
  }
  const text = input.text.trim();
  if (!text) return;

  const native = nativeModelId(input.model).trim();
  const model = native ? native : undefined;
  const effort = getAgyEffort(input.modelSettings);
  const fullAccess = input.runtimeMode === "full-access" || live.runtimeMode === "full-access";

  const { path } = await resolveAntigravityBinaryImpl();
  const args = buildAgyArgs({
    model,
    effort,
    conversationId: live.conversationId,
    fullAccess,
  });

  live.emittedText = "";
  live.toolsSeen.clear();
  live.stderrLines = [];
  live.resultSeen = false;
  live.initSeen = live.conversationId != null;

  const turnPromise = new Promise<void>((resolve, reject) => {
    live.turnDone = resolve;
    live.turnFailed = reject;
  });
  live.activeTurn = true;
  settlePendingTurn(live, input.sessionId);

  const sessionId = input.sessionId;
  watchChild(
    sessionId,
    (line) => {
      const current = liveByThread.get(sessionId);
      if (!current) return;
      handleLine(sessionId, current, line, fullAccess);
    },
    (code) => {
      const current = liveByThread.get(sessionId);
      if (!current) return;
      handleExit(sessionId, current, code);
    },
    (errLine) => {
      const current = liveByThread.get(sessionId);
      if (!current || current.muteUpdates) return;
      const trimmed = errLine.trim();
      if (!trimmed) return;
      current.stderrLines.push(trimmed);
      if (current.stderrLines.length > 50) current.stderrLines.shift();
      // Surface CLI diagnostics without polluting the assistant transcript.
      current.onEvent({ type: "status", text: trimmed });
    },
  );

  const initTimer = setTimeout(() => {
    const current = liveByThread.get(sessionId);
    if (!current || current.initSeen || current.resultSeen || current.cancelled) return;
    // Still allow the turn to complete if the CLI streams without an init
    // event (older builds); only fail when nothing arrived at all.
    if (current.emittedText || current.toolsSeen.size > 0) {
      current.initSeen = true;
      return;
    }
    current.turnFailed?.(
      new Error(
        `Antigravity did not initialize within ${INIT_TIMEOUT_MS / 1000} seconds. Resolved ${path} but received no init event.`,
      ),
    );
    current.turnDone = null;
    current.turnFailed = null;
    void killChild(sessionId).catch(() => undefined);
  }, INIT_TIMEOUT_MS);
  // Timer must not keep the app alive on its own.
  if (typeof initTimer === "object" && "unref" in initTimer) {
    (initTimer as { unref: () => void }).unref?.();
  }

  try {
    await spawnChild(sessionId, path, args, input.cwd).catch((error) => {
      throw new Error(
        `Failed to start Antigravity (${path} ${args.join(" ")}): ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    await writeChild(sessionId, makeAgyUserInput(text).trim()).catch((error) => {
      throw new Error(
        `Failed to send Antigravity turn: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    settlePendingTurn(live, sessionId);
    await turnPromise;
  } catch (error) {
    if (live.cancelled) return;
    const message = error instanceof Error ? error.message : String(error);
    if (!live.muteUpdates) {
      live.onEvent({ type: "session.error", message });
    }
    throw error;
  } finally {
    clearTimeout(initTimer);
    live.turnDone = null;
    live.turnFailed = null;
    live.activeTurn = false;
  }
}

function handleLine(
  sessionId: string,
  live: Live,
  line: string,
  fullAccess: boolean,
): void {
  if (live.muteUpdates || live.cancelled) return;
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const rec = parsed as Record<string, unknown>;
  const event = typeof rec.event === "string" ? rec.event : typeof rec.type === "string" ? rec.type : "";

  if (event === "init") {
    const id =
      (typeof rec.conversation_id === "string" && rec.conversation_id.trim()) ||
      (typeof rec.conversationId === "string" && rec.conversationId.trim()) ||
      (typeof rec.session_id === "string" && rec.session_id.trim()) ||
      undefined;
    if (id && id !== live.conversationId) {
      live.conversationId = id;
      resumeByThread.set(sessionId, { conversationId: id, cwd: live.cwd });
      live.onEvent({ type: "session.providerBound", providerSessionId: id });
    }
    live.initSeen = true;
    return;
  }

  if (event === "step_update") {
    live.initSeen = true;
    const tool = parseAgyToolUpdate(trimmed);
    if (tool) {
      emitToolUpdate(live, tool);
      return;
    }
    const stream = parseAgyStream(trimmed);
    for (const delta of stream.deltas) {
      if (!delta) continue;
      live.emittedText += delta;
      live.onEvent({ type: "message.delta", text: delta });
    }
    if (stream.conversationId && stream.conversationId !== live.conversationId) {
      live.conversationId = stream.conversationId;
      resumeByThread.set(sessionId, {
        conversationId: stream.conversationId,
        cwd: live.cwd,
      });
      live.onEvent({
        type: "session.providerBound",
        providerSessionId: stream.conversationId,
      });
    }
    return;
  }

  if (event === "result") {
    live.initSeen = true;
    live.resultSeen = true;
    const stream = parseAgyStream(trimmed);
    if (stream.conversationId && stream.conversationId !== live.conversationId) {
      live.conversationId = stream.conversationId;
      resumeByThread.set(sessionId, {
        conversationId: stream.conversationId,
        cwd: live.cwd,
      });
      live.onEvent({
        type: "session.providerBound",
        providerSessionId: stream.conversationId,
      });
    }
    if (stream.usage) {
      const used =
        stream.usage.totalTokens ??
        (stream.usage.inputTokens ?? 0) + (stream.usage.outputTokens ?? 0);
      if (used > 0) live.onEvent({ type: "context", used });
    }
    const status = (stream.status ?? "").toUpperCase();
    const ok = status === "SUCCESS";
    if (ok) {
      // Non-streaming fallback: CLI sent only a final response.
      if (!live.emittedText && stream.response) {
        live.emittedText = stream.response;
        live.onEvent({ type: "message.delta", text: stream.response });
      }
      finishActiveTurn(live, [
        { type: "message.completed" },
        { type: "reasoning.completed" },
      ]);
      return;
    }
    const detail =
      stream.error ??
      stream.response ??
      live.stderrLines.join("\n") ??
      "Antigravity turn failed.";
    const hint =
      !fullAccess && /permission|approval|denied/i.test(detail)
        ? " Antigravity headless mode cannot ask for approval — retry in Full Access."
        : "";
    const error = new Error(`${detail}${hint}`.trim());
    live.onEvent({ type: "session.error", message: error.message });
    live.turnFailed?.(error);
    live.turnDone = null;
    live.turnFailed = null;
    return;
  }
}

function emitToolUpdate(
  live: Live,
  tool: { index: number; kind: "tool" | "subagent"; name: string; completed: boolean; output?: string },
): void {
  const callId = live.toolsSeen.get(tool.index) ?? `agy-step-${tool.index}`;
  const seen = live.toolsSeen.has(tool.index);
  live.toolsSeen.set(tool.index, callId);
  const kind = tool.kind === "subagent" ? "agent" : "tool";
  if (!seen) {
    live.onEvent({
      type: "tool.started",
      callId,
      title: tool.name,
      kind,
      status: "in_progress",
    });
  }
  live.onEvent({
    type: "tool.updated",
    callId,
    title: tool.name,
    kind,
    status: tool.completed ? "completed" : "in_progress",
    detail: tool.output || undefined,
  });
}

function handleExit(sessionId: string, live: Live, code: number | null): void {
  if (live.resultSeen || live.cancelled || live.muteUpdates) {
    // Expected per-turn exit after a result; session stays alive for resume.
    // Unwatch so the next turn starts clean, but keep conversationId.
    if (live.resultSeen) {
      unwatchChild(sessionId);
    }
    live.turnDone?.();
    live.turnDone = null;
    live.turnFailed = null;
    live.activeTurn = false;
    return;
  }
  // Unexpected exit before any result: end the session honestly.
  const stderr = live.stderrLines.join("\n").trim();
  const message = stderr
    ? `Antigravity exited (code ${String(code)}) before producing a result: ${stderr}`
    : `Antigravity exited (code ${String(code)}) before producing a result.`;
  live.onEvent({ type: "session.error", message });
  live.onEvent({ type: "session.ended", code });
  liveByThread.delete(sessionId);
  unwatchChild(sessionId);
  live.turnFailed?.(new Error(message));
  live.turnDone = null;
  live.turnFailed = null;
  live.activeTurn = false;
}

function finishActiveTurn(live: Live, extraEvents: HarnessEvent[] = []): void {
  live.turnEndPending = false;
  live.activeTurn = false;
  for (const event of extraEvents) live.onEvent(event);
  const done = live.turnDone;
  live.turnDone = null;
  live.turnFailed = null;
  if (done) {
    done();
    return;
  }
  live.turnEndPending = true;
}

function settlePendingTurn(live: Live, _sessionId: string): void {
  if (!live.turnEndPending || !live.turnDone) return;
  finishActiveTurn(live);
}

/** Exported for tests. */
export function __antigravityTestReset(): void {
  liveByThread.clear();
  resumeByThread.clear();
  cancelledThreads.clear();
  resolveAntigravityBinaryImpl = resolveAntigravityBinary;
}

export function __antigravityTestResumeMap(): Map<string, Resume> {
  return resumeByThread;
}
