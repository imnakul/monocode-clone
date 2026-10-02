use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::session_store::{now_millis, validate_id, SessionStore};

const TITLE_MAX: usize = 200;
const BODY_MAX: usize = 1_000_000;
const TAG_MAX: usize = 48;
const TAGS_MAX: usize = 20;
const PROJECT_CWD_MAX: usize = 4096;
const SOURCE_BLOCK_ID_MAX: usize = 512;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Draft,
    Todo,
    InProgress,
    Blocked,
    Review,
    Completed,
    Deferred,
}

impl TaskStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Todo => "todo",
            Self::InProgress => "in_progress",
            Self::Blocked => "blocked",
            Self::Review => "review",
            Self::Completed => "completed",
            Self::Deferred => "deferred",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        Some(match value {
            "draft" => Self::Draft,
            "todo" => Self::Todo,
            "in_progress" => Self::InProgress,
            "blocked" => Self::Blocked,
            "review" => Self::Review,
            "completed" => Self::Completed,
            "deferred" => Self::Deferred,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub body: String,
    pub status: TaskStatus,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_cwd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_block_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,
}

/// A full task replacement. Callers merge partial edits before invoking this.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpsert {
    pub id: String,
    pub title: String,
    pub body: String,
    pub status: TaskStatus,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub project_cwd: Option<String>,
    #[serde(default)]
    pub source_session_id: Option<String>,
    #[serde(default)]
    pub source_block_id: Option<String>,
}

/// Create the independent task table without changing the session migration
/// version or rewriting notes/sessions.
pub fn ensure_tasks_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tasks (
           id TEXT PRIMARY KEY,
           title TEXT NOT NULL,
           body TEXT NOT NULL DEFAULT '',
           status TEXT NOT NULL DEFAULT 'todo'
             CHECK (status IN ('draft', 'todo', 'in_progress', 'blocked',
                               'review', 'completed', 'deferred')),
           tags_json TEXT NOT NULL DEFAULT '[]',
           project_cwd TEXT,
           source_session_id TEXT,
           source_block_id TEXT,
           created_at INTEGER NOT NULL,
           updated_at INTEGER NOT NULL,
           completed_at INTEGER
         );
         CREATE INDEX IF NOT EXISTS tasks_project_updated_idx
           ON tasks (project_cwd, updated_at DESC, id ASC);
         CREATE INDEX IF NOT EXISTS tasks_status_updated_idx
           ON tasks (status, updated_at DESC, id ASC);",
    )
}

#[tauri::command(async)]
pub fn tasks_list(store: State<'_, SessionStore>) -> Result<Vec<Task>, String> {
    let conn = store.lock_conn()?;
    list_tasks(&conn).map_err(|error| error.to_string())
}

#[tauri::command(async)]
pub fn tasks_get(store: State<'_, SessionStore>, id: String) -> Result<Option<Task>, String> {
    validate_id(&id, "task")?;
    let conn = store.lock_conn()?;
    get_task(&conn, &id).map_err(|error| error.to_string())
}

#[tauri::command(async)]
pub fn tasks_upsert(store: State<'_, SessionStore>, task: TaskUpsert) -> Result<Task, String> {
    validate_task_upsert(&task)?;
    let conn = store.lock_conn()?;
    upsert_task(&conn, &task).map_err(|error| error.to_string())
}

#[tauri::command(async)]
pub fn tasks_delete(store: State<'_, SessionStore>, id: String) -> Result<(), String> {
    validate_id(&id, "task")?;
    let conn = store.lock_conn()?;
    delete_task(&conn, &id).map_err(|error| error.to_string())
}

fn validate_task_upsert(task: &TaskUpsert) -> Result<(), String> {
    validate_id(&task.id, "task")?;
    if task.body.len() > BODY_MAX {
        return Err("Task is too large".into());
    }
    validate_optional_id(task.source_session_id.as_deref(), "session")?;
    validate_optional_block_id(task.source_block_id.as_deref())?;
    if let Some(project_cwd) = task.project_cwd.as_deref() {
        let project_cwd = project_cwd.trim();
        if project_cwd.is_empty()
            || project_cwd.len() > PROJECT_CWD_MAX
            || project_cwd.chars().any(char::is_control)
        {
            return Err("Invalid task project path".into());
        }
    }
    Ok(())
}

fn validate_optional_id(value: Option<&str>, label: &str) -> Result<(), String> {
    if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
        validate_id(value, label)?;
    }
    Ok(())
}

