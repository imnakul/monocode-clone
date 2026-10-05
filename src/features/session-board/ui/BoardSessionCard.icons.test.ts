import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BoardSessionCard } from "./BoardSessionCard";
import { RemoteControlIndicator } from "../../provider-sessions/ui/RemoteControlIndicator";
import type { BoardCard } from "../sessionBoard";

function card(changes: Partial<BoardCard> = {}): BoardCard {
  return {
    sessionId: "s1",
    runId: "run",
    title: "Nightly report",
    cwd: "/repo",
    harness: "claude",
    model: "Sonnet",
    status: "in_progress",
    queuedCount: 0,
    updatedAt: 1,
    ...changes,
  };
}

function render(
  value: BoardCard,
  lane: "in_progress" | "done",
  remoteControl = false,
): string {
  return renderToStaticMarkup(
    createElement(BoardSessionCard, {
      card: value,
      lane,
      now: 2,
      preserveHover: false,
      busy: false,
      onOpen: vi.fn(),
      onRemove: vi.fn(),
      remoteControl,
    }),
  );
}

describe("Session Manager card icons", () => {
  it("marks running automation sessions and Remote Control chats", () => {
    const html = render(card({ automation: true }), "in_progress", true);
    expect(html).toContain('aria-label="Automation run"');
    expect(html).toContain('data-remote-control-indicator="On"');
  });

  it("shows neither for an ordinary chat, nor once the run is done", () => {
    expect(render(card(), "in_progress")).not.toContain("Automation run");
    expect(render(card(), "in_progress")).not.toContain(
      "data-remote-control-indicator",
    );
    const done = render(
      card({ automation: true, status: "done" }),
      "done",
      true,
    );
    expect(done).not.toContain("Automation run");
    expect(done).not.toContain("data-remote-control-indicator");
  });
});

describe("RemoteControlIndicator", () => {
  it("shows the PC icon in the accent colour when on and nothing when off", () => {
    const on = renderToStaticMarkup(createElement(RemoteControlIndicator));
    expect(on).toContain("text-accent");
    expect(on).toContain('aria-label="Remote Control: On"');
    expect(
      renderToStaticMarkup(
        createElement(RemoteControlIndicator, { label: "Off" }),
      ),
    ).toBe("");
  });
});
