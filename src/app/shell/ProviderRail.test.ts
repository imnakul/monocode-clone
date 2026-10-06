import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProviderRail, type ProviderRailEntry } from "./ProviderRail";

const entries: ProviderRailEntry[] = [
  { provider: "claude", label: "Claude", count: 12, refreshing: false, failed: false },
  { provider: "codex", label: "Codex", count: null, refreshing: true, failed: true },
];

function render(selected: "claude" | "codex" | null = null, list = entries): string {
  return renderToStaticMarkup(
    createElement(ProviderRail, {
      entries: list,
      selected,
      onSelect: vi.fn(),
    }),
  );
}

describe("ProviderRail", () => {
  it("renders nothing when no provider is enabled", () => {
    expect(render(null, [])).toBe("");
  });

  it("renders only retained cloud navigation without local discovery folders", () => {
    const html = render();
    expect(html).toContain("Claude cloud sessions, 12 loaded");
    expect(html).toContain("Codex cloud sessions, could not be read");
    expect(html).not.toContain("Local provider conversations");
    expect(html).not.toContain("Refresh Claude conversations");
    expect(html).not.toContain("Refresh Codex conversations");
    expect(html).toContain("data-shared-hover-item");
  });

  it("offers Add session even when there are no cloud records", () => {
    const html = renderToStaticMarkup(createElement(ProviderRail, {
      entries: [], selected: null, onSelect: vi.fn(), onAddSession: vi.fn(),
    }));
    expect(html).toContain("Add session");
    expect(html).not.toContain("Claude cloud");
    expect(html).not.toContain("Codex cloud");
  });

  it("marks the selected provider and reports refresh without an inline button", () => {
    const html = render("claude");
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).not.toContain("animate-spin");
    expect(html).toContain('aria-busy="true"');
  });
});
