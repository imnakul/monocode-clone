import { isHarnessAvailable } from "../../../integrations/harness/core/availability";
import { isBoardStatus } from "../../session-board/sessionBoard";
import type { sessionTodoManager } from "../../session-board/sessionTodos";
import { parseQuickAttachments } from "../../quick-composer/model/quickAttachments";

import { looksLikeProject } from "../../projects/model/recents";
import {
  mergeModelSettings,
  modelEffortSetting,
  modelsFor,
  preferredModelId,
  resolveModel,
} from "../../sessions/model/models";
import {
  HARNESSES,
  RUNTIME_MODE_HINT,
  RUNTIME_MODE_LABEL,
  RUNTIME_MODES,
  type HarnessId,
  type Session,
} from "../../sessions/model/session";
import {
  loadSessionFolders,
  placeSessionInFolder,
  saveSessionFolders,
} from "../../sessions/model/sessionFolders";
import {
  normalizeNoteTags,
  noteTitle,
  type Note,
  type NoteUpsert,
} from "../../notes";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";
import type { Worktree, Worktrees } from "../../source-control/model/worktrees";
import { pathKey } from "../../../shared/lib/paths";
import type { SplitDir } from "../../workspace/model/layout";
import { consumeOperatorCommand } from "../../sessions/model/operatorCommand";
import { sessionConversationPage } from "./sessionConversation";

export type AppSessionListing = {
  id: string;
  title: string;
  harness: HarnessId;
  model: string;
  busy: boolean;
  hasDraft: boolean;
};

export type AppSessionPlacement = {
  direction: SplitDir;
  besideSessionId: string;
};

export type AgentAppHost = {
  sessionManager?: ReturnType<typeof sessionTodoManager>;
  start(
    launch: QuickLaunch,
    id: string,
    placement?: AppSessionPlacement,
  ): Promise<void>;
  sessions(cwd: string): Promise<AppSessionListing[]>;
  session(id: string): Promise<Session | null>;
  send(
    id: string,
    prompt: string,
    requestId: string,
  ): Promise<{ alreadySubmitted: boolean }>;
  draft(
    id: string,
    prompt: string,
    requestId: string,
  ): Promise<{ alreadySaved: boolean; draft: boolean }>;
  worktrees(cwd: string): Promise<Worktrees>;
  createWorktree(
    cwd: string,
    branch: string,
    base: string,
    existing: boolean,
  ): Promise<Worktree>;
  notes(): Promise<Note[]>;
  note(id: string): Promise<Note | null>;
  saveNote(note: NoteUpsert): Promise<Note>;
};

const FIELDS = new Map<string, readonly string[]>([
  ["session_manager.list", ["status", "projectCwd", "query", "limit", "offset"]],
  ["session_manager.read", ["id"]],
  ["session_manager.write", ["id", "title", "projectCwd", "prompt", "harness", "model", "modelSettings", "effort", "runtimeMode", "attachments", "workspaceMode", "worktreeBase", "worktreeCwd"]],
  ["session_manager.start", ["id"]],
  ["session_manager.delete", ["id"]],
  ["session_manager.remove", ["id", "runId"]],
  ["session_manager.clear", ["status", "projectCwd"]],
  ["models.list", []],
  ["sessions.list", []],
  ["sessions.read", ["sessionId", "before", "limit", "maxChars"]],
  ["sessions.send", ["sessionId", "prompt"]],
  ["sessions.draft", ["sessionId", "prompt"]],
  [
    "sessions.start",
    [
      "prompt",
      "draft",
      "harness",
      "model",
      "modelSettings",
      "effort",
      "runtimeMode",
      "reveal",
      "workspaceMode",
      "worktreeBase",
      "worktreeCwd",
      "placement",
      "besideSessionId",
    ],
  ],
  ["worktrees.list", []],
  ["worktrees.create", ["branch", "base", "existing"]],
  ["folders.list", []],
  ["folders.move", ["sessionId", "folderId", "newFolderName"]],
  ["notes.list", ["limit", "offset"]],
  ["notes.read", ["id"]],
  ["notes.write", ["id", "title", "body", "tags"]],
]);

