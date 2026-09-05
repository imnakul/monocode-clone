//! Read-only scanner for external agent sessions (migration wizard).
//!
//! Pure `std::fs` reads — **zero child processes**. Spawning CLIs here would
//! reintroduce the visible-console class of bugs the Windows stabilization
//! work eliminated, so this module must never gain a `Command`.
//!
//! Sources: Claude transcripts, Codex rollouts, OpenCode/ZCode sqlite
//! stores, Cline manifests, Antigravity metadata. Missing stores,
//! unreadable dirs, and corrupt files all yield empty lists, never `Err`:
//! a missing agent install is normal, not a failure.

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Cap per-file line scanning so a pathological transcript cannot stall the
/// wizard. Real transcripts are tens of thousands of lines at most.
const MAX_LINES_PER_FILE: usize = 200_000;
/// Cap title length (chars).
const MAX_TITLE_CHARS: usize = 120;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSession {
    pub id: String,
    pub title: String,
    pub updated_at: Option<String>,
    pub message_count: u32,
    pub source: String,
    /// Decoded workspace path (real cwd from the transcript when present,
    /// slug-decoded fallback otherwise).
    pub cwd: String,
    /// Absolute transcript path (file sources), used by the Phase 3 replay
    /// reader. Empty for database sources (see `read_external_transcript`).
    pub file: String,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalWorkspace {
    pub workspace_path: String,
    pub session_count: usize,
    /// Distinct sources present in this workspace, in canonical order.
    pub sources: Vec<String>,
    pub sessions: Vec<ExternalSession>,
}

/// Canonical source order used for `sources` lists and UI pills.
const SOURCE_ORDER: &[&str] = &[
    "claude",
    "codex",
    "opencode",
    "zcode",
    "cline",
    "antigravity",
];

/// Scan external agent sessions, grouped by workspace, most recent first.
///
/// `since_days == 0` disables recency filtering; `limit == 0` disables the
/// cap. Never fails: every I/O or parse error degrades to fewer results.
#[tauri::command(async)]
pub fn scan_external_sessions(
    since_days: u32,
    limit: u32,
) -> Result<Vec<ExternalWorkspace>, String> {
    Ok(scan_external_sessions_for_home(
        &user_home(),
        since_days,
        limit,
    ))
}

fn user_home() -> Option<PathBuf> {
    if let Some(home) = crate::dirs_home() {
        if !home.is_empty() {
            return Some(PathBuf::from(home));
        }
    }
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

fn scan_external_sessions_for_home(
    home: &Option<PathBuf>,
    since_days: u32,
    limit: u32,
) -> Vec<ExternalWorkspace> {
    let Some(home) = home else {
        return Vec::new();
    };
    scan_external_sessions_from_paths(
        &home.join(".claude").join("projects"),
        &home.join(".codex").join("sessions"),
        &home
            .join(".local")
            .join("share")
            .join("opencode")
            .join("opencode.db"),
        &home.join(".zcode").join("cli").join("db").join("db.sqlite"),
        &home.join(".cline").join("data").join("sessions"),
        &home.join(".gemini").join("antigravity-cli"),
        since_days,
        limit,
    )
}

/// Explicit-paths variant so tests never touch real machine stores.
#[allow(clippy::too_many_arguments)]
fn scan_external_sessions_from_paths(
    claude_projects: &Path,
    codex_sessions: &Path,
    opencode_db: &Path,
    zcode_db: &Path,
    cline_sessions: &Path,
    agy_cli_dir: &Path,
    since_days: u32,
    limit: u32,
) -> Vec<ExternalWorkspace> {
    let cutoff_epoch = if since_days == 0 {
        0
    } else {
        now_epoch().saturating_sub(u64::from(since_days) * 86_400)
    };

    let mut sessions: Vec<(u64, ExternalSession)> = Vec::new();
    scan_claude_dir(claude_projects, &mut sessions);
    scan_codex_dir(codex_sessions, &mut sessions);
    scan_opencode_db(opencode_db, &mut sessions);
    scan_zcode_db(zcode_db, &mut sessions);
    scan_cline_dir(cline_sessions, &mut sessions);
    scan_agy_dir(agy_cli_dir, &mut sessions);
    sessions.retain(|(epoch, _)| *epoch >= cutoff_epoch);
    sessions.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.id.cmp(&b.1.id)));
    if limit > 0 && sessions.len() > limit as usize {
        sessions.truncate(limit as usize);
    }

    // Group by workspace, preserving recency order. Cwds are normalized
    // first so `E:/dir` (OpenCode) and `E:\dir` (everyone else) merge.
    let mut workspaces: Vec<ExternalWorkspace> = Vec::new();
    for (_, mut session) in sessions {
        session.cwd = normalize_cwd(&session.cwd);
        match workspaces
            .iter_mut()
            .find(|workspace| workspace.workspace_path == session.cwd)
        {
            Some(workspace) => workspace.sessions.push(session),
            None => workspaces.push(ExternalWorkspace {
                workspace_path: session.cwd.clone(),
                session_count: 0,
                sources: Vec::new(),
                sessions: vec![session],
            }),
        }
    }
    for workspace in &mut workspaces {
        workspace.session_count = workspace.sessions.len();
        workspace.sources = SOURCE_ORDER
            .iter()
            .filter(|source| workspace.sessions.iter().any(|s| s.source == ***source))
            .map(|source| source.to_string())
            .collect();
    }
    workspaces
}

