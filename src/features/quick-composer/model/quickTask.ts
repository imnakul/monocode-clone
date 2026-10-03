import type { TaskStatus, TaskUpsert } from "../../tasks/tasks";

/** What the floating composer makes: a session (default) or a Task. */
export type QuickComposerKind = "session" | "task";

const KIND_KEY = "monocode.quickComposer.kind";

/** Task fields the composer collects next to the prompt. */
export type QuickTaskFields = {
  status: TaskStatus;
  /** Local calendar day (`YYYY-MM-DD`) the task is in focus, or null. */
  focusDate: string | null;
  /** Free text: tags separated by spaces or commas, `#` optional. */
  tags: string;
  /** Project path, or null for Personal. */
  projectCwd: string | null;
};

export const EMPTY_QUICK_TASK: QuickTaskFields = {
  status: "todo",
  focusDate: null,
  tags: "",
  projectCwd: null,
};

/** The last kind picked in the floating composer, so it reopens the same way. */
export function loadQuickComposerKind(): QuickComposerKind {
  try {
    return localStorage.getItem(KIND_KEY) === "task" ? "task" : "session";
  } catch {
    return "session";
  }
}

export function saveQuickComposerKind(kind: QuickComposerKind): void {
  try {
    localStorage.setItem(KIND_KEY, kind);
  } catch {
    // Private mode or quota: the composer still works, it just forgets.
  }
}

/** Splits `#bug, windows ui` into `["bug", "windows", "ui"]`. */
export function parseQuickTags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, "").trim())
    .filter(Boolean);
}

/**
 * Builds the `createTask` input from the prompt: the first non-empty line is
 * the title (a leading Markdown heading mark is dropped) and the remaining
 * lines are the description. Returns null when there is no title yet.
 */
export function quickTaskInput(
  prompt: string,
  fields: QuickTaskFields,
): Omit<Partial<TaskUpsert>, "id"> | null {
  const lines = prompt.replace(/\r\n?/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());
  if (titleIndex < 0) return null;
  const title = lines[titleIndex].trim().replace(/^#+\s*/, "");
  if (!title) return null;
  const body = lines
    .slice(titleIndex + 1)
    .join("\n")
    .trim();
  return {
    title,
    body,
    status: fields.status,
    tags: parseQuickTags(fields.tags),
    ...(fields.projectCwd ? { projectCwd: fields.projectCwd } : {}),
    ...(fields.focusDate ? { focusDate: fields.focusDate } : {}),
  };
}
