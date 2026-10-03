// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AgentTranscript } from "./AgentTranscript";
vi.mock("../hooks/useTranscriptSelection", () => ({
  useTranscriptSelection: () => ({
    selection: {
      text: "Selected task body",
      responseId: "reply-1",
      rect: new DOMRect(100, 200, 200, 20),
    },
    dismissSelection: vi.fn(),
  }),
}));
it("passes selected reply text and its source block to task capture", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const save = vi.fn(async () => {});
  try {
    await act(async () =>
      root.render(
        createElement(AgentTranscript, {
          blocks: [
            { id: "reply-1", role: "assistant", text: "Selected task body" },
          ],
          onSaveSelectionTask: save,
        }),
      ),
    );
    const action = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent === "Add as Todo");
    expect(action).toBeDefined();
    await act(async () => action!.click());
    expect(save).toHaveBeenCalledWith("Selected task body", "reply-1");
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
