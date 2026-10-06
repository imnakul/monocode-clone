# Review — Antigravity CLI usage, MCP and custom agents

Branch: `nakul/windows-support-upstream-0.7.0`

Base: `3a7c86550fd1cffbad94339cfb4b2510ec21d035`

Created: 2026-10-06 (IST)

Tier: Large (provider integration)

## Idea
Add the three capabilities authorized after the local AGY capability report:
quota/credits in the existing footer, MCP discovery and enable switches, and
custom-agent selection saved with each CLI chat. Preserve Antigravity ACP.
Learn, Remote Control, fork and planning are explicitly out of scope.

## Research
- User-supplied `AGY-CAPABILITY-REPORT.md`: CLI 1.3.0 on Windows passed streaming,
  exact native resume, `/usage`, `/credits`, `mcp list`, and `--agent` including resume.
  The report is evidence, not instructions to execute its probes.
- Official MCP docs: user config `~/.gemini/config/mcp_config.json`, workspace
  `.agents/mcp_config.json`, `mcpServers`, `serverUrl`, boolean `disabled`.
  Read-only file scanning follows the existing MCP discovery architecture; no
  server is claimed connected just because its configuration is enabled.
- Official agents docs: `.agents/agents/<name>/agent.md` and
  `~/.gemini/config/agents/<name>/agent.md`. Interactive switching may fork;
  select before the first turn and keep the same agent for native resume.
- Current footer/usage popover, MCP Switch and ModelSettings/ModelPicker already
  provide the UI building blocks. Inspect their exact integration points next.
- Quota reports are separate from cumulative per-conversation token accounting.
- The user subsequently supplied exact sanitized native reports: a pipe table
  with Remaining percentages and Resets At (UTC), Gemini rows and one shared
  Claude & GPT group; `Remaining credits  0`. Stored as regression fixtures.

## Plan
1. Extend MCP file discovery and locked/atomic disabled edits to CLI config;
   reuse existing provider filter, row and Switch. Preserve headers/env/JSONC.
2. Parse read-only quota and credit reports, cache by relevant CLI identity,
   and render actual model-group windows in existing usage chips/popovers.
   Unknown output/errors stay visible; no invented quota/context values.
3. Discover custom-agent definitions without processes; reuse existing setting
   selector with cwd-specific options and persist selection in modelSettings.
   Validate agent availability and reject changing an already-bound native chat.
4. Add regression tests for malformed reports, zero credits, model groups,
   MCP writes and scope, agent selection, project isolation and native resume.
5. Run full checks and build; update records; hand over manual Windows UI checks.

## Todos
- [x] Read working agreement and current implementation; define scope.
- [x] Create this spec before source edits.
- [x] Finish integration research; user supplied exact native quota/credits fixtures.
- [x] Implement MCP discovery and guarded enable controls.
- [x] Implement quota/credits footer.
- [x] Implement agent discovery, selection and immutable resume binding.
- [x] Run targeted checks, full `npm run check` gates, production frontend build.
- [x] Update L-69/register, changelog (rolled to 03), roadmap and comparison.
- [x] Provide manual CLI/desktop checklist; no native UI automation.

## Issues and fixes
- The initial report only summarized quotas. The user's later raw output revealed
  a table and a shared Claude & GPT group. Added exact-format tests, retained the
  shared group rather than inventing independent quotas, and interpreted bare
  reset timestamps as UTC only when the column explicitly says UTC. Unsupported
  formats still fail visibly.
- Enabled configuration is not verified live MCP connection health. Plugin-bundled
  MCP/agent definitions outside the documented user/workspace files are not claimed
  discovered; this slice scans those native files only.
- Mid-chat agent switching is unverified and can imply native fork; prevent it.
- Existing untracked upstream-sync specs are unrelated and remain untouched.
- CLI-specific agent discovery/controls target local execution. Remote-machine
  hosts and additional headless provider support are outside this task.
