import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sent: [] as string[],
  spawned: [] as string[][],
  onLine: null as ((line: string) => void) | null,
  writeChild: vi.fn(async (_id: string, line: string) => {
    state.sent.push(line);
  }),
}));

vi.mock("../../core/child", () => ({
  resolveClaudeBinary: async () => ({ path: "/fake/claude" }),
  spawnChild: async (_id: string, _path: string, args: string[]) => {
    state.spawned.push(args);
    state.onLine?.(
      JSON.stringify({ type: "system", subtype: "init", session_id: "helper" }),
    );
  },
  killChild: async () => undefined,
  unwatchChild: () => undefined,
  watchChild: (_id: string, line: (value: string) => void) => {
    state.onLine = line;
  },
  writeChild: state.writeChild,
}));

import { HelperToolAttemptError } from "../../core/helperIsolation";
import { runClaudeTextPrompt, stopClaudeTextPrompt } from "./claudeText";

function emit(value: Record<string, unknown>): void {
  state.onLine?.(JSON.stringify(value));
}

function parseSent(): Record<string, unknown>[] {
  return state.sent.map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for " + label + ".");
}

beforeEach(() => {
  state.sent.length = 0;
  state.spawned.length = 0;
  state.onLine = null;
  state.writeChild.mockClear();
});

afterEach(async () => {
  await stopClaudeTextPrompt();
});

describe("Claude isolated helper runner", () => {
  it("starts a no-tools child with the selected model and rejects tool use", async () => {
    const prompt = runClaudeTextPrompt({
      helperOnly: true,
      cwd: "/repo",
      model: "claude-sonnet-4-6",
      prompt: "Return JSON only.",
    });
    await waitFor(() => state.sent.length === 1, "helper prompt");
    expect(state.spawned[0]).toEqual(
      expect.arrayContaining([
        "--tools",
        "",
        "--disable-slash-commands",
        "--model",
        "claude-sonnet-4-6",
      ]),
    );

    emit({
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Bash", input: { command: "pwd" } },
        ],
      },
    });

    await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
  });

  it("writes a deny response before rejecting a can_use_tool request", async () => {
    const prompt = runClaudeTextPrompt({
      helperOnly: true,
      cwd: "/repo",
      prompt: "Return JSON only.",
    });
    await waitFor(() => state.sent.length === 1, "helper prompt");

    emit({
      type: "control_request",
      request_id: "permission-1",
      request: {
        subtype: "can_use_tool",
        tool_name: "Bash",
        input: { command: "pwd" },
      },
    });
    await waitFor(
      () => parseSent().some((line) => line.type === "control_response"),
      "deny response",
    );

    const sent = parseSent();
    expect(sent[sent.length - 1]).toMatchObject({
      type: "control_response",
      response: {
        request_id: "permission-1",
        response: { behavior: "deny" },
      },
    });
    await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
  });
});

describe("Claude by-the-way runner", () => {
  it("keeps normal tool events separate from isolated helpers", async () => {
    const events: import("../../core/types").HarnessEvent[] = [];
    const prompt = runClaudeTextPrompt({
      cwd: "/repo",
      model: "claude-sonnet-4-6",
      prompt: "Explain the code",
      onEvent: (event) => events.push(event),
    });
    await waitFor(() => state.sent.length === 1, "BTW prompt");
    expect(state.spawned[0]).not.toContain("--disable-slash-commands");
    emit({
      type: "stream_event",
      event: {
        type: "content_block_start",
        index: 0,
        content_block: {
          type: "tool_use",
          id: "read-1",
          name: "Read",
          input: { file_path: "/repo/a.ts" },
        },
      },
    });
    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool.started", callId: "read-1" }),
    );
    emit({
      type: "assistant",
      message: { content: [{ type: "text", text: "Explanation" }] },
    });
    emit({ type: "result", subtype: "success" });
    await expect(prompt).resolves.toBe("Explanation");
  });
});