/// Normalize a workspace path for grouping: OpenCode stores `E:/…` while
/// every other source stores `E:\…`, which otherwise splits one directory
/// into two workspaces (and later into two MonoCode projects). Windows-only
/// rewrite — backslashes are legal filename characters on Unix.
fn normalize_cwd(cwd: &str) -> String {
    let trimmed = cwd.trim();
    #[cfg(windows)]
    {
        trimmed.replace('/', "\\")
    }
    #[cfg(not(windows))]
    {
        trimmed.to_string()
    }
}

fn now_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn file_mtime_epoch(path: &Path) -> u64 {
    std::fs::metadata(path)
        .and_then(|meta| meta.modified())
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Claude: ~/.claude/projects/<cwd-slug>/<session-uuid>.jsonl
// ---------------------------------------------------------------------------

fn scan_claude_dir(projects: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    let Ok(entries) = std::fs::read_dir(projects) else {
        return;
    };
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let slug = dir
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        let Ok(files) = std::fs::read_dir(&dir) else {
            continue;
        };
        for file in files.flatten() {
            let path = file.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }
            if let Some((epoch, session)) = parse_claude_file(&path, &slug) {
                out.push((epoch, session));
            }
        }
    }
}

#[derive(Default)]
struct ClaudeAcc {
    session_id: Option<String>,
    cwd: Option<String>,
    summary: Option<String>,
    first_user_text: Option<String>,
    max_epoch: u64,
    max_timestamp: Option<String>,
    message_count: u32,
}

fn parse_claude_file(path: &Path, slug: &str) -> Option<(u64, ExternalSession)> {
    let text = std::fs::read_to_string(path).ok()?;
    let mut acc = ClaudeAcc::default();
    // Files that contribute no signal at all (no timestamps, ids, cwd, or
    // messages) are garbage, not sessions — the filename-stem fallback
    // below must not resurrect them.
    let mut signals = 0u32;
    for (index, line) in text.lines().enumerate() {
        if index >= MAX_LINES_PER_FILE {
            break;
        }
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Cheap pre-filter: only lines that can matter pay for JSON parsing.
        if !line.contains("\"type\"") {
            if let Some(epoch) = extract_epoch(line) {
                signals += 1;
                acc.bump_time(epoch, extract_timestamp(line));
            }
            continue;
        }
        let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        signals += ingest_claude_line(&value, &mut acc);
    }
    if signals == 0 {
        return None;
    }
    let id = acc
        .session_id
        .or_else(|| {
            path.file_stem()
                .map(|stem| stem.to_string_lossy().into_owned())
        })
        .filter(|id| !id.is_empty())?;
    let cwd = acc
        .cwd
        .or_else(|| decode_claude_slug(slug))
        .unwrap_or_else(|| slug.to_string());
    let title = acc
        .summary
        .or(acc.first_user_text)
        .map(|text| truncate_title(&text))
        .unwrap_or_else(|| "Untitled session".to_string());
    let updated_at = acc.max_timestamp.clone();
    // Recency prefers transcript timestamps; file mtime is only a fallback
    // for transcripts that carry none (copies/backups can make mtime newer
    // than the actual conversation).
    let epoch = if acc.max_epoch > 0 {
        acc.max_epoch
    } else {
        file_mtime_epoch(path)
    };
    Some((
        epoch,
        ExternalSession {
            id,
            title,
            updated_at,
            message_count: acc.message_count,
            source: "claude".to_string(),
            cwd,
            file: path.to_string_lossy().into_owned(),
        },
    ))
}

