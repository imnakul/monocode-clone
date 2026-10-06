import { describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
import {
  parseNativeSessionInput,
  resolveNativeSession,
} from "./nativeSessionInput";

const id = "019a98c1-0111-7123-8111-123456789abc";
describe("native session references", () => {
  it("uses the selected provider for a raw local ID", () => {
    expect(parseNativeSessionInput(` ${id} `, "codex")).toEqual({
      provider: "codex",
      nativeId: id,
    });
  });
  it.each([
    `claude --resume ${id}`,
    `claude -r '${id}'`,
    `claude --resume="${id}"`,
  ])("recognizes Claude resume syntax %s", (input) => {
    expect(parseNativeSessionInput(input, "codex")).toEqual({
      provider: "claude",
      nativeId: id,
    });
  });
  it("recognizes a quoted Codex command without executing it", () => {
    expect(parseNativeSessionInput(`codex resume "${id}"`, "claude")).toEqual({
      provider: "codex",
      nativeId: id,
    });
  });
  it.each([
    "",
    "--last",
    "claude -r",
    `claude --resume '${id}"`,
    `codex resume ${id} --last`,
    `codex resume ${id}; echo boom`,
    "$(cat secret)",
    `${id}\n${id}`,
    "../sessions/x",
    "https://claude.ai/chat/session_123",
    "https://chatgpt.com/share/123",
    "opencode --session x",
    "agy --conversation x",
    "x".repeat(201),
  ])("rejects unsupported references %s", (input) => {
    expect(() => parseNativeSessionInput(input, "claude")).toThrow();
  });
  it("passes identity and account to read-only lookup, propagating missing-session errors", async () => {
    invoke.mockRejectedValueOnce(new Error("Not found"));
    await expect(
      resolveNativeSession({ provider: "codex", nativeId: id }, "work"),
    ).rejects.toThrow("Not found");
    expect(invoke).toHaveBeenCalledWith("provider_sessions_resolve", {
      provider: "codex",
      nativeId: id,
      accountId: "work",
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
