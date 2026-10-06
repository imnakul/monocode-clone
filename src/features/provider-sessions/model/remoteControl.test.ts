import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  loadDefault: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  sync: vi.fn(),
  toggle: vi.fn(),
  prepare: vi.fn(),
}));
vi.mock("../../settings/model/settings", () => ({
  loadClaudeRemoteControlDefault: mocks.loadDefault,
  loadRemoteControlChoices: () => new Set<string>(),
  saveRemoteControlChoices: vi.fn(),
  loadRemoteControlSessions: mocks.load,
  saveRemoteControlSessions: mocks.save,
}));
vi.mock("../../../integrations/harness/core/registry", () => ({
  setHarnessRemoteControl: mocks.toggle,
  syncHarnessRemoteControlDesired: mocks.sync,
}));
vi.mock("./providerSessions", () => ({
  prepareProviderNativeInput: mocks.prepare,
}));
import { HarnessRemoteControlError } from "../../../integrations/harness/core/types";
import {
  changeClaudeRemoteControl,
  initializeNewClaudeRemoteControlPreference,
  restoreClaudeRemoteControlPreferences,
  persistClaudeRemoteControlEvent,
} from "./remoteControl";
import type { HarnessRemoteControlInput } from "../../../integrations/harness/core/registry";

let stored: Set<string>;
const input: HarnessRemoteControlInput = {
  sessionId: "one",
  cwd: "/repo",
  model: "claude:sonnet",
  runtimeMode: "supervised",
  enabled: true,
  onEvent: vi.fn(),
};
beforeEach(() => {
  vi.resetAllMocks();
  stored = new Set();
  mocks.loadDefault.mockReturnValue(false);
  mocks.load.mockImplementation(() => new Set(stored));
  mocks.save.mockImplementation((value: Set<string>) => {
    stored = new Set(value);
  });
  mocks.prepare.mockImplementation(
    async (_harness: string, value: HarnessRemoteControlInput) => value,
  );
  mocks.toggle.mockResolvedValue(undefined);
});

describe("nonvisual Claude RC orchestration", () => {
  it("restores only saved Claude preferences without starting a connection", () => {
    stored = new Set(["one", "codex", "deleted"]);
    restoreClaudeRemoteControlPreferences([
      { id: "one", harness: "claude", title: "Existing" },
      { id: "two", harness: "claude", title: "Other" },
      { id: "codex", harness: "codex", title: "Codex" },
    ]);
    expect(stored).toEqual(new Set(["one", "codex", "deleted"]));
    expect(mocks.sync).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "one", enabled: true }),
    );
    expect(mocks.sync).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "two", enabled: false }),
    );
    expect(mocks.toggle).not.toHaveBeenCalled();
  });
  it("clears a hard auto-enable failure but preserves consent and parked choices", () => {
    stored = new Set(["one"]);
    persistClaudeRemoteControlEvent("one", {
      type: "remoteControl.changed",
      status: "off",
    });
    persistClaudeRemoteControlEvent("one", {
      type: "remoteControl.changed",
      status: "needs-consent",
    });
    expect(stored.has("one")).toBe(true);
    persistClaudeRemoteControlEvent("one", {
      type: "remoteControl.changed",
      status: "failed",
    });
    expect(stored.has("one")).toBe(false);
  });
  it("applies the default only to newly created Claude chats without spawning", () => {
    mocks.loadDefault.mockReturnValue(true);
    expect(
      initializeNewClaudeRemoteControlPreference({
        id: "one",
        harness: "claude",
        title: "New",
      }),
    ).toBe(true);
    expect(
      initializeNewClaudeRemoteControlPreference({
        id: "two",
        harness: "codex",
        title: "New",
      }),
    ).toBe(false);
    expect(stored).toEqual(new Set(["one"]));
    expect(mocks.toggle).not.toHaveBeenCalled();
  });
  it.each(["needs-consent", "failed"] as const)(
    "retains consent intent but clears a hard %s failure",
    async (status) => {
      mocks.toggle.mockRejectedValue(
        new HarnessRemoteControlError(status, "Setup required"),
      );
      await expect(changeClaudeRemoteControl(input)).rejects.toThrow(
        "Setup required",
      );
      expect(stored.has("one")).toBe(status === "needs-consent");
    },
  );
  it("keeps a newer choice when an older connection request fails", async () => {
    let rejectOld!: (error: Error) => void;
    mocks.toggle.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    const older = changeClaudeRemoteControl(input);
    await vi.waitFor(() => expect(mocks.toggle).toHaveBeenCalledOnce());
    await changeClaudeRemoteControl({ ...input, enabled: false });
    await changeClaudeRemoteControl(input);
    rejectOld(new HarnessRemoteControlError("failed", "Stale failure"));
    await older;
    expect(stored.has("one")).toBe(true);
  });
});
