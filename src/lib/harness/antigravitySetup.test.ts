import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelAntigravitySignIn,
  parseAntigravityAuthLine,
  signInAntigravity,
} from "./antigravitySetup";

const boundary = vi.hoisted(() => ({
  line: (_value: string): void => {},
  stderr: (_value: string): void => {},
  sent: [] as Array<{ method: string; params: unknown }>,
  open: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  kill: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  failure: false,
}));

const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?state=test-state&redirect_uri=http%3A%2F%2F127.0.0.1%3A54321%2F&response_type=code";
const prefix = "Open the following link to authenticate the ACP server: ";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: boundary.open }));
vi.mock("../fs", () => ({ homeDir: async (): Promise<string> => "C:/Users/test" }));
vi.mock("./child", () => ({
  resolveAntigravityBinary: async (): Promise<{ path: string }> => ({ path: "C:/ACP/agy_acp_server.exe" }),
  spawnChild: async (): Promise<void> => {},
  killChild: boundary.kill,
  unwatchChild: (): void => {},
  watchChild: (_id: string, line: (value: string) => void, _exit: (code: number | null) => void, stderr: (value: string) => void): void => {
    boundary.line = line;
    boundary.stderr = stderr;
  },
  writeChild: async (_id: string, line: string): Promise<void> => {
    const message: unknown = JSON.parse(line);
    if (!message || typeof message !== "object" || !("id" in message) || !("method" in message) || typeof message.method !== "string") throw new Error("Invalid request");
    boundary.sent.push({ method: message.method, params: "params" in message ? message.params : undefined });
    if (message.method === "initialize") {
      boundary.line(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: 1, authMethods: [{ id: "oauth-personal", name: "Google account" }] } }));
    } else if (message.method === "authenticate") {
      boundary.stderr(prefix + authUrl);
      boundary.line(prefix + authUrl);
      boundary.line(JSON.stringify({ jsonrpc: "2.0", id: message.id, ...(boundary.failure ? { error: { code: -32000, message: "Subscription required" } } : { result: {} }) }));
    }
  },
}));

afterEach(async (): Promise<void> => {
  await cancelAntigravitySignIn();
  boundary.sent.length = 0;
  boundary.failure = false;
  boundary.open.mockClear();
  boundary.kill.mockClear();
});

describe("Antigravity explicit sign-in", () => {
  // A URL from agent output must never launch an arbitrary website or protocol.
  it("accepts only the Google authorization endpoint with a loopback callback", (): void => {
    expect(parseAntigravityAuthLine(prefix + authUrl)).toBe(authUrl);
    expect(parseAntigravityAuthLine("__MONOCODE_ANTIGRAVITY_AUTH_URL__" + JSON.stringify(authUrl))).toBe(authUrl);
    expect(() => parseAntigravityAuthLine(prefix + authUrl.replace("accounts.google.com", "evil.example"))).toThrow();
    expect(() => parseAntigravityAuthLine(prefix + authUrl.replace("127.0.0.1", "evil.example"))).toThrow();
    expect(parseAntigravityAuthLine('{"jsonrpc":"2.0"}')).toBeNull();
  });

  // A setup click must authenticate, not create a conversation or consume a prompt.
  it("authenticates explicitly, opens a duplicate URL only once, and cleans up", async (): Promise<void> => {
    await signInAntigravity();
    expect(boundary.sent.map((message) => message.method)).toEqual(["initialize", "authenticate"]);
    expect(boundary.sent[1]?.params).toEqual({ methodId: "oauth-personal" });
    expect(boundary.open).toHaveBeenCalledExactlyOnceWith(authUrl);
    expect(boundary.kill).toHaveBeenCalled();
  });

  // A successful browser launch must not turn a rejected account into a success.
  it("surfaces authentication failure and closes the setup process", async (): Promise<void> => {
    boundary.failure = true;
    await expect(signInAntigravity()).rejects.toThrow("Subscription required");
    expect(boundary.kill).toHaveBeenCalled();
  });
});
