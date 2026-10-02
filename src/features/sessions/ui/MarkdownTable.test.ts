// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMarkdown } from "./AgentMarkdown";

const copy = vi.hoisted(() =>
  vi.fn(async (_text: string, _html: string) => {}),
);
vi.mock("../../../platform/tauri/clipboard", async (original) => ({
  ...(await original<typeof import("../../../platform/tauri/clipboard")>()),
  copyFormattedText: copy,
}));

let container: HTMLDivElement;
let root: Root;
const first = "| Item | Count |\n| --- | ---: |\n| First | 2 |";
const second = "| Other |\n| --- |\n| Second |";
function render(
  onSaveNote?: (text: string) => Promise<void>,
  streaming = false,
) {
  act(() =>
    root.render(
      createElement(AgentMarkdown, {
        text: `${first}\n\n${second}`,
        onSaveNote,
        streaming,
      }),
    ),
  );
}
function action(index: number, label: string) {
  return container
    .querySelectorAll('[aria-label="Table actions"]')
    [index].querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  copy.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("table actions", () => {
  it("copies only the chosen table with Markdown and rich table formats", async () => {
    render();
    await act(async () => action(1, "Copy table").click());
    expect(copy).toHaveBeenCalledOnce();
    expect(copy.mock.calls[0][0]).toBe(second);
    expect(copy.mock.calls[0][1]).toContain("<table>");
    expect(copy.mock.calls[0][1]).not.toMatch(/First|Copy|data-streamdown/);
    expect(action(1, "Copy table").textContent).toBe("Copied");
  });

  it("saves the chosen Markdown table through the existing note callback", async () => {
    const save = vi.fn(async (_text: string) => {});
    render(save);
    await act(async () => action(0, "Add table to Note").click());
    expect(save).toHaveBeenCalledWith(first);
    expect(action(0, "Add table to Note").textContent).toBe("Saved to Notes");
  });

  it("surfaces a save failure and allows retry", async () => {
    const save = vi
      .fn(async (_text: string) => {})
      .mockRejectedValueOnce(new Error("disk full"));
    render(save);
    await act(async () => action(0, "Add table to Note").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "disk full",
    );
    await act(async () => action(0, "Add table to Note").click());
    expect(save).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("does not offer note saving when notes are unavailable", () => {
    render();
    expect(
      container.querySelector('[aria-label="Add table to Note"]'),
    ).toBeNull();
  });

  it("keeps unfinished streamed tables from being saved or copied", () => {
    render(
      vi.fn(async () => {}),
      true,
    );
    expect(action(0, "Copy table").disabled).toBe(true);
    expect(action(0, "Add table to Note").disabled).toBe(true);
  });
});