/// Block IDs can be provider-scoped opaque values such as `cline:native-id`.
/// Keep them bounded and control-free without applying the stricter session
/// and record ID alphabet to provider-owned identifiers.
fn validate_optional_block_id(value: Option<&str>) -> Result<(), String> {
    if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
        if value.len() > SOURCE_BLOCK_ID_MAX || value.chars().any(char::is_control) {
            return Err("Invalid task source block id".into());
        }
    }
    Ok(())
}

fn list_tasks(conn: &Connection) -> rusqlite::Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, body, status, tags_json, project_cwd,
                source_session_id, source_block_id, created_at, updated_at, completed_at
         FROM tasks
         ORDER BY updated_at DESC, id ASC",
    )?;
    let rows = stmt.query_map([], read_task)?;
    rows.collect()
}

fn get_task(conn: &Connection, id: &str) -> rusqlite::Result<Option<Task>> {
    conn.query_row(
        "SELECT id, title, body, status, tags_json, project_cwd,
                source_session_id, source_block_id, created_at, updated_at, completed_at
         FROM tasks
         WHERE id = ?1",
        params![id],
        read_task,
    )
    .optional()
}

fn upsert_task(conn: &Connection, input: &TaskUpsert) -> rusqlite::Result<Task> {
    let title = normalize_title(&input.title);
    let body = input.body.replace("\r\n", "\n").replace('\r', "\n");
    let status = input.status.as_str();
    let tags = normalize_tags(&input.tags);
    let tags_json = serde_json::to_string(&tags)
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
    let project_cwd = clean_optional(input.project_cwd.as_deref());
    let source_session_id = clean_optional(input.source_session_id.as_deref());
    let source_block_id = clean_optional(input.source_block_id.as_deref());
    let now = now_millis();

    // Completion time and created time transitions are evaluated by one
    // SQLite statement, so an edit racing a completion cannot reset the time.
    conn.execute(
        "INSERT INTO tasks (
           id, title, body, status, tags_json, project_cwd,
           source_session_id, source_block_id, created_at, updated_at, completed_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9,
                   CASE WHEN ?4 = 'completed' THEN ?9 ELSE NULL END)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           body = excluded.body,
           status = excluded.status,
           tags_json = excluded.tags_json,
           project_cwd = excluded.project_cwd,
           source_session_id = excluded.source_session_id,
           source_block_id = excluded.source_block_id,
           updated_at = CASE
             WHEN tasks.title IS NOT excluded.title
               OR tasks.body IS NOT excluded.body
               OR tasks.status IS NOT excluded.status
               OR tasks.tags_json IS NOT excluded.tags_json
               OR tasks.project_cwd IS NOT excluded.project_cwd
               OR tasks.source_session_id IS NOT excluded.source_session_id
               OR tasks.source_block_id IS NOT excluded.source_block_id
             THEN excluded.updated_at ELSE tasks.updated_at END,
           completed_at = CASE
             WHEN excluded.status = 'completed' AND tasks.status <> 'completed'
               THEN excluded.completed_at
             WHEN excluded.status = 'completed' THEN tasks.completed_at
             ELSE NULL END",
        params![
            input.id,
            title,
            body,
            status,
            tags_json,
            project_cwd,
            source_session_id,
            source_block_id,
            now,
        ],
    )?;
    get_task(conn, &input.id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

fn delete_task(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    Ok(())
}

fn read_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    let status_text: String = row.get(3)?;
    let status = TaskStatus::parse(&status_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            3,
            rusqlite::types::Type::Text,
            format!("Invalid task status: {status_text}").into(),
        )
    })?;
    let tags_json: String = row.get(4)?;
    let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        body: row.get(2)?,
        status,
        tags,
        project_cwd: row.get(5)?,
        source_session_id: row.get(6)?,
        source_block_id: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        completed_at: row.get(10)?,
    })
}

fn clean_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn normalize_tags(tags: &[String]) -> Vec<String> {
    let mut normalized = Vec::new();
    for input in tags {
        let tag = input
            .trim()
            .trim_start_matches('#')
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("-")
            .to_lowercase();
        let tag: String = tag.chars().take(TAG_MAX).collect();
        let tag = tag.trim_end_matches('-').to_string();
        if tag.is_empty() || normalized.contains(&tag) {
            continue;
        }
        normalized.push(tag);
        if normalized.len() == TAGS_MAX {
            break;
        }
    }
    normalized
}