- Full check first stopped at two Clippy `unnecessary_to_owned` findings in the
  new allowlist test. Removed the allocations; reran all Rust gates successfully.
  After the native report fixture arrived, reran the web gate and frontend build.
- The concurrent web/build rerun had one failure in the unchanged editor test
  `FilePaneNavigation` → clamped pending navigation on blur. All 9 tests in that
  file passed on an isolated recheck; neither editor source nor test was changed.
  Final sequential build and full `npm run check` passed, including that test.

## Learnings
- Backend `harness_exec` previously rejected `--print /usage` even though the
  adapter advertised it. Fixed with exact 30s report argv, CLI-only binary guard,
  35s native timeout and strict exit status; no free-form print command is allowed.
- Agents use a CLI-specific `antigravityAgent` key, so OpenCode agent preferences
  cannot leak into CLI chats. Model changes retain the existing choice instead
  of replacing it with the last agent selected in a different chat.
- New chats (and legacy chats without an explicit agent) use Default agent, not
  a custom agent carried in global model preferences from another workspace.
  Explicit per-chat selections survive later model changes.
- The provider records Default agent too, and validates custom definitions before
  process launch. A warm turn keeps its loaded agent; Stop/restart validates the
  definition again. Switching refuses before writing or killing the current chat.
- Native discovery reads bounded frontmatter and returns only names/scope, not
  agent instruction bodies. Workspace definitions override same-name global ones.
- CLI quota formats are human reports; explicit family/window/remaining labels are
  required. Unknown family/default models show all groups in the popover instead
  of borrowing a model-family quota. Missing reset timestamps remain unknown.
- Gemini has its own native quota; Claude and GPT select the same shared native
  group. Table percentages mean remaining, and the UTC header supplies the
  timezone omitted from the individual reset values.
- Final focused provider/model/agent regressions: 64 passed; native quota/footer
  fixtures: 6 passed; focused Rust: 5 passed. Counts overlap with full gates and
  are not summed. Final `npm run check` passed: TypeScript, 5,643 web tests /
  521 files, Rust format, Clippy and 619 Rust tests (2 existing ignored).
  `cargo check`, `npm run build` and `git diff --check` also passed.

## Manual verification (separate human/local signed-in follow-up)
1. Use this branch in `npm run tauri dev` with the authenticated official agy CLI.
2. Select an explicit Gemini/Claude/GPT CLI model. Compare the footer’s quota
   windows and reset times with `agy --print /usage --print-timeout 30s`; open the
   existing usage popup and compare credits with `/credits`. Zero is a real balance.
   For Configured CLI model, check the popup shows all groups rather than guessed
   percentages. If the report parser refuses the format, paste sanitized raw
   output; report a format mismatch rather than a quota/backend-account failure.
3. Settings → MCP → Antigravity CLI: compare user and workspace rows to native
   files and `agy mcp list`. Switch one disposable server, inspect only its native
   `disabled` flag, and confirm other fields/server scopes are retained. Use a new
   chat or Stop/resume to reload; Configured does not claim live connection.
4. Create disposable workspace/global custom agents with matching directory/name
   frontmatter; focus the app to refresh discovery. Select one in a new chat,
   Quick Composer or automation. Verify its fixture instruction token, native ID,
   Stop/resume and restart preserve the same agent. After native bind the dropdown
   is disabled with a Start a new chat explanation; model/effort changes keep it.
5. Delete a disposable selected definition, Stop and resume: expect a clear error
   before any prompt is sent, with the native ID retained. Restore it to continue.
6. Open an existing ACP chat and verify its models, attachments and resume still
   work. CLI learn/RC/fork/planning controls remain unavailable/deferred.

## Done
Implementation and automated gates complete; Review awaits the separate signed-in
Windows checks above; the supplied native report format is covered by tests. No installer,
GUI automation or remote feature was added. Nothing has been pushed in this task.
