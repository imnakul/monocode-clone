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

  it("renders a folder row per enabled provider without duplicate refresh controls", () => {
    const html = render();
    expect(html).toContain("Claude conversations, 12 loaded");
    expect(html).toContain("Codex conversations, could not be read");
    expect(html).not.toContain("Refresh Claude conversations");
    expect(html).not.toContain("Refresh Codex conversations");
    expect(html).toContain("data-shared-hover-item");
  });

  it("marks the selected provider and reports refresh without an inline button", () => {
    const html = render("claude");
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).not.toContain("animate-spin");
    expect(html).toContain('aria-busy="true"');
  });
});
