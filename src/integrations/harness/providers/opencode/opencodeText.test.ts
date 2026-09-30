import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  onOutput: null as ((line: string) => void) | null,
  createSession: vi.fn(),
  prompt: vi.fn(),
  abortSession: vi.fn(async () => undefined),
  closeEvents: vi.fn(async () => undefined),
}));

vi.mock("../../core/child", () => ({
  closeHarnessSse: async () => undefined,
  execChild: async () => "opencode 1.18.30",
  freeHarnessPort: async () => 4096,
  harnessHttp: vi.fn(),
  killChild: async () => undefined,
  openHarnessSse: async () => undefined,
  resolveOpenCodeBinary: async () => ({ path: "/fake/opencode" }),
  spawnChild: async (_id: string, _path: string, _args: string[]) => {
    state.onOutput?.("opencode server listening on http://127.0.0.1:4096");
  },
  unwatchChild: () => undefined,
  watchChild: (
    _id: string,
    output: (line: string) => void,
  ) => {
    state.onOutput = output;
  },
  watchSse: () => undefined,
}));

vi.mock("./opencodeClient", () => ({
  OpenCodeClient: vi.fn(() => ({
    createSession: state.createSession,
    prompt: state.prompt,
    abortSession: state.abortSession,
    closeEvents: state.closeEvents,
  })),
}));

import { HelperToolAttemptError } from "../../core/helperIsolation";
import {
  runOpenCodeTextPrompt,
  stopOpenCodeTextPrompt,
} from "./opencodeText";

beforeEach(() => {
  state.onOutput = null;
  state.createSession.mockReset().mockResolvedValue({ id: "helper-session" });
  state.prompt.mockReset();
  state.abortSession.mockReset().mockResolvedValue(undefined);
  state.closeEvents.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await stopOpenCodeTextPrompt();
});

describe("OpenCode isolated helper runner", () => {
  it("uses a deny-all session and the configured provider/model slug", async () => {
    state.prompt.mockResolvedValue({
      parts: [{ type: "text", text: '{"title":"Model chosen"}' }],
    });

    await expect(
      runOpenCodeTextPrompt({
        cwd: "/repo",
        model: "custom-provider/custom-model",
        prompt: "Return JSON only.",
      }),
    ).resolves.toBe('{"title":"Model chosen"}');

    expect(state.createSession).toHaveBeenCalledWith({
      permission: [{ permission: "*", pattern: "*", action: "deny" }],
    });
    expect(state.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        model: {
          providerID: "custom-provider",
          modelID: "custom-model",
        },
        parts: [{ type: "text", text: "Return JSON only." }],
      }),
    );
  });

  it("aborts and rejects when the reply contains a tool part", async () => {
    state.prompt.mockResolvedValue({
      parts: [{ type: "tool", tool: "bash", input: { command: "pwd" } }],
    });

    await expect(
      runOpenCodeTextPrompt({
        cwd: "/repo",
        model: "custom-provider/custom-model",
        prompt: "Return JSON only.",
      }),
    ).rejects.toBeInstanceOf(HelperToolAttemptError);
    expect(state.abortSession).toHaveBeenCalledWith("helper-session");
  });
});
