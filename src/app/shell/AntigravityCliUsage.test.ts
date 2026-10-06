// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UsageFooter } from "./UsageFooter";
import { clearCachedRateLimits } from "../../features/providers/model/rateLimitsCache";
import {
  idleRateLimits,
  type ProviderRateLimits,
} from "../../features/providers/model/rateLimits";

const fetchUsage = vi.hoisted(() => vi.fn());
vi.mock(
  "../../features/providers/model/antigravityCliUsage",
  async (original) => ({
    ...(await original<
      typeof import("../../features/providers/model/antigravityCliUsage")
    >()),
    fetchAntigravityCliRateLimits: fetchUsage,
  }),
);
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
let container: HTMLDivElement;
let root: Root;
const limits: ProviderRateLimits = {
  ...idleRateLimits("antigravity-cli"),
  status: "ok",
  updatedAt: Date.now(),
  creditBalance: 0,
  modelGroups: [
    {
      name: "Gemini",
      session: { usedPercent: 6, windowMinutes: 300, resetsAt: null },
      weekly: { usedPercent: 17, windowMinutes: 10080, resetsAt: null },
    },
    {
      name: "Claude & GPT",
      session: { usedPercent: 0, windowMinutes: 300, resetsAt: null },
      weekly: { usedPercent: 0, windowMinutes: 10080, resetsAt: null },
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  clearCachedRateLimits();
  fetchUsage.mockReset().mockResolvedValue(limits);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  clearCachedRateLimits();
  vi.unstubAllGlobals();
});

it("shows the selected model family's quota, all family details and zero credits in the existing footer", async () => {
  await act(async () =>
    root.render(
      createElement(UsageFooter, {
        providers: ["antigravity-cli"],
        session: {
          harness: "antigravity-cli",
          model: "antigravity-cli:gemini-3.8-flash-high",
        },
      }),
    ),
  );
  expect(fetchUsage).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("17% used");
  const trigger = container.querySelector<HTMLButtonElement>(
    '[aria-label="Antigravity CLI usage details"]',
  )!;
  await act(async () => trigger.click());
  expect(document.body.textContent).toContain("Remaining credits: 0");
  expect(
    document.querySelector('[aria-label="Gemini model quotas"]'),
  ).not.toBeNull();
  expect(
    document.querySelector('[aria-label="Claude & GPT model quotas"]'),
  ).not.toBeNull();
  fetchUsage.mockRejectedValue(new Error("quota report format changed"));
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Refresh usage"]')!
      .click(),
  );
  expect(document.body.textContent).toContain(
    "Showing the last available snapshot",
  );
  expect(document.body.textContent).toContain("quota report format changed");
});

it("does not borrow a model family's quota for the configured default and does not fetch for ACP", async () => {
  await act(async () =>
    root.render(
      createElement(UsageFooter, {
        providers: ["antigravity-cli"],
        session: {
          harness: "antigravity-cli",
          model: "antigravity-cli:default",
        },
      }),
    ),
  );
  expect(container.textContent).toContain("Model quotas");
  expect(container.textContent).not.toContain("17% used");
  await act(async () =>
    root.render(
      createElement(UsageFooter, {
        providers: [],
        session: { harness: "antigravity" },
      }),
    ),
  );
  expect(
    container.querySelector('[aria-label="Antigravity CLI usage details"]'),
  ).toBeNull();
  expect(fetchUsage).toHaveBeenCalledTimes(1);
});
