import { describe, expect, it, vi } from "vitest";
import type { AiHelperTarget } from "../../../features/settings/model/settings";
import {
  buildRepairPrompt,
  classifyHelperError,
  runHelperPipeline,
} from "./helperPipeline";
import { HelperToolAttemptError } from "./helperIsolation";

const primary: AiHelperTarget = { provider: "codex", model: "gpt-5.5" };
const fallback: AiHelperTarget = { provider: "claude", model: "sonnet" };
const schema = { type: "object" };
const expected = 'JSON {"subject": string, "body": string}';
const prompt = "Write a commit message.";

function parse(raw: string): { subject: string; body: string } | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value !== null &&
      typeof value === "object" &&
      "subject" in value &&
      typeof value.subject === "string" &&
      "body" in value &&
      typeof value.body === "string"
    ) {
      return { subject: value.subject, body: value.body };
    }
  } catch {
    return null;
  }
  return null;
}

function pipeline(
  run: (
    target: AiHelperTarget,
    prompt: string,
    opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
  ) => Promise<string>,
  options: {
    targets?: readonly AiHelperTarget[];
    signal?: AbortSignal;
    now?: () => number;
    deadlineMs?: number;
    isAvailable?: (target: AiHelperTarget) => boolean;
  } = {},
) {
  return runHelperPipeline({
    targets: options.targets ?? [primary, fallback],
    prompt,
    outputSchema: schema,
    parse,
    describeExpected: expected,
    perCallTimeoutMs: 90_000,
    deadlineMs: options.deadlineMs ?? 180_000,
    isAvailable: options.isAvailable ?? (() => true),
    run,
    signal: options.signal,
    now: options.now,
  });
}

describe("helper pipeline", () => {
  it("returns a valid first reply with the output schema", async () => {
    const run = vi.fn(async () => '{"subject":"Fix x","body":""}');

    await expect(pipeline(run)).resolves.toEqual({
      ok: true,
      value: { subject: "Fix x", body: "" },
      target: primary,
      calls: 1,
    });
    expect(run).toHaveBeenCalledWith(primary, prompt, {
      timeoutMs: 90_000,
      outputSchema: schema,
    });
  });

  it("repairs one invalid primary reply without repeating the schema", async () => {
    const run = vi
      .fn<(
        target: AiHelperTarget,
        prompt: string,
        opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
      ) => Promise<string>>()
      .mockResolvedValueOnce("Sure! Here's a message")
      .mockResolvedValueOnce('{"subject":"Fix x","body":"b"}');

    const result = await pipeline(run);

    expect(result).toMatchObject({
      ok: true,
      value: { subject: "Fix x", body: "b" },
      calls: 2,
    });
    expect(run.mock.calls[1]?.[1]).toBe(
      buildRepairPrompt(prompt, "Sure! Here's a message", expected),
    );
    expect(run.mock.calls[1]?.[2]).toEqual({ timeoutMs: 90_000 });
  });

  it("uses the fallback once after two invalid primary replies", async () => {
    const run = vi
      .fn<(
        target: AiHelperTarget,
        prompt: string,
        opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
      ) => Promise<string>>()
      .mockResolvedValueOnce("invalid one")
      .mockResolvedValueOnce("invalid two")
      .mockResolvedValueOnce('{"subject":"Fix x","body":"b"}');

    const result = await pipeline(run);

    expect(result).toMatchObject({ ok: true, target: fallback, calls: 3 });
    expect(run.mock.calls.map(([target]) => target)).toEqual([
      primary,
      primary,
      fallback,
    ]);
    expect(run.mock.calls[2]?.[2]).toEqual({
      timeoutMs: 90_000,
      outputSchema: schema,
    });
  });

  it.each([
    ["permission denied", "auth"],
    ["schema rejected: output_schema", "schema-rejected"],
    ["generation timed out", "timeout"],
    ["unexpected exit", "failed"],
  ] as const)("classifies %s as %s", (message, kind) => {
    expect(classifyHelperError(new Error(message))).toBe(kind);
  });

  it("retries a schema rejection without a schema and the original prompt", async () => {
    const run = vi
      .fn<(
        target: AiHelperTarget,
        prompt: string,
        opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
      ) => Promise<string>>()
      .mockRejectedValueOnce(new Error("output_schema is not supported"))
      .mockResolvedValueOnce('{"subject":"Fix x","body":""}');

    const result = await pipeline(run, { targets: [primary] });

    expect(result).toMatchObject({ ok: true, calls: 2 });
    expect(run.mock.calls[1]?.[1]).toBe(prompt);
    expect(run.mock.calls[1]?.[2]).toEqual({ timeoutMs: 90_000 });
  });

  it("does not repair or fall back after authentication or tool failures", async () => {
    for (const error of [
      new Error("401 unauthorized"),
      new HelperToolAttemptError("codex", "commandExecution"),
    ]) {
      const run = vi.fn(async () => {
        throw error;
      });
      const result = await pipeline(run);
      expect(result).toMatchObject({ ok: false, calls: 1 });
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it("fails over after an ordinary primary error and returns the fallback error", async () => {
    const run = vi
      .fn<(
        target: AiHelperTarget,
        prompt: string,
        opts: { timeoutMs: number; outputSchema?: Record<string, unknown> },
      ) => Promise<string>>()
      .mockRejectedValueOnce(new Error("process exited"))
      .mockRejectedValueOnce(new Error("timed out"));

    await expect(pipeline(run)).resolves.toMatchObject({
      ok: false,
      kind: "timeout",
      target: fallback,
      calls: 2,
    });
  });

  it("honors unavailable targets and stops at the deadline", async () => {
    const run = vi.fn(async () => '{"subject":"Fix x","body":""}');
    const result = await pipeline(run, {
      isAvailable: (target) => target.provider === "claude",
    });
    expect(result).toMatchObject({ ok: true, target: fallback, calls: 1 });

    let time = 0;
    const exhausted = await pipeline(run, {
      targets: [primary],
      deadlineMs: 4_999,
      now: () => time,
    });
    expect(exhausted).toMatchObject({ ok: false, kind: "timeout", calls: 0 });
    expect(time).toBe(0);
  });

  it("discards a completed reply when cancelled in flight", async () => {
    const controller = new AbortController();
    const run = vi.fn(async () => {
      controller.abort();
      return '{"subject":"Fix x","body":""}';
    });

    await expect(
      pipeline(run, { signal: controller.signal, targets: [primary] }),
    ).resolves.toMatchObject({ ok: false, kind: "cancelled", calls: 1 });
  });

  it("keeps tool error messages free of arguments", () => {
    const error = new HelperToolAttemptError(
      "claude",
      "Write secret-token-value",
    );
    expect(error.message).toBe("AI helper tried to use a tool (claude: Write)");
  });
});
