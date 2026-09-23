import { afterEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  inspect: vi.fn(),
  readBase64: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args: Record<string, unknown>): unknown => {
    if (command === "inspect_paths") return boundary.inspect(args);
    if (command === "read_file_base64") return boundary.readBase64(args);
    throw new Error(`Unexpected invoke ${command}`);
  },
}));

const {
  antigravityConfigs,
  antigravityEvents,
  antigravityMode,
  antigravityModels,
  antigravityPrompt,
  attachmentUri,
} = await import("./antigravityAcpProtocol");

const groupedConfigOptions = [
  {
    id: "model",
    type: "select",
    currentValue: "gemini-3-pro",
    options: [
      { value: "gemini-3-pro", name: "Gemini 3 Pro" },
      {
        // Grouped entries flatten while preserving native model IDs.
        value: "claude-group",
        name: "Claude",
        options: [
          { value: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
          { value: "claude-opus-4-6", name: "Claude Opus 4.6" },
        ],
      },
    ],
  },
  {
    id: "mode",
    type: "select",
    currentValue: "default",
    options: [
      { value: "default", name: "Supervised" },
      { value: "auto_edit", name: "Auto-accept edits" },
      { value: "yolo", name: "Full access" },
    ],
  },
];

afterEach((): void => {
  boundary.inspect.mockReset();
  boundary.readBase64.mockReset();
});

describe("Antigravity ACP config contract", (): void => {
  it("keeps only select options and flattens grouped model entries", (): void => {
    const configs = antigravityConfigs({ configOptions: groupedConfigOptions });
    expect(configs).toHaveLength(2);
    const models = antigravityModels(configs);
    expect(models.map((model) => model.nativeId)).toEqual([
      "gemini-3-pro",
      "claude-sonnet-4-6",
      "claude-opus-4-6",
    ]);
    expect(models[0]).toMatchObject({ id: "antigravity:gemini-3-pro", harness: "antigravity", name: "Gemini 3 Pro" });
    expect(antigravityModels([{ id: "model", currentValue: "x", options: [] }])).toEqual([]);
  });

  it("maps MonoCode supervision levels onto native mode values", (): void => {
    expect(antigravityMode("supervised")).toBe("default");
    expect(antigravityMode("auto-accept-edits")).toBe("auto_edit");
    expect(antigravityMode("full-access")).toBe("yolo");
  });

  it("normalizes native command fields and bounds tool output", (): void => {
    const events = antigravityEvents({
      sessionId: "s1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "call-1",
        kind: "execute",
        title: "Run",
        rawInput: { CommandLine: "git status" },
        rawOutput: { combinedOutput: "x".repeat(9000) },
      },
    });
    const tool = events.find((event) => event.type === "tool.updated");
    expect(tool).toMatchObject({ callId: "call-1" });
    if (tool?.type !== "tool.updated") throw new Error("missing tool event");
    expect(tool.title).toContain("git status");
    expect(tool.detail).toBeDefined();
    expect(tool.detail.length).toBeLessThanOrEqual(8001);
    expect(antigravityEvents({ sessionId: "s1" })).toEqual([]);
  });
});

describe("Antigravity ACP prompt blocks", (): void => {
  const capabilities = { image: true, audio: true, embeddedContext: true };

  it("sends images as real multimodal blocks after validating real bytes", async (): Promise<void> => {
    boundary.inspect.mockReturnValue([{ isDir: false, size: 64 }]);
    const png = "iVBORw0KGgo=";
    boundary.readBase64.mockReturnValue(png);
    const blocks = await antigravityPrompt(
      "look",
      [{ id: "a", name: "shot.png", kind: "image", size: 64, mimeType: "image/png", path: "C:/tmp/shot.png" }],
      capabilities,
    );
    expect(blocks).toEqual([
      { type: "text", text: "look" },
      { type: "image", data: png, mimeType: "image/png" },
    ]);
  });

  it("rejects unsupported, oversized, and missing attachments before any prompt", async (): Promise<void> => {
    await expect(
      antigravityPrompt("hi", [{ id: "a", name: "a.zip", kind: "file", size: 2, mimeType: "application/zip", data: "e30=" }], capabilities),
    ).rejects.toThrow(/does not support/);
    boundary.inspect.mockReturnValue([{ isDir: false, size: 11 * 1024 * 1024 }]);
    await expect(
      antigravityPrompt("hi", [{ id: "a", name: "big.png", kind: "image", size: 1, mimeType: "image/png", path: "C:/tmp/big.png" }], capabilities),
    ).rejects.toThrow(/too large/);
    boundary.inspect.mockReturnValue([]);
    await expect(
      antigravityPrompt("hi", [{ id: "a", name: "gone.png", kind: "image", size: 1, mimeType: "image/png", path: "C:/tmp/gone.png" }], capabilities),
    ).rejects.toThrow(/Could not read/);
    await expect(
      antigravityPrompt("hi", [{ id: "a", name: "a.png", kind: "image", size: 1, mimeType: "image/png", data: "aGk=" }], {}),
    ).rejects.toThrow(/does not support 'a.png'|runtime does not support/);
  });

  it("wraps UTF-8 text as an embedded resource and refuses binary text files", async (): Promise<void> => {
    const blocks = await antigravityPrompt(
      "hi",
      [{ id: "t", name: "notes.md", kind: "file", size: 5, mimeType: "text/markdown", data: "aGVsbG8=" }],
      capabilities,
    );
    expect(blocks).toEqual([
      { type: "text", text: "hi" },
      { type: "resource", resource: { uri: expect.stringContaining("notes.md"), mimeType: "text/markdown", text: "hello" } },
    ]);
    await expect(
      antigravityPrompt("hi", [{ id: "b", name: "blob.md", kind: "file", size: 4, mimeType: "text/markdown", data: "//5oZWxsaw==" }], capabilities),
    ).rejects.toThrow(/not UTF-8|binary/);
  });

  it("builds absolute file URIs for Windows and Unix paths", (): void => {
    expect(attachmentUri("C:\\tmp\\shot.png")).toBe("file:///C:/tmp/shot.png");
    expect(attachmentUri("/tmp/shot.png")).toBe("file:///tmp/shot.png");
    expect(() => attachmentUri("relative/shot.png")).toThrow(/absolute/);
  });
});
