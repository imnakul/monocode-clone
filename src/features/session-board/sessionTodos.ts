import { prepareAttachments } from "../sessions/model/attachments";
import { applyQuickWorkspace } from "../quick-composer/model/quickWorkspace";
import { quickLaunchAttachments } from "../quick-composer/model/quickAttachments";
import { consumeOperatorCommand } from "../sessions/model/operatorCommand";
import {
  parseQuickLaunch,
  type QuickLaunch,
} from "../quick-composer/model/quickComposer";
import {
  newSession,
  sessionDraftBlock,
  titleFromPrompt,
  type Session,
  type ComposerTurnOptions,
} from "../sessions/model/session";
import { mergeModelSettings, resolveModel } from "../sessions/model/models";
import {
  looksLikeProject,
  isRemoteProjectPath,
} from "../projects/model/recents";
import {
  boardSnapshot,
  hideBoardCards,
  loadBoard,
  observeBoardSessions,
  visibleBoardCards,
  type BoardCard,
  type BoardStatus,
} from "./sessionBoard";
import { gitBranches } from "../../platform/tauri/fs";
import { pathKey } from "../../shared/lib/paths";

export function editableSessionTodo(session: Session): boolean {
  return (
    !!sessionDraftBlock(session) &&
    !session.busy &&
    !session.worktreePreparing &&
    !session.backgroundTasks?.length &&
    !session.pendingSwitch &&
    !session.providerSessionId &&
    !session.orchestrationLeadId &&
    !session.inboxAsk &&
    !session.worktreeRemoved &&
    session.blocks.every((block) => block.role === "user" && block.draft)
  );
}
export function sessionTodoLaunch(session: Session): QuickLaunch {
  if (!editableSessionTodo(session))
    throw new Error("Only an unsent draft session can be edited as a Todo");
  const draft = sessionDraftBlock(session)!;
  return {
    prompt: draft.text,
    cwd: session.cwd,
    harness: session.harness,
    model: session.model,
    modelSettings: session.modelSettings,
    runtimeMode: session.runtimeMode,
    attachments: quickLaunchAttachments(draft.attachments ?? []),
    workspaceMode: session.workspaceMode ?? "current",
    ...(session.worktreeBase ? { worktreeBase: session.worktreeBase } : {}),
    ...(session.worktreeCwd ? { worktreeCwd: session.worktreeCwd } : {}),
    ...(draft.intent ? { intent: draft.intent } : {}),
    draft: true,
    reveal: false,
  };
}
function normalizeTodoLaunch(launch: QuickLaunch) {
  return {
    prompt: launch.prompt,
    cwd: launch.cwd,
    harness: launch.harness,
    model: launch.model,
    modelSettings: Object.fromEntries(
      Object.entries(launch.modelSettings ?? {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
    runtimeMode: launch.runtimeMode,
    attachments: quickLaunchAttachments(launch.attachments ?? []),
    workspaceMode: launch.workspaceMode ?? "current",
    worktreeBase: launch.worktreeBase,
    worktreeCwd: launch.worktreeCwd,
    intent: launch.intent,
  };
}
async function todoRevision(session: Session) {
  const content = JSON.stringify({
    title: session.title,
    draftId: sessionDraftBlock(session)?.id,
    launch: normalizeTodoLaunch(sessionTodoLaunch(session)),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export type SessionTodoHost = {
  read(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  erase(session: Session): Promise<void>;
  open(id: string): Promise<Session | null>;
  submit(
    id: string,
    text: string,
    attachments: NonNullable<QuickLaunch["attachments"]>,
    options: ComposerTurnOptions & { appRequestId?: string },
  ): boolean | Promise<boolean>;
};
/** Per-session serialization protects double starts and concurrent Operator edits. */
export function sessionTodoManager(host: SessionTodoHost) {
  const pending = new Map<string, Promise<unknown>>();
  const startedDrafts = new Set<string>();
  const serialize = <T>(
    id: string,
    operation: () => Promise<T>,
  ): Promise<T> => {
    const next = (pending.get(id) ?? Promise.resolve())
      .catch(() => {})
      .then(operation);
    pending.set(id, next);
    void next
      .finally(() => {
        if (pending.get(id) === next) pending.delete(id);
      })
      .catch(() => {});
    return next;
  };
  const read = async (id: string) => {
    const session = await host.read(id);
    if (!session) throw new Error("Session Manager Todo was not found");
    return session;
  };
  return {
    async list(
      filters: {
        status?: BoardStatus;
        projectCwd?: string;
        query?: string;
      } = {},
    ): Promise<BoardCard[]> {
      await loadBoard();
      const snapshot = boardSnapshot();
      if (!snapshot.ready || snapshot.error)
        throw new Error(
          snapshot.error ?? "Session Manager storage is unavailable",
        );
      return visibleBoardCards(snapshot.cards).filter(
        (card) =>
          (!filters.status || card.status === filters.status) &&
          (!filters.projectCwd ||
            pathKey(card.cwd) === pathKey(filters.projectCwd)) &&
          (!filters.query ||
            [card.title, card.cwd, card.model, card.reason]
              .join(" ")
              .toLowerCase()
              .includes(filters.query.toLowerCase())),
      );
    },
    async read(id: string) {
      const session = await read(id);
      return {
        id,
        title: session.title,
        revision: await todoRevision(session),
        ...sessionTodoLaunch(session),
      };
    },
    write(
      id: string,
      launch: QuickLaunch,
      options: {
        edit?: boolean;
        title?: string;
        expectedRevision?: string;
      } = {},
    ) {
      return serialize(id, async () => {
        if (!/^[A-Za-z0-9_-]{1,256}$/.test(id))
          throw new Error(
            "Invalid Session Manager Todo ID (maximum 256 characters)",
          );
        const parsed = parseQuickLaunch(launch);
        if (
          !parsed ||
          !looksLikeProject(parsed.cwd) ||
          isRemoteProjectPath(parsed.cwd) ||
          !/^(?:[a-z]:[\\/]|\/|\\\\)/i.test(parsed.cwd)
        )
          throw new Error(
            "Choose a local project and a valid prompt or attachments",
          );
        const attachments = await prepareAttachments(parsed.attachments ?? []);
        let branch: string | undefined;
        if (parsed.workspaceMode === "worktree")
          branch = parsed.worktreeBase ?? "HEAD";
        else {
          try {
            branch =
              (await gitBranches(parsed.worktreeCwd ?? parsed.cwd)).current ??
              undefined;
          } catch {
            /* Project folders do not need to be Git repositories. */
          }
        }
        const current = await host.read(id);
        if (options.edit && !current) throw new Error("Todo was not found");
        if (current && !editableSessionTodo(current))
          throw new Error(
            "This session has already started; its conversation cannot be overwritten",
          );
        if (
          current &&
          options.expectedRevision &&
          (await todoRevision(current)) !== options.expectedRevision
        )
          throw new Error(
            "This Todo changed while you were editing. Reopen it before saving.",
          );
        if (current && !options.edit) {
          const existing = sessionTodoLaunch(current);
          const expected = normalizeTodoLaunch({
            ...launch,
            model: parsed.model ?? current.model,
            runtimeMode: parsed.runtimeMode ?? current.runtimeMode,
            modelSettings: mergeModelSettings(
              resolveModel(parsed.harness, parsed.model ?? current.model),
              parsed.modelSettings ?? {},
            ),
          });
          if (
            JSON.stringify(normalizeTodoLaunch(existing)) !==
              JSON.stringify(expected) ||
            (options.title && options.title !== current.title)
          )
            throw new Error("Request ID already belongs to a different Todo");
          await observeBoardSessions([current]);
          return { id, ...existing };
        }
        const base =
          current ??
          newSession(
            parsed.harness,
            parsed.cwd,
            parsed.model,
            parsed.runtimeMode,
          );
        const session = applyQuickWorkspace(
          {
            ...base,
            id,
            cwd: parsed.cwd,
            harness: parsed.harness,
            model: parsed.model ?? base.model,
            runtimeMode: parsed.runtimeMode ?? base.runtimeMode,
            workspaceMode: undefined,
            worktreeBase: undefined,
            worktreeCwd: undefined,
            branch,
          },
          parsed,
        );
        session.modelSettings = mergeModelSettings(
          resolveModel(session.harness, session.model),
          parsed.modelSettings ?? {},
        );
        const oldDraft = current && sessionDraftBlock(current);
        session.blocks = [
          {
            id: oldDraft?.id ?? crypto.randomUUID(),
            role: "user",
            text: parsed.prompt,
            ...(attachments.length ? { attachments } : {}),
            draft: true,
            appRequestId: id,
            ...(launch.intent ? { intent: launch.intent } : {}),
          },
        ];
        session.title =
          options.title ??
          titleFromPrompt(parsed.prompt, session.harness, attachments);
        await host.save(session);
        await observeBoardSessions([session]);
        return { id, ...sessionTodoLaunch(session) };
      });
    },
    start(id: string, operator = false) {
      return serialize(id, async () => {
        const session = await host.open(id);
        if (!session) throw new Error("Todo was not found");
        const draft = sessionDraftBlock(session);
        if (!draft) {
          if (
            session.blocks.some(
              (block) => block.role === "user" && !block.draft,
            )
          )
            return { id, started: true, alreadyStarted: true };
          throw new Error("This session has no Todo draft to start");
        }
        const startKey = `${id}:${draft.id}`;
        if (startedDrafts.has(startKey))
          return { id, started: true, alreadyStarted: true };
        if (
          session.busy ||
          session.worktreePreparing ||
          session.pendingSwitch ||
          session.worktreeRemoved
        )
          throw new Error("Session is busy or unavailable");
        if (operator && consumeOperatorCommand(draft.text).matched)
          throw new Error(
            "App calls cannot enable /operator in another session",
          );
        const attachments = await prepareAttachments(draft.attachments ?? []);
        const latest = await host.read(id);
        if (
          !latest ||
          latest.busy ||
          sessionDraftBlock(latest)?.id !== draft.id ||
          sessionDraftBlock(latest)?.text !== draft.text
        )
          throw new Error(
            "This Todo changed before it could start; refresh Session Manager",
          );
        const accepted = await host.submit(id, draft.text, attachments, {
          draftBlockId: draft.id,
          ...(draft.appRequestId ? { appRequestId: draft.appRequestId } : {}),
          ...(draft.intent ? { intent: draft.intent } : {}),
        });
        if (!accepted)
          throw new Error(
            "The session could not start. Its Todo draft has been retained.",
          );
        startedDrafts.add(startKey);
        return { id, started: true, alreadyStarted: false };
      });
    },
    delete(id: string) {
      return serialize(id, async () => {
        const session = await host.read(id);
        if (!session) {
          await loadBoard();
          const card = boardSnapshot().cards.find(
            (row) => row.sessionId === id && row.status === "todo",
          );
          if (card) await hideBoardCards([card]);
          return { id, deleted: true };
        }
        if (!editableSessionTodo(session))
          throw new Error(
            "Only an unsent Todo can be deleted; remove terminal cards from the board instead",
          );
        await observeBoardSessions([session]);
        const card = boardSnapshot().cards.find((row) => row.sessionId === id);
        await host.erase(session);
        if (card) await hideBoardCards([card]);
        return { id, deleted: true };
      });
    },
    async remove(id: string, runId: string) {
      await loadBoard();
      const card = boardSnapshot().cards.find((row) => row.sessionId === id);
      if (!card || card.runId !== runId)
        throw new Error(
          "The board run changed; refresh Session Manager before removing it",
        );
      if (card.status !== "done" && card.status !== "stopped")
        throw new Error(
          "Only done or stopped cards can be removed by Operator",
        );
      await hideBoardCards([card]);
      return { id, removed: true };
    },
    async clear(status: "done" | "stopped", projectCwd?: string) {
      const cards = await this.list({ status, projectCwd });
      await hideBoardCards(cards);
      return { removed: cards.length };
    },
  };
}
