//! Golden tests for the external-session scanner. Fixtures live in
//! `src/test_fixtures/session_import/fake-home/` so no live CLI installs
//! are needed. Fixture timestamps are 2026 dates; recency tests use far
//! past/future `since_days` values instead of wall-clock math where the
//! outcome must be deterministic.

use super::*;
use std::path::PathBuf;

fn fixture_home() -> Option<PathBuf> {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    Some(manifest.join("src/test_fixtures/session_import/fake-home"))
}

/// Fixture scan without touching real machine stores.
fn scan_fixtures(since_days: u32, limit: u32) -> Vec<ExternalWorkspace> {
    let home = fixture_home().expect("fixture home");
    scan_external_sessions_from_paths(
        &home.join(".claude").join("projects"),
        &home.join(".codex").join("sessions"),
        &home.join("no-opencode.db"),
        &home.join("no-zcode.db"),
        &None,
        &home.join("no-cline"),
        since_days,
        limit,
    )
}

#[test]
fn groups_claude_and_codex_sessions_by_workspace() {
    let workspaces = scan_fixtures(0, 0);
    // Newest first: codex (2026-08-20), claude One (2026-08-01), Two (07-15).
    assert_eq!(workspaces.len(), 3);
    assert_eq!(
        workspaces[0].workspace_path,
        "E:\\Fake\\Project With Spaces\\app"
    );
    assert_eq!(workspaces[0].sessions[0].source, "codex");
    assert_eq!(workspaces[0].sessions[0].id, "thread-aaa-1111");
    assert_eq!(workspaces[0].sessions[0].message_count, 2);
    assert_eq!(
        workspaces[0].sessions[0].title,
        "Refactor the settings panel"
    );

    let one = workspaces
        .iter()
        .find(|w| w.workspace_path == "E:\\Fake\\Project One")
        .expect("claude workspace one");
    assert_eq!(one.session_count, 1);
    let session = &one.sessions[0];
    assert_eq!(session.source, "claude");
    assert_eq!(session.id, "aaaaaaaa-1111-4111-8111-111111111111");
    // Summary line wins over first user text for the title.
    assert_eq!(
        session.title,
        "Fixed login redirect by clearing stale cookies."
    );
    assert_eq!(session.message_count, 3);
    assert_eq!(
        session.updated_at.as_deref(),
        Some("2026-08-01T10:02:00.000Z")
    );
}

#[test]
fn skips_corrupt_files_without_failing() {
    let workspaces = scan_fixtures(0, 0);
    let total: usize = workspaces.iter().map(|w| w.session_count).sum();
    // sess-aaa + sess-bbb + rollout-test; corrupt.jsonl contributes nothing.
    assert_eq!(total, 3);
}

#[test]
fn since_days_filters_old_sessions() {
    // since_days huge keeps everything; the filter path is exercised by the
    // empty-home and missing-dir cases below plus a narrow window here.
    let all = scan_fixtures(0, 0);
    assert_eq!(all.iter().map(|w| w.session_count).sum::<usize>(), 3);
    // A window ending long before the fixtures excludes everything.
    // (Cutoff math uses wall-clock now; fixtures are 2026-07/08. A 1-day
    // window only passes if "now" is within a day after the newest fixture,
    // so assert the shape, not the count.)
    let recent = scan_fixtures(1, 0);
    for workspace in &recent {
        for session in &workspace.sessions {
            let epoch = session
                .updated_at
                .as_deref()
                .and_then(parse_rfc3339_epoch)
                .unwrap_or(0);
            assert!(epoch >= now_epoch().saturating_sub(86_400));
        }
    }
}

#[test]
fn limit_caps_total_sessions_newest_first() {
    let workspaces = scan_fixtures(0, 2);
    let total: usize = workspaces.iter().map(|w| w.session_count).sum();
    assert_eq!(total, 2);
    // Newest session overall is the codex one.
    assert_eq!(workspaces[0].sessions[0].source, "codex");
}

#[test]
fn missing_stores_yield_empty_lists() {
    let missing = PathBuf::from("/definitely/not/here/monocode-test");
    assert!(scan_external_sessions_from_paths(
        &missing.join("projects"),
        &missing.join("sessions"),
        &missing.join("opencode.db"),
        &missing.join("zcode.db"),
        &None,
        &missing.join("cline"),
        0,
        0,
    )
    .is_empty());
    assert!(scan_external_sessions_for_home(&None, 0, 0).is_empty());
}

#[test]
fn decodes_drive_letter_slugs() {
    assert_eq!(
        decode_claude_slug("E--Fake-Project-One"),
        Some(format!(
            "E:{}Fake{}Project{}One",
            std::path::MAIN_SEPARATOR,
            std::path::MAIN_SEPARATOR,
            std::path::MAIN_SEPARATOR
        ))
    );
    assert_eq!(decode_claude_slug(""), None);
}

