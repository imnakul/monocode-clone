import { describe, expect, it } from "vitest";
import {
  cliModels,
  cliSpawnArgs,
  cliUsage,
  nativeConversationId,
  reportArgs,
  usageDelta,
  userMessage,
  validateCliPrompt,
} from "./antigravityCliProtocol";
import {
  harnessSupportsAttachments,
  runtimeModeLabel,
  runtimeModesForHarness,
} from "../../../../features/sessions/model/session";

const id = "055a398f-db14-4c5f-abbb-1bf03f8120a7";
const input = {
  sessionId: "one",
  cwd: "/repo",
  model: "antigravity-cli:gemini-3.8-flash-high",
  runtimeMode: "supervised" as const,
  onEvent: (): void => {},
};

describe("official agy headless protocol", () => {
  it("sends the full prompt once over stdin, never as a -p argument", () => {
    const text = 'hello\n"quoted" $()';
    const args = cliSpawnArgs(input, id);
    expect(args).toContain("--input-format");
    expect(args).toContain("--conversation");
    expect(args).toContain(id);
    expect(args).not.toContain("-p");
    expect(args).not.toContain("--continue");
    expect(JSON.parse(userMessage(text))).toEqual({
      event: "user",
      message: { content: text },
    });
  });
  it("uses only explicit Full access for bypassing CLI permissions", () => {
    expect(cliSpawnArgs(input)).not.toContain("--dangerously-skip-permissions");
    expect(cliSpawnArgs({ ...input, runtimeMode: "full-access" })).toContain(
      "--dangerously-skip-permissions",
    );
    expect(
      cliSpawnArgs({ ...input, modelSettings: { effort: "high" } }),
    ).toContain("--effort");
  });
  it("rejects ACP native IDs and hides unsupported attachment/approval controls", () => {
    expect(nativeConversationId(id)).toBe(id);
    expect(() => cliSpawnArgs(input, "agy-acp:v1:one")).toThrow();
    expect(harnessSupportsAttachments("antigravity-cli")).toBe(false);
    expect(harnessSupportsAttachments("antigravity")).toBe(true);
    expect(runtimeModesForHarness("antigravity-cli")).toEqual([
      "supervised",
      "full-access",
    ]);
    expect(runtimeModeLabel("auto", "antigravity-cli")).toBe("CLI policy");
  });
  it("discovers CLI models without borrowing or replacing the ACP catalog", () => {
    expect(
      cliModels(
        "Model  Name\ngemini-3.8-flash-high     Gemini 3.8 Flash (High)\ngemini-3.8-flash-high     duplicate\n",
      ),
    ).toMatchObject([
      {
        id: "antigravity-cli:gemini-3.8-flash-high",
        harness: "antigravity-cli",
        nativeId: "gemini-3.8-flash-high",
      },
    ]);
  });
  it("normalizes cumulative tokens and computes turn differences without context guesses", () => {
    const previous = cliUsage({
      input_tokens: 100,
      output_tokens: 10,
      cache_read_tokens: 50,
    })!;
    const next = cliUsage({
      input_tokens: 120,
      output_tokens: 17,
      cache_read_tokens: 60,
      thinking_tokens: 3,
    })!;
    expect(usageDelta(next, previous)).toMatchObject({
      total: 27,
      input: 20,
      output: 7,
      cachedInput: 10,
      reasoning: 3,
    });
    expect(
      cliUsage({ input_tokens: -1, output_tokens: Infinity }),
    ).toMatchObject({ input: 0, output: 0 });
  });
  it("keeps read-only reports outside the stream and rejects terminal-only commands", () => {
    expect(reportArgs("/usage")).toEqual(["--print", "/usage"]);
    expect(reportArgs("/models")).toEqual(["models"]);
    expect(reportArgs("hello")).toBeUndefined();
    expect(() => validateCliPrompt("/remote-control on")).toThrow(
      "interactive",
    );
    expect(() => validateCliPrompt("/compact")).toThrow();
  });
});