fn ingest_claude_line(value: &serde_json::Value, acc: &mut ClaudeAcc) -> u32 {
    let mut signals = 0u32;
    if let Some(epoch) = value
        .get("timestamp")
        .and_then(|ts| ts.as_str())
        .and_then(parse_rfc3339_epoch)
    {
        signals += 1;
        acc.bump_time(
            epoch,
            value
                .get("timestamp")
                .and_then(|ts| ts.as_str())
                .map(str::to_string),
        );
    }
    if acc.session_id.is_none() {
        if let Some(sid) = value.get("sessionId").and_then(|v| v.as_str()) {
            if !sid.is_empty() {
                signals += 1;
                acc.session_id = Some(sid.to_string());
            }
        }
    }
    if acc.cwd.is_none() {
        if let Some(cwd) = value.get("cwd").and_then(|v| v.as_str()) {
            if !cwd.is_empty() {
                signals += 1;
                acc.cwd = Some(cwd.to_string());
            }
        }
    }
    let kind = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
    match kind {
        "summary" => {
            signals += 1;
            if acc.summary.is_none() {
                if let Some(summary) = value.get("summary").and_then(|v| v.as_str()) {
                    let summary = summary.trim();
                    if !summary.is_empty() {
                        acc.summary = Some(summary.to_string());
                    }
                }
            }
        }
        "user" => {
            signals += 1;
            acc.message_count += 1;
            if acc.first_user_text.is_none() {
                if let Some(text) = first_text_content(value) {
                    if !is_injected_instructions(&text) {
                        acc.first_user_text = Some(text);
                    }
                }
            }
        }
        "assistant" => {
            signals += 1;
            acc.message_count += 1;
        }
        _ => {}
    }
    signals
}

/// First `{"type":"text"}` block of a user message, skipping tool_result and
/// image-only content.
fn first_text_content(value: &serde_json::Value) -> Option<String> {
    let content = value.get("message")?.get("content")?;
    if let Some(text) = content.as_str() {
        return nonempty(text);
    }
    for block in content.as_array()? {
        if block.get("type").and_then(|v| v.as_str()) != Some("text") {
            continue;
        }
        if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
            if let Some(text) = nonempty(text) {
                return Some(text);
            }
        }
    }
    None
}

fn nonempty(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// System-injected context dumps (AGENTS.md, permission preambles) make
/// terrible titles — the first *real* user text wins instead.
fn is_injected_instructions(text: &str) -> bool {
    let head = text.trim_start();
    head.starts_with("# AGENTS.md")
        || head.starts_with("<INSTRUCTIONS>")
        || head.starts_with("<permissions instructions>")
        || head.starts_with("<system-reminder>")
}

/// `E--Developing-Knoarc-Teacher` → `E:\Developing\Knoarc\Teacher`.
/// Best effort: a literal `-` inside a real dir name collides with the
/// separator, so transcript `cwd` fields always win when present.
fn decode_claude_slug(slug: &str) -> Option<String> {
    if slug.is_empty() {
        return None;
    }
    let sep = std::path::MAIN_SEPARATOR;
    let mut chars = slug.chars();
    let decoded = match (chars.next(), chars.next(), chars.next()) {
        (Some(drive), Some('-'), Some('-')) if drive.is_ascii_alphabetic() => {
            let tail: String = chars.collect();
            format!("{drive}:{sep}{}", tail.replace('-', &sep.to_string()))
        }
        _ => slug.replace('-', &sep.to_string()),
    };
    if decoded.is_empty() {
        None
    } else {
        Some(decoded)
    }
}

// ---------------------------------------------------------------------------
// Codex: ~/.codex/sessions/**/(rollout|session)-*.jsonl
// ---------------------------------------------------------------------------

fn scan_codex_dir(sessions: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    visit_jsonl(sessions, 0, &mut |path| {
        if let Some((epoch, session)) = parse_codex_file(path) {
            out.push((epoch, session));
        }
    });
}

/// Recursive walk with a depth cap. Symlink loops: `read_dir` does not
/// follow directory symlinks on traversal here because we only recurse
/// into `is_dir()` paths — still, cap depth defensively.
fn visit_jsonl(dir: &Path, depth: usize, visit: &mut impl FnMut(&Path)) {
    if depth > 8 {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(kind) = entry.file_type() else {
            continue;
        };
        if kind.is_dir() {
            visit_jsonl(&path, depth + 1, visit);
        } else if kind.is_file() && path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
            visit(path.as_path());
        }
    }
}

