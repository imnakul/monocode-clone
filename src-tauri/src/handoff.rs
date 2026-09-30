//! Exact-path handoff of local, usually Git-ignored files (for example a spec
//! under a private `docs/`) between the lead checkout and isolated worker
//! checkouts.
//!
//! Git's dirty-file index deliberately skips ignored files, so the ordinary
//! worker seeding and checkpoint integration never carry them. Here the app
//! moves only files a user-confirmed assignment named one by one, compares them
//! by content hash against a baseline recorded before dispatch, and never
//! touches `.gitignore`, the index or any undeclared ignored file.
//!
//! Errors carry relative paths only, never file content.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::fs::{expand_home, resolve_repo_path, MAX_TEXT_FILE_BYTES};

const BLOCKED_PARTS: [&str; 3] = [".git", "node_modules", "target"];
const PREVIEW_LIMIT: usize = 32 * 1024;
const READ_PAGE_LIMIT: usize = 32 * 1024;
const MAX_UNEXPECTED_REPORTED: usize = 20;
const MAX_HANDOFF_FILES: usize = 16;
static BASELINE_TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileState {
    pub exists: bool,
    pub size: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
}

impl FileState {
    fn missing() -> Self {
        Self {
            exists: false,
            size: 0,
            hash: None,
        }
    }

