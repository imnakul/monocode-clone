// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextMeter } from "./ContextMeter";
import { SessionPane } from "../surfaces/SessionPane";
import { AgentTranscript } from "../surfaces/AgentTranscript";
import {
  buildDeterministicHandoff,
  buildHandoffComposerCard,
  handoffTurnCard,
  sessionThroughTurn,
  wrapHandoffPrompt,
} from "../lib/handoff";
import { appendUser } from "../lib/harness/apply";
import {
  newSession,
  type Session,
} from "../lib/session";

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: () => Promise.resolve(() => {}),
  }),
}));

vi.mock("../lib/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/settings")>()),
  loadFollowUpBehavior: () => "steer",
  loadScrollLockOnSend: () => false,
}));

vi.mock("../lib/voiceInput", () => ({
  voiceInputAvailable: () => false,
  subscribeVoiceInputAvailable: () => () => {},
}));

vi.mock("../lib/fileWatch", () => ({
  subscribeWatchedFiles: () => () => {},
  notifyWatchedFiles: () => {},
  invalidateWatchedFiles: () => {},
}));

vi.mock("../lib/checkpoint", () => ({
  sessionCheckpointStatus: () => Promise.resolve([]),
  subscribeReviewChanged: () => () => {},
  keepSessionChanges: () => Promise.resolve(),
  undoSessionChanges: () => Promise.resolve(),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Handoff production destination Send flow and hook stability", () => {
  it("ContextMeter preserves hook call order when transitioning from empty session to first turn", async () => {
    // Before Send: empty session, blocks is empty, no usage -> hasData is false
    await act(async () => {
      root.render(
        createElement(ContextMeter, {
          harness: "codex",
          model: "codex:default",
          cwd: "/test/project",
          blocks: [],
          usage: undefined,
          turnUsage: undefined,
          sessionUsage: undefined,
        }),
      );
    });
    expect(container.innerHTML).toBe("");

    // After Send: first user block is appended -> hasData becomes true
    const userBlock = {
      id: "u-first",
      role: "user" as const,
      text: "Handoff prompt",
      secondOpinion: {
        kind: "handoff" as const,
        from: "claude" as const,
        to: "codex" as const,
      },
    };

    // Re-rendering must execute without "Rendered more hooks than during the previous render"
    await act(async () => {
      root.render(
        createElement(ContextMeter, {
          harness: "codex",
          model: "codex:default",
          cwd: "/test/project",
          blocks: [userBlock],
          usage: undefined,
          turnUsage: undefined,
          sessionUsage: undefined,
        }),
      );
    });

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("executes full destination Send lifecycle with empty prompt without blank-screen crash", async () => {
    const sourceSession: Session = {
      ...newSession("claude", "/test/project"),
      id: "source-send-1",
      title: "Fix bug",
      blocks: [
        { id: "u1", role: "user", text: "Fix the memory leak in worker" },
        { id: "a1", role: "assistant", text: "I identified the leak in worker pool." },
      ],
    };

    const turn = [sourceSession.blocks[0], sourceSession.blocks[1]];
    const sliced = sessionThroughTurn(sourceSession, turn);
    const brief = buildDeterministicHandoff(sliced);
    const handoffCard = buildHandoffComposerCard({
      from: "claude",
      to: "codex",
      brief,
      userRequest: "Fix the memory leak in worker",
      files: ["src/worker.ts"],
    });

    let currentSession: Session = {
      ...newSession("codex", "/test/project"),
      id: "dest-send-1",
      title: "Handoff",
      handoffCard,
      blocks: [],
    };

    const onSubmitMock = vi.fn((_sessionId, text, _attachments, _options) => {
      const card = handoffTurnCard(handoffCard);
      const cards = { secondOpinion: card };
      currentSession = {
        ...currentSession,
        handoffCard: undefined,
        busy: true,
      };
      // App.onSubmit sends empty text when user does not enter additional text
      currentSession = appendUser(currentSession, text, [], cards);
    });

    const renderPane = async (session: Session): Promise<void> => {
      await act(async () => {
        root.render(
          createElement(SessionPane, {
            session,
            visible: true,
            focused: true,
            inSplit: true,
            composerFocused: true,
            recents: [],
            hideProjectPicker: false,
            onFocus: vi.fn(),
            onClose: vi.fn(),
            onCwdChange: vi.fn(),
            onBranchChange: vi.fn(),
            onModelChange: vi.fn(),
            onModelSettingsChange: vi.fn(),
            onRuntimeModeChange: vi.fn(),
            onSubmit: onSubmitMock,
            onStop: vi.fn(),
            onCompactContext: vi.fn(),
            onPlaceSessionInFolder: vi.fn(),
            onDeleteQueuedMessage: vi.fn(),
            onEditQueuedMessage: vi.fn(),
            onQueuedMessageEditingChange: vi.fn(),
            onSteerQueuedMessage: vi.fn(),
            onResumeQueue: vi.fn(),
            onApproval: vi.fn(),
            onOpenFile: vi.fn(),
            onOpenDiff: vi.fn(),
            onOpenPlan: vi.fn(),
            onBuildPlan: vi.fn(),
            onQuestionReply: vi.fn(),
          }),
        );
      });
    };

    // 1. Initial render: empty destination session in split pane with handoff composer card
    await renderPane(currentSession);
    expect(container.textContent).toContain("Handoff");

    // 2. Click Send with empty text
    const sendButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Send"], button[title="Send"]',
    );
    expect(sendButton).not.toBeNull();
    expect(sendButton?.disabled).toBe(false);

    await act(async () => {
      sendButton?.click();
    });

    expect(onSubmitMock).toHaveBeenCalledTimes(1);
    expect(onSubmitMock).toHaveBeenCalledWith(
      "dest-send-1",
      "",
      [],
      expect.objectContaining({ intent: "default" }),
    );

    // 3. Post-Send render: session now has blocks.length === 1 and busy === true
    await renderPane(currentSession);

    expect(currentSession.blocks.length).toBe(1);
    expect(currentSession.busy).toBe(true);
    expect(container.textContent).toContain("Handoff");
    expect(container.textContent).toContain("Claude");
    expect(container.textContent).toContain("Codex");
  });

  it("renders destination session with added user text and wrapped prompt", async () => {
    const handoffCard = buildHandoffComposerCard({
      from: "claude",
      to: "codex",
      brief: "Recap of task",
      userRequest: "Original user prompt",
      files: [],
    });
    const turnCard = handoffTurnCard(handoffCard);
    const cards = { secondOpinion: turnCard };

    let destinationSession: Session = {
      ...newSession("codex", "/test/project"),
      id: "dest-send-2",
      title: "Handoff",
      handoffCard,
      blocks: [],
    };

    const addedText = "Please check the error handling paths.";
    destinationSession = {
      ...destinationSession,
      handoffCard: undefined,
    };
    destinationSession = appendUser(
      destinationSession,
      addedText,
      [],
      cards,
    );

    await act(async () => {
      root.render(
        createElement(AgentTranscript, {
          blocks: destinationSession.blocks,
          busy: destinationSession.busy,
          visible: true,
          cwd: "/test/project",
          harness: "codex",
        }),
      );
    });

    expect(container.textContent).toContain("Handoff");
    expect(container.textContent).toContain(addedText);

    const wrappedPrompt = wrapHandoffPrompt(
      handoffCard.brief,
      handoffCard.from,
      addedText,
    );
    expect(wrappedPrompt).toContain(addedText);
    expect(wrappedPrompt).toContain("<handoff>\nRecap of task\n</handoff>");
  });
});
