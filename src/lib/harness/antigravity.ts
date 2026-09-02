import {
  killChild,
  resolveAntigravityBinary,
  spawnChild,
  unwatchChild,
  watchChild,
  writeChild,
} from "./child";
import type { ApprovalDecision, SendTurnInput, SteerTurnInput } from "./types";

export async function sendAntigravityTurn(input: SendTurnInput): Promise<void> {
  const { sessionId, text, cwd, onEvent } = input;
  const { path } = await resolveAntigravityBinary();

  watchChild(
    sessionId,
    (line: string) => {
      onEvent({
        type: "message.delta",
        text: line + "\n",
      });
    },
    (code: number | null) => {
      unwatchChild(sessionId);
      onEvent({
        type: "message.completed",
      });
      onEvent({
        type: "session.ended",
        code,
      });
    },
    (errLine: string) => {
      onEvent({
        type: "message.delta",
        text: errLine + "\n",
      });
    },
  );

  await spawnChild(sessionId, path, ["--prompt", text], cwd);
}

export function steerAntigravityTurn(input: SteerTurnInput): Promise<void> {
  return writeChild(input.sessionId, input.text + "\n");
}

export function respondAntigravityApproval(
  _sessionId: string,
  _requestId: number,
  _decision: ApprovalDecision,
): void {}

export function cancelAntigravityTurn(sessionId: string): Promise<void> {
  return killChild(sessionId);
}

export function stopAntigravitySession(sessionId: string): Promise<void> {
  return killChild(sessionId);
}

export function forgetAntigravitySession(sessionId: string): Promise<void> {
  return killChild(sessionId);
}

export function bindAntigravitySession(
  _threadId: string,
  _providerSessionId: string,
  _cwd: string,
): void {}
