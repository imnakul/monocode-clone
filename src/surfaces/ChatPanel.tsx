import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronRight, Plus } from "../chrome/icons";
import { ExplorerMenu, type ExplorerMenuItem } from "../chrome/ExplorerMenu";
import { SessionCard, SessionRenameRow } from "../chrome/SessionCard";
import {
  addSessionToFolder,
  applySessionListDrop,
  buildSessionList,
  createFolderWithSessions,
  dissolveFolder,
  folderContaining,
  groupSessionListEntries,
  loadSessionFolders,
  removeSessionFromFolder,
  renameFolder,
  saveSessionFolders,
  ungroupedSessions,
  type SessionFolder,
  type SessionListDropTarget,
} from "../lib/sessionFolders";
import type { SessionSummary } from "../lib/sessionStore";

type Props = {
  chats: SessionSummary[];
  sidechats?: SessionSummary[];
  activeSessionId?: string;
  busySessionIds?: Set<string>;
  approvalSessionIds?: Set<string>;
  unseenFinishedIds?: Set<string>;
  creating: boolean;
  error: string | null;
  onSelect: (sessionId: string) => void;
  onPin?: (sessionId: string, pinned: boolean) => void;
  onRename?: (sessionId: string, title: string) => void;
  onDelete?: (sessionId: string) => void;
  onNew: () => void;
  onSelectSidechat?: (sessionId: string) => void;
};

/** Storage key for chat folders. Bare (not a path) so every scratch chat
 * shares one folder store instead of fragmenting per directory. */
const CHAT_FOLDERS_KEY = "chats";

/** Chat mode: projectless chats only, no workspace chrome. Folders reuse the
 * project session-folder store and list builder; only the chrome is lighter
 * (no custom colors, no drag — moves happen through the row menu). */
