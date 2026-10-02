// @vitest-environment happy-dom

import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "../data/sessionStore";
import { SessionCard } from "./SessionCard";
import { saveCompactModelLabels } from "../../settings/model/settings";

const SESSION: SessionSummary = {
  id: "model-label-session",
  cwd: "/tmp/project",
  harness: "claude",
  model: "claude:sonnet-4",
  activeTurnModel: {
    harness: "codex",
    id: "gpt-5.1",
    name: "GPT-5.1 custom alias",
  },
  runtimeMode: "supervised",
  title: "Model label test",
  createdAt: 1,
  updatedAt: 1,
};

function renderCard(compact: boolean): string {
  return renderToStaticMarkup(
    createElement(SessionCard, {
      session: SESSION,
      isActive: false,
      busy: true,
      done: false,
      needsApproval: false,
      compact,
      now: 1,
      onSelect: () => {},
    }),
  );
}

function cardElement(compact: boolean) {
  return createElement(SessionCard, {
    session: SESSION,
    isActive: false,
    busy: true,
    done: false,
    needsApproval: false,
    compact,
    now: 1,
    onSelect: () => {},
  });
}

describe("session card model labels", () => {
  beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
  afterEach(() => {
    localStorage.removeItem("monocode.compactModelLabels");
    vi.unstubAllGlobals();
  });

  it("keeps the experimental compact label hidden by default", () => {
    localStorage.removeItem("monocode.compactModelLabels");
    expect(renderCard(true)).not.toContain("Model: GPT-5.1 custom alias");
  });

  it("shows the active turn's saved model name on compact cards when enabled", () => {
    localStorage.setItem("monocode.compactModelLabels", "1");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      act(() => root.render(cardElement(true)));
      expect(container.textContent).toContain("Model: GPT-5.1 custom alias");
      expect(container.innerHTML).toContain(
        'title="Model: GPT-5.1 custom alias"',
      );
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it("updates an already mounted compact card when the setting changes", () => {
    localStorage.removeItem("monocode.compactModelLabels");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      act(() => root.render(cardElement(true)));
      expect(container.textContent).not.toContain(
        "Model: GPT-5.1 custom alias",
      );
      act(() => saveCompactModelLabels(true));
      expect(container.textContent).toContain("Model: GPT-5.1 custom alias");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it("shows the active turn model on regular cards too", () => {
    const markup = renderCard(false);
    expect(markup).toContain("GPT-5.1 custom alias");
  });
});
