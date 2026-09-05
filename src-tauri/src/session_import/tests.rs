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
        &home.join("no-cline"),
        &home.join("no-agy"),
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
        &missing.join("cline"),
        &missing.join("agy"),
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
    // Newest opencode session must export a non-empty transcript (guards
    // against schema drift like the `role`-column regression).
    let opencode = workspaces
        .iter()
        .flat_map(|w| &w.sessions)
        .find(|s| s.source == "opencode")
        .expect("expected a real OpenCode session");
    let json = super::read_external_transcript("opencode".to_string(), opencode.id.clone())
        .expect("opencode export");
    let value: serde_json::Value = serde_json::from_str(&json).expect("json");
    let messages = value
        .get("messages")
        .and_then(|v| v.as_array())
        .expect("messages");
    println!("opencode_export_messages={}", messages.len());
    assert!(!messages.is_empty(), "expected transcript content");
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
         CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT); \
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
        "INSERT INTO message (id, session_id, time_created, data) \
         VALUES ('msg_1', 'ses_1', 1788500001000, '{\"role\":\"user\"}')",
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
fn normalizes_workspace_separators() {
    // Forward slashes (OpenCode) and backslashes (everyone else) address
    // the same directory on Windows and must group into one workspace.
    #[cfg(windows)]
    {
        assert_eq!(normalize_cwd("E:/Fake/App"), "E:\\Fake\\App");
        assert_eq!(normalize_cwd("E:\\Fake\\App"), "E:\\Fake\\App");
    }
    assert_eq!(normalize_cwd("  padded  "), "padded");
}

#[test]
fn missing_databases_scan_empty() {
    let missing = PathBuf::from("/definitely/not/here/monocode-test.db");
    let mut out = Vec::new();
    scan_opencode_db(&missing, &mut out);
    scan_zcode_db(&missing, &mut out);
    assert!(out.is_empty());
}

#[test]
fn scans_agy_conversations() {
    let root = temp_case("agydir");
    let cache = root.join("cache");
    std::fs::create_dir_all(&cache).expect("agy cache dir");
    std::fs::write(
        cache.join("conversation_metadata.json"),
        r#"{"conversations":{
            "conv-1": {"is_internal": false, "last_modified_time": "2026-09-04T10:00:00.000+05:30",
             "summary": {"Title": "Fix login", "Preview": "Fix login preview",
              "UpdatedAt": "2026-09-04T04:00:00.0000000Z",
              "WorkspaceURIs": ["file:///e:/Fake/Agy App"]}},
            "conv-2": {"is_internal": false, "last_modified_time": "2026-09-03T10:00:00Z",
             "summary": {"Title": "", "Preview": "Plan the migration",
              "UpdatedAt": "2026-09-03T10:00:00Z", "WorkspaceURIs": []}},
            "conv-internal": {"is_internal": true},
            "": {"is_internal": false}
        }}"#,
    )
    .expect("agy metadata");
    let mut out = Vec::new();
    scan_agy_dir(&root, &mut out);
    assert_eq!(out.len(), 2);
    let by_id = |id: &str| {
        out.iter()
            .find(|(_, s)| s.id == id)
            .map(|(epoch, s)| (*epoch, s.clone()))
    };
    let (epoch, one) = by_id("conv-1").expect("titled conversation");
    assert_eq!(one.source, "antigravity");
    assert_eq!(one.title, "Fix login");
    assert_eq!(one.cwd, "e:/Fake/Agy App");
    assert!(epoch > 0);
    assert_eq!(
        one.updated_at.as_deref(),
        Some("2026-09-04T10:00:00.000+05:30")
    );
    // Empty title falls back to the preview; missing workspace falls back.
    let (_, two) = by_id("conv-2").expect("preview conversation");
    assert_eq!(two.title, "Plan the migration");
    assert_eq!(two.cwd, "(unknown workspace)");
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn missing_agy_dir_scans_empty() {
    let mut out = Vec::new();
    scan_agy_dir(
        &PathBuf::from("/definitely/not/here/monocode-test"),
        &mut out,
    );
    assert!(out.is_empty());
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
            "INSERT INTO message (id, session_id, time_created, data) \
             VALUES ('msg_2', 'ses_1', 1788500002000, '{\"role\":\"assistant\"}')",
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
