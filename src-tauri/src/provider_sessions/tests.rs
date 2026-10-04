use super::*;
use std::fs;

struct TestDir(PathBuf);
impl TestDir {
    fn path(&self) -> &Path {
        &self.0
    }
}
impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn setup() -> (TestDir, Connection) {
    let dir = TestDir(
        std::env::temp_dir().join(format!("monocode-provider-test-{}", uuid::Uuid::new_v4())),
    );
    fs::create_dir_all(dir.path()).unwrap();
    let conn = Connection::open_in_memory().unwrap();
    ensure_table(&conn).unwrap();
    (dir, conn)
}

fn claude(root: &Path, id: &str) {
    let dir = root.join("projects").join("-repo");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join(format!("{id}.jsonl")), format!("{{\"type\":\"user\",\"sessionId\":\"{id}\",\"cwd\":\"/repo\",\"timestamp\":\"2026-10-04T00:00:00Z\",\"message\":{{\"role\":\"user\",\"content\":\"Keep original context\"}}}}\n")).unwrap();
}

#[test]
fn archive_survives_refresh_without_writing_provider_files() {
    let (dir, conn) = setup();
    claude(dir.path(), "native-one");
    let path = dir.path().join("projects/-repo/native-one.jsonl");
    let original = fs::read(&path).unwrap();
    let first = list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0).unwrap();
    assert_eq!(first.conversations.len(), 1);
    let key = &first.conversations[0].key;
    set_archive(&conn, key, true).unwrap();
    assert!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .is_empty()
    );
    let archived = list_at(&conn, Provider::Claude, dir.path(), "default", true, 20, 0).unwrap();
    assert!(archived.conversations[0].archived);
    set_archive(&conn, key, false).unwrap();
    assert_eq!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .len(),
        1
    );
    assert_eq!(fs::read(path).unwrap(), original);
}