function fields(action: string, input: Record<string, unknown>) {
  const allowed = FIELDS.get(action);
  if (!allowed) throw new Error(`Unknown app action: ${action}`);
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length)
    throw new Error(`Unknown ${action} fields: ${unknown.join(", ")}`);
}

function managerId(value: unknown): string {
  const id = requiredString(value, "id", 256);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Invalid task/session ID");
  return id;
}
function managerProject(value: unknown): string | null {
  if (value === null) return null;
  const path = requiredString(value, "projectCwd", 4096);
  if (new TextEncoder().encode(path).length > 4096 || /[\u0000-\u001f\u007f]/.test(path) || !looksLikeProject(path))
    throw new Error("projectCwd must be a project path, or null for Personal");
  return path;
}

function requiredString(value: unknown, name: string, max = 30_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(
      `${name} must be a non-empty string under ${max} characters`,
    );
  return value.trim();
}

function agentPrompt(value: unknown): string {
  const prompt = requiredString(value, "prompt", 240_000);
  if (consumeOperatorCommand(prompt).matched)
    throw new Error("App calls cannot enable /operator in another session");
  return prompt;
}

function optionalString(
  value: unknown,
  name: string,
  max = 512,
): string | undefined {
  return value === undefined ? undefined : requiredString(value, name, max);
}

function noteBody(value: unknown): string {
  if (typeof value !== "string" || value.length > 240_000)
    throw new Error("body must be a string under 240000 characters");
  return value.replace(/\r\n?/g, "\n");
}

function noteTags(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 20 ||
    value.some((tag) => typeof tag !== "string" || tag.length > 48)
  )
    throw new Error(
      "tags must be an array of at most 20 strings under 48 characters each",
    );
  return normalizeNoteTags(value as string[]);
}

function requireProject(source: Session): string {
  if (!looksLikeProject(source.cwd))
    throw new Error("Choose a project folder in this session first");
  return source.cwd;
}

async function projectSession(
  source: Session,
  id: string,
  host: AgentAppHost,
): Promise<Session> {
  const cwd = requireProject(source);
  if (!(await host.sessions(cwd)).some((session) => session.id === id))
    throw new Error("Session was not found in this project");
  const target = await host.session(id);
  if (!target) throw new Error("Session was not found in this project");
  return target;
}

/** Two short body paragraphs, with a hard cap independent of Markdown length. */
export function notePreview(body: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n")
    .slice(0, 400);
}

