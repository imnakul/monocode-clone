import { describe, expect, it } from "vitest";
import { newTab, newTerminalFile, openTerminalTab } from "./layout";
import { disappearedTerminalIds } from "./terminalPanes";

describe("disappearedTerminalIds", () => {
  it("returns ids whose terminal files vanish between two tab sets", () => {
    const keep = newTerminalFile("/repo", "keep");
    const drop = newTerminalFile("/repo", "drop");
    let before = openTerminalTab(newTab("session-1"), keep);
    before = openTerminalTab(before, drop);
    const after = openTerminalTab(newTab("session-1"), keep);

    expect(disappearedTerminalIds([before], [after])).toEqual([drop.id]);
  });

  it("ignores terminals that survive and terminals that are new", () => {
    const keep = newTerminalFile("/repo", "keep");
    const added = newTerminalFile("/repo", "added");
    const before = openTerminalTab(newTab("session-1"), keep);
    let after = openTerminalTab(newTab("session-1"), keep);
    after = openTerminalTab(after, added);

    expect(disappearedTerminalIds([before], [after])).toEqual([]);
  });

  it("reports every vanished id once across tabs and panes", () => {
    const gone = newTerminalFile("/repo", "gone");
    const alsoGone = newTerminalFile("/repo", "also-gone");
    const t1 = openTerminalTab(newTab("session-1"), gone);
    const t2 = openTerminalTab(newTab("session-2"), alsoGone);

    const ids = disappearedTerminalIds([t1, t2], []);
    expect(ids).toEqual([gone.id, alsoGone.id]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles tabs without terminal panes", () => {
    expect(
      disappearedTerminalIds([newTab("session-1")], [newTab("session-1")]),
    ).toEqual([]);
  });
});
