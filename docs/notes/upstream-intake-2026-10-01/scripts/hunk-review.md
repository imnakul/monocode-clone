## Cargo.lock — content; 1 hunks; side diffs 13/485 lines
Hunk @2345 (1/1 side lines)
ours:
version = "0.1.55-local5-provider-fixes"
upstream:
version = "0.6.0"
## Cargo.toml — content; 1 hunks; side diffs 9/9 lines
Hunk @7 (1/1 side lines)
ours:
version = "0.1.55-local5-provider-fixes"
upstream:
version = "0.6.0"
## package-lock.json — content; 2 hunks; side diffs 14/22 lines
Hunk @3 (1/1 side lines)
ours:
  "version": "0.1.55-local5-provider-fixes",
upstream:
  "version": "0.6.0",
Hunk @13 (1/1 side lines)
ours:
      "version": "0.1.55-local5-provider-fixes",
upstream:
      "version": "0.6.0",
## package.json — content; 1 hunks; side diffs 9/31 lines
Hunk @4 (1/1 side lines)
ours:
  "version": "0.1.55-local5-provider-fixes",
upstream:
  "version": "0.6.0",
## src-tauri/src/fs.rs — content; 3 hunks; side diffs 388/1532 lines
Hunk @5 (6/8 side lines)
ours:
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::Manager;
upstream:
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
Hunk @29 (1/11 side lines)
ours:
static WALLPAPER_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);
upstream:
const MAX_GENERATED_IMAGE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_GENERATED_IMAGE_DATA_BYTES: u64 = MAX_GENERATED_IMAGE_BYTES * 4 / 3 + 4;
const GENERATED_IMAGE_DIR: &str = "generated-images";

[middle retained in evidence JSON]
    mime_type: String,
    size: u64,
}
Hunk @5485 (26/95 side lines)
ours:
/// Projectless chats live under the user's MonoCode home, outside any
/// project: `<home>/.monocode/scratch/<name>/`. Creates the directory on
/// demand and returns its absolute path so the frontend can match scratch
/// sessions by prefix without expanding `~` itself.
[middle retained in evidence JSON]
        return None;
    }
    Some(home.join(".monocode").join("scratch").join(clean))