#[derive(Default)]
struct CodexAcc {
    id: Option<String>,
    cwd: Option<String>,
    first_user_text: Option<String>,
    max_epoch: u64,
    max_timestamp: Option<String>,
    message_count: u32,
}

fn parse_codex_file(path: &Path) -> Option<(u64, ExternalSession)> {
    let text = std::fs::read_to_string(path).ok()?;
    let mut acc = CodexAcc::default();
    let mut signals = 0u32;
    for (index, line) in text.lines().enumerate() {
        if index >= MAX_LINES_PER_FILE {
            break;
        }
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if !line.contains("\"type\"") {
            continue;
        }
        let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        signals += ingest_codex_line(&value, &mut acc);
    }
    if signals == 0 {
        return None;
    }
    let id = acc.id.or_else(|| {
        path.file_stem()
            .map(|stem| stem.to_string_lossy().into_owned())
    })?;
    let cwd = acc.cwd.unwrap_or_else(|| "(unknown workspace)".to_string());
    let title = acc
        .first_user_text
        .map(|text| truncate_title(&text))
        .unwrap_or_else(|| "Untitled session".to_string());
    let updated_at = acc.max_timestamp.clone();
    let epoch = if acc.max_epoch > 0 {
        acc.max_epoch
    } else {
        file_mtime_epoch(path)
    };
    Some((
        epoch,
        ExternalSession {
            id,
            title,
            updated_at,
            message_count: acc.message_count,
            source: "codex".to_string(),
            cwd,
            file: path.to_string_lossy().into_owned(),
        },
    ))
}

fn ingest_codex_line(value: &serde_json::Value, acc: &mut CodexAcc) -> u32 {
    let mut signals = 0u32;
    if let Some(epoch) = value
        .get("timestamp")
        .and_then(|v| v.as_str())
        .and_then(parse_rfc3339_epoch)
    {
        signals += 1;
        acc.bump_time(
            epoch,
            value
                .get("timestamp")
                .and_then(|v| v.as_str())
                .map(str::to_string),
        );
    }
    let kind = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if kind == "session_meta" {
        signals += 1;
        let payload = value.get("payload");
        if acc.id.is_none() {
            if let Some(id) = payload.and_then(|p| p.get("id")).and_then(|v| v.as_str()) {
                if !id.is_empty() {
                    acc.id = Some(id.to_string());
                }
            }
        }
        if acc.cwd.is_none() {
            if let Some(cwd) = payload.and_then(|p| p.get("cwd")).and_then(|v| v.as_str()) {
                if !cwd.is_empty() {
                    acc.cwd = Some(cwd.to_string());
                }
            }
        }
        return signals;
    }
    if kind != "response_item" {
        return signals;
    }
    let payload = match value.get("payload") {
        Some(payload) => payload,
        None => return signals,
    };
    if payload.get("type").and_then(|v| v.as_str()) != Some("message") {
        return signals;
    }
    match payload.get("role").and_then(|v| v.as_str()) {
        Some("user") => {
            signals += 1;
            acc.message_count += 1;
            if acc.first_user_text.is_none() {
                if let Some(text) = first_input_text(payload) {
                    if !is_injected_instructions(&text) {
                        acc.first_user_text = Some(text);
                    }
                }
            }
        }
        Some("assistant") => {
            signals += 1;
            acc.message_count += 1;
        }
        _ => {}
    }
    signals
}

fn first_input_text(payload: &serde_json::Value) -> Option<String> {
    for block in payload.get("content")?.as_array()? {
        if block.get("type").and_then(|v| v.as_str()) != Some("input_text") {
            continue;
        }
        if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
            if let Some(text) = nonempty(text) {
                return Some(text);
            }
        }
    }
    None
}

// ---------------------------------------------------------------------------
// SQLite-backed sources: OpenCode, ZCode CLI.
// Opened strictly read-only — the scanner must never lock or modify
// another agent's live database (WAL sidecars are read alongside).
// ---------------------------------------------------------------------------

fn open_ro(path: &Path) -> Option<rusqlite::Connection> {
    if !path.is_file() {
        return None;
    }
    rusqlite::Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).ok()
}

/// Inverse of `days_from_civil`: epoch days → (year, month, day).
fn civil_from_days(days: i64) -> Option<(i64, i64, i64)> {
    let days = days + 719_468;
    let era = days.div_euclid(146_097);
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = if month_prime < 10 {
        month_prime + 3
    } else {
        month_prime - 9
    };
    Some((if month <= 2 { year + 1 } else { year }, month, day))
}

