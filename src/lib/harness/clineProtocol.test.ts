import { describe, expect, it } from "vitest";
import {
  autoApproveForMode,
  clineAutoOption,
  clineModeId,
  clineStartupError,
  eventsFromAcpUpdate,
  extractModelConfigId,
  modelsFromSessionNew,
  permissionOptionId,
  permissionRequestFromAcp,
  readConfigOptions,
  sessionIdFromResult,
} from "./clineProtocol";

describe("clineModeId", () => {
  it("always runs in act mode; supervision is approvals, not plan mode", () => {
    expect(clineModeId("supervised")).toBe("act");
    expect(clineModeId("auto-accept-edits")).toBe("act");
    expect(clineModeId("auto")).toBe("act");
    expect(clineModeId("full-access")).toBe("act");
  });
});

describe("autoApproveForMode", () => {
  it("enables auto-approve only in full-access", () => {
    expect(autoApproveForMode("full-access")).toBe(true);
    expect(autoApproveForMode("supervised")).toBe(false);
    expect(autoApproveForMode("auto-accept-edits")).toBe(false);
    expect(autoApproveForMode("auto")).toBe(false);
  });
});

describe("clineAutoOption", () => {
  const ids = ["allow-once", "allow-always", "reject-once"];
  it("supervised always asks", () => {
    expect(clineAutoOption("supervised", "edit", ids)).toBeNull();
    expect(clineAutoOption("supervised", "execute", ids)).toBeNull();
  });
  it("auto-accept-edits asks for commands but auto-allows edits", () => {
    expect(clineAutoOption("auto-accept-edits", "execute", ids)).toBeNull();
    expect(clineAutoOption("auto-accept-edits", "other", ids)).toBeNull();
    expect(clineAutoOption("auto-accept-edits", "fetch", ids)).toBeNull();
    expect(clineAutoOption("auto-accept-edits", "edit", ids)).toBe("allow-once");
  });
  it("auto allows once", () => {
    expect(clineAutoOption("auto", "execute", ids)).toBe("allow-once");
  });
  it("full-access prefers allow-always", () => {
    expect(clineAutoOption("full-access", "execute", ids)).toBe("allow-always");
  });
  it("returns null with no options", () => {
    expect(clineAutoOption("full-access", "edit", [])).toBeNull();
  });
});

describe("permissionOptionId", () => {
  it("maps allow/deny to Cline option ids", () => {
    expect(
      permissionOptionId("allow", ["allow-once", "reject-once"]),
    ).toBe("allow-once");
    expect(
      permissionOptionId("deny", ["allow-once", "reject-once"]),
    ).toBe("reject-once");
    expect(permissionOptionId("allow", [])).toBe("allow-once");
    expect(permissionOptionId("deny", [])).toBe("reject-once");
  });
});

describe("permissionRequestFromAcp", () => {
  it("parses a toolCall permission with options", () => {
    const request = permissionRequestFromAcp({
      sessionId: "S1",
      toolCall: {
        toolCallId: "call_1",
        title: "Read file",
        kind: "read",
      },
      options: [
        { optionId: "allow-once", name: "Allow once" },
        { optionId: "reject-once", name: "Reject" },
      ],
    });
    expect(request.callId).toBe("call_1");
    expect(request.kind).toBe("read");
    // Kind-aware titles are canonicalized by the shared preview helpers.
    expect(request.title).toBe("Read");
    expect(request.optionIds).toEqual(["allow-once", "reject-once"]);
  });

  it("falls back to a Permission title with no tool fields", () => {
    const request = permissionRequestFromAcp({ options: [] });
    expect(request.title).toBe("Permission");
    expect(request.optionIds).toEqual([]);
  });
});