#[test]
fn parses_rfc3339_variants() {
    // 2026-08-01T10:02:00Z == ...+00:00 == ... with fractional seconds.
    let base = parse_rfc3339_epoch("2026-08-01T10:02:00Z").expect("zulu");
    assert_eq!(parse_rfc3339_epoch("2026-08-01T10:02:00.000Z"), Some(base));
    assert_eq!(parse_rfc3339_epoch("2026-08-01T12:02:00+02:00"), Some(base));
    assert_eq!(parse_rfc3339_epoch("2026-08-01T10:02:00"), Some(base));
    assert_eq!(parse_rfc3339_epoch("not-a-date"), None);
    assert_eq!(parse_rfc3339_epoch("2026-13-01T00:00:00Z"), None);
}

#[test]
fn skips_injected_instruction_dumps_for_titles() {
    assert!(is_injected_instructions(
        "# AGENTS.md instructions for E:\\x\n\n<INSTRUCTIONS>"
    ));
    assert!(is_injected_instructions(
        "<permissions instructions>\nFilesystem sandboxing defines"
    ));
    assert!(!is_injected_instructions("Fix the login redirect loop"));
}

/// Live validation against this machine's real agent stores. Ignored by
/// default (needs the installs); run with
/// `cargo test -p monocode session_import_live -- --ignored --nocapture`.
/// Machine-specific: asserts the developer machine's known stores scan.
#[test]
#[ignore]
fn session_import_live() {
    let home = super::user_home().expect("home dir");
    let workspaces = scan_external_sessions_for_home(&Some(home), 0, 0);
    let claude_sessions: usize = workspaces
        .iter()
        .flat_map(|w| &w.sessions)
        .filter(|s| s.source == "claude")
        .count();
    let codex_sessions: usize = workspaces
        .iter()
        .flat_map(|w| &w.sessions)
        .filter(|s| s.source == "codex")
        .count();
    let mut by_source: std::collections::BTreeMap<&str, usize> = std::collections::BTreeMap::new();
    for workspace in &workspaces {
        for session in &workspace.sessions {
            *by_source.entry(session.source.as_str()).or_default() += 1;
        }
    }
    println!("by_source={by_source:?}");
    println!(
        "workspaces={} claude_sessions={} codex_sessions={}",
        workspaces.len(),
        claude_sessions,
        codex_sessions
    );
    for workspace in workspaces.iter().take(5) {
        println!(
            "  {} ({} sessions)",
            workspace.workspace_path, workspace.session_count
        );
    }
    assert!(claude_sessions > 0, "expected real Claude sessions");
    assert!(codex_sessions > 0, "expected real Codex sessions");
}

fn temp_case(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "monocode-session-import-{name}-{}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("temp case dir");
    dir
}

fn make_agent_db(path: &Path) {
    let conn = rusqlite::Connection::open(path).expect("create agent db");
    conn.execute_batch(
        "CREATE TABLE session (id TEXT PRIMARY KEY, directory TEXT, title TEXT, \
         time_created INTEGER, time_updated INTEGER); \
         CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, role TEXT, time_created INTEGER, data TEXT); \
         CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT, \
         time_created INTEGER, time_updated INTEGER, data TEXT);",
    )
    .expect("agent schema");
    conn.execute(
        "INSERT INTO session (id, directory, title, time_created, time_updated) \
         VALUES ('ses_1', 'E:\\Fake\\Agent App', 'Agent session one', 1788500000000, 1788589000000)",
        [],
    )
    .expect("insert session");
    conn.execute(
        "INSERT INTO message (id, session_id, role, time_created, data) \
         VALUES ('msg_1', 'ses_1', 'user', 1788500001000, '{\"role\":\"user\"}')",
        [],
    )
    .expect("insert message");
    conn.execute(
        "INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) \
         VALUES ('part_1', 'msg_1', 'ses_1', 1788500001000, 1788500001000, '{\"type\":\"text\",\"text\":\"hello agent\"}')",
        [],
    )
    .expect("insert part");
}

