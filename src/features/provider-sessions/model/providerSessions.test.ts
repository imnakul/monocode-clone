import { beforeEach, describe, expect, it, vi } from "vitest";
import { newSession, type Session } from "../../sessions/model/session";
const invoke = vi.hoisted(() => vi.fn());
const bind = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("../../../integrations/harness/core/registry", () => ({
  bindHarnessSession: bind,
}));
import {
  openProviderConversation,
  prepareProviderNativeInput,
  setProviderConversationArchived,
  type ProviderConversation,
} from "./providerSessions";

const row: ProviderConversation = {
  key: '["claude","/home/.claude","native-one"]',
  provider: "claude",
  nativeId: "native-one",
  sourceRoot: "/home/.claude",
  providerAccountId: "default",
  title: "Original chat",
  cwd: "/repo",
  updatedAt: 42,
  archived: false,
  monocodeSessionId: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockImplementation(async (command: string) => {
    if (command === "provider_sessions_validate_source") return "native-one";
    if (command === "provider_sessions_bind") return "stable-mono";
    if (command === "provider_sessions_for_session")
      return { key: row.key, cwd: row.cwd };
  });
});

describe("native provider conversations", () => {
  it.each([
    ["E:\\Developing\\Repo\\", "e:/developing/repo"],
    ["\\\\HOST\\Share\\Repo", "//host/share/repo/"],
  ])("reuses saved Windows identity across path spelling: %s", async (nativeCwd, savedCwd) => {
    const nativeRow = { ...row, cwd: nativeCwd };
    const existing = { ...newSession("claude", savedCwd), providerSessionId: row.nativeId };
    const saveSession = vi.fn();
    expect(await openProviderConversation(nativeRow, {
      findSession: async () => existing,
      saveSession,
    })).toBe(existing);
    expect(saveSession).not.toHaveBeenCalled();
    expect(bind).toHaveBeenCalledWith("claude", existing.id, row.nativeId, savedCwd, "default");
    invoke.mockImplementation(async (command: string) => {
      if (command === "provider_sessions_for_session") return { key: row.key, cwd: nativeCwd };
      if (command === "provider_sessions_validate_source") return row.nativeId;
    });
    expect(await prepareProviderNativeInput("claude", {
      sessionId: existing.id, cwd: savedCwd, model: "claude:sonnet",
      runtimeMode: "supervised", onEvent: vi.fn(),
    })).toMatchObject({ nativeResume: { providerSessionId: row.nativeId } });
  });

  it.each(["/Repo", "/repo\\sub", "/repo/sub"])("keeps different Unix folders distinct: %s", async (cwd) => {
    await expect(openProviderConversation(row, {
      findSession: async () => ({ ...newSession("claude", cwd), providerSessionId: row.nativeId }),
      saveSession: vi.fn(),
    })).rejects.toThrow("no longer matches");
    expect(bind).not.toHaveBeenCalled();
  });
  it("rejects a mismatched live native ID before claiming a source binding", async () => {
    await expect(
      openProviderConversation(row, {
        findSession: async () => undefined,
        saveSession: vi.fn(),
        findNativeSession: async () => ({
          ...newSession("claude", "/repo"),
          providerSessionId: "other-native",
        }),
      }),
    ).rejects.toThrow("does not match");
    expect(
      invoke.mock.calls.some(([name]) => name === "provider_sessions_bind"),
    ).toBe(false);
  });
  it("reuses and saves a provider-bound live chat before its first local message", async () => {
    const existing = {
      ...newSession("claude", "/repo"),
      id: "live-mono",
      providerSessionId: "native-one",
    };
    invoke.mockImplementation(
      async (command: string, args: Record<string, unknown>) => {
        if (command === "provider_sessions_validate_source")
          return "native-one";
        if (command === "provider_sessions_bind") return args.sessionId;
      },
    );
    const saveSession = vi.fn(async () => undefined);
    const result = await openProviderConversation(row, {
      findSession: async () => undefined,
      findNativeSession: async () => existing,
      saveSession,
    });
    expect(result).toBe(existing);
    expect(saveSession).toHaveBeenCalledWith(existing);
    expect(bind).toHaveBeenCalledWith(
      "claude",
      "live-mono",
      "native-one",
      "/repo",
      "default",
    );
  });
  it("deduplicates repeated opens, saves metadata only and binds the exact native ID", async () => {
    const sessions = new Map<string, Session>();
    const saveSession = vi.fn(async (session: Session) => {
      sessions.set(session.id, session);
    });
    const deps = {
      findSession: async (id: string) => sessions.get(id),
      saveSession,
    };
    const first = openProviderConversation(row, deps);
    const second = openProviderConversation(row, deps);
    expect(first).toBe(second);
    const result = await first;
    expect(result.id).toBe("stable-mono");
    expect(result.harness).toBe("claude");
    expect(result.blocks).toEqual([]);
    expect(result.providerSessionId).toBe("native-one");
    expect(result.composerSeed).toBeUndefined();
    expect(bind).toHaveBeenCalledWith(
      "claude",
      "stable-mono",
      "native-one",
      "/repo",
      "default",
    );
    expect(await openProviderConversation(row, deps)).toBe(result);
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(
      invoke.mock.calls.some(([name]) => String(name).includes("transcript")),
    ).toBe(false);
  });
  it("rejects changed profiles before saving or binding a conversation", async () => {
    invoke.mockRejectedValue(new Error("Different provider profile"));
    const saveSession = vi.fn();
    await expect(
      openProviderConversation(row, {
        findSession: async () => undefined,
        saveSession,
      }),
    ).rejects.toThrow("Different provider profile");
    expect(saveSession).not.toHaveBeenCalled();
    expect(bind).not.toHaveBeenCalled();
  });
  it("does not rebind a MonoCode chat that changed harness", async () => {
    const existing = newSession("codex", "/repo");
    await expect(
      openProviderConversation(row, {
        findSession: async () => existing,
        saveSession: vi.fn(),
      }),
    ).rejects.toThrow("no longer matches");
    expect(bind).not.toHaveBeenCalled();
  });
  it("restores strict native resume before send and prevents cross-provider continuation", async () => {
    const input = {
      sessionId: "stable-mono",
      cwd: "/repo",
      model: "claude:sonnet",
      runtimeMode: "supervised" as const,
      onEvent: vi.fn(),
    };
    expect(await prepareProviderNativeInput("claude", input)).toEqual({
      ...input,
      nativeResume: { providerSessionId: "native-one" },
    });
    await expect(prepareProviderNativeInput("opencode", input)).rejects.toThrow(
      "original provider",
    );
  });
  it("archives only the MonoCode visibility record", async () => {
    await setProviderConversationArchived(row.key, true);
    expect(invoke).toHaveBeenCalledWith("provider_sessions_set_archived", {
      key: row.key,
      archived: true,
    });
    expect(bind).not.toHaveBeenCalled();
  });
  it("rejects a changed folder after restoring a native source binding", async () => {
    await expect(
      prepareProviderNativeInput("claude", {
        sessionId: "stable-mono",
        cwd: "/changed",
        model: "claude:sonnet",
        runtimeMode: "supervised",
        onEvent: vi.fn(),
      }),
    ).rejects.toThrow("original project folder");
  });
  it("recovers a failed local save using the same binding without launching or replaying", async () => {
    const saveSession = vi
      .fn()
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValueOnce(undefined);
    const deps = { findSession: async () => undefined, saveSession };
    await expect(openProviderConversation(row, deps)).rejects.toThrow(
      "Disk full",
    );
    const session = await openProviderConversation(row, deps);
    expect(session.id).toBe("stable-mono");
    expect(saveSession.mock.calls.map(([saved]) => saved.id)).toEqual([
      "stable-mono",
      "stable-mono",
    ]);
    expect(bind).toHaveBeenCalledOnce();
  });
});
