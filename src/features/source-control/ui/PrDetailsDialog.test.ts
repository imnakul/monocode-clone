// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateHelperPrContent: vi.fn(),
  helperFailureMessage: vi.fn(() => "The description could not be generated."),
}));

vi.mock("../../../integrations/harness", () => ({
  generateHelperPrContent: mocks.generateHelperPrContent,
  helperFailureMessage: mocks.helperFailureMessage,
}));

import { PrDetailsDialog } from "./PrDetailsDialog";
import type { HelperPrDraft } from "../../../integrations/harness";

const initialDraft: HelperPrDraft = {
  title: "Generated title",
  body: "Generated description",
  base: "main",
  head: "feature/helpers",
};

let container: HTMLDivElement;
let root: Root;
let onCreate: ReturnType<typeof vi.fn>;
let onCancel: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.generateHelperPrContent.mockReset();
  mocks.helperFailureMessage.mockReset().mockReturnValue("Retry failed.");
  onCreate = vi.fn(async () => undefined);
  onCancel = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body
    .querySelectorAll("[data-popover-side]")
    .forEach((element) => element.remove());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderDialog(): Promise<void> {
  await act(async () => {
    root.render(
      createElement(PrDetailsDialog, {
        cwd: "/repo",
        draft: initialDraft,
        initialError: "Couldn't write the pull request description.",
        pushed: true,
        onCreate,
        onCancel,
      }),
    );
  });
}

async function changeValue(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  await act(async () => {
    const prototype =
      field.tagName === "INPUT"
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function titleField(): HTMLInputElement {
  return document.body.querySelector<HTMLInputElement>('[aria-label="Title"]')!;
}

function descriptionField(): HTMLTextAreaElement {
  return document.body.querySelector<HTMLTextAreaElement>(
    '[aria-label="Description"]',
  )!;
}

function retryButton(): HTMLButtonElement {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.includes("again"),
  )!;
}

function createButton(): HTMLButtonElement {
  return document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!;
}

describe("PrDetailsDialog", () => {
  it("creates with edited fields and ignores a repeated create click", async () => {
    await renderDialog();
    await changeValue(titleField(), "  My edited title  ");
    await changeValue(descriptionField(), "Edited body");

    await act(async () => {
      createButton().click();
      createButton().click();
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith({
      title: "My edited title",
      body: "Edited body",
      base: "main",
      head: "feature/helpers",
    });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables creation for an empty title and keeps an error in the dialog", async () => {
    onCreate.mockRejectedValue(new Error("GitHub refused the request."));
    await renderDialog();
    await changeValue(titleField(), "   ");
    expect(createButton().disabled).toBe(true);

    await changeValue(titleField(), "Valid title");
    await act(async () => {
      createButton().click();
      await Promise.resolve();
    });

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "GitHub refused the request.",
    );
    expect(titleField().value).toBe("Valid title");
  });

  it("updates generated text only when both fields stayed unchanged during retry", async () => {
    let resolveGeneration:
      | ((outcome: unknown) => void)
      | undefined;
    mocks.generateHelperPrContent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    await renderDialog();

    const retry = retryButton();
    await act(async () => retry.click());
    expect(retry.textContent).toContain("Trying again…");
    expect(createButton().disabled).toBe(true);
    await changeValue(titleField(), "User title");
    await changeValue(descriptionField(), "User description");
    await act(async () => {
      resolveGeneration?.({
        status: "ready",
        content: {
          title: "New generated title",
          body: "New generated description",
          base: "main",
          head: "feature/helpers",
        },
      });
      await Promise.resolve();
    });

    expect(titleField().value).toBe("User title");
    expect(descriptionField().value).toBe("User description");
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "A new description was generated, but you edited the fields, so it wasn't applied.",
    );
  });

  it("replaces unchanged fields after retry and discards a cancelled late result", async () => {
    let resolveGeneration: ((outcome: unknown) => void) | undefined;
    mocks.generateHelperPrContent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    await renderDialog();
    await act(async () => retryButton().click());
    await act(async () => {
      resolveGeneration?.({
        status: "ready",
        content: {
          title: "Retry title",
          body: "Retry body",
          base: "main",
          head: "feature/helpers",
        },
      });
      await Promise.resolve();
    });
    expect(titleField().value).toBe("Retry title");
    expect(descriptionField().value).toBe("Retry body");

    await act(async () => retryButton().click());
    await act(async () => {
      Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.trim() === "Cancel")!
        .click();
      root.render(null);
    });
    await act(async () => {
      resolveGeneration?.({
        status: "ready",
        content: {
          title: "Late title",
          body: "Late body",
          base: "main",
          head: "feature/helpers",
        },
      });
      await Promise.resolve();
    });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.body.querySelector('[aria-label="Title"]')).toBeNull();
  });
});