#[test]
fn scans_opencode_and_zcode_databases() {
    let root = temp_case("agentdb");
    let oc = root.join("opencode.db");
    let zc = root.join("zcode.db");
    make_agent_db(&oc);
    make_agent_db(&zc);

    let mut out = Vec::new();
    scan_opencode_db(&oc, &mut out);
    scan_zcode_db(&zc, &mut out);
    assert_eq!(out.len(), 2);
    for (epoch, session) in &out {
        assert!(*epoch > 0);
        assert_eq!(session.id, "ses_1");
        assert_eq!(session.cwd, "E:\\Fake\\Agent App");
        assert_eq!(session.title, "Agent session one");
        assert_eq!(session.message_count, 1);
        assert_eq!(session.updated_at.as_deref(), Some("2026-09-05"));
    }
    assert_eq!(out[0].1.source, "opencode");
    assert_eq!(out[1].1.source, "zcode");

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn missing_databases_scan_empty() {
    let missing = PathBuf::from("/definitely/not/here/monocode-test.db");
    let mut out = Vec::new();
    scan_opencode_db(&missing, &mut out);
    scan_zcode_db(&missing, &mut out);
    scan_t3_db(&None, &mut out);
    assert!(out.is_empty());
}

#[test]
fn scans_t3_threads_with_native_mapping() {
    let root = temp_case("t3db");
    let db = root.join("state.sqlite");
    {
        let conn = rusqlite::Connection::open(&db).expect("create t3 db");
        conn.execute_batch(
            "CREATE TABLE projection_threads (thread_id TEXT, project_id TEXT, title TEXT, \
             branch TEXT, worktree_path TEXT, updated_at TEXT, archived_at TEXT); \
             CREATE TABLE projection_projects (project_id TEXT, workspace_root TEXT); \
             CREATE TABLE projection_thread_sessions (thread_id TEXT, provider_name TEXT, \
             provider_session_id TEXT, provider_thread_id TEXT, updated_at TEXT); \
             CREATE TABLE projection_thread_messages (message_id TEXT, thread_id TEXT, \
             role TEXT, text TEXT, created_at TEXT); \
             INSERT INTO projection_projects VALUES ('proj-1', 'E:\\Fake\\T3 App'); \
             INSERT INTO projection_threads VALUES \
             ('thr-1', 'proj-1', 'Thread one', NULL, NULL, '2026-09-04T10:00:00.000Z', NULL), \
             ('thr-2', 'proj-1', 'Thread two', NULL, NULL, '2026-09-04T11:00:00.000Z', NULL), \
             ('thr-3', 'proj-1', 'Archived thread', NULL, NULL, '2026-09-04T12:00:00.000Z', '2026-09-04T13:00:00.000Z'), \
             ('', 'proj-1', 'No id thread', NULL, NULL, '2026-09-04T14:00:00.000Z', NULL); \
             INSERT INTO projection_thread_sessions VALUES \
             ('thr-1', 'claude', 'native-uuid-1', NULL, '2026-09-04T10:00:00.000Z'), \
             ('thr-1', 'opencode', NULL, NULL, '2026-09-04T09:00:00.000Z'), \
             ('thr-2', 'cursor', 'cursor-1', NULL, '2026-09-04T11:00:00.000Z'); \
             INSERT INTO projection_thread_messages VALUES \
             ('m1', 'thr-1', 'user', 'hello t3', '2026-09-04T10:00:00.000Z'), \
             ('m2', 'thr-1', 'assistant', 'hi back', '2026-09-04T10:01:00.000Z');",
        )
        .expect("t3 rows");
    }
    let mut out = Vec::new();
    scan_t3_db(&Some(db.clone()), &mut out);
    // thr-3 archived out, empty-id row skipped.
    assert_eq!(out.len(), 2);
    let by_id = |id: &str| {
        out.iter()
            .find(|(_, s)| s.id == id)
            .map(|(epoch, s)| (*epoch, s.clone()))
    };
    let (epoch, one) = by_id("thr-1").expect("claude thread");
    assert_eq!(one.source, "t3");
    assert_eq!(one.harness.as_deref(), Some("claude"));
    assert_eq!(one.native_id.as_deref(), Some("native-uuid-1"));
    assert_eq!(one.message_count, 2);
    assert_eq!(one.cwd, "E:\\Fake\\T3 App");
    assert!(epoch > 0);
    assert_eq!(one.updated_at.as_deref(), Some("2026-09-04T10:00:00.000Z"));
    // Cursor has no native harness but the row still lists for replay.
    let (_, two) = by_id("thr-2").expect("cursor thread");
    assert_eq!(two.harness, None);
    assert_eq!(two.native_id, None);

    // Messages export in the shared shape.
    let json = export_t3_messages(&db, "thr-1").expect("export");
    let value: serde_json::Value = serde_json::from_str(&json).expect("json");
    let messages = value
        .get("messages")
        .and_then(|v| v.as_array())
        .expect("messages");
    assert_eq!(messages.len(), 2);
    assert_eq!(
        messages[0].get("role").and_then(|v| v.as_str()),
        Some("user")
    );
    assert_eq!(
        messages[0]
            .get("parts")
            .and_then(|v| v.as_array())
            .and_then(|parts| parts[0].get("text"))
            .and_then(|v| v.as_str()),
        Some("hello t3")
    );
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn scans_cline_manifests() {
    let root = temp_case("clinedir");
    let dir = root.join("1788000000000_abCD12_cli");
    std::fs::create_dir_all(&dir).expect("cline session dir");
    std::fs::write(
        dir.join("1788000000000_abCD12_cli.json"),
        r#"{"version":1,"session_id":"1788000000000_abCD12_cli","source":"cli","provider":"cline","model":"anthropic/claude-sonnet-5","cwd":"E:\\Fake\\Cline App","started_at":"2026-08-25T10:00:00.000Z","ended_at":"2026-08-25T11:00:00.000Z"}"#,
    )
    .expect("manifest");
    std::fs::write(
        dir.join("1788000000000_abCD12_cli.messages.json"),
        r#"{"messages":[{"role":"user"},{"role":"assistant"},{"role":"user"}]}"#,
    )
    .expect("messages");
    // Corrupt neighbor is skipped.
    let bad = root.join("bad_dir");
    std::fs::create_dir_all(&bad).expect("bad dir");
    std::fs::write(bad.join("bad_dir.json"), "not json{{{").expect("bad manifest");

    let mut out = Vec::new();
    scan_cline_dir(&root, &mut out);
    assert_eq!(out.len(), 1);
    let (epoch, session) = &out[0];
    assert!(*epoch > 0);
    assert_eq!(session.id, "1788000000000_abCD12_cli");
    assert_eq!(session.source, "cline");
    assert_eq!(session.title, "anthropic/claude-sonnet-5");
    assert_eq!(session.message_count, 3);
    assert_eq!(
        session.updated_at.as_deref(),
        Some("2026-08-25T11:00:00.000Z")
    );
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn exports_transcript_parts_in_order() {
    let root = temp_case("exportdb");
    let db = root.join("export.db");
    make_agent_db(&db);
    // Second message with two parts (tool + text).
    {
        let conn = rusqlite::Connection::open(&db).expect("open export db");
        conn.execute(
            "INSERT INTO message (id, session_id, role, time_created, data) \
             VALUES ('msg_2', 'ses_1', 'assistant', 1788500002000, '{\"role\":\"assistant\"}')",
            [],
        )
        .expect("insert msg2");
        conn.execute(
            "INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) \
             VALUES ('part_2', 'msg_2', 'ses_1', 1788500002000, 1788500002000, '{\"type\":\"tool\",\"tool\":\"Read\"}')",
            [],
        )
        .expect("insert part2");
        conn.execute(
            "INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) \
             VALUES ('part_3', 'msg_2', 'ses_1', 1788500003000, 1788500003000, '{\"type\":\"text\",\"text\":\"reading now\"}')",
            [],
        )
        .expect("insert part3");
    }
    let json = export_transcript_for_db(&db, "ses_1").expect("export");
    let value: serde_json::Value = serde_json::from_str(&json).expect("json");
    let messages = value
        .get("messages")
        .and_then(|v| v.as_array())
        .expect("messages");
    assert_eq!(messages.len(), 2);
    assert_eq!(
        messages[0].get("role").and_then(|v| v.as_str()),
        Some("user")
    );
    assert_eq!(
        messages[1]
            .get("parts")
            .and_then(|v| v.as_array())
            .map(|parts| parts.len()),
        Some(2)
    );
    assert!(export_transcript_for_db(&db, "missing").is_ok());
    let empty: serde_json::Value =
        serde_json::from_str(&export_transcript_for_db(&db, "missing").expect("empty"))
            .expect("json");
    assert_eq!(
        empty
            .get("messages")
            .and_then(|v| v.as_array())
            .map(|m| m.len()),
        Some(0)
    );
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn formats_epoch_millis_as_dates() {
    assert_eq!(
        format_epoch_millis(1788532131813),
        Some("2026-09-04".to_string())
    );
    assert_eq!(format_epoch_millis(0), None);
    assert_eq!(format_epoch_millis(-5), None);
    // Round-trip through the civil algorithms.
    for (year, month, day) in [(2026, 9, 4), (2000, 2, 29), (2026, 1, 1)] {
        let days = days_from_civil(year, month, day).expect("days");
        assert_eq!(civil_from_days(days), Some((year, month, day)));
    }
}

#[test]
fn maps_t3_provider_names() {
    assert_eq!(map_t3_provider("claude"), Some("claude".to_string()));
    assert_eq!(map_t3_provider("CODEX"), Some("codex".to_string()));
    assert_eq!(map_t3_provider("opencode"), Some("opencode".to_string()));
    assert_eq!(map_t3_provider("cline"), Some("cline".to_string()));
    assert_eq!(map_t3_provider("cursor"), None);
    assert_eq!(map_t3_provider(""), None);
}
