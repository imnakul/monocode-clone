// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModelSettings } from "../../sessions/ui/ModelSettings";
import {
  cliAgentSetting,
  useAntigravityCliAgents,
} from "./antigravityCliAgents";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  invoke.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("reuses the setting selector, persists the CLI-specific choice and disables it after native binding", async () => {
  const onChange = vi.fn();
  const agents = [{ id: "reviewer", scope: "project" as const }];
  await act(async () =>
    root.render(
      createElement(ModelSettings, {
        harness: "antigravity-cli",
        model: "antigravity-cli:default",
        values: {},
        settingsOverride: [cliAgentSetting(agents)],
        onChange,
      }),
    ),
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Agent: Default agent"]',
      )!
      .click(),
  );
  const option = [
    ...document.querySelectorAll<HTMLButtonElement>('[role="option"]'),
  ].find((button) => button.textContent?.includes("reviewer"));
  expect(option).toBeDefined();
  act(() => option!.click());
  expect(onChange).toHaveBeenCalledWith({ antigravityAgent: "reviewer" });
  act(() =>
    root.render(
      createElement(ModelSettings, {
        harness: "antigravity-cli",
        model: "antigravity-cli:default",
        values: { antigravityAgent: "reviewer" },
        settingsOverride: [cliAgentSetting(agents, "reviewer", true)],
        disabled: true,
        onChange,
      }),
    ),
  );
  expect(
    container.querySelector<HTMLButtonElement>('button[aria-label^="Agent:"]')!
      .disabled,
  ).toBe(true);
  expect(container.querySelector("button")!.getAttribute("title")).toContain(
    "fixed",
  );
});

it("keeps discovery scoped to the current project and ignores late results from the previous project", async () => {
  let resolveOld:
    ((value: { id: string; scope: "project" }[]) => void) | undefined;
  invoke.mockImplementation(async (_command: string, args: { cwd: string }) =>
    args.cwd === "/old"
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : [{ id: "new-agent", scope: "project" }],
  );
  function Probe({ cwd }: { cwd: string }) {
    const result = useAntigravityCliAgents("antigravity-cli", cwd);
    return createElement(
      "span",
      null,
      result.settings[0].options.map((option) => option.label).join(","),
    );
  }
  await act(async () => root.render(createElement(Probe, { cwd: "/old" })));
  await act(async () => root.render(createElement(Probe, { cwd: "/new" })));
  expect(container.textContent).toContain("new-agent");
  await act(async () => resolveOld!([{ id: "old-agent", scope: "project" }]));
  expect(container.textContent).not.toContain("old-agent");
});
