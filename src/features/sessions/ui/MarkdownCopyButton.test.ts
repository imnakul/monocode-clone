// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownModeToggle, MarkdownViewShell } from "./MarkdownModeToggle";
const copy = vi.hoisted(() => vi.fn(async (_text: string) => {}));
vi.mock("../../../platform/tauri/clipboard", () => ({ copyText: copy }));
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  copy.mockReset().mockResolvedValue();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const button = () =>
  container.querySelector<HTMLButtonElement>('[aria-label="Copy Markdown"]')!;
describe("full Markdown copy", () => {
  it("copies exact current source including frontmatter and table syntax in either view", async () => {
    const markdown =
      "---\ntitle: Current draft\n---\n\n| A | B |\n| --- | --- |\n| **one** | two |\n";
    const render = (mode: "preview" | "source", text: string) =>
      act(() =>
        root.render(
          createElement(MarkdownViewShell, {
            mode,
            onModeChange: () => {},
            markdown: text,
            preview: createElement("p", null, "Rendered content"),
            source: createElement("p", null, "Editor content"),
          }),
        ),
      );
    render("preview", markdown);
    await act(async () => button().click());
    expect(copy).toHaveBeenLastCalledWith(markdown);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Copied",
    );
    render("source", markdown + "Unsaved edit");
    await act(async () => button().click());
    expect(copy).toHaveBeenLastCalledWith(markdown + "Unsaved edit");
    expect(
      container.querySelector('[role="tablist"]')?.contains(button()),
    ).toBe(false);
  });
  it("reports copy failure and supports retry without changing content", async () => {
    copy.mockRejectedValueOnce(new Error("Clipboard unavailable"));
    act(() =>
      root.render(
        createElement(MarkdownModeToggle, {
          mode: "source",
          onChange: () => {},
          markdown: "# Keep this",
        }),
      ),
    );
    await act(async () => button().click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Clipboard unavailable",
    );
    await act(async () => button().click());
    expect(copy).toHaveBeenLastCalledWith("# Keep this");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it("keeps non-Markdown consumers unchanged unless raw content is supplied", () => {
    act(() =>
      root.render(
        createElement(MarkdownModeToggle, {
          mode: "preview",
          onChange: () => {},
        }),
      ),
    );
    expect(button()).toBeNull();
  });
});
