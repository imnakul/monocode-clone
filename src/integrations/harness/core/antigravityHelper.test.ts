import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeHandlers = {
  onNotification: (method: string, params: unknown) => void;
  onRequest: (id: string | number, method: string, params: unknown) => void;
  onExit: (code: number | null) => void;
};

const mocks = vi.hoisted(() => ({
  acquireAntigravityRuntime: vi.fn(),
  invoke: vi.fn(async () => "/app-data/antigravity-helper"),
}));

vi.mock("./antigravityRuntimeHost", () => ({
  acquireAntigravityRuntime: mocks.acquireAntigravityRuntime,
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

import { HelperToolAttemptError, HelperUnavailableError } from "./helperIsolation";
import { runAntigravityHelperPrompt } from "./antigravityHelper";

function helperOptions(configId: "mode" | "model", value: string) {
  return {
    configOptions: [
      {
        id: configId,
        type: "select",
        currentValue: value,
        options: [{ value, name: value }],
      },
    ],
  };
}

function makeRuntime(modeValue = "default") {
  const requests: { method: string; params: unknown }[] = [];
  const notifications: { method: string; params: unknown }[] = [];
  let handlers: FakeHandlers | null = null;
  let resolvePrompt: ((value: unknown) => void) | undefined;
  const rpc = {
    request: vi.fn((method: string, params: unknown): Promise<unknown> => {
      requests.push({ method, params });
      if (method === "session/new") {
        return Promise.resolve({
          sessionId: "helper-session",
          ...helperOptions("model", "model-selected"),
        });
      }
      if (method === "session/set_config_option") {
        const config = params as { configId?: string; value?: string };
        if (config.configId === "mode") {
          return Promise.resolve(helperOptions("mode", modeValue));
        }
        return Promise.resolve(helperOptions("model", config.value ?? ""));
      }
      if (method === "session/prompt") {
        return new Promise((resolve) => {
          resolvePrompt = resolve;
        });
      }
      return Promise.resolve({});
    }),
    notify: vi.fn(async (method: string, params: unknown) => {
      notifications.push({ method, params });
    }),
    respond: vi.fn(async () => undefined),
    respondError: vi.fn(async () => undefined),
  };
  const runtime = {
    rpc,
    executablePath: "/fake/antigravity",
    promptCapabilities: {},
    sessionCapabilities: {},
    attach: vi.fn((_id: string, next: FakeHandlers) => {
      handlers = next;
    }),
    detach: vi.fn(),
    takeBuffered: vi.fn(() => []),
  };
  mocks.acquireAntigravityRuntime.mockResolvedValue(runtime);
  return {
    runtime,
    requests,
    notifications,
    handlers: () => handlers,
    finishPrompt: (value: unknown) => resolvePrompt?.(value),
  };
}

async function waitFor(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for " + label + ".");
}

beforeEach(() => {
  mocks.acquireAntigravityRuntime.mockReset();
  mocks.invoke.mockReset().mockResolvedValue("/app-data/antigravity-helper");
});

describe("Antigravity isolated helper runner", () => {
  it("uses a separate helper folder, no MCP servers, and the configured model", async () => {
    const fake = makeRuntime();
    const prompt = runAntigravityHelperPrompt({
      cwd: "/project",
      prompt: "Return JSON only.",
      model: "model-selected",
      timeoutMs: 5_000,
    });
    await waitFor(
      () => fake.requests.some((request) => request.method === "session/prompt"),
      "helper prompt",
    );

    expect(fake.requests.map((request) => request.method)).toEqual([
      "session/new",
      "session/set_config_option",
      "session/set_config_option",
      "session/prompt",
    ]);
    expect(fake.requests[0]?.params).toEqual({
      cwd: "/app-data/antigravity-helper",
      mcpServers: [],
    });
    expect(fake.requests[1]?.params).toEqual({
      sessionId: "helper-session",
      configId: "mode",
      value: "default",
    });
    expect(fake.requests[2]?.params).toEqual({
      sessionId: "helper-session",
      configId: "model",
      value: "model-selected",
    });
    fake.handlers()?.onNotification("session/update", {
      sessionId: "helper-session",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { text: "Hello " },
      },
    });
    fake.handlers()?.onNotification("session/update", {
      sessionId: "helper-session",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { text: "helper" },
      },
    });
    fake.finishPrompt({ stopReason: "end_turn" });

    await expect(prompt).resolves.toBe("Hello helper");
    expect(fake.runtime.detach).toHaveBeenCalledWith("helper-session");
    expect(fake.notifications).toEqual([]);
  });

  it("rejects a mode fallback before sending the helper prompt", async () => {
    const fake = makeRuntime("auto_edit");
    const prompt = runAntigravityHelperPrompt({
      cwd: "/project",
      prompt: "Return JSON only.",
    });

    await expect(prompt).rejects.toBeInstanceOf(HelperUnavailableError);
    expect(fake.requests.some((request) => request.method === "session/prompt")).toBe(
      false,
    );
    expect(fake.runtime.detach).toHaveBeenCalledWith("helper-session");
  });

  it("rejects permissions, tool calls and unsafe mode changes after cancelling", async () => {
    const permissionRuntime = makeRuntime();
    const permissionPrompt = runAntigravityHelperPrompt({
      cwd: "/project",
      prompt: "Do not use tools.",
    });
    await waitFor(
      () =>
        permissionRuntime.requests.some(
          (request) => request.method === "session/prompt",
        ),
      "permission test prompt",
    );
    permissionRuntime.handlers()?.onRequest(
      "permission-1",
      "session/request_permission",
      {
        options: [{ kind: "reject_once", optionId: "reject-once" }],
      },
    );
    await expect(permissionPrompt).rejects.toBeInstanceOf(
      HelperToolAttemptError,
    );
    expect(permissionRuntime.runtime.rpc.respond).toHaveBeenCalledWith(
      "permission-1",
      { outcome: { outcome: "selected", optionId: "reject-once" } },
    );
    expect(permissionRuntime.notifications).toContainEqual({
      method: "session/cancel",
      params: { sessionId: "helper-session" },
    });

    for (const update of [
      { sessionUpdate: "tool_call" },
      {
        sessionUpdate: "config_option_update",
        configOptions: [
          {
            id: "mode",
            type: "select",
            currentValue: "yolo",
            options: [{ value: "yolo", name: "yolo" }],
          },
        ],
      },
    ]) {
      const fake = makeRuntime();
      const prompt = runAntigravityHelperPrompt({
        cwd: "/project",
        prompt: "Do not use tools.",
      });
      await waitFor(
        () => fake.requests.some((request) => request.method === "session/prompt"),
        "tool attempt test prompt",
      );
      fake.handlers()?.onNotification("session/update", {
        sessionId: "helper-session",
        update,
      });
      await expect(prompt).rejects.toBeInstanceOf(HelperToolAttemptError);
      expect(fake.notifications).toContainEqual({
        method: "session/cancel",
        params: { sessionId: "helper-session" },
      });
      expect(fake.runtime.detach).toHaveBeenCalledWith("helper-session");
    }
  });
});