describe("eventsFromAcpUpdate", () => {
  it("maps agent message chunks to deltas", () => {
    expect(
      eventsFromAcpUpdate({
        sessionId: "S1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "OK" },
        },
      }),
    ).toEqual([{ type: "message.delta", text: "OK" }]);
  });

  it("maps thought chunks to reasoning deltas", () => {
    expect(
      eventsFromAcpUpdate({
        update: {
          sessionUpdate: "agent_thought_chunk",
          content: { type: "text", text: "hmm" },
        },
      }),
    ).toEqual([{ type: "reasoning.delta", text: "hmm" }]);
  });

  it("maps tool calls to tool.updated", () => {
    const events = eventsFromAcpUpdate({
      update: {
        sessionUpdate: "tool_call",
        toolCall: {
          toolCallId: "call_9",
          title: "terminal.exec",
          kind: "execute",
          status: "pending",
        },
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "tool.updated",
      callId: "call_9",
    });
  });

  it("ignores session bookkeeping updates", () => {
    expect(
      eventsFromAcpUpdate({
        update: {
          sessionUpdate: "session_info_update",
          updatedAt: "2026-09-04T03:45:29.460Z",
        },
      }),
    ).toEqual([]);
    expect(
      eventsFromAcpUpdate({ update: { sessionUpdate: "current_mode_update" } }),
    ).toEqual([]);
  });

  it("maps usage to a context event", () => {
    expect(
      eventsFromAcpUpdate({
        update: {
          sessionUpdate: "session_info_update",
          updatedAt: "2026-09-04T03:45:29.460Z",
          usage: { inputTokens: 10, outputTokens: 5 },
        },
      }),
    ).toContainEqual({ type: "context", used: 15, window: undefined });
  });
});

describe("modelsFromSessionNew", () => {
  it("harvests availableModels with the current model", () => {
    const { models, currentModelId } = modelsFromSessionNew({
      sessionId: "S1",
      models: {
        availableModels: [
          { modelId: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5" },
          { modelId: "z-ai/glm-5.3-flash", name: "GLM 5.3 Flash" },
        ],
        currentModelId: "anthropic/claude-sonnet-5",
      },
      configOptions: [],
    });
    expect(currentModelId).toBe("anthropic/claude-sonnet-5");
    expect(models).toEqual([
      {
        id: "cline:anthropic/claude-sonnet-5",
        harness: "cline",
        name: "Claude Sonnet 5",
        nativeId: "anthropic/claude-sonnet-5",
      },
      {
        id: "cline:z-ai/glm-5.3-flash",
        harness: "cline",
        name: "GLM 5.3 Flash",
        nativeId: "z-ai/glm-5.3-flash",
      },
    ]);
  });

  it("falls back to the model config option", () => {
    const { models } = modelsFromSessionNew({
      sessionId: "S1",
      configOptions: [
        {
          type: "select",
          id: "model",
          category: "model",
          currentValue: "openai/gpt-5.4",
          options: [{ value: "openai/gpt-5.4", name: "GPT-5.4" }],
        },
      ],
    });
    expect(models).toEqual([
      {
        id: "cline:openai/gpt-5.4",
        harness: "cline",
        name: "GPT-5.4",
        nativeId: "openai/gpt-5.4",
      },
    ]);
  });

  it("returns no models when neither shape is present", () => {
    expect(modelsFromSessionNew({ sessionId: "S1" }).models).toEqual([]);
  });
});

describe("session plumbing", () => {
  it("reads session ids in every casing", () => {
    expect(sessionIdFromResult({ sessionId: "a" })).toBe("a");
    expect(sessionIdFromResult({ session_id: "b" })).toBe("b");
    expect(sessionIdFromResult({})).toBeUndefined();
  });

  it("extracts the model config id, skipping the provider option", () => {
    expect(
      extractModelConfigId(
        readConfigOptions([
          { id: "provider", category: "model", currentValue: "cline" },
          { id: "model", category: "model", currentValue: "x" },
        ]),
      ),
    ).toBe("model");
    expect(extractModelConfigId([])).toBe("model");
  });
});

describe("clineStartupError", () => {
  it("points unauthenticated runs at cline auth", () => {
    const error = clineStartupError(new Error("not authenticated"));
    expect(error.message).toContain("cline auth");
  });
});