function startLaunch(
  source: Session,
  input: Record<string, unknown>,
): QuickLaunch {
  const cwd = requireProject(source);
  const prompt = agentPrompt(input.prompt);
  const draft = input.draft ?? false;
  if (typeof draft !== "boolean") throw new Error("draft must be a boolean");
  const harness = input.harness ?? source.harness;
  if (!HARNESSES.includes(harness as HarnessId))
    throw new Error("Unknown harness; run models.list for available providers");
  const chosenHarness = harness as HarnessId;
  if (!isHarnessAvailable(chosenHarness))
    throw new Error(`${chosenHarness} is not available in MonoCode`);
  const requestedModel = optionalString(input.model, "model");
  const model = requestedModel
    ? modelsFor(chosenHarness).find((entry) => entry.id === requestedModel)
    : resolveModel(
        chosenHarness,
        chosenHarness === source.harness
          ? source.model
          : preferredModelId(chosenHarness),
      );
  if (!model || model.harness !== chosenHarness)
    throw new Error("Unknown model; run models.list for exact model IDs");
  const rawSettings = input.modelSettings;
  if (
    rawSettings !== undefined &&
    (!rawSettings ||
      typeof rawSettings !== "object" ||
      Array.isArray(rawSettings))
  )
    throw new Error(
      "modelSettings must be an object of setting IDs and values",
    );
  const requestedSettings = {
    ...((rawSettings ?? {}) as Record<string, unknown>),
  };
  if (input.effort !== undefined) {
    const effort = modelEffortSetting(model);
    if (!effort)
      throw new Error(`${model.id} does not expose an effort setting`);
    requestedSettings[effort.id] = requiredString(input.effort, "effort", 128);
  }
  for (const [key, value] of Object.entries(requestedSettings)) {
    const setting = model.settings?.find((entry) => entry.id === key);
    if (
      !setting ||
      typeof value !== "string" ||
      !setting.options.some((option) => option.value === value)
    )
      throw new Error(
        `Invalid model setting ${key}; run models.list for allowed values`,
      );
  }
  const runtimeMode = input.runtimeMode ?? source.runtimeMode;
  if (!RUNTIME_MODES.includes(runtimeMode as Session["runtimeMode"]))
    throw new Error(`runtimeMode must be one of: ${RUNTIME_MODES.join(", ")}`);
  const reveal = input.reveal ?? false;
  if (typeof reveal !== "boolean") throw new Error("reveal must be a boolean");
  const workspaceMode = input.workspaceMode ?? "current";
  if (workspaceMode !== "current" && workspaceMode !== "worktree")
    throw new Error("workspaceMode must be current or worktree");
  const worktreeBase = optionalString(input.worktreeBase, "worktreeBase");
  if (worktreeBase && workspaceMode !== "worktree")
    throw new Error("worktreeBase requires workspaceMode worktree");
  const worktreeCwd = optionalString(input.worktreeCwd, "worktreeCwd");
  if (worktreeCwd && workspaceMode !== "current")
    throw new Error("worktreeCwd requires workspaceMode current");
  return {
    cwd,
    prompt,
    ...(draft ? { draft: true } : {}),
    harness: chosenHarness,
    model: model.id,
    modelSettings: mergeModelSettings(model, {
      ...(chosenHarness === source.harness && model.id === source.model
        ? source.modelSettings
        : {}),
      ...(requestedSettings as Record<string, string>),
    }),
    runtimeMode: runtimeMode as Session["runtimeMode"],
    reveal,
    workspaceMode,
    ...(workspaceMode === "current" && (worktreeCwd || source.worktreeCwd)
      ? { worktreeCwd: worktreeCwd || source.worktreeCwd }
      : {}),
    ...(worktreeBase ? { worktreeBase } : {}),
  };
}

