// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextMeter, type ContextMeterProps } from "./ContextMeter";
import type { NativeContextBreakdown } from "../model/contextBreakdown";
const inspection = vi.hoisted(() => vi.fn());
vi.mock("../../../integrations/harness/core/registry", () => ({
  inspectHarnessContext: inspection,
}));
vi.mock("../../settings/model/settings", () => ({
  subscribeDetailedContext: () => () => {},
  loadDetailedContext: () => true,
  subscribeRemainingQuota: () => () => {},
  loadRemainingQuota: () => false,
}));
vi.mock("../../../shared/ui/Popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { role: "dialog" }, children),
}));
vi.mock("../../../platform/tauri/fs", () => ({
  listSkills: async () => [],
  readTextFile: async () => "",
}));
vi.mock("../model/systemBreakdown", async (original) => ({
  ...(await original<typeof import("../model/systemBreakdown")>()),
  loadSystemAndToolsConfig: async () => ({
    globalRules: [],
    mcpServers: [{ name: "SocratiCode" }],
    plugins: [{ name: "plugin" }],
  }),
}));
vi.mock("../../providers/model/rateLimitsFetch", () => ({
  fetchClaudeRateLimits: async () => null,
  fetchCodexRateLimits: async () => null,
}));
const native: NativeContextBreakdown = {
  source: "claude",
  totalTokens: 100,
  windowTokens: 200,
  categories: [
    { name: "Messages", tokens: 80, kind: "used" },
    { name: "Free", tokens: 100, kind: "free" },
    { name: "Deferred tools", tokens: 5, kind: "deferred" },
  ],
  memoryFiles: [{ path: "CLAUDE.md", tokens: 10 }],
  mcpServers: [
    { serverName: "SocratiCode", tokens: 10, toolCount: 2, deferredTools: 1 },
  ],
  messages: {
    toolCalls: 1,
    toolResults: 2,
    attachments: 3,
    assistant: 4,
    user: 5,
    unattributed: 6,
  },
};
const props: ContextMeterProps = {
  sessionId: "s1",
  harness: "claude",
  usage: { used: 100, window: 200, measuredAtUserBlockId: "u1" },
  blocks: [{ id: "u1", role: "user", text: "hello" }],
};
describe("context popover lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    inspection.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(value = props) {
    await act(async () => root.render(createElement(ContextMeter, value)));
  }
  async function toggle() {
    await act(async () =>
      container.querySelector<HTMLButtonElement>("button")!.click(),
    );
  }
  it("shows unknown without deriving a percentage from processed tokens", async () => {
    await render({
      sessionId: "s1",
      turnUsage: { input: 50_000, output: 0, total: 50_000 },
    });
    await toggle();
    expect(container.textContent).toContain(
      "No context reading yet. It appears after the first reply.",
    );
    expect(container.textContent).toContain("Processed this turn");
    expect(container.textContent).not.toContain("%");
    expect(inspection).not.toHaveBeenCalled();
  });
  it("does not inspect stale or busy readings", async () => {
    await render({ ...props, usage: { used: 100, window: 200 } });
    await toggle();
    expect(container.textContent).toContain("Out of date — updates after the next reply");
    expect(inspection).not.toHaveBeenCalled();
    await render({ ...props, busy: true });
    expect(container.textContent).toContain("Updating…");
    expect(inspection).not.toHaveBeenCalled();
  });
  it("renders reported categories, MCP tokens and unattributed messages", async () => {
    inspection.mockResolvedValue(native);
    await render();
    await toggle();
    expect(inspection).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Reported by Claude Code");
    expect(container.textContent).toContain(
      "Some of these numbers are Claude Code's own estimates.",
    );
    expect(container.textContent).toContain("Unattributed");
    expect(container.textContent).toContain("1 tools deferred");
    expect(container.textContent).toContain("Deferred (not in context)");
    expect(container.textContent).not.toMatch(/exact|measured|actual/i);
  });
  it("shows estimates and size not reported on unavailable inspection", async () => {
    inspection.mockResolvedValue(null);
    await render({
      ...props,
      usage: { used: 50_000, window: 200_000, measuredAtUserBlockId: "u1" },
    });
    await toggle();
    expect(container.textContent).toContain(
      "Claude Code's breakdown wasn't available.",
    );
    expect(container.textContent).toContain("Unclassified history");
    await act(async () => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.includes("System & tools"))!
        .click();
    });
    expect(container.textContent).toContain("SocratiCode");
    expect(container.textContent).toContain("size not reported");
    expect(container.textContent).not.toMatch(/exact|measured|actual/i);
  });
  it.each(["close", "session", "usage", "unmount"])(
    "aborts and ignores late response after %s",
    async (change) => {
      let resolve: (value: NativeContextBreakdown) => void = () => {};
      inspection.mockImplementation(
        () =>
          new Promise<NativeContextBreakdown>((finish) => {
            resolve = finish;
          }),
      );
      await render();
      await toggle();
      const signal = inspection.mock.calls[0][2] as AbortSignal;
      if (change === "close") await toggle();
      else if (change === "session")
        await render({ ...props, sessionId: "s2", usage: { used: 100 } });
      else if (change === "usage")
        await render({ ...props, usage: { used: 200, stale: true } });
      else await act(async () => root.render(null));
      expect(signal.aborted).toBe(true);
      await act(async () => resolve(native));
      expect(container.textContent).not.toContain("Reported by Claude Code");
    },
  );
  it("discards native details when a new context event arrives", async () => {
    inspection.mockResolvedValue(native);
    await render();
    await toggle();
    expect(container.textContent).toContain("Reported by Claude Code");
    await render({ ...props, usage: { used: 50, window: 200, stale: true } });
    expect(container.textContent).not.toContain("Reported by Claude Code");
  });
});
