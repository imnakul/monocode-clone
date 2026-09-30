import type { AiHelperTarget } from "../../../features/settings/model/settings";
import {
  HelperToolAttemptError,
  HelperUnavailableError,
} from "./helperIsolation";

export type HelperFailureKind =
  | "auth"
  | "tool-attempt"
  | "cancelled"
  | "timeout"
  | "invalid"
  | "unavailable"
  | "failed";

export type HelperResult<T> =
  | { ok: true; value: T; target: AiHelperTarget; calls: number }
  | {
      ok: false;
      kind: HelperFailureKind;
      target: AiHelperTarget | null;
      message: string;
      calls: number;
    };

type HelperFailure<T> = Extract<HelperResult<T>, { ok: false }>;

type PipelineInput<T> = {
  targets: readonly AiHelperTarget[];
  prompt: string;
  outputSchema: Record<string, unknown>;
  parse: (raw: string) => T | null;
  describeExpected: string;
  perCallTimeoutMs: number;
  deadlineMs: number;
  isAvailable: (target: AiHelperTarget) => boolean;
  run: (
    target: AiHelperTarget,
    prompt: string,
    opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
  ) => Promise<string>;
  signal?: AbortSignal;
  now?: () => number;
};

type ClassifiedError =
  | "auth"
  | "tool-attempt"
  | "unavailable"
  | "schema-rejected"
  | "timeout"
  | "failed";

function failure<T>(
  kind: HelperFailureKind,
  target: AiHelperTarget | null,
  message: string,
  calls: number,
): HelperFailure<T> {
  return { ok: false, kind, target, message, calls };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyHelperError(error: unknown): ClassifiedError {
  const message = errorMessage(error);
  if (
    error instanceof HelperToolAttemptError ||
    message.startsWith("AI helper tried to use a tool")
  ) {
    return "tool-attempt";
  }
  if (error instanceof HelperUnavailableError) return "unavailable";
  if (
    /\b(401|403)\b|unauthori[sz]ed|not (logged|signed) in|log ?in required|authenticat|invalid api key|credential|expired token|permission denied/i.test(
      message,
    )
  ) {
    return "auth";
  }
  if (/output_?schema|json schema|response_format/i.test(message)) {
    return "schema-rejected";
  }
  if (/timed out|timeout/i.test(message)) return "timeout";
  return "failed";
}

export function buildRepairPrompt(
  prompt: string,
  invalidReply: string,
  describeExpected: string,
): string {
  return `${prompt}\n\nYour previous reply could not be used because it was not valid ${describeExpected}.\nPrevious reply (truncated):\n${invalidReply.trim().slice(0, 2000)}\n\nReply again with only ${describeExpected}. No prose, no code fences.`;
}

export async function runHelperPipeline<T>(
  input: PipelineInput<T>,
): Promise<HelperResult<T>> {
  const primary = input.targets[0];
  if (!primary) {
    return failure("unavailable", null, "No AI helper is configured.", 0);
  }

  const now = input.now ?? Date.now;
  const start = now();
  let calls = 0;
  let last: Extract<HelperResult<T>, { ok: false }> | null = null;

  const beforeCall = (
    target: AiHelperTarget,
  ): { timeoutMs: number } | HelperFailure<T> => {
    if (input.signal?.aborted) {
      return failure<T>("cancelled", target, "Cancelled.", calls);
    }
    const remaining = input.deadlineMs - (now() - start);
    if (remaining < 5_000) {
      return failure<T>(
        "timeout",
        target,
        "The AI helper ran out of time.",
        calls,
      );
    }
    return { timeoutMs: Math.min(input.perCallTimeoutMs, remaining) };
  };

  const cancelledAfterCall = (
    target: AiHelperTarget,
  ): HelperFailure<T> | null =>
    input.signal?.aborted
      ? failure<T>("cancelled", target, "Cancelled.", calls)
      : null;

  const run = async (
    target: AiHelperTarget,
    prompt: string,
    outputSchema?: Record<string, unknown>,
  ): Promise<
    { raw: string } | { result: HelperFailure<T> } | { error: unknown }
  > => {
    const call = beforeCall(target);
    if ("ok" in call) return { result: call };
    calls += 1;
    try {
      const raw = await input.run(target, prompt, {
        timeoutMs: call.timeoutMs,
        ...(outputSchema ? { outputSchema } : {}),
      });
      const cancelled = cancelledAfterCall(target);
      return cancelled ? { result: cancelled } : { raw };
    } catch (error) {
      const cancelled = cancelledAfterCall(target);
      return cancelled ? { result: cancelled } : { error };
    }
  };

  if (!input.isAvailable(primary)) {
    last = failure("unavailable", primary, "The AI helper is unavailable.", calls);
  } else {
    const first = await run(primary, input.prompt, input.outputSchema);
    if ("result" in first) return first.result;
    if ("error" in first) {
      const kind = classifyHelperError(first.error);
      if (kind === "auth" || kind === "tool-attempt") {
        return failure(kind, primary, errorMessage(first.error), calls);
      }
      if (kind === "schema-rejected") {
        const retry = await run(primary, input.prompt);
        if ("result" in retry) return retry.result;
        if ("error" in retry) {
          const retryKind = classifyHelperError(retry.error);
          if (retryKind === "auth" || retryKind === "tool-attempt") {
            return failure(retryKind, primary, errorMessage(retry.error), calls);
          }
          last = failure(
            retryKind === "schema-rejected" ? "failed" : retryKind,
            primary,
            errorMessage(retry.error),
            calls,
          );
        } else {
          const parsed = input.parse(retry.raw);
          if (parsed !== null) return { ok: true, value: parsed, target: primary, calls };
          last = failure("invalid", primary, "The reply was not usable.", calls);
        }
      } else {
        last = failure(kind, primary, errorMessage(first.error), calls);
      }
    } else {
      const parsed = input.parse(first.raw);
      if (parsed !== null) return { ok: true, value: parsed, target: primary, calls };

      const repair = await run(
        primary,
        buildRepairPrompt(input.prompt, first.raw, input.describeExpected),
      );
      if ("result" in repair) return repair.result;
      if ("error" in repair) {
        const kind = classifyHelperError(repair.error);
        if (kind === "auth" || kind === "tool-attempt") {
          return failure(kind, primary, errorMessage(repair.error), calls);
        }
        last = failure(
          kind === "schema-rejected" ? "failed" : kind,
          primary,
          errorMessage(repair.error),
          calls,
        );
      } else {
        const repaired = input.parse(repair.raw);
        if (repaired !== null) {
          return { ok: true, value: repaired, target: primary, calls };
        }
        last = failure("invalid", primary, "The reply was not usable.", calls);
      }
    }
  }

  const fallback = input.targets[1];
  if (!fallback) {
    return last ?? failure("unavailable", primary, "The AI helper is unavailable.", calls);
  }
  if (!input.isAvailable(fallback)) {
    return last ?? failure("unavailable", fallback, "The AI helper is unavailable.", calls);
  }

  const fallbackCall = await run(fallback, input.prompt, input.outputSchema);
  if ("result" in fallbackCall) return fallbackCall.result;
  if ("error" in fallbackCall) {
    const kind = classifyHelperError(fallbackCall.error);
    return failure(
      kind === "schema-rejected" ? "failed" : kind,
      fallback,
      errorMessage(fallbackCall.error),
      calls,
    );
  }
  const parsedFallback = input.parse(fallbackCall.raw);
  return parsedFallback !== null
    ? { ok: true, value: parsedFallback, target: fallback, calls }
    : failure("invalid", fallback, "The reply was not usable.", calls);
}
