import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Trash2 } from "../../../shared/ui/icons";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import {
  looksLikeProject,
  type RecentProject,
} from "../../projects/model/recents";
import { SearchableProjectPicker } from "../../projects/ui/SearchableProjectPicker";
import { useProjectMarks } from "../../projects/ui/ProjectMark";
import { NoteSource, NoteTagsEditor } from "../../notes/ui/NotesView";
import { AgentMarkdown } from "../../sessions/ui/AgentMarkdown";
import { MarkdownDetailTabs } from "../../sessions/ui/MarkdownDetailTabs";
import { useMarkdownMode } from "../../sessions/ui/MarkdownModeToggle";
import { updateTask, type Task, type TaskChanges } from "../tasks";
import { TaskStatusMenu } from "./TaskStatusIcon";
import { relativeTime, TaskProjectMark } from "./TaskTags";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type TaskEditorProps = {
  task: Task;
  /** `full` fills the workspace tab; `compact` fits the peek pane. */
  variant: "full" | "compact";
  recents: RecentProject[];
  cwd?: string;
  onDelete: (id: string) => Promise<void>;
  onOpenSource: (sessionId: string, blockId?: string) => void | Promise<void>;
  onOpenBeside?: (task: Task) => void;
};

/**
 * Edits one task. Changes are sent as partial `updateTask` calls (never a full
 * record), debounced 400 ms and flushed on unmount.
 */
export function TaskEditor({
  task,
  variant,
  recents,
  cwd,
  onDelete,
  onOpenSource,
  onOpenBeside,
}: TaskEditorProps) {
  const [edits, setEdits] = useState<TaskChanges>({});
  const editsRef = useRef<TaskChanges>({});
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const source = useRef<HTMLTextAreaElement>(null);
  const lock = useLockOverscroll<HTMLDivElement>();
  const marks = useProjectMarks();
  const [mode, setMode] = useMarkdownMode(`task:${task.id}`);
  const title = edits.title ?? task.title;
  const body = edits.body ?? task.body;
  const tags = edits.tags ?? task.tags;
  const status = edits.status ?? task.status;
  const project =
    edits.projectCwd === null
      ? undefined
      : (edits.projectCwd ?? task.projectCwd);
  const updated = relativeTime(task.updatedAt);
  const completed = relativeTime(task.completedAt);
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    const snapshot = editsRef.current;
    if (!Object.keys(snapshot).length || deletingRef.current) return;
    try {
      await updateTask(task.id, snapshot);
      const remaining = { ...editsRef.current };
      for (const key of Object.keys(snapshot) as (keyof TaskChanges)[]) {
        if (remaining[key] === snapshot[key]) delete remaining[key];
      }
      editsRef.current = remaining;
      if (alive.current) {
        setEdits(remaining);
        setError(null);
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    }
  }, [task.id]);
  const edit = (changes: TaskChanges, immediate = false) => {
    editsRef.current = { ...editsRef.current, ...changes };
    setEdits(editsRef.current);
    clearTimeout(timer.current);
    if (immediate) void save();
    else timer.current = setTimeout(() => void save(), 400);
  };
  useEffect(() => {
    alive.current = true;
    if (!task.body.trim() && task.title === "Untitled") setMode("source");
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      void save();
    };
    // The editor is keyed by task ID; changing its saved fields must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const outer =
    variant === "full"
      ? "mx-auto flex w-full max-w-5xl flex-col gap-5 px-8 py-8"
      : "flex flex-col gap-4 px-6 py-5";
  const actionClass =
    "inline-flex items-center gap-1.5 rounded-md px-3 h-7 text-[12px] text-content/70 hover:bg-content/10 hover:text-content";

  return (
    <div
      ref={lock}
      className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none select-text"
    >
      <div className={outer}>
        <header className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-content/50">
            <CheckCircle className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span>Task</span>
            <TaskProjectMark task={{ projectCwd: project }} marks={marks} />
            <SearchableProjectPicker
              cwd={project ?? "~"}
              recents={recents}
              railCwd={cwd}
              mode="move"
              itemKind="task"
              buttonClassName="px-1.5"
              onSelectProject={(path) =>
                edit({ projectCwd: looksLikeProject(path) ? path : null }, true)
              }
            />
            <TaskStatusMenu
              status={status}
              onChange={(next) => edit({ status: next }, true)}
            />
          </div>
          <input
            value={title}
            onChange={(event) => edit({ title: event.target.value })}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.currentTarget.blur();
            }}
            aria-label="Task title"
            maxLength={200}
            placeholder="Untitled"
            className="w-full border-0 bg-transparent p-0 text-[20px] font-semibold leading-tight text-content outline-none placeholder:text-content/35"
          />
          {updated || completed ? (
            <div className="flex flex-wrap items-center gap-x-3 text-[12px] text-content/50">
              {updated ? <span>Updated {updated}</span> : null}
              {completed ? <span>Completed {completed}</span> : null}
            </div>
          ) : null}
          <NoteTagsEditor
            label="Add task tag"
            tags={tags}
            onChange={(next) => edit({ tags: next })}
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {task.sourceSessionId ? (
              <button
                type="button"
                className={actionClass}
                onClick={async () => {
                  setActionError(null);
                  try {
                    await onOpenSource(
                      task.sourceSessionId!,
                      task.sourceBlockId,
                    );
                  } catch (error) {
                    if (alive.current) setActionError(message(error));
                  }
                }}
              >
                Open source session
              </button>
            ) : null}
            {onOpenBeside ? (
              <button
                type="button"
                className={actionClass}
                onClick={() => onOpenBeside(task)}
              >
                Open beside session
              </button>
            ) : null}
            <button
              type="button"
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md px-3 h-7 text-[12px] text-content/70 hover:bg-content/10 hover:text-red-400 disabled:opacity-40"
              onClick={async () => {
                deletingRef.current = true;
                setDeleting(true);
                clearTimeout(timer.current);
                try {
                  await onDelete(task.id);
                } catch (error) {
                  deletingRef.current = false;
                  if (alive.current) {
                    setDeleting(false);
                    setActionError(message(error));
                  }
                }
              }}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
              Delete
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 text-[12px] text-red-400/90"
            >
              <span>Could not save task: {error}</span>
              <button
                type="button"
                className="shrink-0 underline hover:no-underline"
                onClick={() => void save()}
              >
                Retry
              </button>
            </div>
          ) : null}
          {actionError ? (
            <div role="alert" className="text-[12px] text-red-400/90">
              {actionError}
            </div>
          ) : null}
        </header>
        <MarkdownDetailTabs
          mode={mode}
          onChange={setMode}
          markdown={body}
          label="Task sections"
        />
        {mode === "source" ? (
          <NoteSource
            value={body}
            textareaRef={source}
            autoFocus={!body.trim()}
            label="Task Markdown"
            onChange={(next) => edit({ body: next })}
          />
        ) : body.trim() ? (
          <AgentMarkdown text={body} cwd={project} hardBreaks />
        ) : (
          <p className="text-[13px] text-content/45">No description</p>
        )}
      </div>
    </div>
  );
}