#[test]
fn binding_is_atomic_sticky_and_archive_preserves_it() {
    let (dir, conn) = setup();
    let key = source_key(&Provider::Codex, dir.path(), "native");
    assert_eq!(
        bind(&conn, &key, "mono-one", "/repo", "default").unwrap(),
        "mono-one"
    );
    assert_eq!(
        bind(&conn, &key, "mono-two", "/changed", "default").unwrap(),
        "mono-one"
    );
    set_archive(&conn, &key, true).unwrap();
    assert_eq!(
        bind(&conn, &key, "mono-three", "/repo", "default").unwrap(),
        "mono-one"
    );
    assert!(bind(&conn, "bad-key", "mono", "/repo", "default").is_err());
    assert_eq!(
        conn.query_row(
            "SELECT source_cwd FROM provider_conversation_state WHERE source_key=?1",
            [key],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "/repo"
    );
}

#[test]
fn metadata_database_covers_non_jsonl_codex_store_and_deduplicates() {
    let (dir, conn) = setup();
    let db = Connection::open(dir.path().join("state_5.sqlite")).unwrap();
    db.execute_batch("CREATE TABLE threads (id TEXT, title TEXT, cwd TEXT, updated_at INTEGER); INSERT INTO threads VALUES ('native','Paged chat','/repo',42);").unwrap();
    let page = list_at(&conn, Provider::Codex, dir.path(), "default", false, 20, 0).unwrap();
    assert_eq!(page.conversations.len(), 1);
    assert_eq!(page.conversations[0].native_id, "native");
    assert_eq!(page.conversations[0].title, "Paged chat");
    fs::create_dir_all(dir.path().join("sessions")).unwrap();
    fs::write(dir.path().join("sessions/native.jsonl"), "{\"type\":\"session_meta\",\"timestamp\":\"1970-01-01T00:00:01Z\",\"payload\":{\"id\":\"native\",\"cwd\":\"/repo\"}}\n").unwrap();
    let deduplicated =
        list_at(&conn, Provider::Codex, dir.path(), "default", false, 20, 0).unwrap();
    assert_eq!(deduplicated.conversations.len(), 1);
    assert_eq!(deduplicated.conversations[0].title, "Paged chat");
    // Listing did not introduce tables or modify the provider DB.
    assert_eq!(
        db.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
}

#[test]
fn archives_and_original_folder_binding_survive_database_restart() {
    let (dir, _) = setup();
    claude(dir.path(), "restart");
    let db = dir.path().join("monocode.sqlite");
    let conn = Connection::open(&db).unwrap();
    ensure_table(&conn).unwrap();
    let key = list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
        .unwrap()
        .conversations[0]
        .key
        .clone();
    bind(&conn, &key, "mono-stable", "/repo", "default").unwrap();
    set_archive(&conn, &key, true).unwrap();
    drop(conn);
    let conn = Connection::open(db).unwrap();
    ensure_table(&conn).unwrap();
    assert!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .is_empty()
    );
    let row = list_at(&conn, Provider::Claude, dir.path(), "default", true, 20, 0)
        .unwrap()
        .conversations
        .remove(0);
    assert!(row.archived);
    assert_eq!(row.monocode_session_id.as_deref(), Some("mono-stable"));
    assert_eq!(
        conn.query_row(
            "SELECT source_cwd FROM provider_conversation_state WHERE source_key=?1",
            [key],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "/repo"
    );
}

#[test]
fn provider_list_and_binding_reuse_existing_monocode_chats_and_archives() {
    let (dir, conn) = setup();
    claude(dir.path(), "known");
    conn.execute_batch("CREATE TABLE sessions (id TEXT, harness TEXT, provider_session_id TEXT, cwd TEXT, provider_account_id TEXT, archived INTEGER, updated_at INTEGER);
        INSERT INTO sessions VALUES ('existing-mono','claude','known','/repo',NULL,1,42);
        INSERT INTO sessions VALUES ('other-account','claude','known','/repo','other',0,100);").unwrap();
    assert!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .is_empty()
    );
    let row = list_at(&conn, Provider::Claude, dir.path(), "default", true, 20, 0)
        .unwrap()
        .conversations
        .remove(0);
    assert_eq!(row.monocode_session_id.as_deref(), Some("existing-mono"));
    assert_eq!(
        bind(&conn, &row.key, "new-candidate", "/repo", "default").unwrap(),
        "existing-mono"
    );
    assert!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .is_empty()
    );
    // An explicit MonoCode-only unarchive overrides the old visibility metadata.
    set_archive(&conn, &row.key, false).unwrap();
    assert_eq!(
        list_at(&conn, Provider::Claude, dir.path(), "default", false, 20, 0)
            .unwrap()
            .conversations
            .len(),
        1
    );
}

#[test]
fn pagination_profiles_and_corrupt_source_are_explicit() {
    let (dir, conn) = setup();
    claude(dir.path(), "one");
    claude(dir.path(), "two");
    fs::write(dir.path().join("projects/-repo/broken.jsonl"), "not json").unwrap();
    let first = list_at(&conn, Provider::Claude, dir.path(), "profile", false, 1, 0).unwrap();
    assert_eq!(first.next_offset, Some(1));
    assert_eq!(first.conversations[0].provider_account_id, "profile");
    assert_eq!(first.diagnostics.len(), 1);
    let second = list_at(&conn, Provider::Claude, dir.path(), "profile", false, 1, 1).unwrap();
    assert_ne!(first.conversations[0].key, second.conversations[0].key);
    assert_eq!(second.next_offset, None);
    let other = source_key(&Provider::Claude, &dir.path().join("other"), "one");
    assert_ne!(first.conversations[0].key, other);
}

#[test]
fn cloud_metadata_rejects_unsafe_urls_and_ids() {
    let mut item = CloudSession {
        provider: Provider::Claude,
        id: "session_one".into(),
        url: "https://claude.ai/code/session_one".into(),
        cwd: "/repo".into(),
        provider_account_id: "default".into(),
        environment_id: None,
        branch: None,
        created_at: 0,
    };
    assert!(validate_cloud(&item).is_ok());
    item.url = "https://claude.ai.evil.test/code/session_one".into();
    assert!(validate_cloud(&item).is_err());
    item.url = "https://user@claude.ai/code/session_one".into();
    assert!(validate_cloud(&item).is_err());
    item.url = "https://claude.ai/code/session_one".into();
    item.id = "--help".into();
    assert!(validate_cloud(&item).is_err());
    // ID validation also lives at the CLI boundary before use as an argument.
    item.id = "bad\nvalue".into();
    assert!(validate_cloud(&item).is_err());
}

#[test]
fn cloud_retention_survives_reopen_and_keeps_first_launch_metadata_per_account() {
    let (dir, _) = setup();
    let db = dir.path().join("monocode.sqlite");
    let conn = Connection::open(&db).unwrap();
    ensure_table(&conn).unwrap();
    let mut item = CloudSession {
        provider: Provider::Codex,
        id: "task_one".into(),
        url: "https://chatgpt.com/codex/tasks/task_one".into(),
        cwd: "/original".into(),
        provider_account_id: "default".into(),
        environment_id: Some("environment_one".into()),
        branch: Some("main".into()),
        created_at: 0,
    };
    let saved = save_cloud(&conn, item.clone()).unwrap();
    assert!(saved.created_at > 0);
    drop(conn);
    let conn = Connection::open(db).unwrap();
    ensure_table(&conn).unwrap();
    item.cwd = "/retry".into();
    let retry = save_cloud(&conn, item.clone()).unwrap();
    assert_eq!(retry.cwd, "/original");
    assert_eq!(retry.created_at, saved.created_at);
    item.provider_account_id = "other".into();
    assert_eq!(save_cloud(&conn, item).unwrap().cwd, "/retry");
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM provider_cloud_sessions", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        2
    );
}

