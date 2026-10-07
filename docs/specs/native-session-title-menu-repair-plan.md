# Review — Native session titles and modal menu repair

Branch: `nakul/windows-support-upstream-0.8.0`
Base: `0d4ecf31f2324c571e45203fbfff735c7c480683`
Created: 2026-10-07 (IST). Tier: Medium.

## Idea

Fix Add session displaying Claude's first prompt instead of its saved name,
and the conversation filters/context menus opening behind the dialog.
Use existing components and preserve native resume/account/dispatch behavior.

## Research

- Screenshot shows the same named chats in Claude Desktop and `claude --resume`,
  whereas our Find rows show first prompts.
- `session_import::ClaudeAcc` ignores customTitle/aiTitle metadata; summaries
  are first-wins. `provider_sessions` uses this parser before filtering/paging.
- Anthropic's official Python SDK `_internal/sessions.py` (read 2026-10-07)
  prefers latest customTitle over latest aiTitle, then latest summary/prompt.
  https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/sessions.py
- The SDK's official `tests/test_sessions.py` fixture (lines 101–105 in the
  inspected source at `/tmp/claude-sdk-test_sessions.py`) writes `customTitle`
  beside `summary` on a top-level `type: "summary"` record, and the test asserts
  that the custom title wins. The parser therefore accepts root customTitle and
  aiTitle fields on the supported metadata records (`custom-title`, `ai-title`,
  and `summary`), while ignoring nested message/tool lookalikes.
- Titles are append-only metadata and may be near the transcript end. Keep the
  existing 200,000-line head scan and inspect at most the final 64 KiB for title
  metadata only; late metadata must not replay or recount messages or alter
  identity, cwd, or recency.
- SearchableSelect already raises dialog menus. ProviderConversationList uses
  ExplorerMenu, whose root/submenus use layers 80/81 below Modal's 90.
  Modal's Escape guard recognizes data-dialog-popover; ExplorerMenu lacks it.

## Plan

1. Primary owns diagnosis/precedence/layer decisions and final review. Primary
   review passed; implementation, tests/builds, records, audits and approved Git
   steps are handled by exactly one Luna 6 Max agent. No other agents or native
   desktop driving.
2. Read saved title metadata from trusted top-level native metadata records.
   Latest nonempty customTitle > latest nonempty aiTitle > latest nonempty
   legacy summary > first real user text > Untitled. Preserve full saved titles;
   UI truncation is presentational, so search can match the complete name.
   Ignore tool/message nested lookalike fields and malformed/blank records.
   Metadata scoped to another session must not rename the current conversation.
3. Preserve scanner purity, native IDs/accounts/cwd and timestamp seconds.
   After the existing 200,000-line head scan, read a UTF-8 and line-boundary-safe
   64 KiB tail for recognized title metadata only. Do not replay messages,
   change message counts/identity/cwd/recency, or introduce provider writes or
   processes. Existing Find filters consume resolved names before ten-row paging.
4. Add optional layer to existing ExplorerMenu, default behavior unchanged.
   Add optional menuLayer to ProviderConversationList; AddNativeSessionDialog
   passes existing LAYER.dialogPopover. Use that layer for filter/context menus,
   raise nested menus one layer above their parent, mark only dialog-layer menus
   with the existing data-dialog-popover Escape guard. Retain stable glass/shared hover.
5. Add meaningful regressions: title precedence/repeated rename/late metadata,
   malformed/blank and unrelated records, fallback and UTF-8; discovery/search
   by saved name; modal filter/context layer and Escape keeping the dialog open;
   existing selectors/list outside dialogs retain their layers and behavior.
6. Run focused tests, TypeScript, Rust fmt/check/tests/Clippy, production build,
   and final full npm run check before commit. Existing validation wrapper:
   /workspace/monocode-validation/run-rust-checks.sh. Use task-local subreaper
   /tmp/monocode-upstream-0.8.0-intake/validation-subreaper.py for container PID 1
   process tests. VITEST_MAX_FORKS=2 and VITEST_MIN_FORKS=2 speed collection.
7. Update L-71, Current changelog, this spec and index. Preserve all local features,
   0.7.0 branch and two unrelated untracked legacy specs. Primary review passed;
   source publication is pending, followed by the human Windows checklist. No
   unrelated changes or force pushes.

## Todos

- [x] Diagnose and write spec before implementation.
- [x] Implement title and menu fixes with existing components.
- [x] Pass focused and full required gates/build; audit final changes.
- [x] Update records; primary review passed.
- [ ] Publish the reviewed source and publication checkpoint normally.
- [ ] Human Windows check: Find names match CLI/Desktop; renamed/older chat search;
      each dropdown/filter/context menu is above dialog and Escape closes only menu.

## Issues and fixes

- The shared Claude parser serves both discovery and migration. Keep saved custom
  and AI titles full length for search, truncate only legacy summary/prompt
  fallbacks, and leave Codex and unrelated provider parsing intact.
- Title candidates are keyed by their top-level sessionId and resolved after a
  real transcript identity is established; title metadata never establishes
  session ID or cwd. A bounded tail collects titles only, preserving message
  count, timestamps and recency behavior beyond the head cap.
- Reused ExplorerMenu covers both anchored filters and point-anchored row menus.
  The optional layer gives Add session menus z-index 91 and nested menus 92;
  data-dialog-popover is applied only at the dialog-menu layer so Modal's capture
  Escape guard leaves the dialog open while each menu closes.
- No native session launch, history loading, process spawn, or writer acquisition
  was added to discovery.

## Learnings

The official SDK fixture confirms `customTitle` may share a summary record, so
field presence must be interpreted with its top-level metadata event and session
scope. A first prompt remains the fallback. Portalled dialog menus need an
explicit layer and the existing nested Escape marker.

## Done

Web and TypeScript passed at 6,271 tests / 577 files. The first combined
`npm run check` reached Clippy and found one redundant conditional; that was
fixed, then `npm run check:rust` passed format, Clippy and 669 Rust tests (two
existing ignored). Workspace `cargo check` and production `npm run build` passed.
Focused regressions passed (33 frontend and 23 Claude-focused Rust tests). Logs
are under `/tmp/monocode-native-title-menu-repair/`. Final source/docs audit is
clean and primary review passed. Source publication and the signed-in Windows
checks above remain pending.