/// Millis epoch (sqlite time columns) → `YYYY-MM-DD` display date.
fn format_epoch_millis(ms: i64) -> Option<String> {
    if ms <= 0 {
        return None;
    }
    let (year, month, day) = civil_from_days(ms.div_euclid(86_400_000))?;
    if !(2000..=2100).contains(&year) {
        return None;
    }
    Some(format!("{year:04}-{month:02}-{day:02}"))
}

fn count_messages(conn: &rusqlite::Connection, session_id: &str) -> u32 {
    conn.query_row(
        "SELECT COUNT(*) FROM message WHERE session_id = ?1",
        rusqlite::params![session_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|count| count.max(0) as u32)
    .unwrap_or(0)
}

/// One `session`-table row shared by the OpenCode/ZCode schema family.
type AgentSessionRow = (
    String,
    Option<String>,
    Option<String>,
    Option<i64>,
    Option<i64>,
);

/// OpenCode (`~/.local/share/opencode/opencode.db`): `session` rows carry
/// id/directory/title/ms times; message bodies live in `part` (see
/// `read_external_transcript`). Native resume continues via the opencode
/// adapter, whose own server reads this same store.
fn scan_opencode_db(db: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    let Some(conn) = open_ro(db) else {
        return;
    };
    let mut stmt = match conn
        .prepare("SELECT id, directory, title, time_created, time_updated FROM session")
    {
        Ok(stmt) => stmt,
        Err(_) => return,
    };
    let rows: Vec<AgentSessionRow> = match stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, Option<i64>>(4)?,
            ))
        })
        .map(|rows| rows.flatten().collect())
    {
        Ok(rows) => rows,
        Err(_) => return,
    };
    for (id, directory, title, created, updated) in rows {
        if id.is_empty() {
            continue;
        }
        let updated_ms = updated.or(created).unwrap_or(0);
        let epoch = (updated_ms.max(0) / 1000) as u64;
        let cwd = directory
            .filter(|dir| !dir.trim().is_empty())
            .unwrap_or_else(|| "(unknown workspace)".to_string());
        let title = title
            .filter(|title| !title.trim().is_empty())
            .map(|title| truncate_title(&title))
            .unwrap_or_else(|| "Untitled session".to_string());
        out.push((
            epoch,
            ExternalSession {
                id: id.clone(),
                title,
                updated_at: format_epoch_millis(updated_ms),
                message_count: count_messages(&conn, &id),
                source: "opencode".to_string(),
                cwd,
                file: String::new(),
            },
        ));
    }
}

/// ZCode CLI (`~/.zcode/cli/db/db.sqlite`): same shape family as OpenCode.
/// ZCode is not a MonoCode harness, so these rows are replay-only.
fn scan_zcode_db(db: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    let Some(conn) = open_ro(db) else {
        return;
    };
    let mut stmt = match conn
        .prepare("SELECT id, directory, title, time_created, time_updated FROM session")
    {
        Ok(stmt) => stmt,
        Err(_) => return,
    };
    let rows: Vec<AgentSessionRow> = match stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, Option<i64>>(4)?,
            ))
        })
        .map(|rows| rows.flatten().collect())
    {
        Ok(rows) => rows,
        Err(_) => return,
    };
    for (id, directory, title, created, updated) in rows {
        if id.is_empty() {
            continue;
        }
        let updated_ms = updated.or(created).unwrap_or(0);
        let epoch = (updated_ms.max(0) / 1000) as u64;
        let cwd = directory
            .filter(|dir| !dir.trim().is_empty())
            .unwrap_or_else(|| "(unknown workspace)".to_string());
        let title = title
            .filter(|title| !title.trim().is_empty())
            .map(|title| truncate_title(&title))
            .unwrap_or_else(|| "Untitled session".to_string());
        out.push((
            epoch,
            ExternalSession {
                id: id.clone(),
                title,
                updated_at: format_epoch_millis(updated_ms),
                message_count: count_messages(&conn, &id),
                source: "zcode".to_string(),
                cwd,
                file: String::new(),
            },
        ));
    }
}

