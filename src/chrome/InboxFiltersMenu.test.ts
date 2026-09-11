import { createElement, type PropsWithChildren, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InboxFiltersMenu } from "./InboxFiltersMenu";
import { SessionFiltersMenu } from "./SessionFiltersMenu";
import { DEFAULT_INBOX_FILTERS } from "../lib/inboxFilters";
import { DEFAULT_SESSION_SIDEBAR_FILTERS } from "../lib/sessionFilters";
import { SHARED_HOVER_CONTINUITY_ATTR } from "./SharedHoverHighlight";

vi.mock("./Popover", () => ({
  Popover: ({ children }: PropsWithChildren): ReactElement =>
    createElement("div", null, children),
}));

describe("InboxFiltersMenu continuity opt-in scoping", () => {
  it("opts Status, Type, and Projects groups into shared-hover continuity with gap-1 spacing", () => {
    const markup = renderToStaticMarkup(
      createElement(InboxFiltersMenu, {
        x: 0,
        y: 0,
        projects: [{ path: "/repo/p1", name: "Project 1" }],
        source: "github",
        filters: DEFAULT_INBOX_FILTERS,
        onChange: () => {},
        onClose: () => {},
      }),
    );

    // Status, Type, and Projects must have both continuity opt-in and gap-1
    const continuityCount = (
      markup.match(new RegExp(SHARED_HOVER_CONTINUITY_ATTR, "g")) || []
    ).length;
    expect(continuityCount).toBe(3);

    // Verify each continuity container retains gap-1 flex layout
    expect(markup).toContain(
      `data-shared-hover-continuity="true" class="flex flex-col gap-1"`,
    );

    // Verify sections outside continuity (Time options) do NOT have data-shared-hover-continuity
    expect(markup).toContain("Time");
    expect(markup).toContain("Assigned to me");
  });

  it("ensures SessionFiltersMenu does not inherit continuity opt-in or gap-1 spacing", () => {
    const markup = renderToStaticMarkup(
      createElement(SessionFiltersMenu, {
        x: 0,
        y: 0,
        harnesses: ["claude"],
        filters: DEFAULT_SESSION_SIDEBAR_FILTERS,
        onChange: () => {},
        onClose: () => {},
      }),
    );

    expect(markup).not.toContain(SHARED_HOVER_CONTINUITY_ATTR);
    expect(markup).not.toContain("gap-1");
  });
});
