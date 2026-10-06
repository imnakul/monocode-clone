# Review — Antigravity CLI alongside ACP

Branch: `nakul/windows-support-upstream-0.7.0`
Base: `4b8c026`
Created: 2026-10-06 (IST)
Tier: Large (separate harness/provider integration)

## Idea
Keep the existing Antigravity ACP runtime intact. Add a separately selectable
Antigravity CLI backed by Google's official `agy` executable. Reuse MonoCode's
provider settings, model picker, streaming transcript, usage and session lifecycle.

## Research
- Official headless protocol: https://antigravity.google/docs/cli/headless/
- Reference/install: https://antigravity.google/docs/cli/reference/ and
  https://antigravity.google/docs/cli/install/
- Remote Control: https://antigravity.google/docs/remote-control?tab=cli
- NDJSON `init`, `step_update`, `result`; stdin user messages permit text only.
- `--conversation` resumes a specific native ID; avoid workspace-wide `--continue`.
- Result usage is cumulative within a persistent process; accounting needs deltas.
- Verify approvals, model discovery, compaction and remote-control compatibility
  before advertising capabilities. CLI features are not automatically headless APIs.

## Plan
1. Record exact flags/event schema and discover the installed CLI without ACP's
   binary/helper/profile requirements. Preserve existing `antigravity` identity.
2. Use a distinct `antigravity-cli` identity and label Antigravity CLI. Separate
   settings, native session IDs and process lifecycle from Antigravity ACP.
3. Stream live text/tool/reasoning events through existing harness events;
   resume exact IDs, stop safely, reject unsupported attachments/controls clearly.
4. Reuse existing provider/model/account controls; no custom UI components.
5. Verify the documented protocol with fixtures and simulated child processes.
   Authenticate/run real provider only if available. Finish with an ACP/CLI table.

## Todos
- [x] Protocol, platform discovery and capability research
- [x] Separate harness/settings/model registration
- [x] Streaming lifecycle, native resume, Stop and usage accounting
- [x] Supported helpers/commands and explicit unsupported controls
- [x] Focused tests, TypeScript, full check, build
- [x] Local features/changelog/spec records and manual handoff

## Issues and fixes
- Existing uncommitted Local/Remote/Cloud-default work is preserved; this task is
  added on top. The two pre-existing untracked upstream-sync specs are hands-off.
- The current environment is Linux; actual installed Windows CLI and native
  desktop UI checks remain separate manual verification.
- Direct documentation fetch was denied by the managed network policy; primary
  documentation was read through the available web research tool. No installer
  or network-policy changes were made.
- The first full suite found our new provider adds one picker row: its existing
  height assertion needed 476px/478px instead of 440px/442px. Updated the assertion
  and checked that both ACP and CLI tabs exist. No unrelated test was changed.
- An existing duplicate ACP entry in model aggregation was removed while placing
  CLI beside ACP. A test locks distinct provider/model identities without repeats.
- Old IDE launchers named `agy` cannot be assumed to speak the CLI protocol. Cold
  startup, model discovery and reports now probe for streaming/resume flags first.
- Cold startup waits for a valid native `init` identity before writing a prompt;
  changed IDs fail closed and Stop cancels pending startup. Process instance IDs
  isolate tool events and old child output; parallel tools can finish out of order.
- Rebinding a warmed-up/restored MonoCode chat to another CLI UUID is rejected
  before writing or changing the existing native context.
- Cumulative usage after native resume cannot be treated as new-turn usage.
  New per-step counters are used where emitted, otherwise omit the first turn's
  usage rather than inventing it. Warm turns use cumulative-result differences.

## Learnings
- `-p` must not be combined with streaming stdin: use exactly one JSON user
  message per turn and preserve the warmed-up process. Native resume uses only
  `--conversation <UUID>`, not whichever chat `--continue` happens to select.
- Headless requests requiring interactive confirmation are denied by agy; its
  `control_request/response` messages are unsupported. Expose saved **CLI policy**
  or explicit **Full access** only; preserve all ACP controls and attachment paths.
- A dedicated headless Plan control is unverified. Plan/orchestration lead requests
  are rejected before input/spawn rather than run with the CLI's workspace edit policy.
- Engine compaction exists, but manual `/compact` in the streaming protocol is
  unverified. Adapter does not register a fake manual compaction capability.
- `/usage`, `/quota`, `/credits` and `agy models` are read-only separate commands;
  other TUI slash commands are rejected clearly instead of sent as control RPCs.
- Remote Control has official TUI and daemon routes. Same-process headless
  attachment is unverified: no misleading Remote toggle/automatic daemon launch.
- CLI uses its own profile/storage and does not imply zero C: usage or measured
  speed improvements. Full capability table and manual setup/checks:
  [Antigravity ACP/CLI comparison](../notes/antigravity-acp-cli-comparison.md).

## Done
Implementation is in the working tree on the original 0.7.0 branch; ACP identity,
runtime and local features are preserved. New adapter/protocol/catalog/tests live
under `src/integrations/harness/providers/antigravity-cli/`; existing components
provide settings, binary selection, model selection and permissions.

Automated verification:
- Full `npm run check`: 5,624 web tests / 518 files; TypeScript; Rust formatting,
  Clippy with warnings denied, and 615 Rust tests / 2 ignored — passed.
- After the final native rebind guard, focused final-source regressions: 168 tests /
  9 files — passed (CLI lifecycle/protocol/catalog, existing ACP lifecycle/catalog,
  settings, provider/model selection and quick permissions).
- Final-source `npm run build` (TypeScript + production frontend): passed.
- Rust `cargo check` and focused standalone CLI resolver/probe tests: passed.
- `git diff --check`: passed. Build retains existing CSS-highlight/chunk-size warnings.

Logs in this execution workspace: `/tmp/antigravity-cli-full-check-final.log`,
`/tmp/antigravity-cli-final-validation.log`, `/tmp/antigravity-cli-final-build.log`,
`/tmp/antigravity-cli-cargo-check.log`, `/tmp/antigravity-cli-rust-focused.log`.

No installed/authenticated agy is available in this environment. Actual
Windows/provider/account/desktop checks are the manual follow-up in the comparison
document. No installer, commit, push or Antigravity daemon installation requested;
the pre-existing uncommitted defaults work remains intact. Current installed builds
do not contain this uncommitted implementation.
