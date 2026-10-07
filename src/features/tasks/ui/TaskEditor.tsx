import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  Copy,
  Target,
  Trash2,
} from "../../../shared/ui/icons";
import { projectName } from "../../../shared/lib/paths";
import { copyText } from "../../../platform/tauri/clipboard";
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
import {
  taskMarkdown,
  updateTask,
  type Task,
  type TaskChanges,
} from "../tasks";
import { useLocalDay } from "../../../shared/hooks/useLocalDay";
import { TaskStatusMenu } from "./TaskStatusIcon";
import { relativeTime, TaskFocusChip, TaskProjectMark } from "./TaskTags";
import { TaskTimeline } from "./TaskTimeline";

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
  /** A brand-new task: put the cursor in the title, not the description. */
  autoFocusTitle?: boolean;
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
  autoFocusTitle = false,
}: TaskEditorProps) {
  const [copied, setCopied] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleFocused = useRef(false);
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
  const focusDate =
    edits.focusDate === null ? undefined : (edits.focusDate ?? task.focusDate);
  const today = useLocalDay();
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
      const saved = await updateTask(task.id, snapshot);
      // Keep every edit until the task shown here has caught up (the effect
      // below drops it): clearing it now would show the old value until the
      // list refresh lands, then jump the caret to the end.
      let remaining: TaskChanges = { ...editsRef.current };
      for (const key of Object.keys(snapshot) as (keyof TaskChanges)[]) {
        if (remaining[key] !== snapshot[key]) continue; // typed again since
        // The typed title stays while the field has focus ("Fix the " is
        // saved as "Fix the"); blur normalises it.
        if (key === "title" && titleFocused.current) continue;
        const stored = shownValue(saved, key);
        // Fields this editor does not show are done once saved.
        if (!stored) delete remaining[key];
        // Otherwise show what was stored (it may be normalised).
        else remaining = { ...remaining, [key]: stored.value };
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
  // Drop an edit once the task prop shows the same value.
  useEffect(() => {
    const current = editsRef.current;
    const keys = (Object.keys(current) as (keyof TaskChanges)[]).filter(
      (key) => {
        if (key === "title" && titleFocused.current) return false;
        const shown = shownValue(task, key);
        return !!shown && sameChange(current[key], shown.value);
      },
    );
    if (!keys.length) return;
    const next = { ...current };
    for (const key of keys) delete next[key];
    editsRef.current = next;
    setEdits(next);
  }, [task]);
  const edit = (changes: TaskChanges, immediate = false) => {
    editsRef.current = { ...editsRef.current, ...changes };
    setEdits(editsRef.current);
    clearTimeout(timer.current);
    if (immediate) void save();
    else timer.current = setTimeout(() => void save(), 400);
  };
  useEffect(() => {
    if (!autoFocusTitle) return;
    const frame = requestAnimationFrame(() => {
      const field = titleRef.current;
      if (!field) return;
      field.focus({ preventScroll: true });
      // "Untitled" is a placeholder title: typing replaces it.
      field.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocusTitle, task.id]);
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
  const iconClass =
    "grid size-7 shrink-0 place-items-center rounded-md text-content/55 transition-colors duration-100 hover:bg-content/10 hover:text-content disabled:opacity-40";
  const remove = async () => {
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
  };
  const copy = async () => {
    setActionError(null);
    try {
      await copyText(
        taskMarkdown(
          {
            ...task,
            title,
            body,
            tags,
            status,
            projectCwd: project,
            focusDate,
          },
          projectName,
        ),
      );
      setCopied(true);
      window.setTimeout(() => {
        if (alive.current) setCopied(false);
      }, 1500);
    } catch (error) {
      setActionError(message(error));
    }
  };

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
            <span className="ml-auto flex items-center gap-0.5">
              <TaskFocusChip
                task={{ ...task, focusDate }}
                today={today}
                className="mr-1"
              />
              <button
                type="button"
                aria-pressed={focusDate === today}
                aria-label={
                  focusDate === today
                    ? "Remove from today's focus"
                    : "Focus today"
                }
                title={
                  focusDate === today
                    ? "Remove from today's focus"
                    : "Focus today"
                }
                onClick={() =>
                  edit(
                    {
                      focusDate: focusDate === today ? null : today,
                      today,
                    },
                    true,
                  )
                }
                className={`${iconClass} ${focusDate === today ? "text-amber-300" : ""}`}
              >
                <Target aria-hidden className="size-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label={copied ? "Task copied" : "Copy task as Markdown"}
                title={
                  copied
                    ? "Copied"
                    : "Copy task (title, status, tags, date, description)"
                }
                onClick={() => void copy()}
                className={iconClass}
              >
                {copied ? (
                  <Check
                    aria-hidden
                    className="size-3.5 text-emerald-400"
                    strokeWidth={2}
                  />
                ) : (
                  <Copy aria-hidden className="size-3.5" strokeWidth={1.75} />
                )}
              </button>
              <button
                type="button"
                aria-label="Delete task"
                title="Delete task"
                disabled={deleting}
                onClick={() => void remove()}
                className={`${iconClass} hover:text-red-400`}
              >
                <Trash2 aria-hidden className="size-3.5" strokeWidth={1.75} />
              </button>
            </span>
          </div>
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => edit({ title: event.target.value })}
            onFocus={() => {
              titleFocused.current = true;
            }}
            onBlur={() => {
              titleFocused.current = false;
              const typed = editsRef.current.title;
              if (typed !== undefined && typed.trim() !== typed)
                edit({ title: typed.trim() }, true);
              else void save();
            }}
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
          {task.sourceSessionId ? (
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
            </div>
          ) : null}
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
            autoFocus={!autoFocusTitle && !body.trim()}
            label="Task Markdown"
            onChange={(next) => edit({ body: next })}
          />
        ) : body.trim() ? (
          <AgentMarkdown text={body} cwd={project} hardBreaks />
        ) : (
          <p className="text-[13px] text-content/45">No description</p>
        )}
        <TaskTimeline task={task} today={today} />
      </div>
    </div>
  );
}

/**
 * The value the editor shows for one field, as `TaskChanges` would hold it
 * (cleared fields are null), or null for fields the editor does not show.
 */
function shownValue(
  task: Task,
  key: keyof TaskChanges,
): { value: TaskChanges[keyof TaskChanges] } | null {
  switch (key) {
    case "title":
      return { value: task.title };
    case "body":
      return { value: task.body };
    case "status":
      return { value: task.status };
    case "tags":
      return { value: task.tags };
    case "projectCwd":
      return { value: task.projectCwd ?? null };
    case "focusDate":
      return { value: task.focusDate ?? null };
    default:
      return null;
  }
}

function sameChange(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