fn normalize_title(title: &str) -> String {
    let trimmed = title.trim();
    let sliced: String = trimmed.chars().take(TITLE_MAX).collect();
    let sliced = sliced.trim().to_string();
    if sliced.is_empty() {
        "Untitled task".into()
    } else {
        sliced
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_store::SessionStore;

    fn input(id: &str, status: TaskStatus) -> TaskUpsert {
        TaskUpsert {
            id: id.into(),
            title: "Task title".into(),
            body: "Markdown body".into(),
            status,
            tags: Vec::new(),
            project_cwd: None,
            source_session_id: None,
            source_block_id: None,
        }
    }

    #[test]
    fn session_store_initializes_an_independent_tasks_table() {
        let store = SessionStore::open_in_memory().unwrap();
        let conn = store.lock_conn().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
        ensure_tasks_table(&conn).unwrap();
        let still_one: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(still_one, 1);
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, 18, "tasks do not add a global migration version");
    }

    #[test]
    fn tasks_and_deletions_survive_reopening_the_session_database() {
        let path =
            std::env::temp_dir().join(format!("monocode-tasks-{}.sqlite", uuid::Uuid::new_v4()));
        let expected = {
            let store = SessionStore::open(path.clone()).unwrap();
            let conn = store.lock_conn().unwrap();
            let mut project = input("persistent-project", TaskStatus::Completed);
            project.project_cwd = Some("C:/Work/Mono".into());
            project.tags = vec!["windows".into()];
            project.source_session_id = Some("source-session".into());
            project.source_block_id = Some("cline:42".into());
            let saved = upsert_task(&conn, &project).unwrap();
            upsert_task(&conn, &input("persistent-personal", TaskStatus::Deferred)).unwrap();
            saved
        };
        {
            let store = SessionStore::open(path.clone()).unwrap();
            let conn = store.lock_conn().unwrap();
            assert_eq!(
                get_task(&conn, &expected.id).unwrap(),
                Some(expected.clone())
            );
            assert_eq!(list_tasks(&conn).unwrap().len(), 2);
            assert_eq!(
                get_task(&conn, "persistent-personal")
                    .unwrap()
                    .unwrap()
                    .project_cwd,
                None
            );
            delete_task(&conn, &expected.id).unwrap();
        }
        {
            let store = SessionStore::open(path.clone()).unwrap();
            let conn = store.lock_conn().unwrap();
            assert!(get_task(&conn, &expected.id).unwrap().is_none());
            assert_eq!(list_tasks(&conn).unwrap().len(), 1);
        }
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn task_crud_normalizes_fields_and_full_upserts_clear_omitted_options() {
        let store = SessionStore::open_in_memory().unwrap();
        let conn = store.lock_conn().unwrap();
        let mut first = input("task-1", TaskStatus::Todo);
        first.title = "  Write tasks  ".into();
        first.body = "first\r\nsecond".into();
        first.tags = vec!["#Road Map".into(), "road-map".into(), "Other".into()];
        first.project_cwd = Some(" /work/project ".into());
        first.source_session_id = Some("session-1".into());
        first.source_block_id = Some("cline:native-42".into());
        validate_task_upsert(&first).unwrap();
        let created = upsert_task(&conn, &first).unwrap();
        assert_eq!(created.title, "Write tasks");
        assert_eq!(created.body, "first\nsecond");
        assert_eq!(created.tags, vec!["road-map", "other"]);
        assert_eq!(created.project_cwd.as_deref(), Some("/work/project"));
        assert_eq!(created.source_session_id.as_deref(), Some("session-1"));
        assert_eq!(created.source_block_id.as_deref(), Some("cline:native-42"));
        assert_eq!(created.status, TaskStatus::Todo);

        std::thread::sleep(std::time::Duration::from_millis(5));
        let mut replacement = input("task-1", TaskStatus::InProgress);
        replacement.title = "Continue implementation".into();
        replacement.body = "Updated body".into();
        replacement.tags = vec!["Implementation".into()];
        let updated = upsert_task(&conn, &replacement).unwrap();
        assert_eq!(updated.created_at, created.created_at);
        assert!(updated.updated_at > created.updated_at);
        assert_eq!(updated.title, "Continue implementation");
        assert_eq!(updated.tags, vec!["implementation"]);
        assert_eq!(updated.project_cwd, None);
        assert_eq!(updated.source_session_id, None);
        assert_eq!(updated.source_block_id, None);
        assert_eq!(get_task(&conn, "task-1").unwrap(), Some(updated.clone()));
        assert_eq!(list_tasks(&conn).unwrap(), vec![updated]);

        delete_task(&conn, "task-1").unwrap();
        assert!(get_task(&conn, "task-1").unwrap().is_none());
        delete_task(&conn, "missing-task").unwrap();
        assert!(get_task(&conn, "missing-task").unwrap().is_none());
        assert!(list_tasks(&conn).unwrap().is_empty());
    }

    #[test]
    fn every_canonical_status_round_trips_and_serializes_with_its_stable_id() {
        let store = SessionStore::open_in_memory().unwrap();
        let conn = store.lock_conn().unwrap();
        let cases = [
            (TaskStatus::Draft, "draft"),
            (TaskStatus::Todo, "todo"),
            (TaskStatus::InProgress, "in_progress"),
            (TaskStatus::Blocked, "blocked"),
            (TaskStatus::Review, "review"),
            (TaskStatus::Completed, "completed"),
            (TaskStatus::Deferred, "deferred"),
        ];

        for (index, (status, serialized)) in cases.into_iter().enumerate() {
            let id = format!("status-{index}");
            let task = upsert_task(&conn, &input(&id, status)).unwrap();
            assert_eq!(task.status, status);
            assert_eq!(serde_json::to_value(status).unwrap(), serialized);
            assert_eq!(get_task(&conn, &id).unwrap().unwrap().status, status);
        }
        assert_eq!(list_tasks(&conn).unwrap().len(), cases.len());
    }

    #[test]
    fn completion_time_is_set_once_preserved_on_edits_and_cleared_on_reopen() {
        let store = SessionStore::open_in_memory().unwrap();
        let conn = store.lock_conn().unwrap();
        let completed = upsert_task(&conn, &input("done-1", TaskStatus::Completed)).unwrap();
        let first_completed_at = completed.completed_at.unwrap();
        assert_eq!(completed.status, TaskStatus::Completed);

        std::thread::sleep(std::time::Duration::from_millis(5));
        let mut edit = input("done-1", TaskStatus::Completed);
        edit.body = "Edited after completion".into();
        let edited = upsert_task(&conn, &edit).unwrap();
        assert_eq!(edited.completed_at, Some(first_completed_at));
        assert_eq!(edited.created_at, completed.created_at);
        assert!(edited.updated_at > completed.updated_at);

        let reopened = upsert_task(&conn, &input("done-1", TaskStatus::Todo)).unwrap();
        assert_eq!(reopened.completed_at, None);
        std::thread::sleep(std::time::Duration::from_millis(5));
        let completed_again = upsert_task(&conn, &input("done-1", TaskStatus::Completed)).unwrap();
        assert!(completed_again.completed_at.unwrap() > first_completed_at);
    }

    #[test]
    fn task_validation_rejects_bad_ids_sizes_provenance_and_project_paths() {
        let mut task = input("bad/id", TaskStatus::Todo);
        assert!(validate_task_upsert(&task).is_err());

        task = input("task-1", TaskStatus::Todo);
        task.body = "x".repeat(BODY_MAX + 1);
        assert!(validate_task_upsert(&task).is_err());

        task = input("task-1", TaskStatus::Todo);
        task.source_session_id = Some("bad/session".into());
        assert!(validate_task_upsert(&task).is_err());

        task = input("task-1", TaskStatus::Todo);
        task.source_block_id = Some("bad\nblock".into());
        assert!(validate_task_upsert(&task).is_err());

        task.source_block_id = Some("x".repeat(SOURCE_BLOCK_ID_MAX + 1));
        assert!(validate_task_upsert(&task).is_err());

        task = input("task-1", TaskStatus::Todo);
        task.project_cwd = Some("/work\0/project".into());
        assert!(validate_task_upsert(&task).is_err());
        task.project_cwd = Some("x".repeat(PROJECT_CWD_MAX + 1));
        assert!(validate_task_upsert(&task).is_err());

        assert!(serde_json::from_str::<TaskStatus>("\"todo\"").is_ok());
        assert!(serde_json::from_str::<TaskStatus>("\"in_progress\"").is_ok());
        assert!(serde_json::from_str::<TaskStatus>("\"unknown\"").is_err());
    }
}
