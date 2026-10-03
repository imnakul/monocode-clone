# Claude and Codex integration review

- Reviewed: 2026-09-30 10:21 IST.
- Source snapshot: nakul/windows-support, HEAD 9397898c923491a9ee1e9cd77c4bcc917634c888 plus current local changes.
- Installed versions: Claude Code 2.1.283; codex-cli 0.159.0.
- Scope: source and official documentation comparison. No live provider requests, desktop tests, source changes, Git mutations, or builds.

## Priorities for normal chats and manual orchestration

1. Session-scoped approval choices (both): Codex wire supports acceptForSession, but the mapper only returns one-shot accept; Claude approval response similarly has no session-rule update flow.
2. Claude model/permission changes without process restart: settingsKeyFor includes model/effort/runtime mode; no live setters are used. Official Anthropic SDK documents live setters, and its Python transport sends set_model/set_permission_mode control requests. Verify supported versions and response correlation before adopting the raw controls. Effort and other flag settings need separate compatibility checks.
3. Conversation branching (both): no native fork calls in these providers. Codex thread/fork and Claude --fork-session are documented; adopting either requires correct MonoCode session identity and transcript handling.
4. Visible provider warnings and quota changes: Codex push quota/reroute events and Claude auth/rate-limit/fallback/tool summary messages are not mapped. Existing quota polling and text/thinking/task streaming already work at source level.
5. Structured title/commit/PR helpers (both): current helper outputs use free-text parsing; native schema output could remove that fragile contract. Claude --json-schema is print-mode only, so the existing persistent helper cannot simply gain the flag.
6. Rich MCP forms (Codex): elicitation support is limited to empty/single boolean forms. Add validated text/choice/multiple-field forms and readable fallback.
7. CLI-reported skills/commands: native Codex skills/list and Claude initialization metadata could complement the existing filesystem skills browser. Skill support itself already exists.
8. Custom models and startup options (both): explicit launch arguments/custom model configuration are missing. Named accounts and isolated homes already exist.
9. Native code review (Codex): review/start is not called. Existing second-opinion review is a separate feature.
10. Live MCP connection status/reload: inherited MCP configuration already works; provider-native introspection/reconnect is the gap.
11. Claude live context breakdown: get_context_usage is present in the official Python SDK transport, but MonoCode does not call it. MonoCode already has context and processed-usage meters.
12. Explicit extra directory/tool/prompt configuration (Claude): missing app-level launch overrides; inherited CLI configuration still applies.
13. Optional Claude fallback and run caps: native options exist; --max-turns is only present in MonoCode's builder/test, with no production caller. Dollar budgets are not subscription quota guarantees. Validate raw streaming support before exposing limits.
14. Native Claude subagent control and transcript/file rewind: useful later, but separate from the parked MonoCode orchestration quartet. File rewind requires checkpointing.

## Corrections to supplied comparison

- Account profiles are implemented: src/features/providers/model/providerAccounts.ts and src-tauri/src/harness.rs:770.
- Skills browsing/discovery already exists: src-tauri/src/skills.rs and src/features/skills/.
- External Claude and Codex transcripts are imported: src-tauri/src/session_import.rs:94.
- Claude compact_boundary is handled and tested. There is still room to improve accounting; it is not entirely absent.
- Codex undo-last-turn is implemented with thread/revert. Official app-server docs label thread/rollback deprecated; do not adopt it just for parity.
- developer_instructions:null selects Codex's built-in collaboration-mode instructions; it does not disable project instructions.
- Claude respawn versus Codex per-turn settings is not by itself evidence of a bug.
- The Opus minimum version/changelog discrepancy is not sufficient evidence to lower the version floor. Installed Claude is above both cited floors.
- No wholesale Agent SDK migration is required by these findings.

## Primary references

- https://learn.chatgpt.com/docs/app-server
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/agent-sdk/configuration
- https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/query.py

Missing means no direct integration was found in the inspected source, not that configured CLI features cannot work through inherited settings. Source inspection does not establish runtime correctness or readiness to ship. T3 and Synara were not independently re-audited for this task.