upstream:
#[tauri::command]
pub async fn save_generated_image(
    app: AppHandle,
    data: String,
[middle retained in evidence JSON]

fn is_png(bytes: &[u8]) -> bool {
    bytes.len() >= 8 && bytes.starts_with(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
## src-tauri/src/harness.rs — content; 6 hunks; side diffs 2279/1142 lines
Hunk @79 (1/8 side lines)
ours:
pub struct HarnessProbe {
upstream:
pub struct ConfiguredBinary {
    pub path: String,
    pub args: Option<Vec<String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AntigravityBinary {
Hunk @1444 (38/15 side lines)
ours:
/// that merely shares a file name. Explicit overrides are validated at
/// resolve time via `is_executable_file`, but `harness_exec` must still only
/// run a binary the backend itself resolves — never any existing file.
/// Comparison is case-insensitive on Windows: an explicit override keeps the
[middle retained in evidence JSON]
    .into_iter()
    .flatten()
    .any(|resolved| resolved_binary_matches(&resolved, &path))
upstream:
/// that merely shares a file name.
pub(crate) fn is_resolved_harness_binary(
    command: &str,
    binary_provider: Option<&str>,
[middle retained in evidence JSON]
            .ok_or_else(|| format!("Unsupported configured harness provider: {provider}")),
    };
    resolved.is_ok_and(|path| path == Path::new(command))
Hunk @1525 (5/21 side lines)
ours:
fn probe_command_output(path: &Path, args: &[&str], timeout: Duration) -> Result<String, String> {
    let command = path.to_string_lossy().into_owned();
    let owned: Vec<String> = args.iter().map(|item| item.to_string()).collect();
    let mut cmd = new_provider_command(path, &owned)?;
    cmd.stdin(Stdio::null())
upstream:
fn exec_capture(command: &str, args: &[String], cwd: Option<&str>) -> Result<String, String> {
    let output = exec_output(command, args, cwd, EXEC_TIMEOUT)?;
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    if output.status.success() || !stdout.trim().is_empty() {
[middle retained in evidence JSON]
    let mut cmd = Command::new(command);
    cmd.args(args)
        .stdin(Stdio::null())
Hunk @1855 (503/24 side lines)
ours:
/// Hide the console window for helper CLIs (git/gh/…) on Windows.
///
/// EVERY backend `Command` that is not an interactive terminal must go
/// through here (or `isolate_child`, which calls it): without
[middle retained in evidence JSON]
}

pub(crate) fn terminate(pid: u32) {
upstream:
/// Linux refuses to `execve` a file that any process holds open for writing,
/// and whether one does is not ours to decide: a sibling thread's spawn
/// inherits our write handles for the moment before it execs its own program.
/// So a binary written seconds ago — a CLI mid-upgrade, or a `--version` probe
[middle retained in evidence JSON]
}

fn terminate(pid: u32) {
Hunk @3212 (5/2 side lines)
ours:
    // PATH first so `%USERPROFILE%\.local\bin\claude.exe` (or any npm shim)
    // resolves dynamically for arbitrary users.
    #[cfg(windows)]
    if let Some(found) = which_in_path(&gui_search_path(), "claude") {
        candidates.push(found);
upstream:
    if let Some(from_shell) = which_via_login_shell("claude") {
        candidates.push(from_shell);
Hunk @5336 (1/31 side lines)
ours:
#[cfg(all(test, unix))]
upstream:
#[cfg(all(windows, test))]
mod windows_binary_tests {
    use super::*;

[middle retained in evidence JSON]
}

#[cfg(test)]
## src-tauri/src/lib.rs — content; 2 hunks; side diffs 151/203 lines
Hunk @3 (1/1 side lines)
ours:
pub mod antigravity_acp;
upstream:
mod account_identity;
Hunk @483 (1/2 side lines)
ours:
            fs::ensure_scratch_chat,
upstream:
            fs::save_generated_image,
            fs::delete_generated_images,
## src-tauri/src/main.rs — content; 1 hunks; side diffs 13/18 lines
Hunk @4 (5/2 side lines)
ours:
    if monocode_lib::antigravity_acp::handle_auth_url_args(
        &std::env::args_os().skip(1).collect::<Vec<_>>(),
        &mut std::io::stderr().lock(),
    ) {
        return;
upstream:
    if let Some(code) = monocode_lib::ssh_askpass::maybe_run() {
        std::process::exit(code);
## src-tauri/src/search.rs — content; 1 hunks; side diffs 8/469 lines
Hunk @174 (5/2 side lines)
ours:
    cmd.arg("--");
    for spec in pathspecs(&options.include, &options.exclude) {
        cmd.arg(spec);
    }
    crate::harness::hide_console_window(&mut cmd);
upstream:
    args.push("--".to_string());
    args.extend(pathspecs(&options.include, &options.exclude));
## src-tauri/src/session_store.rs — content; 3 hunks; side diffs 1064/921 lines
Hunk @1366 (84/14 side lines)
ours:
    let cwd_candidates = cwd.map(project_cwd_candidates);

    let mut sql = String::from(
        "SELECT id, cwd, harness, title, updated_at, archived, blocks_json
[middle retained in evidence JSON]
            .collect();
    }
    let rows = rows_raw;
upstream:
    let budget = MAX_SEARCH_BUFFER_BYTES as i64;
    let sql = search_sessions_sql(options.include_archived, cwd.is_some());

    let mut statement = conn.prepare(&sql).map_err(|e| e.to_string())?;
[middle retained in evidence JSON]
            .query(params![pattern, budget, limit])
            .map_err(|e| e.to_string())?
    };
Hunk @1479 (6/18 side lines)
ours:
    let mut seen_ids = std::collections::HashSet::new();
    for row in rows {
        let (id, cwd, harness, title, updated_at, blocks_raw) = row?;
        if !seen_ids.insert(id.clone()) {
            continue;
        }
upstream:
    loop {
        if !session_search_is_current(token) {
            return Ok(SessionSearchResult {
                hits: Vec::new(),
[middle retained in evidence JSON]
            }
            Err(error) => return Err(error.to_string()),
        };
Hunk @1582 (13/0 side lines)
ours:
type SearchRow = (String, String, String, String, i64, String);

fn search_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SearchRow> {
    Ok((
[middle retained in evidence JSON]
    ))
}

upstream:
## src-tauri/src/window.rs — content; 1 hunks; side diffs 37/212 lines
Hunk @121 (5/21 side lines)
ours:
    #[cfg(target_os = "windows")]
    prepare_windows_window(&window);

    let _ = window.set_focus();
    Ok(())
upstream:
    if reveal {
        let _ = window.set_focus();
    }
    Ok(window)
[middle retained in evidence JSON]
    fn fill(self) -> Color {
        Color(self.r, self.g, self.b, 255)
    }
## src-tauri/tauri.conf.json — content; 1 hunks; side diffs 16/23 lines
Hunk @4 (1/1 side lines)
ours:
  "version": "0.1.55-local5-provider-fixes",
upstream:
  "version": "0.6.0",
## src/app/App.tsx — content; 10 hunks; side diffs 1218/3278 lines
Hunk @108 (2/0 side lines)
ours:
  loadSidebarTabOrder,
  saveAppMode,
upstream:
Hunk @335 (0/2 side lines)
ours:
upstream:
  mergeModelSettings,
  nativeModelId,
Hunk @1174 (4/6 side lines)
ours:
  /** Persisted scratch chats. Project history never includes them (each
   * lives in its own leaf directory no project query reaches), so they get
   * their own listing, loaded once at boot and refreshed in Chat mode. */
  const [scratchHistory, setScratchHistory] = useState<SessionSummary[]>([]);
upstream:
  const [, refreshRemoteTabTitles] = useState(0);
  useEffect(() => {
    const updated = () => refreshRemoteTabTitles((value) => value + 1);
    window.addEventListener(REMOTE_HISTORY_UPDATED, updated);
    return () => window.removeEventListener(REMOTE_HISTORY_UPDATED, updated);
  }, []);
Hunk @2710 (11/1 side lines)
ours:
      if (!looksLikeProject(projectPath)) return false;
      // A created terminal is an explicit start: only this new id starts.
      const existing = findProjectTerminal(
        projectTerminalsRef.current,
[middle retained in evidence JSON]
        existing ? nextDockTerminalTitle(existing, workdir) : undefined,
      );
      startTerminal(file.id);
upstream:
      if (!isLocalProject(projectPath)) return false;
Hunk @3409 (4/3 side lines)
ours:
        for (const file of closingFiles) {
          if (!file.terminal) continue;
          forgetTerminal(file.id);
          void killPty(file.id);
upstream:
        for (const shellId of leafIds(tab.layout)) {
          rememberRemoteSession(shellId);
          rememberRemotePendingWorktree(shellId);
Hunk @3794 (2/3 side lines)
ours:
      optionsOrSession?: OpenDiffOptions | { sessionId: string; cwd: string },
      changeKindParam?: GitFileDiffKind,
upstream:
      session?: { sessionId: string; cwd: string },
      changeKind?: GitFileDiffKind,
      pin = false,
Hunk @3872 (14/2 side lines)
ours:
    (
      path: string,
      options?:
        | GitFileDiffKind
[middle retained in evidence JSON]
            : undefined;
      return onOpenDiff(path, undefined, kind);
    },
upstream:
    (path: string, kind?: GitFileDiffKind, pin?: boolean) =>
      onOpenDiff(path, undefined, kind, pin),
Hunk @6444 (4/29 side lines)
ours:
      const rawCommand = isNativeCommandPrompt(submittedText, current.harness);
      const harnessText = rawCommand
        ? submittedText
        : composeNoteMessage(noteCard, submittedText);
upstream:
      const submittedText = intent === "build" ? "Build approved plan" : text;
      const operatorCommand = consumeOperatorCommand(submittedText);
      if (
        operatorCommand.matched &&
[middle retained in evidence JSON]
      const harnessText =
        options?.ciRepair?.prompt ??
        (rawCommand ? submittedText : composeNoteMessage(noteCard, promptText));
Hunk @7254 (32/19 side lines)
ours:
          const wrappedPrompt = orchestrator.prompt(
              sessionId,
              inboxAskPrompt(
                rawCommand ? undefined : current.inboxAsk,
[middle retained in evidence JSON]
            },
            send: (text, fork, onSummaryBinding) => sendTurn(text, prepared, fork, onSummaryBinding),
          });
upstream:
          let sendText = orchestrator.prompt(
            sessionId,
            inboxAskPrompt(
              rawCommand ? undefined : current.inboxAsk,
[middle retained in evidence JSON]
            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs or split session panes right or down, list and create project worktrees, choose a new session's checkout, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be used as besideSessionId to split its pane again or moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
          }
          await sendTurn(sendText);
Hunk @9248 (7/5 side lines)
ours:
      respondHarnessApproval(
        session.harness,
        sessionId,
        requestId,
        decision,
        scope,
      );
upstream:
      if (remoteProjectFor(session.cwd)) {
        remoteSessionActions(sessionId)?.approve(requestId, decision);
        return;
      }
      respondHarnessApproval(session.harness, sessionId, requestId, decision);
## src/app/shell/MenuBar.tsx — content; 1 hunks; side diffs 28/222 lines
Hunk @9 (1/8 side lines)
ours:
import { SharedHoverHighlight } from "../../features/sessions/ui/SharedHoverHighlight";
upstream:
import {
  keybindingShortcutLabel,
  loadAutosave,
  loadKeybindingOverrides,
  saveAutosave,
  subscribeAutosave,
  subscribeKeybindings,
} from "../../features/settings/model/settings";
## src/app/shell/ProjectRail.tsx — content; 1 hunks; side diffs 42/987 lines
Hunk @84 (105/8 side lines)
ours:
import { SharedHoverHighlight } from "../../features/sessions/ui/SharedHoverHighlight";
import { type AppMode } from "../../features/settings/model/appearance";

const REVEAL_LABEL = IS_MAC
[middle retained in evidence JSON]
  }
  return items;
}
upstream:
import { Popover } from "../../shared/ui/Popover";
import { OPEN_REMOTE_PROJECT_EVENT } from "../../features/connections/model/connections";
import {
  useRemoteMachineOnline,
  useRemoteMachines,
} from "../../features/connections/model/connections";
import { remoteProjectFor } from "../../features/connections/model/remoteProjects";
import { useProjectMenu } from "./useProjectMenu";
## src/app/shell/Sidebar.tsx — content; 5 hunks; side diffs 225/772 lines
Hunk @32 (0/2 side lines)
ours:
upstream:
  useId,
  useLayoutEffect,
Hunk @177 (2/8 side lines)
ours:
import { ChatPanel } from "../../features/sessions/ui/ChatPanel";
import { SharedHoverHighlight } from "../../features/sessions/ui/SharedHoverHighlight";
upstream:
import {
  refreshRemoteProjectSessions,
  remoteRequest,
  remotePendingWorktree,
  remoteSessionFor,
  useRemoteProjectSessions,
} from "../../features/connections/model/connections";
import { parseRemotePath, remotePath, remoteProjectFor } from "../../features/connections/model/remoteProjects";
Hunk @282 (6/3 side lines)
ours:
  onOpenDiff?: (
    path: string,
    options?: GitFileDiffKind | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;
  onOpenCommit?: (commit: GitHistoryCommit) => void;
upstream:
  onOpenDiff?: (path: string, kind?: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges?: (kind: GitFileDiffKind) => void;
  onOpenCommit?: (commit: GitHistoryCommit, pin?: boolean) => void;
Hunk @788 (12/95 side lines)
ours:
  // Chat mode swaps the workspace for the chat list, so it skips the
  // project gate but honors the same overlays (search, inbox, notes,
  // settings) — otherwise chats linger over fullscreen views.
  const chatVisible =
[middle retained in evidence JSON]
    !settingsOpen;
  const gitStatuses = useGitFileStatuses(gitRoot, open && tab === "files");
  const changeStats = useProjectDiffStats(gitRoot, open);
upstream:
  const sidebarVisible = open && sidebarAvailable;
  // With the sidebar collapsed beside the compact rail, its tab shortcuts
  // open the sidebar temporarily until the user clicks away.
  const drawerMode = compactRailVisible && !open;
[middle retained in evidence JSON]
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [drawerVisible]);
Hunk @2304 (3/14 side lines)
ours:
      {(mode === "chat" ? chatVisible : sidebarVisible)
        ? sidebarContent
        : null}
upstream:
      {sidebarVisible ? sidebarContent : null}
      {drawerRendered ? (
        // Pinned to the right edge, so the sidebar slides in as the width grows.
        <div
[middle retained in evidence JSON]
          {sidebarContent}
        </div>
      ) : null}
## src/app/shell/UsageFooter.tsx — content; 1 hunks; side diffs 39/343 lines
Hunk @2 (9/1 side lines)
ours:
import {
  useCallback,
  useEffect,
  useRef,
[middle retained in evidence JSON]
  type Dispatch,
  type SetStateAction,
} from "react";
upstream:
import { useCallback, useEffect, useRef, useState } from "react";
## src/app/shell/UsageProviderChip.tsx — content; 1 hunks; side diffs 26/339 lines
Hunk @76 (5/5 side lines)
ours:
  remainingQuota = false,
}: {
  limits: ProviderRateLimits;
  now: number;
  remainingQuota?: boolean;
upstream:
  presentation,
}: {
  limits: ProviderRateLimits;
  now: number;
  presentation?: { harness: HarnessId; label: string; sourceLabel?: string };
## src/features/files/editor/editorDoc.test.ts — content; 2 hunks; side diffs 80/48 lines
Hunk @3 (5/5 side lines)
ours:
import { formatText } from "../../../shared/lib/format";
import {
  createEditorDiskSession,
  editorDocChanges,
  isDocDirty,
upstream:
import {
  detectLineEnding,
  editorDocChanges,
  normalizeLineBreaks,
  restoreLineEnding,
Hunk @68 (62/13 side lines)
ours:
describe("createEditorDiskSession & isDocDirty integration boundary", () => {
  it("uses detected disk convention for save serialization after formatting", async () => {
    const session = createEditorDiskSession();
    const rawDisk = "const value={answer:42}\r\n";
[middle retained in evidence JSON]
    expect(restaged).toBe("alpha\r\nBETA\r\n");
    expect(restaged).not.toContain("\r\r\n");
  });
upstream:
describe("line-ending round trip", () => {
  it.each(["alpha\nbeta\n", "alpha\r\nbeta\r\n", "alpha\rbeta\r"])(
    "load then save leaves %j byte-identical",
    (raw) => {
[middle retained in evidence JSON]
      expect(restored).toBe(raw);
    },
  );
## src/features/files/ui/FileEditor.tsx — content; 5 hunks; side diffs 70/361 lines
Hunk @168 (6/10 side lines)
ours:
  const diskSessionRef = useRef(createEditorDiskSession());
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  const applyDiskContent = useCallback((rawContent: string) => {
    const { text: content } = diskSessionRef.current.applyDiskContent(rawContent);
upstream:
  const eolRef = useRef<LineEnding>("\n");
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

[middle retained in evidence JSON]
    // into the LF document doubles every line (see editorDoc.ts).
    eolRef.current = detectLineEnding(raw);
    const content = normalizeLineBreaks(raw);
Hunk @238 (1/1 side lines)
ours:
        applyDiskContent(rawContent);
upstream:
        applyDiskContent(content);
Hunk @273 (9/9 side lines)
ours:
        let diff = await gitFileDiff(cwd, relative, "unstaged");
        // A staged-only file has no logical index-to-disk delta. Compare
        // normalized text so Windows checkout EOL conversion cannot hide it.
        if (
[middle retained in evidence JSON]
          hasSameLogicalText(diff.original, diff.current)
        ) {
          diff = await gitFileDiff(cwd, relative, "staged");
upstream:
        const { files } = await gitDiffFiles(cwd);
        const file = files.find((entry) => entry.relative === relative);
        // Normalized equality alone cannot distinguish autocrlf from a real change.
        const kind = file?.staged && !file.unstaged ? "staged" : "unstaged";
[middle retained in evidence JSON]
        if (diff.binary || diff.tooLarge) {
          setGitBase(null);
          return;
Hunk @366 (3/3 side lines)
ours:
      const diskContent = diskSessionRef.current.serializeForSave(content);
      const operation = saveQueue.current.then(() =>
        writeTextFile(path, diskContent),
upstream:
      const serializedContent = restoreLineEnding(content, eolRef.current);
      const operation = saveQueue.current.then(() =>
        writeTextFile(path, serializedContent),
Hunk @405 (2/6 side lines)
ours:
        const diskContent = diskSessionRef.current.serializeForStage(contents);
        await gitStageContents(cwd, relative, diskContent);
upstream:
        // Keep the index convention outside the selected text hunk.
        await gitStageContents(
          cwd,
          relative,
          restoreLineEnding(contents, gitDiff.lineEnding),
        );
## src/features/files/ui/FilePane.tsx — content; 1 hunks; side diffs 79/75 lines
Hunk @37 (4/22 side lines)
ours:
import { SessionChangesDiff } from "../../source-control/ui/SessionChangesDiff";
import { TerminalView } from "../../terminal/ui/TerminalView";
import { WorkingTreeDiff } from "../../source-control/ui/WorkingTreeDiff";
import { GitFileDiffView } from "../../sessions/ui/GitFileDiffView";
upstream:
import { isRemoteProjectPath } from "../../projects/model/recents";

const CommitDiff = lazySurface(async () => {
  const module = await import("../../source-control/ui/CommitDiff");
[middle retained in evidence JSON]
  const module = await import("../../source-control/ui/WorkingTreeDiff");
  return { default: module.WorkingTreeDiff };
});
## src/features/inbox/ui/InboxView.test.ts — content; 1 hunks; side diffs 189/73 lines
Hunk @14 (1/1 side lines)
ours:
  InboxView,
upstream:
  inboxStatusMark,
## src/features/inbox/ui/InboxView.tsx — content; 7 hunks; side diffs 180/178 lines
Hunk @375 (1/2 side lines)
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;
upstream:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];
Hunk @400 (1/2 side lines)
ours:
  onPullReview,
upstream:
  repairSessions,
  onRepairChecks,
Hunk @1402 (1/2 side lines)
ours:
  onPullReview,
upstream:
  repairSessions,
  onRepairChecks,
Hunk @1418 (1/2 side lines)
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;
upstream:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];
Hunk @1445 (1/2 side lines)
ours:
      onPullReview={onPullReview}
upstream:
      repairSessions={repairSessions}
      onRepairChecks={onRepairChecks}
Hunk @2004 (1/2 side lines)
ours:
  onPullReview,
upstream:
  repairSessions,
  onRepairChecks,
Hunk @2022 (1/2 side lines)
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;
upstream:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];
## src/features/notes/ui/NotesView.tsx — content; 1 hunks; side diffs 265/40 lines
Hunk @124 (6/11 side lines)
ours:
  const [loading, setLoading] = useState(() => peekNotes() == null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => rememberedNoteId ?? peekNotes()?.[0]?.id ?? null,
  );
upstream:
  const [loading, setLoading] = useState(() => peekNotes() === null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
[middle retained in evidence JSON]
      rememberedNoteId
    );
  });
## src/features/providers/model/rateLimits.test.ts — content; 2 hunks; side diffs 89/193 lines
Hunk @4 (1/1 side lines)
ours:
  formatQuotaPercent,
upstream:
  exhaustedWindowResetAt,
Hunk @98 (27/18 side lines)
ours:
describe("formatRemainingPercent", () => {
  it("computes and rounds remaining quota percent left", () => {
    expect(formatRemainingPercent(58.4)).toBe("42%");
    expect(formatRemainingPercent(20)).toBe("80%");
[middle retained in evidence JSON]
    expect(formatQuotaPercent(100, true)).toBe("0% left");
    expect(formatQuotaPercent(140, true)).toBe("0% left");
    expect(formatQuotaPercent(-10, true)).toBe("100% left");
upstream:
describe("exhaustedWindowResetAt", () => {
  it("returns the latest reset among spent windows", () => {
    const limits = {
      ...idleRateLimits("codex"),
[middle retained in evidence JSON]
    };
    expect(exhaustedWindowResetAt(limits)).toBe(2_000);
    expect(exhaustedWindowResetAt(idleRateLimits("claude"))).toBeNull();
## src/features/sessions/data/sessionStore.test.ts — content; 2 hunks; side diffs 191/364 lines
Hunk @3 (3/2 side lines)
ours:
import { newSession, type Block, type Session } from "../model/session";
import { applyHarnessEvent } from "../../../integrations/harness/core/apply";
import { planBranch } from "../model/branchPlan";
upstream:
import { mapCodexNotification } from "../../../integrations/harness/providers/codex/codexProtocol";
import { toolCallLabel } from "../model/transcriptActivity";
Hunk @26 (47/177 side lines)
ours:
describe("native branch persistence", () => {
  function branch(): Session {
    const source: Session = { ...newSession("claude", "/repo"), id: "source", providerSessionId: "provider", blocks: [
      { id: "u1", role: "user", text: "hello", providerForkPoint: "assistant-uuid" },
[middle retained in evidence JSON]
    expect(bound.blocks[2].branchOrigin?.status).toBe("done"); expect(bound.blocks[2].branchOrigin?.fork).toBeUndefined();
    const positioned = applyHarnessEvent(bound, { type: "turn.forkPoint", providerForkPoint: "position" });
    expect(positioned.blocks[1].providerForkPoint).toBe("position");
upstream:
it("keeps host-owned transcripts out of local session storage", () => {
  const session = newSession("codex", "remote://env/home/me/repo");
  session.blocks = [{ id: "turn", role: "user", text: "Continue" }];
  expect(shouldPersistSession(session)).toBe(false);
[middle retained in evidence JSON]
    expect(toolCallLabel(recovered, "/home/me/proj")).toBe(
      toolCallLabel(liveRow, "/home/me/proj"),
    );
## src/features/sessions/data/sessionStore.ts — content; 4 hunks; side diffs 367/448 lines
Hunk @24 (2/3 side lines)
ours:
  BranchOrigin,
  BranchSummaryReason,
upstream:
  BtwMessage,
  BtwThread,
  GeneratedImageMeta,
Hunk @685 (7/12 side lines)
ours:
  if (block.role === "user" && typeof block.providerForkPoint === "string" && isPersistableId(block.providerForkPoint)) {
    next.providerForkPoint = block.providerForkPoint;
  }
  if (block.role === "system") {
    const origin = sanitizeBranchOrigin(block.branchOrigin);
    if (origin) next.branchOrigin = origin;
  }
upstream:
  if (block.role === "user" && block.monocode) next.monocode = true;
  if (
    block.role === "user" &&
    (block.intent === "plan" || block.intent === "orchestrate")
[middle retained in evidence JSON]
    /^[A-Za-z0-9_-]{1,512}$/.test(block.appRequestId)
  )
    next.appRequestId = block.appRequestId;
Hunk @766 (2/7 side lines)
ours:
  const review = sanitizeReview(block.review);
  if (review) next.review = review;
upstream:
  if (
    block.role === "user" &&
    typeof block.ciContext === "string" &&
    block.ciContext
  ) {
    next.ciContext = block.ciContext;
  }
Hunk @790 (35/156 side lines)
ours:
function sanitizeBranchOrigin(value: unknown): BranchOrigin | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const reasons: BranchSummaryReason[] = ["different-provider", "not-started", "pending-switch", "orchestration-worker", "no-fork-point", "source-continued", "branch-changed", "fork-failed"];
  // Persistence accepts untrusted JSON, so narrow every field before retaining it.
[middle retained in evidence JSON]
    }
  }
  return origin;
upstream:
function sanitizeNestedId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  if (!id || id.length > 256 || /[\u0000-\u001f]/.test(id)) return undefined;
[middle retained in evidence JSON]
    size,
    ...(alt ? { alt } : {}),
  };
## src/features/sessions/model/messageQueue.test.ts — content; 1 hunks; side diffs 612/13 lines
Hunk @64 (2/4 side lines)
ours:
  it("holds the queue after a failed turn until the user resumes", () => {
    expect(canDispatchQueuedHead(chat({ queueStatus: "held" }))).toBe(false);
upstream:
  it("holds while the last turn is stopped at a usage limit", () => {
    expect(
      canDispatchQueuedHead(chat({ usageLimit: { resetsAt: 1_000 } })),
    ).toBe(false);
## src/features/sessions/model/messageQueue.ts — content; 1 hunks; side diffs 225/14 lines
Hunk @38 (11/7 side lines)
ours:
 * Busy / paused / resuming / steering / held / preparing-handoff / editing-the-head all wait.
 */
export function canDispatchQueuedHead(session: Session): boolean {
  if (session.busy) return false;
[middle retained in evidence JSON]
    // A failed turn holds the queue: auto-dispatch waits for the user.
    session.queueStatus === "held"
  ) {
upstream:
 * Busy / paused / resuming / usage-limited / preparing-handoff /
 * editing-the-head all wait.
 */
export function canDispatchQueuedHead(session: Session): boolean {
  if (session.busy) return false;
  if (session.usageLimit) return false;
  if (session.queueStatus === "paused" || session.queueStatus === "resuming") {
## src/features/sessions/model/session.ts — content; 4 hunks; side diffs 166/230 lines
Hunk @1 (3/1 side lines)
ours:
import type { ContextUsage } from "./contextUsage";
import type { ProcessedUsage } from "./tokenAccounting";
import { deriveLocalSessionTitle } from "./sessionTitle";
upstream:
import { dropContextWindow, type ContextUsage } from "./contextUsage";
Hunk @23 (1/1 side lines)
ours:
import { type CodeReviewReport } from "../../inbox/model/githubTasks";
upstream:
import { loadProjectProviderSettings } from "./projectProviders";
Hunk @372 (2/2 side lines)
ours:
  /** CodeRabbit review report with per-issue fix buttons. Survives reloads. */
  review?: CodeReviewReport;
upstream:
  /** Exact CI repair instructions and evidence supplied with this user turn. */
  ciContext?: string;
Hunk @467 (1/6 side lines)
ours:
  /** Persisted follow-ups waiting for the current turn. */
upstream:
  /**
   * What the live turn is waiting on after the agent yielded with work still
   * running in the background. In-memory only.
   */
  backgroundTasks?: string[];
  /** Follow-ups waiting for current turn. In-memory only. */
## src/features/sessions/ui/AgentTranscript.test.ts — content; 1 hunks; side diffs 102/208 lines
Hunk @49 (17/142 side lines)
ours:
  it("renders native, composer and prefix origins as separate accessible divider rows", () => {
    const source = { ...newSession("claude", "/repo"), id: "source", title: "Original", providerSessionId: "provider", blocks: [
      { id: "u1", role: "user" as const, text: "hello" }, { id: "a1", role: "assistant" as const, text: "reply" },
    ] };
[middle retained in evidence JSON]
      expect(separator?.getAttribute("aria-label")).toBe(divider.text); expect(separator?.textContent).toBe(divider.text);
    }
  });
upstream:
  it("keeps the completed time beside actions when a turn has no BTW control", () => {
    const markup = render([
      {
        id: "user",
[middle retained in evidence JSON]
    );
  });

## src/features/sessions/ui/AgentTranscript.tsx — content; 2 hunks; side diffs 303/719 lines
Hunk @178 (5/3 side lines)
ours:
  onApproval?: (
    requestId: number,
    decision: ApprovalDecision,
    scope?: ApprovalScope,
  ) => void;
upstream:
  /** Work the agent left running when it yielded; the turn waits on it. */
  backgroundTasks?: string[];
  onApproval?: (requestId: number, decision: ApprovalDecision) => void;
Hunk @1182 (2/0 side lines)
ours:


upstream:
## src/features/sessions/ui/Composer.test.ts — content; 3 hunks; side diffs 91/1095 lines
Hunk @60 (3/1 side lines)
ours:
      actionTooltip: "Queue follow-up",
      actionAriaLabel: "Queue",
      label: "Send",
upstream:
      allowBusySubmit,
Hunk @155 (2/7 side lines)
ours:
    currentForm?: McpFormPrompt,
    onFormReply: (requestId: number, reply: unknown) => void = vi.fn(),
upstream:
    onBtwCommand?: (
      text: string,
      options?: { draft?: boolean },
    ) => boolean | void,
    onSubmit: (text: string, attachments: Attachment[]) => void = () => {},
    sessionId?: string,
    harness: "claude" | "codex" = "claude",
Hunk @201 (17/508 side lines)
ours:
  it("shows questions before forms and shows a form when no question is pending", async () => {
    const form: McpFormPrompt = {
      requestId: 2,
      serverName: "Docs",
[middle retained in evidence JSON]

    expect(container.textContent).toContain("Fill in these details");
    expect(container.querySelector('input[id="mcp-form-2-0"]')).not.toBeNull();
upstream:
  it.each([
    ["/btw", ""],
    ["/btw some text here...", "some text here..."],
  ])("routes %s to BTW instead of the main submit", async (draft, text) => {
[middle retained in evidence JSON]
    );
    expect(container.querySelector("textarea")?.value).toBe("");
    expect(onDraftChange).toHaveBeenLastCalledWith("");
## src/features/sessions/ui/Composer.tsx — content; 10 hunks; side diffs 489/1325 lines
Hunk @259 (1/2 side lines)
ours:
  canSteer?: boolean;
upstream:
  /** Allow typed text to replace Stop with Send while a turn is running. */
  allowBusySubmit?: boolean;
Hunk @607 (1/1 side lines)
ours:
  canSteer,
upstream:
  allowBusySubmit = true,
Hunk @1579 (37/54 side lines)
ours:
  const followUpBehavior = useSyncExternalStore(
    subscribeFollowUpBehavior,
    loadFollowUpBehavior,
    () => FOLLOW_UP_BEHAVIOR_DEFAULT,
[middle retained in evidence JSON]
      const files = attachments;
      if (!value.trim() && files.length === 0) return;
      const accepted = onSaveDraft(value, files);
upstream:
  const rememberPaste = (work: Promise<void>) => {
    const flight = work.then(
      () => undefined,
      () => undefined,
[middle retained in evidence JSON]
        mcpContextText(taggedMcpServers(text, selectedMcp), text),
        files,
      );
Hunk @1766 (20/27 side lines)
ours:
    const accepted = onSubmit(text, files, {
      intent:
        planSelected || command.planning
          ? "plan"
[middle retained in evidence JSON]
          }
        : {}),
    });
upstream:
    const accepted = onSubmit(
      mcpContextText(
        taggedMcpServers(submittedText, selectedMcp),
        submittedText,
[middle retained in evidence JSON]
          : {}),
      },
    );
Hunk @1849 (20/2 side lines)
ours:

  const executeComposerAction = (
    action: "send" | "queue" | "steer",
    text: string,
[middle retained in evidence JSON]
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
upstream:
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
Hunk @2642 (26/1 side lines)
ours:
                  <button
                    type="button"
                    data-shared-hover-item
                    aria-pressed={planSelected}
[middle retained in evidence JSON]
                    ) : null}
                  </button>
                  {!hideTopBar && (
upstream:
                  {!remote || remoteFeatures?.plan ? (
Hunk @2906 (4/3 side lines)
ours:
                actionTooltip={actionTooltip}
                actionAriaLabel={actionAriaLabel}
                label={draftSelected ? "Save draft" : "Send"}
                onSend={handleActionClick}
upstream:
                allowBusySubmit={allowBusySubmit}
                label={draftActive ? "Save draft" : "Send"}
                onSend={() => submit(ref.current?.value ?? "")}
Hunk @3047 (2/1 side lines)
ours:
  actionTooltip,
  actionAriaLabel,
upstream:
  allowBusySubmit = true,
Hunk @3060 (2/1 side lines)
ours:
  actionTooltip: string;
  actionAriaLabel: string;
upstream:
  allowBusySubmit?: boolean;
Hunk @3084 (23/20 side lines)
ours:
    return (
      <>
        {hasValue ? (
          <button
[middle retained in evidence JSON]
          <Square className="size-2.5 fill-current" strokeWidth={0} />
        </button>
      </>
upstream:
    return hasValue && allowBusySubmit ? (
      <button
        type="button"
        title={label}
[middle retained in evidence JSON]
      >
        <Square className="size-2.5 fill-current" strokeWidth={0} />
      </button>
## src/features/sessions/ui/ModelPicker.tsx — content; 5 hunks; side diffs 51/279 lines
Hunk @37 (4/6 side lines)
ours:
  hasHarnessEvidence,
  harnessUnavailableHint,
  isHarnessAvailable,
  probeHarnessAvailability,
upstream:
  isProviderHidden,
  projectProvidersRevision,
  subscribeProjectProviders,
} from "../model/projectProviders";
import {
  harnessUnavailableHint,
Hunk @232 (9/4 side lines)
ours:
// Honest status for rows the user can see but that have no evidence yet:
// "Checking availability…" while deferred, the real hint once probed.
function providerRowTitle(harness: HarnessId): string | undefined {
  if (isHarnessAvailable(harness)) return undefined;
[middle retained in evidence JSON]
}

function recentMenuModels(current: AgentModel): AgentModel[] {
upstream:
function recentMenuModels(
  current: AgentModel,
  source: ModelSource,
): AgentModel[] {
Hunk @371 (10/6 side lines)
ours:
    // Per-harness evidence (not the global probe flag): Antigravity is
    // excluded from blanket probes, so it must stay listed until its own
    // catalog discovery reports — never hidden as "not installed" merely
    // because probing was deferred.
[middle retained in evidence JSON]
        isHarnessAvailable(id),
        hasHarnessEvidence(id),
      ),
upstream:
    void projectVersion;
    return HARNESSES.filter(
      (id) =>
        (!allowedHarnesses || allowedHarnesses.includes(id)) &&
        !isProviderHidden(project, id) &&
        showProviderInModelPicker(id, source.available(id), source.probed()),
Hunk @468 (5/1 side lines)
ours:
    // Blanket probes skip the Antigravity ACP handshake: opening this picker
    // is explicit discovery, and the catalog run below reports Antigravity
    // evidence from the shared runtime instead of launching both at once.
    void probeHarnessAvailability({ exclude: ["antigravity"] });
    void refreshHarnessCatalogs([current.harness]);
upstream:
    source.refresh([current.harness]);
Hunk @1483 (2/2 side lines)
ours:
                : tab !== "favorites" && !isHarnessAvailable(tab)
                  ? (providerRowTitle(tab) ?? "No matching models")
upstream:
                : tab !== "favorites" && !source.available(tab)
                  ? harnessUnavailableHint(tab)
## src/features/sessions/ui/SessionPane.tsx — content; 2 hunks; side diffs 125/275 lines
Hunk @102 (1/3 side lines)
ours:
import { type ReviewIssue } from "../../inbox/model/githubTasks";
upstream:
import { RemoteSession } from "../../connections/ui/RemoteSession";
import { isRemoteProjectPath } from "../../projects/model/recents";
import type { HostSession } from "../../connections/model/protocol";
Hunk @328 (2/5 side lines)
ours:
  onBranch,
  onSidechat,
upstream:
  onBtwSubmit,
  onBtwRetry,
  onBtwDelete,
  onBtwStop,
  onBtwModelChange,
## src/features/settings/model/appearance.ts — content; 2 hunks; side diffs 946/110 lines
Hunk @2 (6/3 side lines)
ours:
import { isHexColor } from "../../../shared/lib/colorUtils";
import {
  persistWallpaper,
  retainManagedWallpaper,
} from "../../../platform/tauri/fs";
import { HAS_NATIVE_GLASS, IS_MAC, IS_WINDOWS } from "../../../platform/tauri/platform";
upstream:
import { hslToRgb, isHexColor, type Rgb } from "../../../shared/lib/colorUtils";
import { IS_LINUX, IS_MAC } from "../../../platform/tauri/platform";
import { readFlag, writeFlag } from "./storageFlags";
Hunk @1165 (13/0 side lines)
ours:
  document.documentElement.classList.toggle("is-windows", IS_WINDOWS);
  document.documentElement.classList.toggle("has-glass", IS_MAC || IS_WINDOWS);
  document.documentElement.classList.toggle("has-native-glass", HAS_NATIVE_GLASS);
  applyUiScale(loadUiScale());
[middle retained in evidence JSON]
  applyPopoverHighlight(loadPopoverHighlight());
  applyWallpaperOpacity(loadWallpaperOpacity());
  applyWindowGlassStrength(loadWindowGlassStrength());
upstream:
## src/features/settings/model/settings.test.ts — content; 5 hunks; side diffs 346/301 lines
Hunk @4 (1/1 side lines)
ours:
  DETAILED_CONTEXT_DEFAULT,
upstream:
  AUTOSAVE_DEFAULT,
Hunk @24 (2/1 side lines)
ours:
  loadDetailedContext,
  loadComposerEffortVisible,
upstream:
  loadAutosave,
Hunk @40 (1/3 side lines)
ours:
  loadRemainingQuota,
upstream:
  keybindingPressed,
  matchCustomKeybinding,
  loadQuickComposerShortcut,
Hunk @51 (2/1 side lines)
ours:
  saveDetailedContext,
  saveComposerEffortVisible,
upstream:
  saveAutosave,
Hunk @66 (11/3 side lines)
ours:
  saveRemainingQuota,
  SETTINGS_SECTIONS,
  settingsSectionDescription,
  settingsSectionLabel,
[middle retained in evidence JSON]
  loadAiHelperSettings,
  parseAiHelperSettings,
  saveAiHelperSettings,
upstream:
  saveKeybindingOverride,
  type KeybindingOverride,
  saveQuickComposerShortcut,
## src/features/settings/ui/SettingsView.tsx — content; 14 hunks; side diffs 1612/1296 lines
Hunk @251 (2/0 side lines)
ours:
  hasLiveCatalog,
  isPickerProviderVisible,
upstream:
Hunk @372 (2/1 side lines)
ours:
  KEYBINDINGS,
  loadAiHelperSettings,
upstream:
  currentKeybindings,
Hunk @391 (1/3 side lines)
ours:
  loadRemainingQuota,
upstream:
  loadKeybindingOverrides,
  loadQuickComposerEnabled,
  loadQuickComposerShortcut,
Hunk @413 (1/6 side lines)
ours:
  saveRemainingQuota,
upstream:
  saveKeybindingOverride,
  validateKeybindingShortcut,
  saveQuickComposerEnabled,
  saveQuickComposerShortcut,
  subscribeKeybindings,
  type KeybindingOverride,
Hunk @1292 (61/14 side lines)
ours:
        title="AI helper"
        description="Which model writes chat titles, commit messages and pull request descriptions."
      >
        <Row
[middle retained in evidence JSON]
            </p>
          </>
        ) : null}
upstream:
        title="Editor"
        description="What happens when you save a file in the workspace editor."
      >
        <Row
[middle retained in evidence JSON]
            onChange={onFormatOnSave}
          />
        </Row>
Hunk @3573 (2/336 side lines)
ours:
/** Settings page that owns the initial provider discovery lifecycle. */
export function ProvidersPage(): ReactElement {
upstream:
const GLOBAL_PROVIDER_SCOPE = "global";

function binaryInspectionError(
  provider: ConfigurableBinaryProvider,
[middle retained in evidence JSON]
  cwd?: string;
  recents?: RecentProject[];
}) {
Hunk @3933 (17/43 side lines)
ours:
  const [updateNotices, setUpdateNotices] = useState<CliUpdateNotice[]>([]);
  const notifiedRef = useRef<Set<HarnessId>>(new Set());
  const runUpdateCheck = useCallback(async () => {
    const notices = await checkCliUpdates({
[middle retained in evidence JSON]
      return fresh.length > 0 ? [...current, ...fresh] : current;
    });
  }, []);
upstream:
  const [scope, setScope] = useState<string>(GLOBAL_PROVIDER_SCOPE);
  const [hiddenGlobally, setHiddenGlobally] = useState(
    loadHiddenPickerProviders,
  );
[middle retained in evidence JSON]
        projectSettings.defaultHarness ?? choice?.harness ?? "cursor",
      )
    : (choice?.harness ?? null);
Hunk @4143 (9/22 side lines)
ours:
                : defaultModelId(harness))
            }
            isDefault={choice?.harness === harness}
            initialLoading={initialLoading}
[middle retained in evidence JSON]
            onCatalogRefreshed={runUpdateCheck}
          />
        ))}
upstream:
                : defaultModelId(harness)))
            : (defaultModels[harness] ??
              (choice?.harness === harness
                ? choice.model
[middle retained in evidence JSON]
            />
          );
        })}
Hunk @4551 (4/5 side lines)
ours:
  initialLoading,
  onDefault,
  onModelChange,
  onCatalogRefreshed,
upstream:
  inPicker,
  pickerLocked = false,
  onDefault,
  onModelChange,
  onPickerVisible,
Hunk @4567 (5/7 side lines)
ours:
  initialLoading?: boolean;
  onDefault: (harness: HarnessId, model: string) => void;
  onModelChange: (harness: HarnessId, model: string) => void;
  onCatalogRefreshed?: () => void;
}): ReactElement {
upstream:
  inPicker: boolean;
  /** Globally hidden providers cannot be turned on per project. */
  pickerLocked?: boolean;
  onDefault: (harness: HarnessId, model: string) => void;
  onModelChange: (harness: HarnessId, model: string) => void;
  onPickerVisible: (visible: boolean) => void;
}) {
Hunk @4587 (8/0 side lines)
ours:
  const [inPicker, setInPicker] = useState(() =>
    isPickerProviderVisible(harness),
  );
  const [customBinaryPath, setCustomBinaryPath] = useState<string | null>(() =>
    getCustomBinary(harness),
  );
  const [rechecking, setRechecking] = useState(false);
  const initialDiscoveryFinished = useRef(false);
upstream:
Hunk @4612 (77/11 side lines)
ours:
  const onPickerVisible = (visible: boolean) => {
    savePickerProviderVisible(harness, visible);
    setInPicker(visible);
  };
[middle retained in evidence JSON]
                Reset
              </button>
            </div>
upstream:
  return (
    <Row
      label={
        <span className="flex items-center gap-2">
[middle retained in evidence JSON]
            <span className="rounded-full bg-content/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-content/60">
              Default
            </span>
Hunk @5431 (7/1 side lines)
ours:
  options: {
    value: string;
    label: string;
    disabled?: boolean;
    title?: string;
    description?: string;
  }[];
upstream:
  options: { value: string; label: string; icon?: ReactNode }[];
Hunk @5614 (8/6 side lines)
ours:
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-content/45">
                      {option.description}
                    </span>
                  ) : null}
                </span>
upstream:
                {option.icon ? (
                  <span className="grid size-4 shrink-0 place-items-center">
                    {option.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
## src/features/source-control/model/unifiedDiff.ts — content; 1 hunks; side diffs 13/15 lines
Hunk @3 (1/1 side lines)
ours:
import { decodeLineEndings } from "../../sessions/model/lineEndings";
upstream:
import { LINE_DIFF_CONFIG } from "./lineDiff";
## src/features/source-control/ui/GitChangesPanel.test.ts — content; 3 hunks; side diffs 262/168 lines
Hunk @6 (1/5 side lines)
ours:
const mocks = vi.hoisted(() => ({
upstream:
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(async () => {}),
}));

const { invalidateWatchedFiles } = vi.hoisted(() => ({
Hunk @64 (4/10 side lines)
ours:
  gitPull,
  gitPush,
  gitPrCreate,
} from "../../../platform/tauri/fs";
upstream:
  gitPrCreate,
  gitPull,
  gitPush,
  gitRangeContext,
[middle retained in evidence JSON]
  generatePrContent,
} from "../../../integrations/harness";
import { openUrl } from "@tauri-apps/plugin-opener";
Hunk @116 (9/2 side lines)
ours:
  mocks.invalidateWatchedFiles.mockReset();
  mocks.generateHelperCommitMessage.mockReset();
  mocks.generateHelperPrContent.mockReset();
  mocks.helperFailureMessage.mockReset().mockReturnValue(
[middle retained in evidence JSON]
  mocks.openUrl.mockReset();
  vi.mocked(gitPush).mockReset();
  vi.mocked(gitPrCreate).mockReset();
upstream:
  vi.mocked(generateCommitMessage).mockReset();
  invalidateWatchedFiles.mockReset();
## src/features/source-control/ui/GitChangesPanel.tsx — content; 12 hunks; side diffs 303/256 lines
Hunk @74 (6/3 side lines)
ours:
  generateHelperCommitMessage,
  generateHelperPrContent,
  helperFailureMessage,
  type HelperPrDraft,
} from "../../../integrations/harness";
import { PrDetailsDialog } from "./PrDetailsDialog";
upstream:
  generateCommitMessage,
  generatePrContent,
} from "../../../integrations/harness";
Hunk @125 (8/3 side lines)
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;
  onOpenCommit: (commit: GitHistoryCommit) => void;
upstream:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges: (kind: GitFileDiffKind) => void;
  onOpenCommit: (commit: GitHistoryCommit, pin?: boolean) => void;
Hunk @380 (7/2 side lines)
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;
upstream:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges: (kind: GitFileDiffKind) => void;
Hunk @397 (1/1 side lines)
ours:
  const commitGeneration = useRef<AbortController | null>(null);
upstream:
  const generateAbortRef = useRef<AbortController | null>(null);
Hunk @589 (7/6 side lines)
ours:
    if (!canGenerate) return;
    const startText = messageRef.current?.value ?? message;
    const controller = new AbortController();
    commitGeneration.current = controller;
    setBusy("generate");
    try {
      const generated = await generateHelperCommitMessage(
upstream:
    if (!canGenerate || generateAbortRef.current) return;
    const controller = new AbortController();
    generateAbortRef.current = controller;
    setBusy("generate");
    try {
      const generated = await generateCommitMessage(
Hunk @609 (15/8 side lines)
ours:
      if (controller.signal.aborted) return;
      if ((messageRef.current?.value ?? message) !== startText) {
        fail(
          "A commit message was generated, but you edited the field, so it wasn't applied.",
[middle retained in evidence JSON]
        commitGeneration.current = null;
      }
      if (!controller.signal.aborted) setBusy(null);
upstream:
      if (!controller.signal.aborted) setMessage(generated);
    } catch (error) {
      if (!controller.signal.aborted) fail(error);
    } finally {
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
        setBusy(null);
      }
Hunk @719 (1/5 side lines)
ours:
  const createPullRequest = async (content: HelperPrDraft) => {
upstream:
  const openCreatedPr = async () => {
    const content = isRemoteProjectPath(cwd)
      ? await remotePrContent(cwd)
      : await generatePrContent(cwd, textHarness);
    if (!content) throw new Error("Could not prepare pull request content");
Hunk @975 (9/5 side lines)
ours:
                  ...(onOpenAllChanges
                    ? [
                        {
                          title: "Open All Changes",
[middle retained in evidence JSON]
                        },
                      ]
                    : []),
upstream:
                  {
                    title: "Open All Changes",
                    icon: <FileDiff className="size-3.5" strokeWidth={1.75} />,
                    onClick: () => onOpenAllChanges("staged"),
                  },
Hunk @1023 (9/5 side lines)
ours:
                  ...(onOpenAllChanges
                    ? [
                        {
                          title: "Open All Changes",
[middle retained in evidence JSON]
                        },
                      ]
                    : []),
upstream:
                  {
                    title: "Open All Changes",
                    icon: <FileDiff className="size-3.5" strokeWidth={1.75} />,
                    onClick: () => onOpenAllChanges("unstaged"),
                  },
Hunk @1390 (6/1 side lines)
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
upstream:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
Hunk @1602 (6/1 side lines)
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
upstream:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
Hunk @1640 (1/4 side lines)
ours:
          className="flex h-full w-full min-w-0 items-center gap-1.5 px-2 text-left rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
upstream:
          onDoubleClick={() => {
            if (canOpen) onOpenFile(file.path, kind, true);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
## src/features/source-control/ui/SourceControl.tsx — content; 1 hunks; side diffs 16/9 lines
Hunk @12 (7/2 side lines)
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;
upstream:
  onOpenFile: (path: string, kind: GitFileDiffKind) => void;
  onOpenAllChanges: (kind: GitFileDiffKind) => void;
## src/features/source-control/ui/SwitchBranchDialog.test.ts — add/add; 2 hunks; side diffs 148/81 lines
Hunk @3 (73/43 side lines)
ours:
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
[middle retained in evidence JSON]

    await act(async () => {
      document.body
upstream:
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SwitchBranchDialog } from "./SwitchBranchDialog";
import { generateCommitMessage } from "../../../integrations/harness";
[middle retained in evidence JSON]

    await act(async () => {
      document
Hunk @127 (61/24 side lines)
ours:
    const field = document.body.querySelector<HTMLTextAreaElement>(
      '[aria-label="Commit message"]',
    )!;
    expect(field.disabled).toBe(false);
[middle retained in evidence JSON]

    expect(document.body.querySelector('[aria-label="Commit message"]')).toBeNull();
  });
upstream:
    const signal = vi.mocked(generateCommitMessage).mock.calls[0]?.[2];
    expect(signal?.aborted).toBe(false);

    await act(async () => {
[middle retained in evidence JSON]
    act(() => root.unmount());
    mount.remove();
  }
## src/features/source-control/ui/SwitchBranchDialog.tsx — content; 3 hunks; side diffs 65/121 lines
Hunk @83 (7/6 side lines)
ours:
    if (busy || generating) return;
    const startText = messageRef.current?.value ?? message;
    const controller = new AbortController();
    generationController.current = controller;
    setGenerating(true);
    try {
      const generated = await generateHelperCommitMessage(
upstream:
    if (busy || generating || generateAbortRef.current) return;
    const controller = new AbortController();
    generateAbortRef.current = controller;
    setGenerating(true);
    try {
      const generated = await generateCommitMessage(
Hunk @103 (8/1 side lines)
ours:
      if (controller.signal.aborted) return;
      if ((messageRef.current?.value ?? message) !== startText) {
        window.alert(
          "A commit message was generated, but you edited the field, so it wasn't applied.",
        );
        return;
      }
      setMessage(generated);
upstream:
      if (!controller.signal.aborted) setMessage(generated);
Hunk @120 (4/2 side lines)
ours:
      if (generationController.current === controller) {
        generationController.current = null;
      }
      if (!controller.signal.aborted) {
upstream:
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
## src/features/source-control/ui/WorkingTreeDiff.tsx — content; 1 hunks; side diffs 18/42 lines
Hunk @155 (1/1 side lines)
ours:
  }, [cwd, focusPath, focusKind]);
upstream:
  }, [cwd, focusKind]);
## src/features/workspace/model/layout.ts — content; 2 hunks; side diffs 77/234 lines
Hunk @467 (4/1 side lines)
ours:
    !isTerminalTab(file) &&
    !isVirtualDocumentTab(file) &&
    !file.sessionChanges &&
    !file.diff
upstream:
    !isTerminalTab(file) && !isVirtualDocumentTab(file) && !file.sessionChanges
Hunk @726 (4/5 side lines)
ours:
    const updated: FilePaneTab = {
      ...existingFile,
      ...(focusPath ? { path: focusPath } : {}),
      ...(focusKind ? { changeKind: focusKind, focusKind } : {}),
upstream:
    const { changeKind: _previousKind, ...rest } = existingFile;
    const updated = {
      ...rest,
      ...(focusPath ? { path: focusPath } : {}),
      ...(focusKind ? { changeKind: focusKind } : {}),
## src/features/workspace/model/workspaceSnapshot.test.ts — content; 1 hunks; side diffs 195/185 lines
Hunk @16 (1/1 side lines)
ours:
  newGitDiffTab,
upstream:
  newEditorWorkspaceTab,
## src/features/workspace/model/workspaceSnapshot.ts — content; 3 hunks; side diffs 187/214 lines
Hunk @380 (4/3 side lines)
ours:
    // Never normalize against the fallback catalog here: live catalogs load
    // lazily after boot, and resolving now would replace a valid persisted
    // model (e.g. an Antigravity native id) with a fallback default.
    model: stub.model,
upstream:
    // A snapshot is a saved choice, not a new conversation. Catalog discovery
    // and the current picker preferences must not replace its model.
    model: stub.model || session.model,
Hunk @571 (11/20 side lines)
ours:
  const hasDiff = "diff" in value;
  const diff = sanitizeGitDiff(value.diff);
  const hasFocusKind = "focusKind" in value;
  const focusKind = sanitizeFocusKind(value.focusKind);
[middle retained in evidence JSON]
  if (hasDiff && !diff) return null;
  if (hasFocusKind && !focusKind) return null;

upstream:
  const hasRemoteFile = "remoteFile" in value;
  const remoteFile = sanitizeRemoteFile(value.remoteFile);
  if (hasReleaseNotes && !releaseNotes) return null;
  if (hasCommit && !commit) return null;
[middle retained in evidence JSON]
      value.terminal === true)
  )
    return null;
Hunk @656 (2/2 side lines)
ours:
    path: value.path,
    cwd: repairLegacyEncodedDriveColon(value.cwd),
upstream:
    path: remoteOwner ? remotePath(remoteOwner.environmentId, value.path) : value.path,
    cwd: remoteOwner ? remotePath(remoteOwner.environmentId, value.cwd) : value.cwd,
## src/features/workspace/ui/PaneTree.tsx — content; 2 hunks; side diffs 59/88 lines
Hunk @20 (2/0 side lines)
ours:
  ApprovalScope,
  McpFormReply,
upstream:
Hunk @542 (2/5 side lines)
ours:
                onBranch={onBranch}
                onSidechat={onSidechat}
upstream:
                onBtwSubmit={onBtwSubmit}
                onBtwRetry={onBtwRetry}
                onBtwDelete={onBtwDelete}
                onBtwStop={onBtwStop}
                onBtwModelChange={onBtwModelChange}
## src/integrations/harness/core/apply.ts — content; 3 hunks; side diffs 180/219 lines
Hunk @548 (7/3 side lines)
ours:
export function stopStreaming(session: Session): Session {
    const settled = settlePendingApprovals(session);
    let blocks = settled.blocks.map(stopBlockProgress);
    if (session.liveTurnUsage) {
      blocks = stampTurnUsage(blocks, session.liveTurnUsage);
    }
    blocks = stampTurnDuration(blocks);
upstream:
export function stopStreaming(session: Session, endedAt = Date.now()): Session {
  const { backgroundTasks: _cleared, ...settled } =
    settlePendingApprovals(session);
Hunk @565 (2/1 side lines)
ours:
    liveTurnUsage: undefined,
    blocks,
upstream:
    blocks: stampTurnDuration(settled.blocks.map(stopBlockProgress), endedAt),
Hunk @739 (7/2 side lines)
ours:
/**
 * Resolves the block index of the user turn that owns provider telemetry and duration:
 * 1. The most recent user block with startedAt present and no completed duration (active turn owner).
 * 2. Fallback for settled or late events: the most recent user block with startedAt present.
 * 3. Fallback for legacy blocks or test mocks without startedAt: the most recent user block.
 */
function findTurnOwnerIndex(blocks: Block[]): number {
upstream:
function stampTurnDuration(blocks: Block[], endedAt: number): Block[] {
  let lastUser = -1;
## src/integrations/harness/core/availability.ts — content; 3 hunks; side diffs 124/89 lines
Hunk @61 (20/1 side lines)
ours:
let availability: HarnessAvailability = {
  claude: false,
  codex: false,
  cursor: false,
[middle retained in evidence JSON]
const evidenced = new Set<HarnessId>();
let antigravityProbeError: string | null = null;
const listeners = new Set<() => void>();
upstream:
let inflight: Promise<void> | null = null;
Hunk @94 (51/0 side lines)
ours:
function emit() {
  version += 1;
  for (const listener of listeners) listener();
}
[middle retained in evidence JSON]
  emit();
}

upstream:
Hunk @289 (9/4 side lines)
ours:
      const next = { ...availability };
      for (const entry of entries) {
        if (!entry) continue;
        const [id, ok] = entry;
[middle retained in evidence JSON]
      }
      availability = next;
      emit();
upstream:
      const next = {} as HarnessAvailability;
      for (const [id, ok] of entries) next[id] = ok;
      setHarnessAvailability(next);
      emitHarnessAvailability();
## src/integrations/harness/core/child.ts — content; 3 hunks; side diffs 81/268 lines
Hunk @1 (3/51 side lines)
ours:
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { HarnessId } from "../../../features/sessions/model/session";
upstream:
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  runtimeProviderBinaryPath,
[middle retained in evidence JSON]
): Promise<UnlistenFn> {
  return backend ? backend.listen(event, handler) : tauriListen(event, handler);
}
Hunk @345 (51/71 side lines)
ours:
import { getCustomBinary } from "./customBinary";

function resolveBinary(id: HarnessId, command: string): Promise<{ path: string }> {
  return invoke(command, { overridePath: getCustomBinary(id) });
[middle retained in evidence JSON]

export function resolveClineBinary(): Promise<{ path: string }> {
  return resolveBinary("cline", "harness_resolve_cline");
upstream:
type ResolvedHarnessBinary = { path: string; args?: string[] };

async function resolveHarnessBinary(
  provider: ConfigurableBinaryProvider,
[middle retained in evidence JSON]
  binaryPath?: string | null,
): Promise<{ path: string }> {
  return resolveHarnessBinary("fx", binaryPath);
Hunk @478 (0/15 side lines)
ours:
upstream:
export function resolveHermesBinary(
  binaryPath?: string | null,
): Promise<{ path: string }> {
  return resolveHarnessBinary("hermes", binaryPath);
[middle retained in evidence JSON]
  }>;
}

## src/integrations/harness/core/registry.test.ts — content; 1 hunks; side diffs 55/183 lines
Hunk @67 (26/14 side lines)
ours:
  it("lets adapters that do not use session scope keep their approval behavior", () => {
    const decisions: string[] = [];
    registerHarness(
      stub("cursor", {
[middle retained in evidence JSON]
    const compactContext = vi.fn(async () => undefined);
    registerHarness(stub("codex", { compactContext }));
    registerHarness(stub("claude"));
upstream:
  it("advertises isolated text prompt support by harness", () => {
    registerBuiltinHarnesses();
    const ids: HarnessId[] = [
      "claude",
[middle retained in evidence JSON]
      "hermes",
      "antigravity",
    ];
## src/integrations/harness/core/registry.ts — content; 5 hunks; side diffs 104/189 lines
Hunk @1 (2/6 side lines)
ours:
import type { NativeContextBreakdown } from "../../../features/sessions/model/contextBreakdown";
import type { HarnessId } from "../../../features/sessions/model/session";
upstream:
import type {
  Block,
  HarnessId,
  TaskListMeta,
  TurnIntent,
} from "../../../features/sessions/model/session";
Hunk @37 (7/13 side lines)
ours:
export type HelperPromptInput = {
  cwd: string;
  prompt: string;
  timeoutMs: number;
  providerAccountId?: string;
  model?: string;
  outputSchema?: Record<string, unknown>;
upstream:
/** One-shot, isolated text generation shared by titles and side questions. */
export type TextPromptInput = {
  cwd: string;
  providerAccountId?: string;
[middle retained in evidence JSON]
  timeoutMs?: number;
  signal?: AbortSignal;
  onEvent?: (event: HarnessEvent) => void;
Hunk @127 (2/4 side lines)
ours:
  /** Isolated text generation used by user-selected AI helpers. */
  runHelperPrompt?(input: HelperPromptInput): Promise<string>;
upstream:
  /** Run an isolated, read-only prompt without mutating the main session. */
  runTextPrompt?(input: TextPromptInput): Promise<string>;
  /** Stop an isolated text-generation backend. */
  stopTextPrompt?(): Promise<void>;
Hunk @439 (2/0 side lines)
ours:
        // A landed overlay counts as live and blocks repeats on the auto path;
        // manual Recheck must be able to replace a stale or fallback catalog.
upstream:
Hunk @511 (6/88 side lines)
ours:
export async function inspectHarnessContext(
  harness: HarnessId,
  sessionId: string,
  signal?: AbortSignal,
): Promise<NativeContextBreakdown | null> {
  return getHarness(harness)?.inspectContext?.(sessionId, signal) ?? null;
upstream:
export function canRunHarnessTextPrompt(harness: HarnessId): boolean {
  const adapter = getHarness(harness);
  return adapter?.live === true && adapter.runTextPrompt != null;
}
[middle retained in evidence JSON]

export async function stopHarnessTextPrompts(): Promise<void> {
  await Promise.all([...adapters.values()].map(stopTextPrompt));
## src/integrations/harness/index.ts — content; 1 hunks; side diffs 41/42 lines
Hunk @194 (1/3 side lines)
ours:
  runHarnessHelperPrompt,
upstream:
  canRunHarnessTextPrompt,
  runHarnessTextPrompt,
  stopHarnessTextPrompts,
## src/integrations/harness/providers/antigravity/antigravity.ts — modify/delete; 0 hunks; side diffs 834/16 lines
## src/integrations/harness/providers/antigravity/antigravityCatalog.ts — modify/delete; 0 hunks; side diffs 84/63 lines
## src/integrations/harness/providers/antigravity/antigravityLive.test.ts — modify/delete; 0 hunks; side diffs 851/34 lines
## src/integrations/harness/providers/antigravity/antigravityProtocol.test.ts — modify/delete; 0 hunks; side diffs 120/23 lines
## src/integrations/harness/providers/claude/claude.ts — content; 5 hunks; side diffs 778/560 lines
Hunk @211 (3/1 side lines)
ours:
  requestsById: Map<string, ProcessedUsage>;
  priorTurnsUsage?: ProcessedUsage;
  turnUsage?: ProcessedUsage;
upstream:
  pendingAssistantBoundary: boolean;
Hunk @229 (30/19 side lines)
ours:
const CONTROL_TIMEOUT_MS = 5_000;

export type ClaudeControlFailure =
  | "error"
[middle retained in evidence JSON]
    rules: ClaudeSessionRule[];
  }
>();
upstream:
/**
 * How long a finished background task may take to wake Claude before the turn
 * is let go anyway. The follow-up turn normally starts within a second or two.
 */
[middle retained in evidence JSON]
>();
/** Task-list block key for TaskCreate/TaskUpdate items. */
const CLAUDE_TASKS_KEY = "claude-tasks";
Hunk @465 (1/1 side lines)
ours:
  sessionGrantsByThread.delete(sessionId);
upstream:
  tasksByThread.delete(sessionId);
Hunk @671 (3/1 side lines)
ours:
    requestsById: new Map(),
    priorTurnsUsage: undefined,
    turnUsage: undefined,
upstream:
    pendingAssistantBoundary: false,
Hunk @2324 (1/1 side lines)
ours:
  sessionGrantsByThread.clear();
upstream:
  tasksByThread.clear();
## src/integrations/harness/providers/claude/claudeAdapter.ts — content; 2 hunks; side diffs 22/26 lines
Hunk @21 (1/5 side lines)
ours:
import { runClaudeTextPrompt, warmupClaudeText } from "./claudeText";
upstream:
import {
  runClaudeTextPrompt,
  stopClaudeTextPrompt,
  warmupClaudeText,
} from "./claudeText";
Hunk @52 (2/2 side lines)
ours:
  runHelperPrompt: ({ cwd, prompt, timeoutMs, providerAccountId, model }) =>
    runClaudeTextPrompt({ cwd, prompt, timeoutMs, providerAccountId, model }),
upstream:
  runTextPrompt: runClaudeTextPrompt,
  stopTextPrompt: stopClaudeTextPrompt,
## src/integrations/harness/providers/claude/claudeCatalog.ts — content; 2 hunks; side diffs 88/148 lines
Hunk @407 (8/1 side lines)
ours:
  // The `default` slot is the moving alias the CLI points at its current
  // default model (Opus 5.5 on v2.1.267, whose banner says so). Its concrete
  // target in `resolvedModel` must reach the picker whenever no other row
  // names that model - dropping the slot silently hid every new default.
  const placeholder = !value || value === "default";
  const nativeId = placeholder
    ? fromResolved.id
    : fromValue.id || fromResolved.id;
upstream:
  const nativeId = claudeLaunchId(fromValue.id, fromResolved.id);
Hunk @423 (6/5 side lines)
ours:
  let name = pickerName(displayName, description, nativeId, fromResolved.id);
  if (placeholder && /^default/i.test(name)) {
    const pretty = resolvedClaudeModelName(fromResolved.id);
    name = pretty ? `${pretty.family} ${pretty.version}` : nativeId;
  }
  const settings = settingsFromListRow(rec, fromValue.context1m || fromResolved.context1m);
upstream:
  const name = pickerName(displayName, description, nativeId, fromResolved.id);
  const settings = settingsFromListRow(
    rec,
    fromValue.context1m || fromResolved.context1m,
  );
## src/integrations/harness/providers/claude/claudeLive.test.ts — content; 1 hunks; side diffs 721/1220 lines
Hunk @39 (1/1 side lines)
ours:
  inspectClaudeContext,
upstream:
  cancelClaudeTurn,
## src/integrations/harness/providers/claude/claudeProtocol.test.ts — content; 1 hunks; side diffs 385/161 lines
Hunk @1234 (73/27 side lines)
ours:
describe("Claude helper spawn arguments", () => {
  it("disables tools and slash commands only for isolated helper spawns", () => {
    const helperArgs = buildClaudeSpawnArgs({
      isolated: true,
[middle retained in evidence JSON]
        categories: [{ name: "bad", tokens: -1 }],
      }),
    ).toBeNull();
upstream:
describe("applyClaudeTaskTool", () => {
  it("creates from the result id, updates, renames and deletes", () => {
    const tasks = new Map();
    expect(
[middle retained in evidence JSON]
    expect(applyClaudeTaskTool(tasks, "TaskUpdate", { taskId: "9", status: "completed" }, "")).toBe(false);
    expect(applyClaudeTaskTool(tasks, "TaskList", {}, "#1 [pending] One")).toBe(false);
    expect(tasks.size).toBe(0);
## src/integrations/harness/providers/claude/claudeText.ts — content; 15 hunks; side diffs 132/296 lines
Hunk @17 (1/3 side lines)
ours:
  parseControlRequest,
upstream:
  inputJsonDeltaFromEvent,
  isClaudeUltracodeEffort,
  normalizeClaudeCliEffort,
Hunk @29 (1/5 side lines)
ours:
  toClaudePermissionResult,
upstream:
  summarizeToolRequest,
  toolKindFromName,
  toolStartFromEvent,
  toolTitle,
  tryParseJsonRecord,
Hunk @72 (0/1 side lines)
ours:
upstream:
  settingsKey: string;
Hunk @147 (0/2 side lines)
ours:
upstream:
  modelSettings?: Record<string, string>;
  intent?: TurnIntent;
Hunk @169 (0/2 side lines)
ours:
upstream:
  modelSettings?: Record<string, string>;
  intent?: TurnIntent;
Hunk @179 (5/10 side lines)
ours:
  const session = await ensureLive(
    input.cwd,
    input.providerAccountId,
    input.model,
  );
upstream:
  input.signal?.throwIfAborted();
  const model = pickTextModel(input.model);
  const settings = textSettings(model, input.modelSettings, input.intent);
  const session = await ensureLive(
[middle retained in evidence JSON]
    settings,
  );
  input.signal?.throwIfAborted();
Hunk @203 (1/12 side lines)
ours:
  let timeout: ReturnType<typeof setTimeout> | undefined;
upstream:
  let abortHandler: (() => void) | undefined;
  const abortPromise = input.signal
    ? new Promise<never>((_, reject) => {
        const cancel = () => {
[middle retained in evidence JSON]
        if (input.signal!.aborted) cancel();
      })
    : null;
Hunk @254 (1/3 side lines)
ours:
    if (timeout !== undefined) clearTimeout(timeout);
upstream:
    if (abortHandler && input.signal) {
      input.signal.removeEventListener("abort", abortHandler);
    }
Hunk @272 (2/4 side lines)
ours:
): Promise<LiveText> {
  const model = requestedModel ?? pickTextModel();
upstream:
  requestedSettings?: TextSettings,
): Promise<LiveText> {
  const model = pickTextModel(requestedModel);
  const settings = requestedSettings ?? textSettings(model);
Hunk @286 (1/2 side lines)
ours:
    live.model === model
upstream:
    live.model === model &&
    live.settingsKey === settings.key
Hunk @296 (1/1 side lines)
ours:
  return startLive(cwd, providerAccountId, model);
upstream:
  return startLive(cwd, providerAccountId, model, settings);
Hunk @307 (0/1 side lines)
ours:
upstream:
  settings = textSettings(model),
Hunk @317 (0/1 side lines)
ours:
upstream:
    settingsKey: settings.key,
Hunk @352 (2/5 side lines)
ours:
        model,
        noTools: true,
upstream:
        model: settings.launchModel,
        effort: settings.effort,
        settings: settings.settings,
        permissionMode: settings.permissionMode,
        maxTurns: settings.maxTurns,
Hunk @444 (22/61 side lines)
ours:
async function denyToolRequest(
  session: LiveText,
  requestId: string,
  input: Record<string, unknown>,
[middle retained in evidence JSON]
function failToolAttempt(session: LiveText, toolKind: string): void {
  session.turnFailed?.(new HelperToolAttemptError("claude", toolKind));
  void dropLive();
upstream:
function handleStreamEvent(
  session: LiveText,
  rec: Record<string, unknown>,
): void {
[middle retained in evidence JSON]
    detail: summarizeToolRequest(tool.name, parsed),
    preview: previewFromTool(tool.name, parsed),
  });
## src/integrations/harness/providers/codex/codex.ts — content; 8 hunks; side diffs 605/403 lines
Hunk @49 (11/2 side lines)
ours:
import {
  codexMcpApprovalKindKeys,
  codexMcpConfirmation,
  codexMcpForm,
[middle retained in evidence JSON]
import { joinStreamText, snapshotRemainder } from "../../core/streamText";
import { NativeForkError } from "../../core/types";
import { buildThreadForkParams } from "./codexProtocol";
upstream:
import { codexMcpConfirmation } from "./codexElicitation";
import { snapshotRemainder } from "../../core/streamText";
Hunk @137 (8/6 side lines)
ours:
  emittedAssistant: string;
  emittedReasoning: string;
  /** Cumulative thread usage baseline established before the active turn started. */
  threadBaseline?: CodexRawUsageRecord;
  /** Cumulative thread usage snapshot last seen from Codex. */
  lastThreadTotal?: CodexRawUsageRecord;
  /** Processed usage for the active turn. */
  turnUsage?: ProcessedUsage;
upstream:
  /** Completed snapshots describe one item, not all text in the turn. */
  emittedAssistantByItem: Map<string, string>;
  emittedReasoningByItem: Map<string, string>;
  emittedGeneratedImages: Set<string>;
  turnGeneration: number;
  notificationQueue: Promise<void> | null;
Hunk @510 (2/9 side lines)
ours:
    resumeByThread.delete(input.sessionId);
    mcpGrantsByThread.delete(input.sessionId);
upstream:
    // Codex may retain the thread's sandbox network policy across turns.
    // Switch it when this session gains /operator access or loses agent
    // control, so its local CLI socket matches the current policy.
    if (
[middle retained in evidence JSON]
    ) {
      resumeByThread.delete(input.sessionId);
    }
Hunk @783 (5/4 side lines)
ours:
  live.emittedAssistant = "";
  live.emittedReasoning = "";
  live.inProgressMcpTools.clear();
  live.threadBaseline = live.lastThreadTotal;
  live.turnUsage = undefined;
upstream:
  live.emittedAssistantByItem.clear();
  live.emittedReasoningByItem.clear();
  live.emittedGeneratedImages.clear();
  live.turnGeneration += 1;
Hunk @1040 (25/17 side lines)
ours:
  if (mapped.tokenUsage?.total) {
    const total = mapped.tokenUsage.total;
    const last = mapped.tokenUsage.last;
    if (live.threadBaseline === undefined) {
[middle retained in evidence JSON]
  }
  if (mapped.turnCompleted) {
    finishActiveTurn(live);
upstream:
}

/** Rate-limit updates are sparse: a missing window keeps its last reading. */
function noteRateLimits(live: Live, update: Record<string, unknown>): void {
[middle retained in evidence JSON]
  for (const windows of live.rateLimits.values()) {
    const resetsAt = exhaustedWindowResetAt(parseCodexRateLimits(windows));
    if (resetsAt != null) latest = Math.max(latest ?? 0, resetsAt);
Hunk @1287 (3/5 side lines)
ours:
  live.emittedAssistant = "";
  live.emittedReasoning = "";
  live.inProgressMcpTools.clear();
upstream:
  live.emittedAssistantByItem.clear();
  live.emittedReasoningByItem.clear();
  live.emittedGeneratedImages.clear();
  live.subagentThreads.clear();
  live.pendingSubagent.clear();
Hunk @1390 (66/1 side lines)
ours:
    const confirmation = codexMcpConfirmation(
      params,
      threadId === live.threadId ? [...live.inProgressMcpTools.values()] : [],
    );
[middle retained in evidence JSON]
      if (outcome === "cancelled") return;
      const sessionGrant =
        decision === "allow" && scope === "session" && grantKey !== undefined;
upstream:
    if (!live.planning && live.runtimeMode === "full-access") {
Hunk @1492 (2/4 side lines)
ours:
    const event: Extract<HarnessEvent, { type: "form.requested" }> = {
      type: "form.requested",
upstream:
    const pending = waitApproval(live, uiId, id, "permissions", threadId);
    // MCP consent requires an explicit decision outside non-plan Full Access turns.
    live.onEvent({
      type: "approval.requested",
## src/integrations/harness/providers/codex/codexAdapter.ts — content; 2 hunks; side diffs 36/29 lines
Hunk @22 (2/10 side lines)
ours:
import { runCodexTextPrompt, warmupCodexText } from "./codexText";
import { registerHarness, type HarnessAdapter } from "../../core/registry";
upstream:
import {
  runCodexTextPrompt,
  stopCodexTextPrompt,
  warmupCodexText,
[middle retained in evidence JSON]
  registerHarness,
  type HarnessAdapter,
} from "../../core/registry";
Hunk @59 (16/2 side lines)
ours:
  runHelperPrompt: ({
    cwd,
    prompt,
    timeoutMs,
[middle retained in evidence JSON]
      model,
      outputSchema,
    }),
upstream:
  runTextPrompt: runCodexTextPrompt,
  stopTextPrompt: stopCodexTextPrompt,
## src/integrations/harness/providers/codex/codexCatalog.ts — content; 1 hunks; side diffs 198/131 lines
Hunk @82 (8/8 side lines)
ours:
  try {
    watchChild(
      PROBE_ID,
      (line) => rpc.pushLine(line),
      (code) =>
        rpc.close(new Error(`Codex probe exited (code ${code ?? "unknown"})`)),
    );
    await spawnChild(PROBE_ID, path, ["app-server"], cwd);
upstream:
  watchChild(
    probeId,
    (line) => rpc.pushLine(line),
    () => rpc.close(new Error("Codex probe exited")),
  );

  try {
    await spawnChild(probeId, path, ["app-server"], cwd, undefined, "codex");
## src/integrations/harness/providers/codex/codexElicitation.test.ts — content; 1 hunks; side diffs 386/33 lines
Hunk @1 (10/2 side lines)
ours:
import { afterEach, describe, expect, it } from "vitest";
import {
  codexMcpConfirmation,
  codexMcpForm,
[middle retained in evidence JSON]
} from "./codexElicitation";
import type { CodexInProgressMcpTool } from "./codexElicitation";
import type { McpFormField } from "../../../../features/sessions/model/mcpForm";
upstream:
import { describe, expect, it } from "vitest";
import { codexMcpConfirmation } from "./codexElicitation";
## src/integrations/harness/providers/codex/codexLive.test.ts — content; 1 hunks; side diffs 890/478 lines
Hunk @139 (1/1 side lines)
ours:
    fork?: NativeForkRequest;
upstream:
    controlsAgents?: boolean;
## src/integrations/harness/providers/codex/codexProtocol.ts — content; 1 hunks; side diffs 169/225 lines
Hunk @376 (1/4 side lines)
ours:
  tokenUsage?: CodexTokenUsagePayload;
upstream:
  /** Codex refused the turn because the account's usage limit is spent. */
  usageLimited?: boolean;
  /** A sparse `account/rateLimits/updated` snapshot. */
  rateLimits?: Record<string, unknown>;
## src/integrations/harness/providers/codex/codexText.ts — content; 13 hunks; side diffs 162/327 lines
Hunk @44 (1/1 side lines)
ours:
  toolAttempting: boolean;
upstream:
  onEvent?: (event: HarnessEvent) => void;
Hunk @115 (1/4 side lines)
ours:
  outputSchema?: Record<string, unknown>;
upstream:
  modelSettings?: Record<string, string>;
  threadId?: string;
  onThreadId?: (threadId: string) => void;
  intent?: TurnIntent;
Hunk @143 (1/4 side lines)
ours:
  outputSchema?: Record<string, unknown>;
upstream:
  modelSettings?: Record<string, string>;
  threadId?: string;
  onThreadId?: (threadId: string) => void;
  intent?: TurnIntent;
Hunk @156 (5/3 side lines)
ours:
  const session = await ensureLive(
    input.cwd,
    input.providerAccountId,
    input.model,
  );
upstream:
  input.signal?.throwIfAborted();
  const session = await ensureLive(input);
  input.signal?.throwIfAborted();
Hunk @171 (1/13 side lines)
ours:
  let timeout: ReturnType<typeof setTimeout> | undefined;
upstream:
  let abortHandler: (() => void) | undefined;
  const abortPromise = input.signal
    ? new Promise<void>((_, reject) => {
        abortHandler = () => {
[middle retained in evidence JSON]
        if (input.signal!.aborted) abortHandler();
      })
    : null;
Hunk @203 (1/2 side lines)
ours:
        outputSchema: input.outputSchema,
upstream:
        serviceTier: session.serviceTier,
        intent: input.intent,
Hunk @235 (1/3 side lines)
ours:
    if (timeout !== undefined) clearTimeout(timeout);
upstream:
    if (abortHandler && input.signal) {
      input.signal.removeEventListener("abort", abortHandler);
    }
Hunk @248 (8/12 side lines)
ours:

async function ensureLive(
  cwd: string,
  providerAccountId?: string,
  requestedModel?: string,
): Promise<LiveText> {
  const model = requestedModel ?? pickTextModel();
  const effort = pickTextEffort(model);
upstream:
async function ensureLive(input: {
  cwd: string;
  providerAccountId?: string;
  model?: string;
[middle retained in evidence JSON]
  const effort = pickTextEffort(model, input.modelSettings);
  const serviceTier = pickTextServiceTier(input.modelSettings);
  const requestedThreadId = input.threadId?.trim() || undefined;
Hunk @285 (1/10 side lines)
ours:
      return startLive(cwd, providerAccountId, model);
upstream:
      const started = await startLive(
        input.cwd,
        input.providerAccountId,
        model,
[middle retained in evidence JSON]
      );
      input.onThreadId?.(started.threadId);
      return started;
Hunk @312 (1/10 side lines)
ours:
  return startLive(cwd, providerAccountId, model);
upstream:
  const started = await startLive(
    input.cwd,
    input.providerAccountId,
    model,
[middle retained in evidence JSON]
  );
  input.onThreadId?.(started.threadId);
  return started;
Hunk @332 (0/3 side lines)
ours:
upstream:
  effort = pickTextEffort(model),
  serviceTier?: string,
  requestedThreadId?: string,
Hunk @423 (11/39 side lines)
ours:
async function openThread(session: LiveText, cwd: string): Promise<void> {
  const opened = await session.rpc.request<{ thread?: { id?: string } }>(
    "thread/start",
    buildThreadStartParams({
[middle retained in evidence JSON]
    }),
    INIT_TIMEOUT_MS,
  );
upstream:
async function openThread(
  session: LiveText,
  cwd: string,
  requestedThreadId?: string,
[middle retained in evidence JSON]
      INIT_TIMEOUT_MS,
    );
  }
Hunk @506 (12/3 side lines)
ours:
  if (method === "item/started") {
    const item = asRecord(asRecord(params)?.item);
    const itemType = stringField(item, "type") ?? "unknown";
    if (
[middle retained in evidence JSON]
      void interruptForToolAttempt(session, itemType);
    }
    return;
upstream:
  const mapped = mapCodexNotification(method, params);
  for (const event of mapped.events) {
    session.onEvent?.(event);
## src/integrations/harness/providers/opencode/opencodeAdapter.ts — content; 2 hunks; side diffs 14/18 lines
Hunk @20 (1/5 side lines)
ours:
import { runOpenCodeTextPrompt, warmupOpenCodeText } from "./opencodeText";
upstream:
import {
  runOpenCodeTextPrompt,
  stopOpenCodeTextPrompt,
  warmupOpenCodeText,
} from "./opencodeText";
Hunk @50 (2/2 side lines)
ours:
  runHelperPrompt: ({ cwd, prompt, timeoutMs, model }) =>
    runOpenCodeTextPrompt({ cwd, prompt, timeoutMs, model }),
upstream:
  runTextPrompt: runOpenCodeTextPrompt,
  stopTextPrompt: stopOpenCodeTextPrompt,
## src/integrations/harness/providers/opencode/opencodeText.test.ts — add/add; 2 hunks; side diffs 107/231 lines
Hunk @1 (52/104 side lines)
ours:
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  onOutput: null as ((line: string) => void) | null,
[middle retained in evidence JSON]
  state.prompt.mockReset();
  state.abortSession.mockReset().mockResolvedValue(undefined);
  state.closeEvents.mockReset().mockResolvedValue(undefined);
upstream:
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HarnessEvent } from "../../core/types";

let onStdout: ((line: string) => void) | undefined;
[middle retained in evidence JSON]
  finishPrompt = undefined;
  promptStarted = false;
  harnessHttp.mockClear();
Hunk @166 (42/114 side lines)
ours:
describe("OpenCode isolated helper runner", () => {
  it("uses a deny-all session and the configured provider/model slug", async () => {
    state.prompt.mockResolvedValue({
      parts: [{ type: "text", text: '{"title":"Model chosen"}' }],
[middle retained in evidence JSON]
    ).rejects.toBeInstanceOf(HelperToolAttemptError);
    expect(state.abortSession).toHaveBeenCalledWith("helper-session");
  });
upstream:
it("forwards only incremental OpenCode assistant text", async () => {
  const events: HarnessEvent[] = [];
  const result = runOpenCodeTextPrompt({
    cwd: "/repo",
[middle retained in evidence JSON]
    { type: "message.delta", text: "Hel" },
    { type: "message.delta", text: "lo" },
  ]);
## src/integrations/harness/providers/opencode/opencodeText.ts — content; 5 hunks; side diffs 58/333 lines
Hunk @28 (1/3 side lines)
ours:
import { HelperToolAttemptError } from "../../core/helperIsolation";
upstream:
import { abortTextPromptRace } from "../../core/abortTextPrompt";
import { streamTextDelta } from "../../core/streamText";
import type { HarnessEvent } from "../../core/types";
Hunk @79 (0/2 side lines)
ours:
upstream:
  modelSettings?: Record<string, string>;
  intent?: TurnIntent;
Hunk @100 (0/2 side lines)
ours:
upstream:
  modelSettings?: Record<string, string>;
  intent?: TurnIntent;
Hunk @110 (23/19 side lines)
ours:
  const session = await ensureLive(input.cwd, input.model);
  try {
    const result = await session.client.prompt({
      sessionID: session.sessionId,
[middle retained in evidence JSON]
      await session.client.abortSession(session.sessionId).catch(() => undefined);
      throw new HelperToolAttemptError("opencode", toolKind);
    }
upstream:
  input.signal?.throwIfAborted();
  const session = await ensureLive(input.cwd, input.model, input.modelSettings);
  input.signal?.throwIfAborted();
  session.onEvent = input.onEvent;
[middle retained in evidence JSON]
      }),
      ...(abort.promise ? [abort.promise] : []),
    ]);
Hunk @173 (15/14 side lines)
ours:
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

[middle retained in evidence JSON]
    throw new Error("OpenCode model id must look like provider/model.");
  }
  if (live && live.cwd === cwd && sameModel(live.model, model)) return live;
upstream:
async function ensureLive(
  cwd: string,
  requestedModel?: string,
  modelSettings?: Record<string, string>,
[middle retained in evidence JSON]
    live.modelSettingsKey === settingsKey
  )
    return live;
## src/platform/tauri/fs.test.ts — content; 1 hunks; side diffs 121/40 lines
Hunk @10 (3/1 side lines)
ours:
  persistWallpaper,
  retainManagedWallpaper,
  clearManagedWallpaper,
upstream:
  pickFolders,
## src/platform/tauri/pty.test.ts — content; 1 hunks; side diffs 39/26 lines
Hunk @2 (6/1 side lines)
ours:
import {
  markUnsupportedNotified,
  PTY_SUPPORTED,
  PTY_UNSUPPORTED_MESSAGE,
  trimReplay,
} from "./pty";
upstream:
import { decodePtyChunk, trimReplay } from "./pty";
## src/platform/tauri/pty.ts — content; 1 hunks; side diffs 119/26 lines
Hunk @135 (5/4 side lines)
ours:
      const chunk = decodeBase64(data);
      const start = bytesSeen.get(id) ?? 0;
      bytesSeen.set(id, start + chunk.byteLength);
      if (handler) handler(chunk, start);
      else pushBuffered(id, chunk, start);
upstream:
      const chunk = decodePtyChunk(data);
      if (!chunk) return;
      if (handler) handler(chunk);
      else pushBuffered(id, chunk);
## src/styles/index.css — content; 2 hunks; side diffs 317/1264 lines
Hunk @307 (25/2 side lines)
ours:
.popover-surface {
  background: color-mix(
    in srgb,
    var(--color-content) var(--popover-surface-opacity),
[middle retained in evidence JSON]

html.is-mac,
html.has-glass,
upstream:
/* Tint-less transparent rather than `transparent`, which browsers interpolate
   through black and would dim the page on the way in and out of glass. */
Hunk @460 (34/9 side lines)
ours:
html.theme-light .sidebar-glass {
  background: hsl(
    var(--theme-hue) var(--theme-saturation) var(--background-lightness) /
      var(--sidebar-opacity)
[middle retained in evidence JSON]
    );
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
upstream:
/* The activity dot sits at (23px, 9px) in a 32px button. Its icon is
   centered at (8px, 8px), so this cuts a 2px gap around the 6px dot. */
.compact-rail-icon-with-dot {
  -webkit-mask-image: radial-gradient(
[middle retained in evidence JSON]
    black 5.5px
  );
  mask-image: radial-gradient(circle at 15px 1px, transparent 5px, black 5.5px);