/// Antigravity (`~/.gemini/antigravity-cli/`): `cache/conversation_metadata.json`
/// maps conversation id -> {summary: {Title, Preview, UpdatedAt,
/// WorkspaceURIs[]}, last_modified_time}. Internal entries (no summary) are
/// skipped. Conversations resume natively via `--conversation <id>`; their
/// step store is protobuf, so rows are resume-only (no replay).
fn scan_agy_dir(cli_dir: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    const MAX_METADATA_BYTES: u64 = 8 * 1024 * 1024;
    let meta_path = cli_dir.join("cache").join("conversation_metadata.json");
    let meta_len = std::fs::metadata(&meta_path)
        .map(|meta| meta.len())
        .unwrap_or(0);
    if meta_len == 0 || meta_len > MAX_METADATA_BYTES {
        return;
    }
    let text = match std::fs::read_to_string(&meta_path) {
        Ok(text) => text,
        Err(_) => return,
    };
    let Ok(root) = serde_json::from_str::<serde_json::Value>(&text) else {
        return;
    };
    let Some(conversations) = root.get("conversations").and_then(|v| v.as_object()) else {
        return;
    };
    for (id, entry) in conversations {
        if id.trim().is_empty() {
            continue;
        }
        let Some(entry) = entry.as_object() else {
            continue;
        };
        if entry
            .get("is_internal")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            continue;
        }
        let summary = entry.get("summary");
        let title = summary
            .and_then(|summary| summary.get("Title"))
            .and_then(|v| v.as_str())
            .filter(|title| !title.trim().is_empty())
            .map(str::to_string)
            .or_else(|| {
                summary
                    .and_then(|summary| summary.get("Preview"))
                    .and_then(|v| v.as_str())
                    .filter(|preview| !preview.trim().is_empty())
                    .map(truncate_title)
            })
            .unwrap_or_else(|| "Antigravity session".to_string());
        let last_modified = entry
            .get("last_modified_time")
            .and_then(|v| v.as_str())
            .filter(|v| !v.trim().is_empty())
            .map(str::to_string);
        let updated_summary = summary
            .and_then(|summary| summary.get("UpdatedAt"))
            .and_then(|v| v.as_str())
            .filter(|v| !v.trim().is_empty())
            .map(str::to_string);
        let epoch = last_modified
            .as_deref()
            .and_then(parse_rfc3339_epoch)
            .or_else(|| updated_summary.as_deref().and_then(parse_rfc3339_epoch))
            .unwrap_or(0);
        let cwd = summary
            .and_then(|summary| summary.get("WorkspaceURIs"))
            .and_then(|uris| uris.as_array())
            .and_then(|uris| uris.first())
            .and_then(|uri| uri.as_str())
            .map(|uri| uri.strip_prefix("file:///").unwrap_or(uri).to_string())
            .filter(|dir| !dir.trim().is_empty())
            .unwrap_or_else(|| "(unknown workspace)".to_string());
        // Display prefers the human-facing stamp; recency prefers last touch.
        let updated_display = last_modified.or(updated_summary);
        out.push((
            epoch,
            ExternalSession {
                id: id.clone(),
                title,
                updated_at: updated_display,
                message_count: 0,
                source: "antigravity".to_string(),
                cwd,
                file: String::new(),
            },
        ));
    }
}

/// Cline (`~/.cline/data/sessions/<id>/<id>.json` manifests). The manifest
/// id doubles as the ACP session id, so rows resume natively via
/// `session/load`. Message counts come from a cheap `"role"` byte scan of
/// the sibling messages file (capped size; 0 when too big to bother).
fn scan_cline_dir(sessions: &Path, out: &mut Vec<(u64, ExternalSession)>) {
    const MAX_COUNT_BYTES: u64 = 4 * 1024 * 1024;
    let Ok(entries) = std::fs::read_dir(sessions) else {
        return;
    };
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let name = dir
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        if name.is_empty() {
            continue;
        }
        let manifest_path = dir.join(format!("{name}.json"));
        let text = match std::fs::read_to_string(&manifest_path) {
            Ok(text) => text,
            Err(_) => continue,
        };
        if text.len() > 256 * 1024 {
            continue;
        }
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&text) else {
            continue;
        };
        let get_str = |key: &str| {
            manifest
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|v| !v.trim().is_empty())
                .map(str::to_string)
        };
        let id = get_str("session_id").unwrap_or_else(|| name.clone());
        let cwd = get_str("cwd").unwrap_or_else(|| "(unknown workspace)".to_string());
        let model = get_str("model").unwrap_or_default();
        let title = if model.is_empty() {
            "Cline session".to_string()
        } else {
            truncate_title(&model)
        };
        let started = get_str("started_at");
        let ended = get_str("ended_at");
        let updated_at = ended.or(started);
        let epoch = updated_at
            .as_deref()
            .and_then(parse_rfc3339_epoch)
            .unwrap_or_else(|| file_mtime_epoch(&manifest_path));
        let messages_path = dir.join(format!("{name}.messages.json"));
        let message_count = std::fs::metadata(&messages_path)
            .ok()
            .filter(|meta| meta.len() <= MAX_COUNT_BYTES)
            .and_then(|_| std::fs::read(&messages_path).ok())
            .map(|bytes| {
                let text = String::from_utf8_lossy(&bytes);
                text.match_indices("\"role\":\"user\"").count() as u32
                    + text.match_indices("\"role\":\"assistant\"").count() as u32
            })
            .unwrap_or(0);
        out.push((
            epoch,
            ExternalSession {
                id,
                title,
                updated_at,
                message_count,
                source: "cline".to_string(),
                cwd,
                file: manifest_path.to_string_lossy().into_owned(),
            },
        ));
    }
}