export async function handleAgentApp(
  source: Session,
  requestId: string,
  action: string,
  input: Record<string, unknown>,
  host: AgentAppHost,
): Promise<unknown> {
  fields(action, input);
  switch (action) {
    case "session_manager.list": {
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      const status =
        input.status === undefined
          ? undefined
          : requiredString(input.status, "status", 30);
      if (status !== undefined && !isBoardStatus(status))
        throw new Error("Unknown Session Manager status");
      const projectCwd =
        input.projectCwd === undefined
          ? undefined
          : managerProject(input.projectCwd);
      if (projectCwd === null)
        throw new Error("Session Manager Todos require a project");
      const query =
        input.query === undefined
          ? undefined
          : requiredString(input.query, "query", 1000);
      const limit = input.limit ?? 30,
        offset = input.offset ?? 0;
      if (
        !Number.isInteger(limit) ||
        (limit as number) < 1 ||
        (limit as number) > 100 ||
        !Number.isInteger(offset) ||
        (offset as number) < 0
      )
        throw new Error("Use limit 1–100 and a non-negative offset");
      const cards = await host.sessionManager.list({ status, projectCwd, query });
      return {
        total: cards.length,
        offset,
        cards: cards.slice(
          offset as number,
          (offset as number) + (limit as number),
        ),
      };
    }
    case "session_manager.read":
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      return host.sessionManager.read(managerId(input.id));
    case "session_manager.write": {
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      const id = input.id === undefined ? undefined : managerId(input.id);
      if (id && Object.keys(input).length === 1)
        throw new Error("Supply fields to update a Todo");
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
        throw new Error("Invalid request ID");
      const existing = id ? await host.sessionManager.read(id) : undefined;
      const projectCwd =
        input.projectCwd === undefined
          ? (existing?.cwd ?? requireProject(source))
          : managerProject(input.projectCwd);
      if (!projectCwd) throw new Error("Session Manager Todos require a project");
      const prompt = input.prompt === undefined ? existing?.prompt : input.prompt;
      const attachments = parseQuickAttachments(
        input.attachments === undefined
          ? existing?.attachments
          : input.attachments,
      );
      if (!attachments)
        throw new Error(
          "attachments must be up to 20 persisted file/image descriptors with local paths",
        );
      if (
        typeof prompt !== "string" ||
        prompt.length > 240_000 ||
        (!prompt.trim() && !attachments.length)
      )
        throw new Error("Supply a prompt or attachments");
      if (prompt.trim()) agentPrompt(prompt);
      const projectChanged =
        existing && pathKey(existing.cwd) !== pathKey(projectCwd);
      const mode =
        input.workspaceMode ??
        (projectChanged ? "current" : existing?.workspaceMode) ??
        "current";
      const base = optionalString(
        input.worktreeBase ??
          (projectChanged || input.workspaceMode === "current"
            ? undefined
            : existing?.worktreeBase),
        "worktreeBase",
        400,
      );
      const tree = optionalString(
        input.worktreeCwd ??
          (projectChanged || input.workspaceMode === "worktree"
            ? undefined
            : existing?.worktreeCwd),
        "worktreeCwd",
        4096,
      );
      const template = existing
        ? {
            ...source,
            cwd: projectCwd,
            harness: existing.harness,
            model: existing.model ?? source.model,
            modelSettings: existing.modelSettings ?? {},
            runtimeMode: existing.runtimeMode ?? source.runtimeMode,
            worktreeCwd: tree,
          }
        : {
            ...source,
            cwd: projectCwd,
            worktreeCwd:
              pathKey(projectCwd) === pathKey(source.cwd)
                ? source.worktreeCwd
                : undefined,
          };
      const launch = startLaunch(template, {
        prompt: prompt.trim() ? prompt : "Attached files",
        harness: input.harness ?? existing?.harness,
        model: input.model ?? existing?.model,
        modelSettings: input.modelSettings ?? existing?.modelSettings,
        effort: input.effort,
        runtimeMode: input.runtimeMode ?? existing?.runtimeMode,
        workspaceMode: mode,
        ...(base ? { worktreeBase: base } : {}),
        ...(tree ? { worktreeCwd: tree } : {}),
      });
      launch.prompt = prompt;
      launch.attachments = attachments;
      if (existing?.intent) launch.intent = existing.intent;
      launch.draft = true;
      launch.reveal = false;
      if (tree) {
        const available = (await host.worktrees(projectCwd)).worktrees.find(
          (entry) =>
            !entry.missing &&
            pathKey(entry.path) === pathKey(launch.worktreeCwd!),
        );
        if (!available)
          throw new Error("Worktree is unavailable in this project");
        launch.worktreeCwd =
          pathKey(available.path) === pathKey(projectCwd)
            ? undefined
            : available.path;
      }
      const title =
        input.title === undefined
          ? undefined
          : requiredString(input.title, "title", 200);
      return host.sessionManager.write(
        id ?? `app-todo-${source.id}-${requestId}`,
        launch,
        { edit: !!id, title, expectedRevision: existing?.revision },
      );
    }
    case "session_manager.start": {
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      const id = managerId(input.id);
      return host.sessionManager.start(id, true);
    }
    case "session_manager.delete":
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      return host.sessionManager.delete(managerId(input.id));
    case "session_manager.remove":
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      return host.sessionManager.remove(
        managerId(input.id),
        requiredString(input.runId, "runId", 512),
      );
    case "session_manager.clear": {
      if (!host.sessionManager) throw new Error("Session Manager is unavailable");
      if (input.status !== "done" && input.status !== "stopped")
        throw new Error("Only done or stopped columns can be cleared");
      const project =
        input.projectCwd === undefined
          ? undefined
          : managerProject(input.projectCwd);
      if (project === null)
        throw new Error("Use a project path or omit projectCwd");
      return host.sessionManager.clear(input.status, project);
    }
    case "models.list":
      return {
        runtimeModes: RUNTIME_MODES.map((id) => ({
          id,
          label: RUNTIME_MODE_LABEL[id],
          description: RUNTIME_MODE_HINT[id],
        })),
        harnesses: HARNESSES.map((harness) => ({
          id: harness,
          available: isHarnessAvailable(harness),
          models: modelsFor(harness).map((model) => ({
            id: model.id,
            name: model.name,
            settings: model.settings ?? [],
          })),
        })),
      };
    case "sessions.list":
      return {
        cwd: requireProject(source),
        sessions: await host.sessions(source.cwd),
      };
    case "sessions.read": {
      const id = requiredString(input.sessionId, "sessionId", 256);
      const target = await projectSession(source, id, host);
      return sessionConversationPage(target, {
        before: optionalString(input.before, "before", 256),
        limit: input.limit as number | undefined,
        maxChars: input.maxChars as number | undefined,
      });
    }
    case "sessions.send": {
      const id = requiredString(input.sessionId, "sessionId", 256);
      const prompt = agentPrompt(input.prompt);
      if (id === source.id)
        throw new Error(
          "Use the current conversation to continue this session",
        );
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
        throw new Error("Invalid request ID");
      await projectSession(source, id, host);
      const result = await host.send(
        id,
        prompt,
        `app-${source.id}-${requestId}`,
      );
      return { sessionId: id, submitted: true, ...result };
    }
    case "sessions.draft": {
      const id = requiredString(input.sessionId, "sessionId", 256);
      const prompt = agentPrompt(input.prompt);
      if (id === source.id)
        throw new Error("Use the composer to save a draft in this session");
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
        throw new Error("Invalid request ID");
      await projectSession(source, id, host);
      const result = await host.draft(
        id,
        prompt,
        `app-${source.id}-${requestId}`,
      );
      return { sessionId: id, saved: true, ...result };
    }
    case "sessions.start": {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
        throw new Error(
          "request ID must use letters, digits, underscores or hyphens",
        );
      const launch = startLaunch(source, input);
      if (input.worktreeCwd !== undefined) {
        const chosen = (await host.worktrees(launch.cwd)).worktrees.find(
          (tree) =>
            !tree.missing &&
            pathKey(tree.path) === pathKey(launch.worktreeCwd!),
        );
        if (!chosen)
          throw new Error(
            "Worktree is unavailable in this project; run worktrees.list",
          );
        launch.worktreeCwd =
          pathKey(chosen.path) === pathKey(launch.cwd)
            ? undefined
            : chosen.path;
      }
      const placement = input.placement ?? "tab";
      if (placement !== "tab" && placement !== "right" && placement !== "down")
        throw new Error("placement must be tab, right or down");
      if (input.besideSessionId !== undefined && placement === "tab")
        throw new Error("besideSessionId requires placement right or down");
      const besideSessionId =
        placement === "tab"
          ? undefined
          : (optionalString(input.besideSessionId, "besideSessionId", 256) ??
            source.id);
      const id = `app-${source.id}-${requestId}`;
      if (besideSessionId)
        await host.start(launch, id, {
          direction: placement as SplitDir,
          besideSessionId,
        });
      else await host.start(launch, id);
      return {
        id,
        cwd: launch.cwd,
        harness: launch.harness,
        model: launch.model,
        submitted: !launch.draft,
        draft: !!launch.draft,
      };
    }
    case "worktrees.list":
      return host.worktrees(requireProject(source));
    case "worktrees.create": {
      const cwd = requireProject(source);
      const branch = requiredString(input.branch, "branch", 400);
      const existing = input.existing ?? false;
      if (typeof existing !== "boolean")
        throw new Error("existing must be a boolean");
      const base = optionalString(input.base, "base", 400);
      if (existing && base)
        throw new Error("base cannot be set for an existing branch");
      return host.createWorktree(cwd, branch, base ?? "HEAD", existing);
    }
    case "folders.list": {
      const cwd = requireProject(source);
      return {
        cwd,
        folders: loadSessionFolders(cwd).map(({ id, name, sessionIds }) => ({
          id,
          name,
          sessionIds,
        })),
      };
    }
    case "folders.move": {
      const cwd = requireProject(source);
      const sessionId = requiredString(input.sessionId, "sessionId", 256);
      const folderId = optionalString(input.folderId, "folderId", 256);
      const newFolderName = optionalString(
        input.newFolderName,
        "newFolderName",
        100,
      );
      if (!!folderId === !!newFolderName)
        throw new Error("Supply exactly one of folderId or newFolderName");
      if (
        !(await host.sessions(cwd)).some((session) => session.id === sessionId)
      )
        throw new Error("Session was not found in this project");
      const folders = loadSessionFolders(cwd);
      if (folderId && !folders.some((folder) => folder.id === folderId))
        throw new Error("Folder was not found in this project");
      const next = placeSessionInFolder(
        folders,
        sessionId,
        folderId
          ? { kind: "existing", folderId }
          : { kind: "new", name: newFolderName! },
      );
      saveSessionFolders(cwd, next);
      const folder = next.find((entry) => entry.sessionIds.includes(sessionId));
      return { sessionId, folderId: folder?.id, folderName: folder?.name };
    }
    case "notes.list": {
      const limit = input.limit ?? 30;
      const offset = input.offset ?? 0;
      if (
        !Number.isInteger(limit) ||
        (limit as number) < 1 ||
        (limit as number) > 100
      )
        throw new Error("limit must be an integer from 1 to 100");
      if (!Number.isInteger(offset) || (offset as number) < 0)
        throw new Error("offset must be a non-negative integer");
      const notes = await host.notes();
      return {
        total: notes.length,
        offset,
        notes: notes
          .slice(offset as number, (offset as number) + (limit as number))
          .map((note) => ({
            id: note.id,
            title: note.title,
            preview: notePreview(note.body),
            tags: note.tags,
            sourceCwd: note.sourceCwd,
          })),
      };
    }
    case "notes.read": {
      const id = requiredString(input.id, "id", 256);
      const note = await host.note(id);
      if (!note) throw new Error("Note was not found");
      return note;
    }
    case "notes.write": {
      const id = optionalString(input.id, "id", 256);
      if (id && !/^[A-Za-z0-9_-]+$/.test(id))
        throw new Error("Invalid note ID");
      const title =
        input.title === undefined
          ? undefined
          : requiredString(input.title, "title", 200);
      const body = input.body === undefined ? undefined : noteBody(input.body);
      const tags = input.tags === undefined ? undefined : noteTags(input.tags);
      if (id) {
        if (title === undefined && body === undefined && tags === undefined)
          throw new Error("Supply title, body or tags to update a note");
        const current = await host.note(id);
        if (!current) throw new Error("Note was not found");
        return host.saveNote({
          id,
          title: title ?? current.title,
          body: body ?? current.body,
          tags: tags ?? current.tags,
        });
      }
      if (body === undefined)
        throw new Error("body is required to create a note");
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
        throw new Error("Invalid request ID");
      const createdId = `app-${source.id}-${requestId}`;
      const existing = await host.note(createdId);
      if (existing) {
        if (
          existing.title !== (title ?? noteTitle(body)) ||
          existing.body !== body ||
          JSON.stringify(existing.tags) !== JSON.stringify(tags ?? [])
        )
          throw new Error("Request ID was already used for another note");
        return existing;
      }
      return host.saveNote({
        id: createdId,
        title: title ?? noteTitle(body),
        body,
        tags: tags ?? [],
        sourceSessionId: source.id,
        ...(looksLikeProject(source.cwd) ? { sourceCwd: source.cwd } : {}),
      });
    }
  }
}
