import { describe, expect, it } from "vitest";
import { newSession } from "../../sessions/model/session";
import type { ProviderConversation } from "./providerSessions";
import { conversationRemoteControl } from "./conversationRemoteControl";

const row: ProviderConversation = {
  key: "native",
  provider: "claude",
  nativeId: "native",
  sourceRoot: "/home",
  providerAccountId: "default",
  title: "Chat",
  cwd: "/repo",
  updatedAt: 1,
  archived: false,
  monocodeSessionId: null,
};

describe("provider conversation RC status", () => {
  it("uses live confirmation for a regular MonoCode chat sharing the native ID", () => {
    const session = {
      ...newSession("claude", "/repo"),
      providerSessionId: "native",
      remoteControlStatus: "on" as const,
    };
    expect(
      conversationRemoteControl(row, [session], new Set([session.id]))?.label,
    ).toBe("On");
  });

  it("shows Paused for a saved choice when its mapped chat has no live process", () => {
    expect(
      conversationRemoteControl(
        { ...row, monocodeSessionId: "saved" },
        [],
        new Set(["saved"]),
      )?.label,
    ).toBe("Paused");
    expect(conversationRemoteControl(row, [], new Set())?.label).toBe("Off");
  });

  it("keeps equal native IDs in different provider accounts separate", () => {
    const session = {
      ...newSession("claude", "/repo"),
      providerSessionId: "native",
      providerAccountId: "other",
      remoteControlStatus: "on" as const,
    };
    expect(
      conversationRemoteControl(row, [session], new Set([session.id]))?.label,
    ).toBe("Off");
  });

  it("does not claim Claude Remote Control for Codex", () => {
    expect(
      conversationRemoteControl({ ...row, provider: "codex" }, [], new Set()),
    ).toBeNull();
  });
});