/// Cap for exported transcript parts (opencode/zcode replay). Parts are
/// small; thousands of rows stay well under a few MB of JSON.
const MAX_EXPORT_PARTS: usize = 5000;

/// Export an sqlite-backed transcript for replay: ordered `{role, time,
/// parts}` rows where each part is the stored JSON value verbatim. File
/// sources (claude/codex/cline) are read with `read_text_file` + parsed in
/// the frontend instead. Antigravity rows resume natively and have no
/// transcript export (protobuf step store).
#[tauri::command(async)]
pub fn read_external_transcript(source: String, session_id: String) -> Result<String, String> {
    let home = user_home().ok_or_else(|| "Home directory not found".to_string())?;
    match source.as_str() {
        "opencode" => {
            let db = home
                .join(".local")
                .join("share")
                .join("opencode")
                .join("opencode.db");
            export_transcript_for_db(&db, &session_id)
        }
        "zcode" => {
            let db = home.join(".zcode").join("cli").join("db").join("db.sqlite");
            export_transcript_for_db(&db, &session_id)
        }
        _ => Err(format!(
            "Transcript export for source \"{source}\" goes through the transcript file"
        )),
    }
}

fn export_transcript_for_db(db: &Path, session_id: &str) -> Result<String, String> {
    let conn = open_ro(db).ok_or_else(|| "Session store not found".to_string())?;
    // Two small queries instead of a JOIN: messages in time order, then
    // parts per message. N+1 is fine — imports touch one session at a time.
    let mut messages: Vec<serde_json::Value> = Vec::new();
    let mut part_count = 0usize;
    let mut msg_stmt = conn
        .prepare(
            "SELECT id, time_created, data FROM message WHERE session_id = ?1 ORDER BY time_created, rowid",
        )
        .map_err(|e| format!("Transcript query failed: {e}"))?;
    // NOTE: `role` lives inside the `data` JSON, not as a column — the real
    // OpenCode/ZCode schema is (id, session_id, time_created, time_updated,
    // data). Selecting a `role` column fails on real stores.
    let msg_rows: Vec<(String, Option<i64>, Option<String>)> = msg_stmt
        .query_map([session_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| format!("Transcript query failed: {e}"))?
        .flatten()
        .collect();
    let mut part_stmt = conn
        .prepare("SELECT data FROM part WHERE message_id = ?1 ORDER BY time_created, rowid")
        .map_err(|e| format!("Transcript query failed: {e}"))?;
    for (msg_id, time, data) in msg_rows {
        // Role is embedded in the message envelope, not a column.
        let role = data
            .as_deref()
            .and_then(|text| serde_json::from_str::<serde_json::Value>(text).ok())
            .and_then(|envelope| {
                envelope
                    .get("role")
                    .and_then(|role| role.as_str())
                    .map(str::to_string)
            })
            .unwrap_or_default();
        if role != "user" && role != "assistant" {
            continue;
        }
        let mut parts: Vec<serde_json::Value> = Vec::new();
        let stored: Vec<String> = part_stmt
            .query_map([msg_id.as_str()], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Transcript query failed: {e}"))?
            .flatten()
            .collect();
        for data in stored {
            if part_count >= MAX_EXPORT_PARTS {
                break;
            }
            part_count += 1;
            match serde_json::from_str::<serde_json::Value>(&data) {
                Ok(value) => parts.push(value),
                Err(_) => parts.push(serde_json::json!({"type":"text","text":data})),
            }
        }
        messages.push(serde_json::json!({
            "role": role,
            "time": time.unwrap_or(0),
            "parts": parts,
        }));
        if part_count >= MAX_EXPORT_PARTS {
            break;
        }
    }
    serde_json::to_string(&serde_json::json!({ "messages": messages }))
        .map_err(|e| format!("Transcript export failed: {e}"))
}

trait BumpTime {
    fn bump_time(&mut self, epoch: u64, timestamp: Option<String>);
}

impl BumpTime for ClaudeAcc {
    fn bump_time(&mut self, epoch: u64, timestamp: Option<String>) {
        if epoch >= self.max_epoch {
            self.max_epoch = epoch;
            if timestamp.is_some() {
                self.max_timestamp = timestamp;
            }
        }
    }
}

impl BumpTime for CodexAcc {
    fn bump_time(&mut self, epoch: u64, timestamp: Option<String>) {
        if epoch >= self.max_epoch {
            self.max_epoch = epoch;
            if timestamp.is_some() {
                self.max_timestamp = timestamp;
            }
        }
    }
}

/// Minimal RFC 3339 (`YYYY-MM-DDTHH:MM:SS[.frac][Z|±HH:MM]`) → epoch seconds.
/// Hand-rolled to avoid a chrono dependency for one comparison.
fn parse_rfc3339_epoch(text: &str) -> Option<u64> {
    let text = text.trim();
    let (date, time) = text.split_once('T')?;
    let mut date_parts = date.split('-');
    let year: i64 = date_parts.next()?.parse().ok()?;
    let month: i64 = date_parts.next()?.parse().ok()?;
    let day: i64 = date_parts.next()?.parse().ok()?;
    if date_parts.next().is_some() {
        return None;
    }
    let (clock, zone) = split_zone(time)?;
    let mut clock_parts = clock.split(':');
    let hour: i64 = clock_parts.next()?.parse().ok()?;
    let minute: i64 = clock_parts.next()?.parse().ok()?;
    let second: i64 = clock_parts.next()?.parse().ok()?;
    if !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 60
    {
        return None;
    }
    let days = days_from_civil(year, month, day)?;
    let offset_secs = parse_zone_offset(zone)?;
    let epoch = days * 86_400 + hour * 3600 + minute * 60 + second - offset_secs;
    u64::try_from(epoch).ok()
}

fn split_zone(time: &str) -> Option<(&str, &str)> {
    // Fractional seconds attach to the clock part ("12:00:00.123Z").
    let end = time.find(['Z', '+', '-']).unwrap_or(time.len());
    let (mut clock, zone) = time.split_at(end);
    if let Some(dot) = clock.find('.') {
        clock = &clock[..dot];
    }
    Some((clock, zone))
}

fn parse_zone_offset(zone: &str) -> Option<i64> {
    if zone.is_empty() || zone == "Z" {
        return Some(0);
    }
    let (sign, rest) = match zone.strip_prefix('+') {
        Some(rest) => (1i64, rest),
        None => (-1i64, zone.strip_prefix('-')?),
    };
    let (hours, minutes) = match rest.split_once(':') {
        Some((h, m)) => (h, m),
        None if rest.len() == 4 => rest.split_at(2),
        None => return None,
    };
    let hours: i64 = hours.parse().ok()?;
    let minutes: i64 = minutes.parse().ok()?;
    if hours > 23 || minutes > 59 {
        return None;
    }
    Some(sign * (hours * 3600 + minutes * 60))
}

/// Howard Hinnant's days-from-civil algorithm. Valid for the Gregorian
/// calendar range transcripts actually use.
fn days_from_civil(year: i64, month: i64, day: i64) -> Option<i64> {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let month_prime = (month + 9).rem_euclid(12);
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    Some(era * 146_097 + day_of_era - 719_468)
}

/// Timestamps on lines that failed the `"type"` pre-filter (e.g.
/// queue-operation envelopes) still count for recency.
fn extract_epoch(line: &str) -> Option<u64> {
    let timestamp = extract_timestamp(line)?;
    parse_rfc3339_epoch(&timestamp)
}

fn extract_timestamp(line: &str) -> Option<String> {
    let key = "\"timestamp\":\"";
    let start = line.find(key)? + key.len();
    let rest = &line[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn truncate_title(text: &str) -> String {
    let single_line: String = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if single_line.chars().count() <= MAX_TITLE_CHARS {
        return single_line;
    }
    let truncated: String = single_line.chars().take(MAX_TITLE_CHARS).collect();
    format!("{truncated}…")
}

#[cfg(test)]
mod tests;
