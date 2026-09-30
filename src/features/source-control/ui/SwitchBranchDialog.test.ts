// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateHelperCommitMessage: vi.fn(),
}));

vi.mock("../../../integrations/harness", () => ({
  generateHelperCommitMessage: mocks.generateHelperCommitMessage,
}));

import { SwitchBranchDialog } from "./SwitchBranchDialog";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.generateHelperCommitMessage.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderDialog(): Promise<void> {
  await act(async () => {
    root.render(
      createElement(SwitchBranchDialog, {
        cwd: "/repo",
        branch: "feature/helpers",
        busy: null,
        onStash: vi.fn(),
        onCommit: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
  });
}

async function typeInMessage(value: string): Promise<void> {
  const input = document.body.querySelector<HTMLTextAreaElement>(
    '[aria-label="Commit message"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SwitchBranchDialog commit message generation", () => {
  it("keeps text typed while a generated message is pending", async () => {
    let resolveGeneration: ((message: string) => void) | undefined;
    mocks.generateHelperCommitMessage.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    await renderDialog();

    await act(async () => {
      document.body
        .querySelector<HTMLButtonElement>(
          '[aria-label="Generate commit message"]',
        )!
        .click();
    });
    const field = document.body.querySelector<HTMLTextAreaElement>(
      '[aria-label="Commit message"]',
    )!;
    expect(field.disabled).toBe(false);
    await typeInMessage("my edited message");
    await act(async () => {
      resolveGeneration?.("generated message");
      await Promise.resolve();
    });

    expect(field.value).toBe("my edited message");
    expect(alert).toHaveBeenCalledWith(
      "A commit message was generated, but you edited the field, so it wasn't applied.",
    );
  });

  it("applies a generated message when the field has not changed", async () => {
    mocks.generateHelperCommitMessage.mockResolvedValue("generated message");
    await renderDialog();

    await act(async () => {
      document.body
        .querySelector<HTMLButtonElement>(
          '[aria-label="Generate commit message"]',
        )!
        .click();
      await Promise.resolve();
    });

    expect(
      document.body.querySelector<HTMLTextAreaElement>(
        '[aria-label="Commit message"]',
      )!.value,
    ).toBe("generated message");
  });

  it("keeps the original empty field when generation is cancelled on unmount", async () => {
    let resolveGeneration: ((message: string) => void) | undefined;
    mocks.generateHelperCommitMessage.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    await renderDialog();

    await act(async () => {
      document.body
        .querySelector<HTMLButtonElement>(
          '[aria-label="Generate commit message"]',
        )!
        .click();
    });
    await act(async () => root.render(null));
    await act(async () => {
      resolveGeneration?.("late message");
      await Promise.resolve();
    });

    expect(document.body.querySelector('[aria-label="Commit message"]')).toBeNull();
  });
});
