import { describe, expect, it } from "vitest";
import {
  buildAgyArgs,
  conversationIdFromResumeCursor,
  getAgyEffort,
  makeAgyUserInput,
  modelsFromAntigravityOutput,
  parseAgyModels,
  parseAgyStream,
  parseAgyToolUpdate,
} from "./antigravityProtocol";

describe("Antigravity model catalog", () => {
  it("maps agy models output into picker models", () => {
    const models = modelsFromAntigravityOutput(
      [
        "gemini-3.8-flash-high\tGemini 3.8 Flash (High)",
        "claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)",
      ].join("\n"),
    );
    // Sorted by display name, matching the HARI reference.
    expect(models).toEqual([
      {
        id: "antigravity:claude-sonnet-4-6",
        harness: "antigravity",
        name: "Claude Sonnet 4.6 (Thinking)",
        nativeId: "claude-sonnet-4-6",
      },
      {
        id: "antigravity:gemini-3.8-flash-high",
        harness: "antigravity",
        name: "Gemini 3.8 Flash (High)",
        nativeId: "gemini-3.8-flash-high",
      },
    ]);
  });

  it("parses JSON and legacy text model catalogs", () => {
    expect(
      parseAgyModels('{"models":[{"id":"gemini-3-pro","display_name":"Gemini 3 Pro"}]}'),
    ).toEqual([{ slug: "gemini-3-pro", name: "Gemini 3 Pro" }]);
    expect(parseAgyModels("MODEL\tDESCRIPTION\ngemini-3-flash\tFast\n")).toEqual([
      { slug: "gemini-3-flash", name: "Fast" },
    ]);
  });

  it("reads the installed CLI command envelope without turning JSON into a model id", () => {
    expect(
      parseAgyModels(
        JSON.stringify({
          status: "SUCCESS",
          command: {
            name: "models",
            data: { models: [{ id: "gemini-3.7-flash-low", label: "Gemini 3.7 Flash (Low)" }] },
          },
        }),
      ),
    ).toEqual([{ slug: "gemini-3.7-flash-low", name: "Gemini 3.7 Flash (Low)" }]);
    expect(parseAgyModels('{"status":"ERROR","error":"authentication required"}')).toEqual([]);
  });
});

describe("Antigravity headless args", () => {
  it("builds safe headless arguments and input", () => {
    expect(
      buildAgyArgs({
        model: "gemini-3-pro",
        effort: "high",
        conversationId: "conversation-1",
        fullAccess: true,
      }),
    ).toEqual([
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--model",
      "gemini-3-pro",
      "--effort",
      "high",
      "--conversation",
      "conversation-1",
      "--dangerously-skip-permissions",
    ]);
    expect(JSON.parse(makeAgyUserInput("Hello").trim())).toEqual({
      event: "user",
      message: { content: "Hello" },
    });
  });

  it("omits optional flags and maps full-access honestly", () => {
    expect(buildAgyArgs({ fullAccess: false })).toEqual([
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
    ]);
    expect(buildAgyArgs({ fullAccess: false, effort: "ultra" })).toEqual([
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
    ]);
  });

  it("resolves effort from model settings", () => {
    expect(getAgyEffort({ effort: "high" })).toBe("high");
    expect(getAgyEffort({ reasoningEffort: "low" })).toBe("low");
    expect(getAgyEffort({})).toBeUndefined();
    expect(getAgyEffort(undefined)).toBeUndefined();
  });

  it("makes NDJSON user input", () => {
    const line = makeAgyUserInput("Reply exactly with OK.");
    expect(line.endsWith("\n")).toBe(true);
    expect(JSON.parse(line.trim())).toEqual({
      event: "user",
      message: { content: "Reply exactly with OK." },
    });
  });
});

describe("Antigravity stream parsing", () => {
  it("reads documented nested events and preserves whitespace-only deltas", () => {
    const result = parseAgyStream(
      [
        '{"event":"init","conversation_id":"conv-1","init":{}}',
        '{"event":"step_update","step_update":{"step_type":"agent_response","text_delta":"hello"}}',
        '{"event":"step_update","step_update":{"step_type":"agent_response","text_delta":"\\n"}}',
        '{"event":"result","result":{"conversation_id":"conv-1","status":"SUCCESS","response":"hello\\n","usage":{"input_tokens":5,"output_tokens":2,"thinking_tokens":1,"cache_read_tokens":3,"total_tokens":7}}}',
      ].join("\n"),
    );
    expect(result.deltas).toEqual(["hello", "\n"]);
    expect(result.response).toBe("hello\n");
    expect(result.status).toBe("SUCCESS");
    expect(result.usage?.cachedInputTokens).toBe(3);
    expect(result.usage?.reasoningOutputTokens).toBe(1);
  });

  it("parses init, response deltas, result, and usage", () => {
    const parsed = parseAgyStream(
      [
        '{"event":"init","conversation_id":"conversation-1"}',
        '{"event":"step_update","step_type":"agent_response","text_delta":"Hello "}',
        '{"event":"step_update","step":{"step_type":"agent_response","text_delta":"world"}}',
        '{"event":"result","status":"success","response":"Hello world","usage":{"input_tokens":5,"output_tokens":2,"total_tokens":7}}',
      ].join("\n"),
    );
    expect(parsed).toEqual({
      conversationId: "conversation-1",
      deltas: ["Hello ", "world"],
      response: "Hello world",
      status: "success",
      error: undefined,
      usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 },
    });
    expect(conversationIdFromResumeCursor({ conversationId: "conversation-1" })).toBe(
      "conversation-1",
    );
  });

  it("parses errors and resume cursors", () => {
    const failed = parseAgyStream(
      '{"event":"result","result":{"status":"ERROR","error":"a command tool required permission"}}',
    );
    expect(failed.status).toBe("ERROR");
    expect(failed.error).toMatch(/permission/);
    expect(conversationIdFromResumeCursor("conv-9")).toBe("conv-9");
    expect(conversationIdFromResumeCursor({ conversation_id: "conv-10" })).toBe("conv-10");
    expect(conversationIdFromResumeCursor(undefined)).toBeUndefined();
  });

  it("parses tool and subagent updates", () => {
    const tool = parseAgyToolUpdate(
      JSON.stringify({
        event: "step_update",
        step_update: {
          step_index: 2,
          step_type: "tool",
          state: "RUNNING",
          tool_name: "bash",
          tool_info: { name: "bash", output: "hi" },
        },
      }),
    );
    expect(tool).toMatchObject({ index: 2, kind: "tool", name: "bash", completed: false });

    const done = parseAgyToolUpdate(
      JSON.stringify({
        event: "step_update",
        step_update: {
          step_index: 3,
          step_type: "tool",
          state: "DONE",
          tool_name: "read",
          tool_info: { name: "read", output: "done" },
        },
      }),
    );
    expect(done?.completed).toBe(true);
    expect(done?.output).toBe("done");

    const subagent = parseAgyToolUpdate(
      JSON.stringify({
        event: "step_update",
        step_update: {
          step_index: 4,
          step_type: "agent_response",
          state: "RUNNING",
          subagent_info: { id: "s1" },
        },
      }),
    );
    expect(subagent?.kind).toBe("subagent");

    expect(parseAgyToolUpdate('{"event":"step_update","step_update":{"step_type":"agent_response","text_delta":"hi"}}')).toBeUndefined();
    expect(parseAgyToolUpdate("not json")).toBeUndefined();
  });
});
