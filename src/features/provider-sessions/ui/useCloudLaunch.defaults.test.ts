// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { saveNewChatExecution } from "../../settings/model/settings";
import { useCloudLaunch } from "./useCloudLaunch";
import type { ComposerCloudLaunch } from "./CloudLaunchControls";

let root: Root;
let container: HTMLDivElement;
let control: ComposerCloudLaunch | undefined;
const base = { harness: "claude" as const, cwd: "/project", blocksCount: 0, remote: false,
  draftId: "one", onOutcome: (): void => {} };
function Probe(props: Parameters<typeof useCloudLaunch>[0]): null {
  control = useCloudLaunch(props);
  return null;
}
function render(props: Parameters<typeof useCloudLaunch>[0]): void {
  act(() => root.render(createElement(Probe, props)));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("uses the Cloud default for a fresh draft but keeps its explicit Local choice", () => {
  saveNewChatExecution("cloud");
  render(base);
  expect(control?.active).toBe(true);
  act(() => control?.setActive(false));
  render(base);
  expect(control?.active).toBe(false);
  render({ ...base, draftId: "two" });
  expect(control?.active).toBe(true);
});

it("never applies Cloud to existing native chats, remote machines or unsupported providers", () => {
  saveNewChatExecution("cloud");
  render({ ...base, nativeResume: true });
  expect(control).toBeUndefined();
  render({ ...base, blocksCount: 1 });
  expect(control).toBeUndefined();
  render({ ...base, remote: true });
  expect(control).toBeUndefined();
  render({ ...base, harness: "pi" });
  expect(control).toBeUndefined();
});

it("clears a draft override when changing provider/project, while preserving Cloud restrictions", () => {
  saveNewChatExecution("local");
  render(base);
  act(() => control?.setActive(true));
  expect(control?.active).toBe(true);
  render({ ...base, harness: "codex" });
  expect(control?.active).toBe(false);
  saveNewChatExecution("cloud");
  render({ ...base, cwd: "/other", disabledReason: "Switch to Current checkout" });
  expect(control?.active).toBe(true);
  expect(control?.canLaunch).toBe(false);
  expect(control?.disabledReason).toBe("Switch to Current checkout");
});


it("retains an explicit Local choice when a named draft pane remounts", () => {
  saveNewChatExecution("cloud");
  render(base);
  act(() => control?.setActive(false));
  act(() => root.unmount());
  root = createRoot(container);
  render(base);
  expect(control?.active).toBe(false);
});