    fn of(bytes: &[u8]) -> Self {
        Self {
            exists: true,
            size: bytes.len() as u64,
            hash: Some(format!("{:x}", Sha256::digest(bytes))),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotEntry {
    pub path: String,
    pub state: FileState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaselineEntry {
    pub path: String,
    pub baseline: FileState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationEntry {
    pub path: String,
    pub baseline: FileState,
    pub after: FileState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetyEntry {
    pub path: String,
    /// Worker states that leave nothing to lose if the worktree is removed.
    pub allowed: Vec<FileState>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inspection {
    pub path: String,
    pub before: FileState,
    pub after: FileState,
    pub lead: FileState,
    pub changed: bool,
    /// The lead copy moved on to something that is neither baseline nor result.
    pub conflict: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Integration {
    pub path: String,
    pub applied: bool,
    pub already_applied: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub path: String,
    pub changed: bool,
    pub conflict: bool,
    pub before: Option<String>,
    pub lead: Option<String>,
    pub after: Option<String>,
    pub before_hash: Option<String>,
    pub lead_hash: Option<String>,
    pub after_hash: Option<String>,
    pub baseline_available: bool,
    pub binary: bool,
    pub truncated: bool,
    pub before_truncated: bool,
    pub lead_truncated: bool,
    pub after_truncated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePage {
    pub path: String,
    pub side: String,
    pub offset: u64,
    pub next_offset: Option<u64>,
    pub size: u64,
    pub hash: Option<String>,
    pub text: Option<String>,
    pub base64: Option<String>,
    pub binary: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffReadRequest {
    pub lead_cwd: String,
    pub worker_cwd: String,
    pub path: String,
    pub baseline: FileState,
    pub side: String,
    pub offset: u64,
    pub expected_hash: Option<String>,
}

fn checkout_root(cwd: &str) -> Result<PathBuf, String> {
    let trimmed = cwd.trim();
    if trimmed.is_empty() {
        return Err("A checkout path is required".into());
    }
    let root = expand_home(trimmed);
    if !root.is_dir() {
        return Err("The checkout is not a directory".into());
    }
    Ok(root)
}

fn contains_symlink(root: &Path, relative: &str) -> bool {
    let mut current = root.to_path_buf();
    for part in relative.split('/') {
        current.push(part);
        match std::fs::symlink_metadata(&current) {
            Ok(meta) if meta.file_type().is_symlink() => return true,
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return false,
            Err(_) => return true,
        }
    }
    false
}

/// The one gate every handoff path passes: exact file, inside the checkout,
/// no symlink component, regular file or missing, within the size bound.
fn validate(root: &Path, raw: &str) -> Result<String, String> {
    let unusable = || format!("\"{raw}\" cannot be handed off: use an exact project-relative file");
    if raw.contains(['*', '?', '[', ']', '{', '}']) {
        return Err(unusable());
    }
    let relative = resolve_repo_path(root, raw).map_err(|_| unusable())?;
    for part in relative.split('/') {
        let lower = part.to_ascii_lowercase();
        if part == "." || BLOCKED_PARTS.contains(&lower.as_str()) {
            return Err(format!(
                "\"{relative}\" cannot be handed off: {part} paths are never transferred"
            ));
        }
        if lower == ".env" || lower.starts_with(".env.") {
            return Err(format!(
                "\"{relative}\" cannot be handed off: environment files are never transferred"
            ));
        }
    }
    if contains_symlink(root, &relative) {
        return Err(format!(
            "\"{relative}\" cannot be handed off: it passes through a symbolic link"
        ));
    }
    match std::fs::symlink_metadata(root.join(&relative)) {
        Ok(meta) if !meta.is_file() => Err(format!(
            "\"{relative}\" cannot be handed off: it is not a regular file"
        )),
        Ok(meta) if meta.len() > MAX_TEXT_FILE_BYTES => Err(format!(
            "\"{relative}\" cannot be handed off: it is larger than {} MB",
            MAX_TEXT_FILE_BYTES / 1024 / 1024
        )),
        Ok(_) => Ok(relative),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(relative),
        Err(_) => Err(format!("\"{relative}\" could not be checked")),
    }
}

fn validate_all(root: &Path, paths: &[String]) -> Result<Vec<String>, String> {
    if paths.len() > MAX_HANDOFF_FILES {
        return Err(format!(
            "At most {MAX_HANDOFF_FILES} handoff files are allowed"
        ));
    }
    paths.iter().map(|path| validate(root, path)).collect()
}

#[cfg(unix)]
fn file_mode(path: &Path) -> Option<u32> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::symlink_metadata(path)
        .ok()
        .map(|meta| meta.permissions().mode() & 0o777)
}

#[cfg(not(unix))]
fn file_mode(_path: &Path) -> Option<u32> {
    None
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: Option<u32>) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    if let Some(mode) = mode {
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: Option<u32>) -> Result<(), String> {
    Ok(())
}

/// State plus bytes of an already validated path.
fn read(root: &Path, relative: &str) -> Result<(FileState, Option<Vec<u8>>), String> {
    match std::fs::read(root.join(relative)) {
        Ok(bytes) if bytes.len() as u64 > MAX_TEXT_FILE_BYTES => Err(format!(
            "\"{relative}\" cannot be handed off: it is larger than {} MB",
            MAX_TEXT_FILE_BYTES / 1024 / 1024
        )),
        Ok(bytes) => Ok((FileState::of(&bytes), Some(bytes))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok((FileState::missing(), None))
        }
        Err(_) => Err(format!("\"{relative}\" could not be read")),
    }
}

fn state(root: &Path, relative: &str) -> Result<FileState, String> {
    read(root, relative).map(|(state, _)| state)
}

/// Write beside the target and rename, so a crash never leaves a torn file.
fn write_atomic(
    root: &Path,
    relative: &str,
    bytes: &[u8],
    mode: Option<u32>,
) -> Result<(), String> {
    let target = root.join(relative);
    let parent = target
        .parent()
        .ok_or_else(|| format!("\"{relative}\" has no parent directory"))?;
    std::fs::create_dir_all(parent).map_err(|_| format!("\"{relative}\" could not be created"))?;
    // A directory created above could itself be a link planted concurrently.
    if contains_symlink(root, relative) {
        return Err(format!(
            "\"{relative}\" cannot be handed off: it passes through a symbolic link"
        ));
    }
    let name = target
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    let temp = parent.join(format!(".{name}.monocode-handoff-{}", std::process::id()));
    let result = std::fs::write(&temp, bytes)
        .map_err(|e| e.to_string())
        .and_then(|_| set_mode(&temp, mode))
        .and_then(|_| std::fs::rename(&temp, &target).map_err(|e| e.to_string()));
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
        return Err(format!("\"{relative}\" could not be written"));
    }
    Ok(())
}

fn snapshot(cwd: &str, paths: &[String]) -> Result<Vec<SnapshotEntry>, String> {
    let root = checkout_root(cwd)?;
    validate_all(&root, paths)?
        .into_iter()
        .map(|path| {
            let state = state(&root, &path)?;
            Ok(SnapshotEntry { path, state })
        })
        .collect()
}

fn baseline_file_path(directory: &Path, baseline: &FileState) -> Result<Option<PathBuf>, String> {
    if !baseline.exists {
        return Ok(None);
    }
    let hash = baseline
        .hash
        .as_deref()
        .filter(|value| value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .ok_or_else(|| "The handoff baseline could not be verified".to_string())?;
    Ok(Some(directory.join(hash)))
}

/// Retain approved bytes outside the checkout so conflicts remain reviewable.
/// The content hash is the only filename; file contents never enter run state.
fn retain_baseline(directory: &Path, baseline: &FileState, bytes: &[u8]) -> Result<(), String> {
    if FileState::of(bytes) != *baseline {
        return Err("A handoff file changed while its baseline was being saved".into());
    }
    let Some(target) = baseline_file_path(directory, baseline)? else {
        return Ok(());
    };
    std::fs::create_dir_all(directory)
        .map_err(|_| "The private handoff baseline could not be saved".to_string())?;
    if target.exists() {
        let existing = std::fs::read(&target)
            .map_err(|_| "The private handoff baseline could not be verified".to_string())?;
        if FileState::of(&existing) == *baseline {
            return Ok(());
        }
        return Err("The private handoff baseline could not be verified".into());
    }
    let sequence = BASELINE_TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
    let temp = directory.join(format!(".baseline-{}-{sequence}.tmp", std::process::id()));
    let result = std::fs::write(&temp, bytes)
        .map_err(|_| "The private handoff baseline could not be saved".to_string())
        .and_then(|_| {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(&temp, std::fs::Permissions::from_mode(0o600))
                    .map_err(|_| "The private handoff baseline could not be saved".to_string())?;
            }
            std::fs::rename(&temp, &target)
                .map_err(|_| "The private handoff baseline could not be saved".to_string())
        });
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
        if let Ok(existing) = std::fs::read(&target) {
            if FileState::of(&existing) == *baseline {
                return Ok(());
            }
        }
        return result;
    }
    Ok(())
}

fn retained_baseline(directory: &Path, baseline: &FileState) -> Option<Vec<u8>> {
    let path = baseline_file_path(directory, baseline).ok()??;
    let bytes = std::fs::read(path).ok()?;
    (FileState::of(&bytes) == *baseline).then_some(bytes)
}

fn snapshot_with_baselines(
    cwd: &str,
    paths: &[String],
    baseline_directory: &Path,
) -> Result<Vec<SnapshotEntry>, String> {
    let entries = snapshot(cwd, paths)?;
    let root = checkout_root(cwd)?;
    for entry in &entries {
        if !entry.state.exists {
            continue;
        }
        let (_, Some(bytes)) = read(&root, &entry.path)? else {
            return Err(format!(
                "\"{}\" changed while its baseline was being saved",
                entry.path
            ));
        };
        retain_baseline(baseline_directory, &entry.state, &bytes)?;
    }
    Ok(entries)
}

/// Copy existing lead files into a freshly created worker checkout. A file the
/// worker already holds with different bytes is newer local work and is kept.
fn seed(from_cwd: &str, to_cwd: &str, paths: &[String]) -> Result<Vec<String>, String> {
    let from = checkout_root(from_cwd)?;
    let to = checkout_root(to_cwd)?;
    let sources = validate_all(&from, paths)?;
    validate_all(&to, paths)?;
    let mut seeded = Vec::new();
    for relative in sources {
        let (_, Some(bytes)) = read(&from, &relative)? else {
            continue;
        };
        let existing = state(&to, &relative)?;
        if existing.exists {
            continue;
        }
        write_atomic(&to, &relative, &bytes, file_mode(&from.join(&relative)))?;
        seeded.push(relative);
    }
    Ok(seeded)
}

fn inspect(
    lead_cwd: &str,
    worker_cwd: &str,
    entries: &[BaselineEntry],
) -> Result<Vec<Inspection>, String> {
    let lead = checkout_root(lead_cwd)?;
    let worker = checkout_root(worker_cwd)?;
    entries
        .iter()
        .map(|entry| {
            let path = validate(&lead, &entry.path)?;
            validate(&worker, &entry.path)?;
            let after = state(&worker, &path)?;
            let current = state(&lead, &path)?;
            let changed = after != entry.baseline;
            let conflict = changed && current != entry.baseline && current != after;
            Ok(Inspection {
                path,
                before: entry.baseline.clone(),
                after,
                lead: current,
                changed,
                conflict,
            })
        })
        .collect()
}

/// Preflight every file first, then apply: a conflict on the second file must
/// not leave the first half-applied. Identical retries are recognized by the
/// lead already holding the exact result.
fn integrate(
    lead_cwd: &str,
    worker_cwd: &str,
    entries: &[IntegrationEntry],
) -> Result<Vec<Integration>, String> {
    let lead = checkout_root(lead_cwd)?;
    let worker = checkout_root(worker_cwd)?;
    struct Planned {
        path: String,
        already: bool,
        unchanged: bool,
    }
    let mut planned = Vec::new();
    for entry in entries {
        let path = validate(&lead, &entry.path)?;
        validate(&worker, &entry.path)?;
        if entry.baseline == entry.after {
            planned.push(Planned {
                path,
                already: false,
                unchanged: true,
            });
            continue;
        }
        if state(&worker, &path)? != entry.after {
            return Err(format!(
                "\"{path}\" changed in the worker checkout after it was reviewed. Review it again."
            ));
        }
        let current = state(&lead, &path)?;
        let already = current == entry.after;
        if !already && current != entry.baseline {
            return Err(format!(
                "\"{path}\" was edited in the lead checkout after the worker started. Neither copy was changed; reconcile them manually."
            ));
        }
        planned.push(Planned {
            path,
            already,
            unchanged: false,
        });
    }
    let mut results = Vec::new();
    for (plan, entry) in planned.into_iter().zip(entries) {
        if plan.unchanged || plan.already {
            results.push(Integration {
                path: plan.path,
                applied: false,
                already_applied: plan.already,
            });
            continue;
        }
        // Re-read immediately before writing: the preflight above may be old.
        let (worker_state, bytes) = read(&worker, &plan.path)?;
        if worker_state != entry.after {
            return Err(format!(
                "\"{}\" changed in the worker checkout after it was reviewed. Review it again.",
                plan.path
            ));
        }
        if state(&lead, &plan.path)? != entry.baseline {
            return Err(format!(
                "\"{}\" was edited in the lead checkout while it was being applied. Neither copy was changed.",
                plan.path
            ));
        }
        match bytes {
            Some(bytes) => write_atomic(
                &lead,
                &plan.path,
                &bytes,
                file_mode(&worker.join(&plan.path)),
            )?,
            None => {
                std::fs::remove_file(lead.join(&plan.path))
                    .map_err(|_| format!("\"{}\" could not be removed", plan.path))?;
            }
        }
        results.push(Integration {
            path: plan.path,
            applied: true,
            already_applied: false,
        });
    }
    Ok(results)
}

fn cleanup_safe(worker_cwd: &str, entries: &[SafetyEntry]) -> Result<bool, String> {
    // A checkout that is already gone holds nothing that could be lost.
    if !expand_home(worker_cwd.trim()).exists() {
        return Ok(true);
    }
    let worker = checkout_root(worker_cwd)?;
    for entry in entries {
        // A path that no longer validates (for example a swapped-in link) is
        // never proof that nothing would be lost.
        let Ok(path) = validate(&worker, &entry.path) else {
            return Ok(false);
        };
        let Ok(current) = state(&worker, &path) else {
            return Ok(false);
        };
        if !entry.allowed.contains(&current) {
            return Ok(false);
        }
    }
    Ok(true)
}

fn text_of(bytes: &[u8]) -> (Option<String>, bool, bool) {
    if bytes.contains(&0) || std::str::from_utf8(bytes).is_err() {
        return (None, true, false);
    }
    let truncated = bytes.len() > PREVIEW_LIMIT;
    let mut end = bytes.len().min(PREVIEW_LIMIT);
    while end > 0 && end < bytes.len() && (bytes[end] & 0xC0) == 0x80 {
        end -= 1;
    }
    (
        Some(std::str::from_utf8(&bytes[..end]).unwrap().to_string()),
        false,
        truncated,
    )
}

fn preview(
    lead_cwd: &str,
    worker_cwd: &str,
    path: &str,
    baseline: &FileState,
    baseline_directory: &Path,
) -> Result<Preview, String> {
    let lead = checkout_root(lead_cwd)?;
    let worker = checkout_root(worker_cwd)?;
    let path = validate(&lead, path)?;
    validate(&worker, &path)?;
    let (after_state, after_bytes) = read(&worker, &path)?;
    let (lead_state, lead_bytes) = read(&lead, &path)?;
    let changed = &after_state != baseline;
    let conflict = changed && &lead_state != baseline && lead_state != after_state;
    let baseline_bytes = retained_baseline(baseline_directory, baseline).or_else(|| {
        (&lead_state == baseline)
            .then_some(lead_bytes.clone())
            .flatten()
    });
    let baseline_available = !baseline.exists || baseline_bytes.is_some();
    let (before, before_binary, before_truncated) = baseline_bytes
        .as_deref()
        .map(text_of)
        .unwrap_or((None, false, false));
    let (lead, lead_binary, lead_truncated) = lead_bytes
        .as_deref()
        .map(text_of)
        .unwrap_or((None, false, false));
    let (after, after_binary, after_truncated) = after_bytes
        .as_deref()
        .map(text_of)
        .unwrap_or((None, false, false));
    Ok(Preview {
        path,
        changed,
        conflict,
        before,
        lead,
        after,
        before_hash: baseline.hash.clone(),
        lead_hash: lead_state.hash,
        after_hash: after_state.hash,
        baseline_available,
        binary: before_binary || lead_binary || after_binary,
        truncated: before_truncated || lead_truncated || after_truncated,
        before_truncated,
        lead_truncated,
        after_truncated,
    })
}

struct ReadPageContext<'a> {
    lead_cwd: &'a str,
    worker_cwd: &'a str,
    path: &'a str,
    baseline: &'a FileState,
    baseline_directory: &'a Path,
}

fn read_page(
    context: ReadPageContext<'_>,
    side: &str,
    offset: u64,
    expected_hash: Option<String>,
) -> Result<FilePage, String> {
    let lead = checkout_root(context.lead_cwd)?;
    let worker = checkout_root(context.worker_cwd)?;
    let path = validate(&lead, context.path)?;
    validate(&worker, &path)?;
    let (state, bytes) = match side {
        "baseline" if !context.baseline.exists => (FileState::missing(), None),
        "baseline" => {
            if let Some(bytes) = retained_baseline(context.baseline_directory, context.baseline) {
                (context.baseline.clone(), Some(bytes))
            } else {
                let (lead_state, lead_bytes) = read(&lead, &path)?;
                if &lead_state != context.baseline {
                    return Err("The original handoff baseline is unavailable for this task".into());
                }
                (lead_state, lead_bytes)
            }
        }
        "lead" => read(&lead, &path)?,
        "worker" => read(&worker, &path)?,
        _ => return Err("side must be baseline, lead or worker".into()),
    };
    if state.hash != expected_hash {
        return Err(format!(
            "The {side} handoff file changed after review. Run get again before reading it."
        ));
    }
    if offset > state.size {
        return Err("offset is past the end of the handoff file".into());
    }
    let all = bytes.unwrap_or_default();
    let start = offset as usize;
    let binary = all.contains(&0) || std::str::from_utf8(&all).is_err();
    let mut end = start.saturating_add(READ_PAGE_LIMIT).min(all.len());
    let text = if binary {
        None
    } else {
        let source =
            std::str::from_utf8(&all).map_err(|_| "The file could not be read".to_string())?;
        if !source.is_char_boundary(start) {
            return Err("offset must match a nextOffset returned by the previous page".into());
        }
        while end > start && end < all.len() && (all[end] & 0xC0) == 0x80 {
            end -= 1;
        }
        Some(source[start..end].to_string())
    };
    let base64 = binary.then(|| base64::engine::general_purpose::STANDARD.encode(&all[start..end]));
    Ok(FilePage {
        path,
        side: side.to_string(),
        offset,
        next_offset: (end < all.len()).then_some(end as u64),
        size: state.size,
        hash: state.hash,
        text,
        base64,
        binary,
    })
}

/// Ignored files present in a worker checkout that no handoff entry declared.
/// Only names are returned. Tool caches under blocked directories are not
/// reported, and this is never called for a task without declared handoffs.
fn unexpected_ignored(worker_cwd: &str, declared: &[String]) -> Result<Vec<String>, String> {
    if !expand_home(worker_cwd.trim()).exists() {
        return Ok(Vec::new());
    }
    let worker = checkout_root(worker_cwd)?;
    let declared = validate_all(&worker, declared)?;
    let mut command = Command::new("git");
    crate::hide_window_console(&mut command);
    let output = command
        .arg("-C")
        .arg(&worker)
        .args([
            "ls-files",
            "--others",
            "--ignored",
            "--exclude-standard",
            "-z",
        ])
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .map_err(|_| "Could not inspect ignored files".to_string())?;
    if !output.status.success() {
        return Err("Could not inspect ignored files".into());
    }
    let mut found: Vec<String> = output
        .stdout
        .split(|byte| *byte == 0)
        .filter(|name| !name.is_empty())
        .map(|name| String::from_utf8_lossy(name).replace('\\', "/"))
        .filter(|name| {
            !declared.contains(name)
                && !name
                    .split('/')
                    .any(|part| BLOCKED_PARTS.contains(&part.to_ascii_lowercase().as_str()))
        })
        .collect();
    found.sort();
    found.truncate(MAX_UNEXPECTED_REPORTED);
    Ok(found)
}

async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| error.to_string())?
}

fn baseline_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join("handoff-baselines"))
        .map_err(|_| "Private handoff storage is unavailable".to_string())
}

#[tauri::command(async)]
pub async fn handoff_snapshot(
    app: AppHandle,
    cwd: String,
    paths: Vec<String>,
) -> Result<Vec<SnapshotEntry>, String> {
    let directory = baseline_directory(&app)?;
    blocking(move || snapshot_with_baselines(&cwd, &paths, &directory)).await
}

#[tauri::command(async)]
pub async fn handoff_seed(
    from_cwd: String,
    to_cwd: String,
    paths: Vec<String>,
) -> Result<Vec<String>, String> {
    blocking(move || seed(&from_cwd, &to_cwd, &paths)).await
}

#[tauri::command(async)]
pub async fn handoff_inspect(
    lead_cwd: String,
    worker_cwd: String,
    entries: Vec<BaselineEntry>,
) -> Result<Vec<Inspection>, String> {
    blocking(move || inspect(&lead_cwd, &worker_cwd, &entries)).await
}

#[tauri::command(async)]
pub async fn handoff_integrate(
    lead_cwd: String,
    worker_cwd: String,
    entries: Vec<IntegrationEntry>,
) -> Result<Vec<Integration>, String> {
    blocking(move || integrate(&lead_cwd, &worker_cwd, &entries)).await
}

#[tauri::command(async)]
pub async fn handoff_cleanup_safe(
    worker_cwd: String,
    entries: Vec<SafetyEntry>,
) -> Result<bool, String> {
    blocking(move || cleanup_safe(&worker_cwd, &entries)).await
}

#[tauri::command(async)]
pub async fn handoff_preview(
    app: AppHandle,
    lead_cwd: String,
    worker_cwd: String,
    path: String,
    baseline: FileState,
) -> Result<Preview, String> {
    let directory = baseline_directory(&app)?;
    blocking(move || preview(&lead_cwd, &worker_cwd, &path, &baseline, &directory)).await
}

#[tauri::command(async)]
pub async fn handoff_read(app: AppHandle, request: HandoffReadRequest) -> Result<FilePage, String> {
    let directory = baseline_directory(&app)?;
    blocking(move || {
        read_page(
            ReadPageContext {
                lead_cwd: &request.lead_cwd,
                worker_cwd: &request.worker_cwd,
                path: &request.path,
                baseline: &request.baseline,
                baseline_directory: &directory,
            },
            &request.side,
            request.offset,
            request.expected_hash,
        )
    })
    .await
}

#[tauri::command(async)]
pub async fn handoff_unexpected_ignored(
    worker_cwd: String,
    declared: Vec<String>,
) -> Result<Vec<String>, String> {
    blocking(move || unexpected_ignored(&worker_cwd, &declared)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::ErrorKind;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static SEQ: AtomicU64 = AtomicU64::new(0);
    const SECRET: &str = "PRIVATE-SPEC-BYTES-4711";

    struct Tmp(PathBuf);
    impl Drop for Tmp {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn tmp(label: &str) -> Tmp {
        loop {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let seq = SEQ.fetch_add(1, Ordering::Relaxed);
            let dir = std::env::temp_dir().join(format!(
                "monocode-handoff-{label}-{}-{stamp}-{seq}",
                std::process::id()
            ));
            match std::fs::create_dir(&dir) {
                Ok(()) => return Tmp(dir),
                Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
                Err(error) => panic!("{error}"),
            }
        }
    }

    fn git(dir: &Path, args: &[&str]) -> Option<String> {
        let output = Command::new("git")
            .arg("-C")
            .arg(dir)
            .args(args)
            .output()
            .ok()?;
        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).into_owned())
    }

    /// A repo whose `docs/` is ignored, as in the private-spec scenario.
    fn repo(label: &str) -> Option<Tmp> {
        let dir = tmp(label);
        git(&dir.0, &["init", "-q"])?;
        std::fs::write(dir.0.join(".gitignore"), "docs/\n.env\n").ok()?;
        git(&dir.0, &["add", ".gitignore"])?;
        git(
            &dir.0,
            &[
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@t",
                "commit",
                "-qm",
                "init",
            ],
        )?;
        Some(dir)
    }

    fn put(root: &Path, relative: &str, text: &str) {
        let path = root.join(relative);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
    }

    fn text(root: &Path, relative: &str) -> String {
        std::fs::read_to_string(root.join(relative)).unwrap()
    }

    fn s(value: &str) -> String {
        value.to_string()
    }

    fn cwd(dir: &Tmp) -> String {
        dir.0.to_string_lossy().into_owned()
    }

    const SPEC: &str = "docs/specs/feature.md";

    #[test]
    fn rejects_unsafe_paths_without_echoing_content() {
        let dir = tmp("unsafe");
        put(&dir.0, ".env", SECRET);
        put(&dir.0, "docs/dir/file.md", SECRET);
        for bad in [
            ".env",
            "config/.ENV.local",
            "a/.git/config",
            "node_modules/x/index.js",
            "Target/debug/x",
            "../outside.md",
            "docs/*.md",
            "docs/",
            ".",
            "",
            "docs/dir",
        ] {
            let error = snapshot(&cwd(&dir), &[s(bad)]).expect_err(bad);
            assert!(!error.contains(SECRET), "{bad}: {error}");
        }
    }

    #[test]
    fn rejects_an_oversized_file_and_too_many_entries() {
        let dir = tmp("oversize");
        let path = dir.0.join("docs/big.md");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, vec![b'x'; MAX_TEXT_FILE_BYTES as usize + 1]).unwrap();
        assert!(snapshot(&cwd(&dir), &[s("docs/big.md")]).is_err());
        let many: Vec<String> = (0..=MAX_HANDOFF_FILES)
            .map(|i| format!("d/{i}.md"))
            .collect();
        assert!(snapshot(&cwd(&dir), &many).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_components_and_symlink_files() {
        let dir = tmp("symlink");
        let outside = tmp("symlink-outside");
        put(&outside.0, "spec.md", SECRET);
        std::os::unix::fs::symlink(&outside.0, dir.0.join("docs")).unwrap();
        assert!(snapshot(&cwd(&dir), &[s("docs/spec.md")]).is_err());
        std::os::unix::fs::symlink(outside.0.join("spec.md"), dir.0.join("link.md")).unwrap();
        assert!(snapshot(&cwd(&dir), &[s("link.md")]).is_err());
    }

    #[test]
    fn hands_an_ignored_spec_from_worker_to_lead_to_dependent_without_touching_git() {
        let Some(lead) = repo("lead") else { return };
        let Some(worker_a) = repo("worker-a") else {
            return;
        };
        let Some(worker_b) = repo("worker-b") else {
            return;
        };
        let files = [s(SPEC)];
        // The lead has no spec yet: the baseline is "missing".
        let baseline = snapshot(&cwd(&lead), &files).unwrap();
        assert!(!baseline[0].state.exists);
        assert!(seed(&cwd(&lead), &cwd(&worker_a), &files)
            .unwrap()
            .is_empty());
        // A shell command wrote it: no structured edit event exists anywhere.
        put(&worker_a.0, SPEC, SECRET);
        let entries = [BaselineEntry {
            path: s(SPEC),
            baseline: baseline[0].state.clone(),
        }];
        let inspected = inspect(&cwd(&lead), &cwd(&worker_a), &entries).unwrap();
        assert!(inspected[0].changed && !inspected[0].conflict);
        let baseline_store = tmp("baseline-store");
        let shown = preview(
            &cwd(&lead),
            &cwd(&worker_a),
            SPEC,
            &baseline[0].state,
            &baseline_store.0,
        )
        .unwrap();
        assert_eq!(shown.after.as_deref(), Some(SECRET));
        assert_eq!(shown.before, None);
        let integration = [IntegrationEntry {
            path: s(SPEC),
            baseline: baseline[0].state.clone(),
            after: inspected[0].after.clone(),
        }];
        let done = integrate(&cwd(&lead), &cwd(&worker_a), &integration).unwrap();
        assert!(done[0].applied && !done[0].already_applied);
        assert_eq!(text(&lead.0, SPEC), SECRET);
        // The dependent worker is seeded with the accepted bytes.
        assert_eq!(
            seed(&cwd(&lead), &cwd(&worker_b), &files).unwrap(),
            vec![s(SPEC)]
        );
        assert_eq!(text(&worker_b.0, SPEC), SECRET);
        // Git never learned about it.
        assert_eq!(git(&lead.0, &["status", "--porcelain"]).unwrap(), "");
        assert_eq!(git(&lead.0, &["ls-files"]).unwrap().trim(), ".gitignore");
        assert_eq!(text(&lead.0, ".gitignore"), "docs/\n.env\n");
    }

    #[test]
    fn conflict_review_keeps_the_approved_baseline_and_each_current_copy() {
        let lead = tmp("baseline-conflict-lead");
        let worker = tmp("baseline-conflict-worker");
        let baseline_store = tmp("baseline-conflict-store");
        let path = "docs/spec.md";
        put(&lead.0, path, "approved original bytes");
        let baseline = snapshot_with_baselines(&cwd(&lead), &[s(path)], &baseline_store.0).unwrap()
            [0]
        .state
        .clone();
        seed(&cwd(&lead), &cwd(&worker), &[s(path)]).unwrap();
        put(&worker.0, path, "worker result bytes");
        put(&lead.0, path, "conflicting lead edit bytes");

        let shown = preview(
            &cwd(&lead),
            &cwd(&worker),
            path,
            &baseline,
            &baseline_store.0,
        )
        .unwrap();
        assert!(shown.conflict);
        assert_eq!(shown.before.as_deref(), Some("approved original bytes"));
        assert_eq!(shown.lead.as_deref(), Some("conflicting lead edit bytes"));
        assert_eq!(shown.after.as_deref(), Some("worker result bytes"));
        assert!(shown.baseline_available);

        for (side, expected_hash, expected_text) in [
            (
                "baseline",
                shown.before_hash.clone(),
                "approved original bytes",
            ),
            (
                "lead",
                shown.lead_hash.clone(),
                "conflicting lead edit bytes",
            ),
            ("worker", shown.after_hash.clone(), "worker result bytes"),
        ] {
            let page = read_page(
                ReadPageContext {
                    lead_cwd: &cwd(&lead),
                    worker_cwd: &cwd(&worker),
                    path,
                    baseline: &baseline,
                    baseline_directory: &baseline_store.0,
                },
                side,
                0,
                expected_hash,
            )
            .unwrap();
            assert_eq!(page.text.as_deref(), Some(expected_text));
            assert_eq!(page.next_offset, None);
        }
    }

    #[test]
    fn paged_read_covers_the_full_maximum_allowed_text_file() {
        let lead = tmp("paged-lead");
        let worker = tmp("paged-worker");
        let baseline_store = tmp("paged-baseline-store");
        let path = "docs/large.md";
        let original = "x".repeat(MAX_TEXT_FILE_BYTES as usize);
        put(&lead.0, path, &original);
        let baseline = snapshot_with_baselines(&cwd(&lead), &[s(path)], &baseline_store.0).unwrap()
            [0]
        .state
        .clone();

        let first = preview(
            &cwd(&lead),
            &cwd(&worker),
            path,
            &baseline,
            &baseline_store.0,
        )
        .unwrap();
        assert!(first.before_truncated);
        assert!(first.truncated);

        let mut offset = 0;
        let mut complete = String::new();
        loop {
            let page = read_page(
                ReadPageContext {
                    lead_cwd: &cwd(&lead),
                    worker_cwd: &cwd(&worker),
                    path,
                    baseline: &baseline,
                    baseline_directory: &baseline_store.0,
                },
                "lead",
                offset,
                baseline.hash.clone(),
            )
            .unwrap();
            complete.push_str(page.text.as_deref().unwrap());
            match page.next_offset {
                Some(next) => offset = next,
                None => break,
            }
        }
        assert_eq!(complete, original);
    }

    #[test]
    fn a_file_changed_during_review_requires_a_fresh_get_and_never_leaks_bytes() {
        let lead = tmp("review-change-lead");
        let worker = tmp("review-change-worker");
        let baseline_store = tmp("review-change-store");
        let path = "docs/spec.md";
        put(&lead.0, path, "private baseline contents");
        let baseline = snapshot_with_baselines(&cwd(&lead), &[s(path)], &baseline_store.0).unwrap()
            [0]
        .state
        .clone();
        seed(&cwd(&lead), &cwd(&worker), &[s(path)]).unwrap();
        put(&worker.0, path, "reviewed worker contents");
        let shown = preview(
            &cwd(&lead),
            &cwd(&worker),
            path,
            &baseline,
            &baseline_store.0,
        )
        .unwrap();
        let before_change = read_page(
            ReadPageContext {
                lead_cwd: &cwd(&lead),
                worker_cwd: &cwd(&worker),
                path,
                baseline: &baseline,
                baseline_directory: &baseline_store.0,
            },
            "worker",
            0,
            shown.after_hash.clone(),
        )
        .unwrap();
        assert_eq!(
            before_change.text.as_deref(),
            Some("reviewed worker contents")
        );

        put(&worker.0, path, "changed during review contents");
        let error = read_page(
            ReadPageContext {
                lead_cwd: &cwd(&lead),
                worker_cwd: &cwd(&worker),
                path,
                baseline: &baseline,
                baseline_directory: &baseline_store.0,
            },
            "worker",
            0,
            shown.after_hash,
        )
        .unwrap_err();
        assert!(error.contains("changed after review"));
        assert!(!error.contains("reviewed worker contents"));
        assert!(!error.contains("changed during review contents"));
        let integrate_error = integrate(
            &cwd(&lead),
            &cwd(&worker),
            &[IntegrationEntry {
                path: s(path),
                baseline,
                after: FileState::of(b"reviewed worker contents"),
            }],
        )
        .unwrap_err();
        assert!(!integrate_error.contains("changed during review contents"));
    }

    #[test]
    fn an_existing_spec_baseline_blocks_a_conflicting_lead_edit_and_keeps_both_copies() {
        let lead = tmp("conflict-lead");
        let worker = tmp("conflict-worker");
        let files = [s(SPEC)];
        put(&lead.0, SPEC, "original");
        let baseline = snapshot(&cwd(&lead), &files).unwrap()[0].state.clone();
        seed(&cwd(&lead), &cwd(&worker), &files).unwrap();
        assert_eq!(text(&worker.0, SPEC), "original");
        put(&worker.0, SPEC, "worker version");
        put(&lead.0, SPEC, "lead edit");
        let entries = [BaselineEntry {
            path: s(SPEC),
            baseline: baseline.clone(),
        }];
        let inspected = inspect(&cwd(&lead), &cwd(&worker), &entries).unwrap();
        assert!(inspected[0].changed && inspected[0].conflict);
        let error = integrate(
            &cwd(&lead),
            &cwd(&worker),
            &[IntegrationEntry {
                path: s(SPEC),
                baseline,
                after: inspected[0].after.clone(),
            }],
        )
        .unwrap_err();
        assert!(!error.contains("lead edit") && !error.contains("worker version"));
        assert_eq!(text(&lead.0, SPEC), "lead edit");
        assert_eq!(text(&worker.0, SPEC), "worker version");
    }

    #[test]
    fn identical_retry_after_partial_integration_succeeds_without_duplicating() {
        let lead = tmp("retry-lead");
        let worker = tmp("retry-worker");
        let baseline_store = tmp("retry-baseline-store");
        let files = [s("docs/a.md"), s("docs/b.md")];
        put(&lead.0, "docs/a.md", "original A");
        put(&lead.0, "docs/b.md", "original B");
        let baseline = snapshot_with_baselines(&cwd(&lead), &files, &baseline_store.0).unwrap();
        put(&worker.0, "docs/a.md", "A");
        put(&worker.0, "docs/b.md", "B");
        let entries: Vec<IntegrationEntry> = files
            .iter()
            .zip(&baseline)
            .map(|(path, base)| IntegrationEntry {
                path: path.clone(),
                baseline: base.state.clone(),
                after: state(&worker.0, path).unwrap(),
            })
            .collect();
        // Simulate a crash after only the first file landed.
        integrate(&cwd(&lead), &cwd(&worker), &entries[..1]).unwrap();
        let retained = read_page(
            ReadPageContext {
                lead_cwd: &cwd(&lead),
                worker_cwd: &cwd(&worker),
                path: "docs/a.md",
                baseline: &entries[0].baseline,
                baseline_directory: &baseline_store.0,
            },
            "baseline",
            0,
            entries[0].baseline.hash.clone(),
        )
        .unwrap();
        assert_eq!(retained.text.as_deref(), Some("original A"));
        assert_eq!(retained.next_offset, None);
        let retried = integrate(&cwd(&lead), &cwd(&worker), &entries).unwrap();
        assert!(retried[0].already_applied && !retried[0].applied);
        assert!(retried[1].applied);
        assert_eq!(text(&lead.0, "docs/a.md"), "A");
        assert_eq!(text(&lead.0, "docs/b.md"), "B");
        let again = integrate(&cwd(&lead), &cwd(&worker), &entries).unwrap();
        assert!(again.iter().all(|item| item.already_applied));
    }

    #[test]
    fn a_conflict_on_a_later_file_applies_nothing() {
        let lead = tmp("atomic-lead");
        let worker = tmp("atomic-worker");
        let files = [s("docs/a.md"), s("docs/b.md")];
        put(&lead.0, "docs/b.md", "lead b");
        let baseline = snapshot(&cwd(&lead), &files).unwrap();
        put(&worker.0, "docs/a.md", "A");
        put(&worker.0, "docs/b.md", "worker b");
        let entries: Vec<IntegrationEntry> = files
            .iter()
            .zip(&baseline)
            .map(|(path, base)| IntegrationEntry {
                path: path.clone(),
                baseline: base.state.clone(),
                after: state(&worker.0, path).unwrap(),
            })
            .collect();
        put(&lead.0, "docs/b.md", "lead b edited");
        assert!(integrate(&cwd(&lead), &cwd(&worker), &entries).is_err());
        assert!(!lead.0.join("docs/a.md").exists());
    }

    #[test]
    fn detects_an_edit_made_after_review() {
        let lead = tmp("stale-lead");
        let worker = tmp("stale-worker");
        let files = [s(SPEC)];
        let baseline = snapshot(&cwd(&lead), &files).unwrap()[0].state.clone();
        put(&worker.0, SPEC, "reviewed");
        let reviewed = state(&worker.0, SPEC).unwrap();
        put(&worker.0, SPEC, "edited afterwards");
        let error = integrate(
            &cwd(&lead),
            &cwd(&worker),
            &[IntegrationEntry {
                path: s(SPEC),
                baseline,
                after: reviewed,
            }],
        )
        .unwrap_err();
        assert!(error.contains("after it was reviewed"));
        assert!(!lead.0.join(SPEC).exists());
    }

    #[test]
    fn propagates_a_deletion_and_preserves_the_file_mode() {
        let lead = tmp("delete-lead");
        let worker = tmp("delete-worker");
        put(&lead.0, SPEC, "to delete");
        let baseline = snapshot(&cwd(&lead), &[s(SPEC)]).unwrap()[0].state.clone();
        let after = state(&worker.0, SPEC).unwrap();
        assert!(!after.exists);
        let done = integrate(
            &cwd(&lead),
            &cwd(&worker),
            &[IntegrationEntry {
                path: s(SPEC),
                baseline,
                after,
            }],
        )
        .unwrap();
        assert!(done[0].applied);
        assert!(!lead.0.join(SPEC).exists());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            put(&worker.0, "docs/run.sh", "#!/bin/sh\n");
            std::fs::set_permissions(
                worker.0.join("docs/run.sh"),
                std::fs::Permissions::from_mode(0o750),
            )
            .unwrap();
            let after = state(&worker.0, "docs/run.sh").unwrap();
            integrate(
                &cwd(&lead),
                &cwd(&worker),
                &[IntegrationEntry {
                    path: s("docs/run.sh"),
                    baseline: FileState::missing(),
                    after,
                }],
            )
            .unwrap();
            assert_eq!(file_mode(&lead.0.join("docs/run.sh")), Some(0o750));
        }
    }

    #[test]
    fn seed_never_overwrites_newer_bytes_in_a_retained_checkout() {
        let lead = tmp("seed-lead");
        let worker = tmp("seed-worker");
        put(&lead.0, SPEC, "accepted");
        put(&worker.0, SPEC, "newer local work");
        let seeded = seed(&cwd(&lead), &cwd(&worker), &[s(SPEC)]).unwrap();
        assert!(seeded.is_empty());
        assert_eq!(text(&worker.0, SPEC), "newer local work");
    }

    #[test]
    fn cleanup_is_unsafe_while_the_worker_holds_the_only_changed_copy() {
        let worker = tmp("cleanup");
        let baseline = FileState::missing();
        put(&worker.0, SPEC, "only copy");
        let changed = state(&worker.0, SPEC).unwrap();
        let unsafe_entry = [SafetyEntry {
            path: s(SPEC),
            allowed: vec![baseline.clone()],
        }];
        assert!(!cleanup_safe(&cwd(&worker), &unsafe_entry).unwrap());
        let accepted = [SafetyEntry {
            path: s(SPEC),
            allowed: vec![baseline, changed],
        }];
        assert!(cleanup_safe(&cwd(&worker), &accepted).unwrap());
    }

    #[test]
    fn reports_undeclared_ignored_files_by_name_only() {
        let Some(worker) = repo("unexpected") else {
            return;
        };
        put(&worker.0, SPEC, "declared");
        put(&worker.0, ".env", SECRET);
        put(&worker.0, "docs/scratch.md", SECRET);
        put(&worker.0, "node_modules/pkg/index.js", "cache");
        let found = unexpected_ignored(&cwd(&worker), &[s(SPEC)]).unwrap();
        assert_eq!(found, vec![s(".env"), s("docs/scratch.md")]);
        assert!(found.iter().all(|name| !name.contains(SECRET)));
    }
}