export function ChatPanel({
  chats,
  sidechats = [],
  activeSessionId,
  busySessionIds,
  approvalSessionIds,
  unseenFinishedIds,
  creating,
  error,
  onSelect,
  onPin,
  onRename,
  onDelete,
  onNew,
  onSelectSidechat,
}: Props) {
  const [folders, setFolders] = useState<SessionFolder[]>(() =>
    loadSessionFolders(CHAT_FOLDERS_KEY),
  );
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const [folderMenu, setFolderMenu] = useState<{
    x: number;
    y: number;
    folderId: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(
    null,
  );
  const [sessionDrop, setSessionDrop] =
    useState<SessionListDropTarget | null>(null);
  const now = Date.now();

  const commitFolders = (next: SessionFolder[]) => {
    setFolders(next);
    saveSessionFolders(CHAT_FOLDERS_KEY, next);
  };

  const isSessionDrop = (kind: "folder" | "session", id: string) =>
    sessionDrop?.kind === kind && sessionDrop.id === id;

  const onSessionListDrop = (
    draggedId: string,
    target: SessionListDropTarget,
  ) => {
    const { folders: next, createdId } = applySessionListDrop(
      folders,
      draggedId,
      target,
    );
    if (next === folders && !createdId) return;
    commitFolders(next);
    if (createdId) setRenamingFolderId(createdId);
  };

  const ungrouped = useMemo(
    () => ungroupedSessions(chats, folders),
    [chats, folders],
  );
  const entries = useMemo(
    () => buildSessionList(chats, folders, ungrouped),
    [chats, folders, ungrouped],
  );
  const groupedEntries = useMemo(
    () => groupSessionListEntries(entries),
    [entries],
  );

  const menuChat = menu
    ? chats.find((chat) => chat.id === menu.sessionId)
    : undefined;
  const menuFolderId = menu
    ? folderContaining(folders, menu.sessionId)?.id
    : undefined;
  const menuItems: ExplorerMenuItem[] = [
    ...(onPin
      ? [
          {
            kind: "item" as const,
            id: "pin",
            label: menuChat?.pinned ? "Unpin" : "Pin",
          },
        ]
      : []),
    ...(onRename
      ? [
          {
            kind: "item" as const,
            id: "rename",
            label: "Rename",
            shortcut: "F2",
          },
        ]
      : []),
    { kind: "sep" as const },
    {
      kind: "item" as const,
      id: "folder-new",
      label: "New folder",
    },
    ...folders.map((folder) => ({
      kind: "item" as const,
      id: `folder-add:${folder.id}`,
      label: `Move to ${folder.name}`,
      checked: menuFolderId === folder.id,
    })),
    ...(menuFolderId
      ? [
          {
            kind: "item" as const,
            id: "folder-remove",
            label: "Remove from folder",
          },
        ]
      : []),
    ...(onDelete ? [{ kind: "sep" as const }] : []),
    ...(onDelete
      ? [
          {
            kind: "item" as const,
            id: "delete",
            label: "Delete",
            shortcut: "⌫",
            danger: true,
          },
        ]
      : []),
  ];

  const onPick = (id: string) => {
    if (!menu) return;
    const sessionId = menu.sessionId;
    const pinned = !!menuChat?.pinned;
    setMenu(null);
    if (id === "pin") {
      onPin?.(sessionId, !pinned);
      return;
    }
    if (id === "rename") {
      setRenamingId(sessionId);
      return;
    }
    if (id === "folder-new") {
      const { folders: next, id: createdId } = createFolderWithSessions(
        folders,
        [sessionId],
      );
      if (!createdId) return;
      commitFolders(next);
      setRenamingFolderId(createdId);
      return;
    }
    if (id.startsWith("folder-add:")) {
      commitFolders(
        addSessionToFolder(folders, id.slice("folder-add:".length), sessionId),
      );
      return;
    }
    if (id === "folder-remove") {
      commitFolders(removeSessionFromFolder(folders, sessionId));
      return;
    }
    if (id === "delete") {
      onDelete?.(sessionId);
    }
  };

  const onFolderPick = (folderId: string, id: string) => {
    setFolderMenu(null);
    if (id === "rename") {
      setRenamingFolderId(folderId);
      return;
    }
    if (id === "ungroup") {
      commitFolders(dissolveFolder(folders, folderId));
    }
  };

  const onRowContextMenu = (
    sessionId: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setFolderMenu(null);
    setMenu({ x: event.clientX, y: event.clientY, sessionId });
  };

  const onFolderContextMenu = (
    folderId: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu(null);
    setFolderMenu({ x: event.clientX, y: event.clientY, folderId });
  };

  const renderCard = (chat: SessionSummary) =>
    renamingId === chat.id && onRename ? (
      <SessionRenameRow
        session={chat}
        isActive={chat.id === activeSessionId}
        busy={busySessionIds?.has(chat.id) ?? false}
        needsApproval={approvalSessionIds?.has(chat.id) ?? false}
        onCommit={(title) => {
          onRename(chat.id, title);
          setRenamingId(null);
        }}
        onCancel={() => setRenamingId(null)}
      />
    ) : (
      <SessionCard
        session={chat}
        isActive={chat.id === activeSessionId}
        busy={busySessionIds?.has(chat.id) ?? false}
        done={unseenFinishedIds?.has(chat.id) ?? false}
        needsApproval={approvalSessionIds?.has(chat.id) ?? false}
        dropTarget={isSessionDrop("session", chat.id)}
        now={now}
        onSelect={onSelect}
        onListDrop={onSessionListDrop}
        onListDropTargetChange={setSessionDrop}
        onContextMenu={(event) => onRowContextMenu(chat.id, event)}
        onRename={onRename ? () => setRenamingId(chat.id) : undefined}
        onDelete={onDelete ? () => onDelete(chat.id) : undefined}
      />
    );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-content/10 px-3">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          Chats
        </span>
        <button
          type="button"
          title="New chat"
          aria-label="New chat"
          disabled={creating}
          onClick={onNew}
          className="grid size-6 shrink-0 place-items-center rounded-md text-content/45 hover:bg-content/10 hover:text-content disabled:opacity-40"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      {error ? (
        <p
          role="alert"
          className="shrink-0 px-3 py-1.5 text-[12px] text-red-400/90"
        >
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none p-1.5">
        {sidechats.length > 0 ? (
          <div className="mb-1">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-content/40">
              Sidechats
            </p>
            <ul data-shared-hover-continuity className="flex flex-col gap-0.5">
              {sidechats.map((chat) => (
                <li key={chat.id}>
                  <SessionCard
                    session={chat}
                    isActive={chat.id === activeSessionId}
                    busy={busySessionIds?.has(chat.id) ?? false}
                    done={false}
                    needsApproval={
                      approvalSessionIds?.has(chat.id) ?? false
                    }
                    now={now}
                    onSelect={(sessionId) =>
                      onSelectSidechat?.(sessionId)
                    }
                    onContextMenu={(event) => {
                      // Temporary rows have no record to pin, rename, or
                      // delete — swallow the gesture instead of showing the
                      // browser menu over a dead end.
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {entries.length === 0 && sidechats.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-content/50">
            No chats yet. Start one above — chats live outside any project and
            resume anytime.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {groupedEntries.map((group) => {
              if (group.kind === "divider") {
                return (
                  <li
                    key={group.key}
                    aria-hidden
                    className="mx-1 my-1 list-none"
                  >
                    <div className="h-px bg-content/10" />
                  </li>
                );
              }
              if (group.kind === "folder") {
                return (
                  <li key={group.entry.folder.id}>
                    <ChatFolderGroup
                      folder={group.entry.folder}
                      sessions={group.entry.sessions}
                      dropTarget={isSessionDrop("folder", group.entry.folder.id)}
                      renaming={renamingFolderId === group.entry.folder.id}
                      onToggle={() =>
                        commitFolders(
                          folders.map((folder) =>
                            folder.id === group.entry.folder.id
                              ? { ...folder, collapsed: !folder.collapsed }
                              : folder,
                          ),
                        )
                      }
                      onContextMenu={(event) =>
                        onFolderContextMenu(group.entry.folder.id, event)
                      }
                      onRename={() => setRenamingFolderId(group.entry.folder.id)}
                      onCommitRename={(name) => {
                        commitFolders(
                          renameFolder(folders, group.entry.folder.id, name),
                        );
                        setRenamingFolderId(null);
                      }}
                      onCancelRename={() => setRenamingFolderId(null)}
                      renderCard={renderCard}
                    />
                  </li>
                );
              }
              return (
                <li key={group.key} className="list-none">
                  <ul
                    data-shared-hover-continuity
                    className="flex flex-col gap-0.5"
                  >
                    {group.sessions.map((item) => (
                      <li key={item.session.id}>{renderCard(item.session)}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {menu ? (
        <ExplorerMenu
          x={menu.x}
          y={menu.y}
          ariaLabel="Chat actions"
          items={menuItems}
          onPick={onPick}
          onClose={() => setMenu(null)}
        />
      ) : null}
      {folderMenu ? (
        <ExplorerMenu
          x={folderMenu.x}
          y={folderMenu.y}
          ariaLabel="Folder actions"
          items={[
            { kind: "item" as const, id: "rename", label: "Rename" },
            { kind: "item" as const, id: "ungroup", label: "Ungroup" },
          ]}
          onPick={(id) => onFolderPick(folderMenu.folderId, id)}
          onClose={() => setFolderMenu(null)}
        />
      ) : null}
    </div>
  );
}

function ChatFolderGroup({
  folder,
  sessions,
  dropTarget,
  renaming,
  onToggle,
  onContextMenu,
  onRename,
  onCommitRename,
  onCancelRename,
  renderCard,
}: {
  folder: SessionFolder;
  sessions: SessionSummary[];
  renaming: boolean;
  onToggle: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  renderCard: (session: SessionSummary) => ReactNode;
  dropTarget?: boolean;
}) {
  return (
    <div
      data-session-folder={folder.id}
      className={`relative ${folder.collapsed ? "" : "mb-1.5"}`}
    >
      {dropTarget ? (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-md bg-accent/20" />
      ) : null}
      <div className="overflow-hidden rounded-md bg-content/5">
        {renaming ? (
          <FolderRenameInput
            name={folder.name}
            memberCount={sessions.length}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
          />
        ) : (
          <button
            type="button"
            aria-expanded={!folder.collapsed}
            aria-label={`${folder.collapsed ? "Expand" : "Collapse"} folder ${folder.name}`}
            onContextMenu={onContextMenu}
            onKeyDown={(event) => {
              if (event.key === "F2") {
                event.preventDefault();
                onRename();
              }
            }}
            onClick={onToggle}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-content/80 hover:bg-content/5 hover:text-content"
          >
            {folder.collapsed ? (
              <ChevronRight className="size-3.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="size-3.5 shrink-0" strokeWidth={1.75} />
            )}
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
              {folder.name}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-content/40">
              {sessions.length}
            </span>
          </button>
        )}
      </div>
      {folder.collapsed ? null : (
        <ul
          data-shared-hover-continuity
          className="mt-0.5 flex flex-col gap-0.5 pl-2"
        >
          {sessions.map((session) => (
            <li key={session.id}>{renderCard(session)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FolderRenameInput({
  name,
  memberCount,
  onCommit,
  onCancel,
}: {
  name: string;
  memberCount: number;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const [value, setValue] = useState(name);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (success: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (success && value.trim()) onCommit(value.trim());
    else onCancel();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5">
      <span className="shrink-0 text-[11px] tabular-nums text-content/40">
        {memberCount}
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={onKeyDown}
        aria-label="Folder name"
        className="w-full rounded bg-content/10 px-2 py-1 text-[12px] font-medium text-content outline-none ring-1 ring-accent/40"
      />
    </div>
  );
}