#[test]
fn history_reads_claude_and_codex_files_read_only_and_pages_earlier_chunks() {
    let (dir, _conn) = setup();
    claude(dir.path(), "native-one");
    let path = dir.path().join("projects/-repo/native-one.jsonl");
    let mut lines = String::new();
    for index in 0..40 {
        lines.push_str(&format!(
            "{{\"type\":\"user\",\"message\":{{\"content\":\"line é {index}\"}}}}\n"
        ));
    }
    fs::write(&path, &lines).unwrap();
    let original = fs::read(&path).unwrap();
    let whole =
        read_history_at(dir.path(), &Provider::Claude, "native-one", None, 1 << 20).unwrap();
    assert!(!whole.has_earlier);
    assert_eq!(whole.text, lines);
    let tail = read_history_at(dir.path(), &Provider::Claude, "native-one", None, 300).unwrap();
    assert!(tail.has_earlier);
    assert!(
        tail.text.lines().all(|line| line.ends_with('}')),
        "complete lines only"
    );
    let earlier = read_history_at(
        dir.path(),
        &Provider::Claude,
        "native-one",
        Some(tail.start),
        300,
    )
    .unwrap();
    assert!(!earlier.text.is_empty());
    assert_eq!(
        format!("{}{}", earlier.text, tail.text).lines().count(),
        earlier.text.lines().count() + tail.text.lines().count()
    );
    assert_eq!(fs::read(&path).unwrap(), original);

    let codex = dir.path().join("sessions/2026/10/04");
    fs::create_dir_all(&codex).unwrap();
    fs::write(
        codex.join("rollout-2026-10-04T00-00-00-abc-123.jsonl"),
        "{\"type\":\"response_item\"}\n",
    )
    .unwrap();
    let found = read_history_at(dir.path(), &Provider::Codex, "abc-123", None, 1 << 20).unwrap();
    assert!(found.text.contains("response_item"));
}

#[test]
fn history_reports_missing_files_and_rejects_unsafe_ids() {
    let (dir, _conn) = setup();
    let missing = read_history_at(dir.path(), &Provider::Claude, "nope", None, 100).unwrap_err();
    assert!(missing.contains("No transcript file"));
    assert!(read_history_at(dir.path(), &Provider::Claude, "../etc", None, 100).is_err());
}
