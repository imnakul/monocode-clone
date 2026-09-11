import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsNav } from "./SettingsRail";
import { SettingsView } from "../surfaces/SettingsView";
import {
  DETAILED_CONTEXT_DEFAULT,
  REMAINING_QUOTA_DEFAULT,
  saveDetailedContext,
  saveRemainingQuota,
} from "../lib/settings";

function mockLocalStorage(): void {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

describe("SettingsRail with Experimentation", () => {
  it("renders Experimentation navigation item with its label and icon", () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsNav, {
        section: "experimentation",
        onSelect: () => {},
        onClose: () => {},
      }),
    );

    expect(markup).toContain("Experimentation");
    expect(markup).toContain("<svg");
  });
});

describe("SettingsView Experimentation Page", () => {
  beforeEach(mockLocalStorage);
  afterEach(() => {
    localStorage.removeItem("monocode.detailedContext");
    localStorage.removeItem("monocode.remainingQuota");
  });

  it("renders section header and exact copy for both experimental toggles", () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsView, {
        section: "experimentation",
        cwd: "E:/test",
        sessions: [],
        onClose: () => {},
        onOpenSession: () => {},
        onArchiveSession: () => {},
        onDeleteSession: () => {},
      }),
    );

    // Section header
    expect(markup).toContain("Experimentation");
    expect(markup).toContain(
      "Preview features that may change or use estimated data.",
    );

    // Detailed context row
    expect(markup).toContain("Detailed context");
    expect(markup).toContain(
      "Show the full context inspector with usage breakdowns, quota, costing, skills, and System &amp; Tools details. Values are estimated and might not be fully accurate yet.",
    );

    // Remaining quota row
    expect(markup).toContain("Remaining quota");
    expect(markup).toContain(
      "Show plan limits as quota remaining—for example, 42% left—instead of quota already used.",
    );
  });

  it("defaults both switches to OFF and exposes switch semantics", () => {
    expect(DETAILED_CONTEXT_DEFAULT).toBe(false);
    expect(REMAINING_QUOTA_DEFAULT).toBe(false);

    const markup = renderToStaticMarkup(
      createElement(SettingsView, {
        section: "experimentation",
        cwd: "E:/test",
        sessions: [],
        onClose: () => {},
        onOpenSession: () => {},
        onArchiveSession: () => {},
        onDeleteSession: () => {},
      }),
    );

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-label="Detailed context"');
    expect(markup).toContain('aria-label="Remaining quota"');
    // Both off by default: aria-checked should be "false"
    const checkedMatches = markup.match(/aria-checked="false"/g);
    expect(checkedMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it("reflects ON switch semantics when values are saved", () => {
    saveDetailedContext(true);
    saveRemainingQuota(true);

    const markup = renderToStaticMarkup(
      createElement(SettingsView, {
        section: "experimentation",
        cwd: "E:/test",
        sessions: [],
        onClose: () => {},
        onOpenSession: () => {},
        onArchiveSession: () => {},
        onDeleteSession: () => {},
      }),
    );

    const checkedMatches = markup.match(/aria-checked="true"/g);
    expect(checkedMatches?.length).toBeGreaterThanOrEqual(2);
  });
});
