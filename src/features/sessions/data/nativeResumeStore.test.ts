import { beforeEach, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
import { newSession } from "../model/session";
import {
  shouldPersistSession,
  upsertNativeResumeSession,
} from "./sessionStore";

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockImplementation(
    async (command: string, args: Record<string, unknown>) => {
      if (command === "provider_sessions_for_session")
        return { key: '["claude","/profile","native"]', cwd: "/repo" };
      if (command === "provider_sessions_validate_source") return "native";
      if (command === "session_upsert")
        return {
          ...(args.session as Record<string, unknown>),
          createdAt: 1,
          updatedAt: 1,
        };
    },
  );
});

it("persists a verified native conversation view without inventing transcript history", async () => {
  const session = newSession("claude", "/repo");
  expect(shouldPersistSession(session)).toBe(false);
  const saved = await upsertNativeResumeSession(session);
  expect(saved?.id).toBe(session.id);
  expect(invoke).toHaveBeenCalledWith(
    "session_upsert",
    expect.objectContaining({
      session: expect.objectContaining({ id: session.id, blocks: [] }),
    }),
  );
});

it.each([null, { key: "key", cwd: "/other" }])(
  "refuses an unbound or retargeted empty view: %j",
  async (source) => {
    invoke.mockResolvedValue(source);
    await expect(
      upsertNativeResumeSession(newSession("claude", "/repo")),
    ).rejects.toThrow("binding is missing");
    expect(
      invoke.mock.calls.some(([command]) => command === "session_upsert"),
    ).toBe(false);
  },
);

it("refuses an unverified provider profile before saving", async () => {
  invoke.mockImplementation(async (command: string) => {
    if (command === "provider_sessions_for_session")
      return { key: "key", cwd: "/repo" };
    throw new Error("Different profile");
  });
  await expect(
    upsertNativeResumeSession(newSession("claude", "/repo")),
  ).rejects.toThrow("Different profile");
  expect(
    invoke.mock.calls.some(([command]) => command === "session_upsert"),
  ).toBe(false);
});
