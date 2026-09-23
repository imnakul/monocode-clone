// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "../../../app/shell/Sidebar";
import { newSession, type Session } from "../model/session";
import { buildHandoffComposerCard } from "../model/handoff";
import { buildSessionList, groupSessionListEntries } from "../model/sessionFolders";

describe("Sidebar handoff presentation regression", () => {
  it("renders Sidebar without crashing when handoff creates a session beside the original", () => {
    const parentSession: Session = {
      ...newSession("claude", "/mock/project"),
      id: "parent-session-1",
      title: "Parent Claude Session",
      repo: "my-org/my-repo",
      branch: "feature/sync",
      updatedAt: Date.now() - 60_000,
      blocks: [
        { id: "u1", role: "user", text: "Please optimize this code" },
        { id: "a1", role: "assistant", text: "I will optimize it." },
      ],
    };

    const handoffComposerCard = buildHandoffComposerCard({
      from: "claude",
      to: "codex",
      brief: "Session recap: optimizing database queries",
      userRequest: "Check second opinion with Codex",
      files: ["src/db.ts"],
    });

    // Simulating openSessionBeside creating handoff destination session with its composer card
    const handoffSession: Session = {
      ...newSession("codex", parentSession.cwd),
      id: "handoff-session-2",
      title: "Second Opinion: Codex",
      repo: parentSession.repo,
      branch: parentSession.branch,
      updatedAt: Date.now(),
      handoffCard: handoffComposerCard,
      blocks: [
        {
          id: "handoff-block",
          role: "user",
          text: "Handoff from claude",
        },
      ],
    };

    const sessions = [parentSession, handoffSession];

    // 1. Verify data structures process cleanly through sessionFolders
    const entries = buildSessionList(sessions, [], sessions);
    const groups = groupSessionListEntries(entries);
    expect(groups.length).toBeGreaterThan(0);

    // 2. Render Sidebar with the handoff session
    let markup = "";
    expect(() => {
      markup = renderToStaticMarkup(
        createElement(Sidebar, {
          cwd: "/mock/project",
          open: true,
          sessions,
          busySessionIds: new Set(),
          approvalSessionIds: new Set(),
          activeSessionId: handoffSession.id,
          status: "idle",
          pending: false,
          tab: "sessions",
          onTabChange: () => {},
          onSelectSession: () => {},
        }),
      );
    }).not.toThrow();

    expect(markup).toBeTruthy();
    expect(markup).toContain("Second Opinion: Codex");
    expect(markup).toContain("Parent Claude Session");
    expect(markup).toContain("my-org/my-repo/feature/sync");
  });
});
