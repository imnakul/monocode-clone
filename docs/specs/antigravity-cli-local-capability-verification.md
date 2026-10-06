# Draft — Antigravity CLI local capability verification

Created: 2026-10-06 (IST)
Target branch: `nakul/windows-support-upstream-0.7.0`
Remote inspected: `fda6d396dfdb6c1610fa1b3fc25439ad57aac692`
Provider implementation: `d26c9a2`, preserved by the current remote merge.

## Goal

Test the installed, signed-in Windows agy CLI against the exact headless transport
MonoCode uses. Interactive CLI success alone does not establish adapter support.
Research only: do not implement features, modify user conversations, commit or push.
Read AGENTS.md and WORKING-AGREEMENT.md. Preserve other agents' uncommitted files.
No automated driving of the native MonoCode window; provide a separate human checklist.

## Setup and evidence

- Record checkout HEAD, working-tree status, Windows version, resolved agy executable,
  agy version and relevant `--help`/subcommand help. Do not upgrade or replace the CLI.
- Use an empty temporary test project outside the real repo. All test conversations
  are disposable and must use the same authenticated profile as the app.
- If authentication is absent, stop provider calls and ask the owner to sign in locally.
  Never read/copy credential stores, tokens, environment dumps or another account's data.
- Use Python subprocess or .NET Process with redirected stdin/stdout/stderr, not a
  pipeline that immediately closes stdin. Launch the resolved executable directly.
- Baseline argv: `--input-format stream-json --output-format stream-json --print-timeout 2m`.
  Add an existing discovered model only if needed. Keep normal CLI permissions.
- Send each input as one newline-terminated JSON object:
  `{"event":"user","message":{"content":"Reply with exactly: desktop-test. Do not use tools."}}`
- Read stdout concurrently, preserve timestamped JSON events and separate stderr.
  Wait for each `result` before the next local prompt. Keep stdin open while idle.
- Capture exit codes, init/native IDs, event names and failures. Mask remote instance
  links/account identifiers in the report; do not include authentication URLs/codes.
- Every experiment has a bounded timeout. Close/terminate only its own child process
  tree; confirm no test-owned children remain. Do not kill other agy/app processes.

## Tests — four selected follow-ups

| Test | Method | Pass evidence / limitation |
|---|---|---|
| Availability | Resolve agy and inspect version/help; compare to `src-tauri/src/harness.rs` probe markers. In the app, a human checks Settings → Providers → Antigravity CLI separately from ACP. | Official CLI accepts streaming/resume arguments. An IDE launcher merely named agy must not count. Record exact error/path if availability differs between app and terminal. |
| Usage footer | Run read-only `/usage`, `/credits`, model-list reports separately using supported print/structured output flags from installed help. Complete two streamed turns; stop and resume the exact ID for one more turn. | Record quota/reset/credit fields and token counters; determine cumulative versus per-turn counters. Current footer is NOT implemented for this provider: lack of its chip is expected, not proof CLI reports fail. Avoid counting resumed historical usage as a fresh turn. |
| MCP discovery | Inspect supported MCP listing/config paths using official help/docs. Report only server names, scopes, transport types and enabled/status fields. In the disposable chat, verify one known benign read-only MCP tool if permitted. | Separate configured, enabled and actually connected. Do not copy server credentials or run unknown MCP installers. Determine which provider-specific toggle/reload interfaces exist; do not change the owner's config. Existing MonoCode MCP discovery lacks Antigravity. |
| Remote Control | Add `--remote-control` to the baseline streamed process. Owner opens its link on phone with the same account. Test desktop-origin prompt, then phone-origin prompt while stdin stays open and the desktop is idle, then another desktop turn. | Capture link creation, same native ID and every phone user/assistant/tool/result event on stdout; no duplicate turns. Flag acceptance or phone UI success alone is insufficient. Test one safe approval/question if the engine provides a supported route, disconnect/reconnect phone, then terminate the test process. Record what the browser does after termination. MonoCode adapter currently discards events without an active local turn and has no RC toggle. |
| Native fork | Discover official fork support in installed help/docs. Test in an isolated conversation via any documented headless/API entry point. If only interactive `/fork` exists, report that separately. | Original and child have distinct native IDs; child retains context, can resume independently and does not change original. A new chat populated with a summary is NOT native fork. No documented headless entry point means BLOCKED, not permission to scrape UI/internal endpoints. |

## Additional research — explanation only, not added to implementation scope

Use a separate disposable process for each command experiment: unsupported slash
commands can terminate streaming mode. Do not forward every TUI command into a real chat.

- Custom agents: discover agents and documented `--agent` support. If a fixture is
  needed, create it only inside the test project. Verify its instructions, tools,
  native ID/resume behavior and how switching differs from selecting on creation.
- Planning: distinguish `/plan` workflow from `/planning` session mode. Determine
  whether a documented streamed route can keep the task read-only until approval;
  record questions/artifact events and how execution resumes after approval.
- Fast: verify what `/fast` changes and whether headless startup can express it.
  Do not infer support from reasoning-effort selection or assume it selects a faster model.
- Learn: test only project-local rule/skill output in the disposable workspace.
  Verify a fresh conversation loads it. Do not create global rules or silently
  substitute a normal prompt for native `/learn`; distinguish those results.
- Teamwork/Boost: first verify plan eligibility and documented headless invocation.
  If unavailable, record BLOCKED. If available, use a tiny bounded task; record child
  IDs, streamed progress, approvals, completion and cancel cleanup. Do not launch
  a large campaign or bypass permissions to make the test pass.
- Browser/Goal/Grill-me/BTW: inspect supported routes. Optional small tests only
  after baseline works. Browser must use a benign public/test page; BTW must show
  separately correlated side responses without ending/rebinding the main turn.

## MonoCode regression checks and human UI follow-up

- Run the three adjacent `antigravityCli*.test.ts` suites and TypeScript on the local
  checkout if its dependencies are already installed. Report failures without unrelated edits.
- Human: create a new Antigravity CLI chat, send two turns, stop and resume, check
  model/effort selection and `/usage`/`/credits`; compare app/terminal binary paths.
- Current scope does not add usage footer, MCP panel, RC or fork controls. Their
  UI checks follow implementation; do not mark existing UI as exposing them.
- Current scope also does not add the research-only modes/slash commands.

## Report to return

Write `AGY-CAPABILITY-REPORT.md` outside the repository and return its contents:
1. Environment/version/path/checkout and test setup (no secrets).
2. Matrix: feature → interactive result → headless result → current MonoCode result
   → PASS / FAIL / BLOCKED / NOT IMPLEMENTED → exact supporting argv/events.
3. Sanitized short wire excerpts, native-ID relationships and exit/error details.
4. Remote owner observations, including idle phone turns and reconnect.
5. Candidate supported implementation routes; separate proven facts from guesses.
6. Remaining unknowns and which owned test processes/files remain, if any.

Never declare support solely because a flag parses or the interactive UI works.
