# Upstream 0.10.0 intake report

Created 2026-10-09. Read-only merge forecast and baseline for `nakul/windows-support-upstream-0.10.0`.

## Pinned snapshots

| Role | Ref / commit | Notes |
|---|---|---|
| Fork base | `origin/nakul/windows-support-upstream-0.8.0` / `82907ac33c9bfc5cf17fec15e85220fffbd3a439` | Live head; descendant of the previous checkout `f16c498fdcfb5276196a432178582bfd7dd61ace` by 10 fork commits. The requested `0.8.0-local` wording is a build label, not a ref. |
| Last integrated upstream | v0.8.0 / `9ccfc094615aa3170c01ae77a44298aefacdc9de` | Three-way merge base. |
| Upstream target | `main` / `416396c1b9815bcb1ea069563ff9c263a82671b1` | Live `ls-remote` matched before and after fetch. Includes v0.9.0, v0.10.0 and 16 commits after the v0.10.0 tag, as requested. |
| New fork branch | `nakul/windows-support-upstream-0.10.0` | Published at the verified fork base as an authorized base-only checkpoint; the remote ref matches the 0.8.0 source head. Remote branch creation is separate from merge approval. |

The target range is 63 commits: 22 from v0.8.0 to v0.9.0, 25 from v0.9.0 to v0.10.0, and 16 after v0.10.0. It changes 204 paths (60 added, 144 modified; 22,234 insertions and 1,307 deletions in the upstream diff).

## Incoming feature scope

- **v0.9.0:** Persistent Mono document artifacts and `app` artifact commands; macOS floating Mono chats; Mono permission settings and launched-session history; per-Mono session sidebar visibility; regular-session stop/archive/delete commands. Also account-email masking and Mono activity/completion-report behavior.
- **v0.10.0:** Floating Mono rail and artifact sheet; macOS menu-bar icon control and native spellcheck; Explorer keyboard navigation; expandable Mono activity ticker; OpenCode 2.x local/remote protocols; Linux AppImage self-update. Adds isolated Mono Codex storage/migration, 80% context rotation, one-hour habits, Windows Codex Mono junction/rollout-file fixes, and Grok/OpenCode temporary text-session cleanup. Linux packaging/WebKitGTK and beta updater changes are platform-specific.
- **16 post-tag commits:** Mono session diffs and editable commit messages; Mono session-folder preferences; Git-backed turn checkpoint reviews; same-as-user-shell Codex selection; composer autocorrect setting; Markdown rendering/table-width fixes; Mono rail status dots; image lightbox zoom and trackpad subscription cleanup; reorder-drag and thought-row fixes.
- **Known separate issue:** User reports Antigravity CLI 1.3.2 console flashes only when the CLI starts or does work; Monos currently use OpenCode. Root cause is unconfirmed. No Antigravity fix or popup change is part of this sync.

## Three-way preview and resolution

Preview ran in disposable bare repo `/tmp/monocode-upstream-0.10.0-intake/merge-preview.git`; it did not merge or modify this checkout. Result: 40 conflict paths / 90 text hunks (39 content conflicts and one add/add), 36 clean auto-merges of files changed on both sides, and 128 upstream-only changed paths. The full 204-path classification is in the appendix. A clean text merge is not a semantic preservation check.

### Conflict decision table

| Conflict area | Path | Text hunks | Resolution |
|---|---|---:|---|
| Build/dependency manifests | `.gitignore` | 1 | Retained upstream release outputs plus local Windows build/tool ignores. |
| Build/dependency manifests | `Cargo.lock` | 2 | Resolved lockfile with upstream runtime dependencies and local Windows dependencies. |
| Build/dependency manifests | `Cargo.toml` | 1 | Kept upstream workspace/runtime changes and the local Windows feature/build contract. |
| Harness process and provider protocols | `host/child-backend.test.ts` | 1 | Unioned upstream OpenCode v2 transport cases with local Windows process/argv assertions. |
| Build/dependency manifests | `package-lock.json` | 2 | Resolved both dependency sets; lockfile matches the merged package manifest. |
| Build/dependency manifests | `package.json` | 1 | Kept upstream scripts/dependencies and local Windows build/version scripts. |
| Build/dependency manifests | `src-tauri/Cargo.toml` | 1 | Added upstream storage/packaging crates while retaining ConPTY, tray and notification dependencies. |
| Native Rust commands, providers and session store | `src-tauri/src/control_cli.rs` | 3 | Unioned artifacts/session lifecycle with Tasks/Operator controls; retained all 43 app actions. |
| Native Rust commands, providers and session store | `src-tauri/src/harness.rs` | 2 | Kept Windows gates/hidden child behavior and AGY registrations; added OpenCode v1/v2 probe coverage. |
| Native Rust commands, providers and session store | `src-tauri/src/lib.rs` | 3 | Registered upstream artifacts/Mono modules alongside AGY ACP+CLI, Cline, Tasks and macOS trackpad. |
| Native Rust commands, providers and session store | `src-tauri/src/quick_composer.rs` | 2 | Kept Windows shortcut/toggle; gated the menu-only open command to macOS. |
| Native Rust commands, providers and session store | `src-tauri/src/session_store.rs` | 7 | Unioned all schema fields and SQL projections; repaired sidebar_hidden row mapping and schema-19 assertions. |
| Build/dependency manifests | `src-tauri/tauri.conf.json` | 1 | Added upstream capabilities while retaining local app identity and Windows configuration. |
| App, session and Mono lifecycle | `src/app/App.tsx` | 10 | Kept Tasks/session/Operator behavior; added Mono lifecycle with strict Codex identity and pre-migration Stop guard. |
| Shared UI, transcript and settings | `src/app/shell/SidebarRename.test.ts` | 1 | Kept local rename/hover cases and upstream sidebar activity/floating-Mono coverage. |
| App, session and Mono lifecycle | `src/features/agent-app/model/agentApp.ts` | 1 | Kept Tasks aliases and Operator allowlists; artifact commands remain Mono/habit-only. |
| App, session and Mono lifecycle | `src/features/monos/model/monoFiles.ts` | 1 | Combined local Tasks instructions with upstream artifact rules. |
| Shared UI, transcript and settings | `src/features/notes/ui/NotesView.test.ts` | 1 | Kept local Notes behaviors while adding upstream rendering regressions. |
| App, session and Mono lifecycle | `src/features/sessions/data/sessionStore.test.ts` | 1 | Unioned local review persistence with upstream artifact-card persistence coverage. |
| App, session and Mono lifecycle | `src/features/sessions/data/sessionStore.ts` | 1 | Projected review data and artifact cards together without dropping local session fields. |
| App, session and Mono lifecycle | `src/features/sessions/model/session.ts` | 1 | Unioned local session metadata with upstream artifact/review fields. |
| Shared UI, transcript and settings | `src/features/sessions/ui/AccessPicker.tsx` | 1 | Added upstream permission options while preserving provider-specific local labels. |
| Shared UI, transcript and settings | `src/features/sessions/ui/AgentMarkdown.tsx` | 5 | Combined local tables/Add-to-session actions with streaming/highlighting; fade remount stays prose-only. |
| Shared UI, transcript and settings | `src/features/sessions/ui/AgentTranscript.tsx` | 4 | Kept L-51 reply layout and action grouping while adding Mono work/session actions. |
| Shared UI, transcript and settings | `src/features/sessions/ui/Composer.tsx` | 1 | Added autocorrect without replacing local Task/session modes, Stop, Queue or Steer controls. |
| Shared UI, transcript and settings | `src/features/settings/model/displayPrefs.test.ts` | 3 | Kept remaining-usage=true expectations and added independent autocorrect coverage. |
| Shared UI, transcript and settings | `src/features/settings/model/displayPrefs.ts` | 1 | Retained local remaining-usage=true default and added autocorrect preference. |
| Shared UI, transcript and settings | `src/features/settings/model/settings.ts` | 1 | Added upstream settings while preserving local menu and startup provider preferences. |
| Shared UI, transcript and settings | `src/features/settings/ui/SettingsView.test.ts` | 3 | Unioned local Settings coverage with explicit one-refresh-per-open provider catalog tests. |
| Shared UI, transcript and settings | `src/features/settings/ui/SettingsView.tsx` | 4 | Preserved local Settings UI and provider refresh on model-menu open without render-loop refreshes. |
| App, session and Mono lifecycle | `src/features/source-control/ui/GitChangesPanel.tsx` | 2 | Kept abort/generation cleanup and manual edits during generation; added empty-selection editing. |
| Harness process and provider protocols | `src/integrations/harness/core/child.ts` | 1 | Kept Windows hidden launches/job cleanup and added upstream child/provider behavior. |
| Harness process and provider protocols | `src/integrations/harness/core/registry.test.ts` | 1 | Unioned local provider identity checks with upstream v2 and cleanup cases. |
| Harness process and provider protocols | `src/integrations/harness/core/registry.ts` | 1 | Kept provider-specific labels/allowlists and local registrations while adding upstream providers. |
| Harness process and provider protocols | `src/integrations/harness/providers/codex/codex.ts` | 2 | Kept ordinary native Resume/identity intact; isolated Mono storage applies only to Mono sessions. |
| Harness process and provider protocols | `src/integrations/harness/providers/codex/codexText.test.ts` | 2 | Combined local read-only/helper regressions with upstream Mono-store lifecycle coverage. |
| Harness process and provider protocols | `src/integrations/harness/providers/codex/codexText.ts` | 8 | Added Mono-only isolated storage; helpers stay ephemeral, read-only and outside the Mono store. |
| Harness process and provider protocols | `src/integrations/harness/providers/opencode/opencodeClient.ts` | 1 | Kept v1 messageID forks; v2 uses verified before boundary, MCP route/status normalization and move cleanup. |
| Harness process and provider protocols | `src/integrations/harness/providers/opencode/opencodeLive.test.ts` | 4 | Added v2 selected-boundary, MCP server-scope and move/cleanup cases alongside v1 behavior. |
| Harness process and provider protocols | `src/integrations/harness/providers/opencode/opencodeText.ts` | 1 | Added bounded temporary-session cleanup while retaining local provider identity behavior. |

### Approved preservation contracts

- **Build/dependency manifests:** reconcile required upstream dependencies with Windows targets, build gates and the local toolchain; do not drop either side by selecting whole files.
- **Windows harness and registration:** retain report-argv validation, Windows case-insensitive provider identity, hidden child processes/job-object cleanup, and the local Antigravity ACP/Cline registrations. Add OpenCode 2.x through provider-specific handling and retain bounded, valid-ID Grok cleanup. `lib.rs` must union AGY ACP, CLI, artifacts, Tasks and macOS-only trackpad registrations.
- **Codex text/storage:** Mono Codex uses isolated MonoCode storage only for Mono sessions. Ordinary Codex native resume, account identity, Remote Control, RC/cloud behavior, tool restrictions and client-cache identity remain intact. Preserve `helperOnly`/read-only tool-attempt rejection, abort cleanup and separate helper clients while adding ephemeral/codexStore behavior; ephemeral is a storage mode, not permission isolation.
- **Session persistence:** union all local and incoming session fields, including review data, artifact cards and `sidebar_hidden`; preserve SQL column, bind and row-mapper index alignment. Keep artifact/session lifecycle cleanup and local task/session identity.
- **Mono/app lifecycle:** integrate artifact cards, Mono launched-session history, session stop/archive/delete, changes/commit panels and editable empty-selection commit messages alongside the local Tasks alias and Operator permission checks. Preserve abort/cleanup and provider/session identity.
- **Composer/transcript/settings:** add upstream spelling/autocorrect and Mono settings while keeping local Stop/Queue/Steer controls, shared hover/glass, wallpaper behavior and always-visible Windows menubar. `AgentMarkdown` must union local table actions/AddToSessionManager with upstream highlighted code, streaming Markdown and fade behavior; retain transcript `role=group` and `data-turn-actions` together.
- **Usage preference:** upstream changes the default remaining-usage visibility from true to false. Keep the local true default; add autocorrect independently.
- **Git changes panel:** keep local `commitGeneration` abort cleanup while adding upstream editable messages when no files are selected.
- **OpenCode fork semantics:** preserve v1 `messageID` fork-at-message behavior. OpenCode v2.0.19 (official tag commit `1fd016ef32286de9489b7b24f1029f52c49a27b3`) defines POST `/api/session/:sessionID/fork` with optional `{before: SessionMessage.ID}`; its protocol docs say the child copies projected history before that message. The server handler passes this field to `session.fork`. Use `{before: messageID}` for v2, then retain the upstream move verification/delete-on-failure flow. Both v2.0.15 and v2.0.19 retain `serve --help` with `--hostname` and `--port`, so the read-only protocol probe stays valid.

### OpenCode 2.x MCP evidence and scope

The official v2.0.19 tag (`1fd016ef32286de9489b7b24f1029f52c49a27b3`) defines
`GET /api/mcp` in `packages/protocol/src/groups/mcp.ts` as a list of
`Mcp.Server` records. `packages/schema/src/mcp.ts` defines each record as
`{name, status, integrationID?}` with the status tag `connected`, `pending`,
`disabled`, `failed`, or `needs_auth`. The client now uses the v2 route,
validates each entry and rejects duplicate/malformed records before converting
the list into the exact v1 lookup shape. The 5-second timeout and location
header/query are retained.

The same tag's `packages/core/src/tool/mcp.ts` registers direct MCP tool actions
as `${sanitizedServer}_${sanitizedTool}` and requests permission with the exact
tool `messageID` and call `id` in `source`. The v2 permission adapter maps its
`action/resources/source` fields to the common permission event shape. Server
scope is applied only when those exact IDs identify one live tool part, the
permission action equals that tool, and one connected server name uniquely
matches. Duplicate server names, sanitized-name collisions, malformed status
records and unmatched calls fail closed. Code Mode wrappers do not carry a
verified inner MCP tool identity through this adapter, so they retain the
ordinary approval prompt rather than receiving an inferred server-wide grant.

Client and live tests cover `/api/mcp`, exact status validation (including
whitespace rejection), v2 `source` attribution, and session-scoped permission
reply. The client retains v1's map endpoint and current approval behavior.

### Clean auto-merge semantic review

All 36 clean-overlap paths were reviewed after the merge for behavior that
textual conflict detection cannot see:

- **Process and Windows paths:** `host/child-backend.ts`, `src-tauri/src/window.rs`, `src/platform/tauri/fs.ts`. Source review retained no-console spawning, process-tree/job cleanup, canonical paths and Windows path handling; native Windows behavior remains on the manual checklist.
- **Startup and restoration:** `src/app/model/quickLaunchSession.ts`, `src/app/shell/Sidebar.tsx`, `src/features/projects/model/projectReturn.ts`, `src/features/sessions/data/sessionHistory.ts`. Light/lazy checks remain; the merge does not launch providers on every startup or bind a session to a mismatched project/provider.
- **Provider protocols:** OpenCode v1/v2 protocol and client files, Codex protocol/live files, and harness types/index. Generation-specific labels, provider allowlists and session identity remain; v1 forks retain `messageID` and v2 boundary uses the verified `before` field.
- **Transcript/session state:** `mono_transcript.rs`, `quickComposer.ts`, `sessionHistory.ts`, `monocodeToolCall.ts`, `transcriptActivity.ts`, `SessionPane.tsx` and `SessionReview.tsx`. Local queues, task/session identity, action boundaries, review state and transcript ordering remain alongside artifacts, checkpoint reviews and Mono diffs.
- **Shared UI/settings:** `FileTree.tsx`, Notes files, `PrivateEmail.test.ts` and `styles/index.css`. Keyboard navigation is additive; local menu, wallpaper/glass, hover, remaining-usage default and provider settings remain.

The local source for a feature whose files are outside the upstream 204-path
change remains unchanged from base `82907ac`. Changed paths were integrated
and reviewed at the hunk or semantic-contract level; no whole-file side
selection was used. Source review is distinct from feature-by-feature runtime
testing.

## Baseline verification

- `npm run check:web` at unchanged fork base 829: **Vitest failed** after 4m51s: 577/580 test files passed and 6,298/6,302 tests passed. The four failures are three assertion files expecting the old literal `Allow` label after the base renamed it to `Allow once`: `src/features/monos/ui/MonoActivityPanel.test.ts`, `src/features/sessions/ui/AgentTranscript.inlineWork.test.ts`, and two cases in `src/integrations/harness/providers/codex/codexApprovalUi.test.ts`. This is a pre-existing test expectation mismatch, not evidence that approvals are broken. `npm run check:web` short-circuited its chained TypeScript stage after Vitest failed.
- Standalone `npx tsc --noEmit`: passed (exit 0).
- One Settings test logged `EAI_AGAIN registry.npmjs.org` but passed; do not attribute the four UI assertion failures to that network event.
- Logs: `/tmp/monocode-upstream-0.10.0-intake/baseline-web.log` and `baseline-tsc.log`.
- The four stale `Allow` expectations were updated to `Allow once` in the
  merged tests without changing approval payloads. Final post-merge gate
  results are recorded below.
- OpenCode helper teardown now attempts abort, session deletion, event close,
  unwatch and child kill independently. A regression confirms a failed delete
  cannot hide the original read-only tool-attempt error or skip later cleanup.

## Post-merge verification and preservation audit

- The durable appendix was compared programmatically with
  `git diff --name-status --no-renames 9ccfc094615aa3170c01ae77a44298aefacdc9de..416396c1b9815bcb1ea069563ff9c263a82671b1`:
  all 204 paths match (60 additions, 144 modifications; zero omitted or extra
  paths). All 60 upstream additions exist and are tracked in the merge result.
- `docs/LOCAL-FEATURES.md` retains all 73 IDs (L-01 through L-73). Source
  paths outside the upstream changed-path set remain as they were at the
  verified fork base. Source paths changed by upstream were reviewed against
  the preserved local contracts in the conflict table and clean-merge review.
  Automated suite results below validate selected coverage; they do not mean
  all 73 features received a runtime test.
- Final automated gates on the pinned `416396c` snapshot:
  - `npm run check` passed: **600 web test files / 6,617 tests**, TypeScript,
    `cargo fmt --check`, Clippy for all workspace targets with `-D warnings`,
    and **705 Rust tests passed / 2 ignored**.
  - `cargo check --workspace` passed. `npm run build` passed; Vite's existing
    CSS `::highlight` warning and large-chunk notices remain.
  - `node --test scripts/release-channel.test.cjs`: **8 passed**.
  - Six focused repair suites: **139 passed**. `npm run host:build` passed;
    the host suite had **103 passed / 1 failed / 5 skipped**. Its sole failure
    is the unchanged-base `host/providers.test.ts` assertion that local
    `HARNESSES` equals `REMOTE_PROVIDERS`; local `antigravity-cli` is not in the
    remote allowlist. Remote provider expansion is out of scope.
- Logs: `/tmp/monocode-upstream-0.10.0-intake/full-check-final-rerun.log`,
  `cargo-check-final.log`, `production-build-final.log`,
  `release-channel-tests.log`, `host-build-rerun.log` and `host-tests.log`.
  Focused repair output is in `focused-repair.log`; the final focused rerun
  passed 6 files / 139 tests.
- The final combined gate used a task-local subreaper with concurrent
  `waitpid` reaping. The earlier task wrapper delayed orphan reaping until the
  main process exited, making a process-group assertion see terminated
  zombies. The targeted assertion passed with the corrected wrapper, as did
  the final Rust suite; no product or test assertions were changed for this
  environment issue.
- Native/manual Windows handoff (not performed in this task):
  1. Launch a fresh Windows dev/packaged build; verify no visible provider or
     helper console, and verify child cleanup when MonoCode closes.
  2. Check OpenCode v1 `serve` and v2 `service` startup, Provider Check and
     Refresh all, plus a direct MCP server approval and selected-message fork.
  3. Verify Codex Resume and account identity in ordinary chats; verify Mono
     Codex resumes only through its isolated store and helpers remain read-only.
  4. Check Mono artifact cards, session stop/archive/delete, Tasks project
     alias, composer spellcheck/autocorrect, quick composer, visible menu bar,
     file-tree keyboard navigation, wallpaper and shared hover.
  5. Confirm L-70 focus history, L-71 migration Resume/hidden compaction
     summary, L-72 Tasks alias and L-73 light provider check/Refresh all.
- Host-only limitation: `host/child-backend.ts` has no remote dispatch for
  `codex_mono_store_prepare/copy/restore`. Remote-machine Mono storage isolation
  therefore remains unverified/out of scope; the implementation does not fall
  back to the ordinary Codex store. Local Mono and ordinary Codex paths are
  separate. This host limitation is distinct from native desktop behavior.
- Host validation: `npm run host:build` passed. The host suite reports 103
  passed, 1 failed and 5 skipped; the failure is the unchanged base assertion
  in `host/providers.test.ts` that `REMOTE_PROVIDERS` equals all local
  `HARNESSES`. The local set already includes `antigravity-cli` at base 829,
  while the unchanged remote allowlist omits it. Remote provider expansion is
  outside this sync; no host-provider behavior was changed for this mismatch.
- The reported Antigravity CLI 1.3.2 console flash occurs only when the CLI
  starts or works per the user; its cause remains unconfirmed and is outside
  this sync. This branch makes no fix claim.

### Later upstream `main` movement (not included in the validated merge)

The last live `main` recheck advanced from the approved pinned target
`416396c1b9815bcb1ea069563ff9c263a82671b1` to
`7d099eb8e1d3a544a9221cda66de251f25e6c4a0`. The six later commits change 83
paths (17 additions, 66 modifications; 6,710 insertions and 168 deletions).
The pinned target remains unchanged; the later commits are not integrated and
do not alter the validation results above.

A read-only `git merge-tree --write-tree` preview used a temporary index/tree
built from the tracked, fully merged worktree (including unstaged repairs,
excluding untracked files). It found 24 content conflicts plus one
modify/delete conflict in these 25 paths:

- Host process/provider transport: `host/child-backend.ts`, `host/process.ts`,
  `host/provider-transport.test.ts`, `host/providers.ts`, `host/server.ts`.
- Native registration and MCP: `src-tauri/src/harness.rs`, `src-tauri/src/lib.rs`,
  `src-tauri/src/mcp.rs`.
- App, rail and usage: `src/app/App.tsx`, `src/app/shell/Sidebar.tsx`,
  `src/app/shell/UsageFooter.tsx`, `src/app/shell/UsageProviderChip.tsx`.
- Provider, model, availability and settings: `src/features/connections/model/protocol.ts`,
  `src/features/providers/model/rateLimits.ts`,
  `src/features/providers/model/rateLimitsCache.ts`,
  `src/features/sessions/model/models.ts`, `src/features/sessions/model/session.ts`,
  `src/features/sessions/ui/HarnessIcon.tsx`,
  `src/features/sessions/ui/ModelPicker.test.ts`,
  `src/features/settings/ui/SettingsView.tsx`,
  `src/integrations/harness/core/availability.ts`,
  `src/integrations/harness/core/availabilityState.ts`,
  `src/integrations/harness/core/child.ts`,
  `src/integrations/harness/core/register.ts`.
- Modify/delete: `src/integrations/harness/providers/antigravity/antigravityProtocol.ts`.

The changes are additive in scope but need keep-both integration: register
Devin across provider/harness, host, model, identity, usage, MCP and Settings
surfaces while retaining local Cline and Antigravity ACP/CLI behavior; keep
`devinAskEdits` after `codexStore` and preserve the Mono-only Codex store; union
safe selected-file commit context with ordinary commit/edit-abort behavior;
add collapsed-rail Mono pins while retaining Tasks/session entries and actions;
and keep Windows path, temp-directory and checkpoint protections. Devin's
protocol imports `asRecord`, `eventsFromAcpUpdate` and `stringField` from the
upstream Antigravity helper path. The fork's ACP code is under
`core/antigravityAcpProtocol.ts` and has a different event parser; do not
register the removed upstream Antigravity provider a second time. If the user
approves a separate follow-up merge, factor or add vetted shared ACP helpers
for Devin and review the exact conflict group before editing. No source files,
index entries, branch refs or tests were changed for this later delta.

The approved `416396c` snapshot remains independently publishable after the
primary review. Parent is awaiting the user's choice on a separate follow-up
for the six later commits; that decision does not change the already-run gates.

## Appendix: upstream path and merge outcome manifest

| Upstream diff | Merge preview outcome | Path |
|---|---|---|
| `M` | `upstream_only` | `.github/workflows/ci.yml` |
| `M` | `upstream_only` | `.github/workflows/release.yml` |
| `M` | `conflict` | `.gitignore` |
| `M` | `upstream_only` | `CHANGELOG.md` |
| `M` | `upstream_only` | `CONTRIBUTING.md` |
| `M` | `conflict` | `Cargo.lock` |
| `M` | `conflict` | `Cargo.toml` |
| `M` | `upstream_only` | `README.md` |
| `M` | `conflict` | `host/child-backend.test.ts` |
| `M` | `clean_overlap` | `host/child-backend.ts` |
| `A` | `upstream_only` | `host/opencode-v2-transport.test.ts` |
| `M` | `upstream_only` | `host/vitest.config.ts` |
| `A` | `upstream_only` | `mono-chat.html` |
| `M` | `conflict` | `package-lock.json` |
| `M` | `conflict` | `package.json` |
| `A` | `upstream_only` | `playwright.config.ts` |
| `A` | `upstream_only` | `scripts/assert-appimage-host-libs.sh` |
| `M` | `upstream_only` | `scripts/install-linux-deps-debian.sh` |
| `A` | `upstream_only` | `scripts/release-channel.cjs` |
| `A` | `upstream_only` | `scripts/release-channel.test.cjs` |
| `A` | `upstream_only` | `scripts/repack-appimage.sh` |
| `M` | `conflict` | `src-tauri/Cargo.toml` |
| `A` | `upstream_only` | `src-tauri/src/artifacts.rs` |
| `M` | `clean_overlap` | `src-tauri/src/checkpoint.rs` |
| `A` | `upstream_only` | `src-tauri/src/checkpoint/turn.rs` |
| `A` | `upstream_only` | `src-tauri/src/checkpoint/turn/tests.rs` |
| `A` | `upstream_only` | `src-tauri/src/codex_mono_store.rs` |
| `M` | `conflict` | `src-tauri/src/control_cli.rs` |
| `M` | `conflict` | `src-tauri/src/harness.rs` |
| `M` | `conflict` | `src-tauri/src/lib.rs` |
| `M` | `upstream_only` | `src-tauri/src/macos.rs` |
| `M` | `upstream_only` | `src-tauri/src/menu.rs` |
| `A` | `upstream_only` | `src-tauri/src/mono_chat.rs` |
| `A` | `upstream_only` | `src-tauri/src/mono_chat/menu_bar.rs` |
| `M` | `clean_overlap` | `src-tauri/src/mono_transcript.rs` |
| `M` | `upstream_only` | `src-tauri/src/notes.rs` |
| `M` | `conflict` | `src-tauri/src/quick_composer.rs` |
| `M` | `conflict` | `src-tauri/src/session_store.rs` |
| `A` | `upstream_only` | `src-tauri/src/trackpad_zoom.rs` |
| `M` | `clean_overlap` | `src-tauri/src/window.rs` |
| `M` | `conflict` | `src-tauri/tauri.conf.json` |
| `M` | `conflict` | `src/app/App.tsx` |
| `A` | `upstream_only` | `src/app/hooks/useFloatingMono.test.ts` |
| `A` | `upstream_only` | `src/app/hooks/useFloatingMono.ts` |
| `M` | `upstream_only` | `src/app/hooks/useMonoHabits.test.ts` |
| `M` | `upstream_only` | `src/app/hooks/useMonoHabits.ts` |
| `M` | `clean_overlap` | `src/app/model/quickLaunchSession.test.ts` |
| `M` | `clean_overlap` | `src/app/model/quickLaunchSession.ts` |
| `M` | `upstream_only` | `src/app/model/updater.test.ts` |
| `M` | `upstream_only` | `src/app/model/updater.ts` |
| `M` | `upstream_only` | `src/app/model/updaterConfig.test.ts` |
| `M` | `clean_overlap` | `src/app/shell/Sidebar.tsx` |
| `M` | `conflict` | `src/app/shell/SidebarRename.test.ts` |
| `M` | `upstream_only` | `src/app/shell/SidebarUpdate.test.ts` |
| `M` | `clean_overlap` | `src/app/shell/UsageProviderChip.test.ts` |
| `M` | `upstream_only` | `src/features/agent-app/model/agentApp.test.ts` |
| `M` | `conflict` | `src/features/agent-app/model/agentApp.ts` |
| `A` | `upstream_only` | `src/features/artifacts/artifacts.test.ts` |
| `A` | `upstream_only` | `src/features/artifacts/artifacts.ts` |
| `A` | `upstream_only` | `src/features/artifacts/ui/ArtifactCard.tsx` |
| `A` | `upstream_only` | `src/features/artifacts/ui/ArtifactContent.tsx` |
| `A` | `upstream_only` | `src/features/artifacts/ui/ArtifactPanel.test.ts` |
| `A` | `upstream_only` | `src/features/artifacts/ui/ArtifactPanel.tsx` |
| `A` | `upstream_only` | `src/features/connections/model/remoteSessionTabs.test.ts` |
| `A` | `upstream_only` | `src/features/connections/model/remoteSessionTabs.ts` |
| `M` | `upstream_only` | `src/features/files/editor/codeHighlightPlugin.test.ts` |
| `M` | `upstream_only` | `src/features/files/editor/codeHighlightPlugin.ts` |
| `M` | `upstream_only` | `src/features/files/ui/BinaryFileView.test.ts` |
| `M` | `upstream_only` | `src/features/files/ui/BinaryFileView.tsx` |
| `M` | `upstream_only` | `src/features/files/ui/FileTree.test.ts` |
| `M` | `clean_overlap` | `src/features/files/ui/FileTree.tsx` |
| `A` | `upstream_only` | `src/features/monos/floatingMain.test.ts` |
| `A` | `upstream_only` | `src/features/monos/floatingMain.tsx` |
| `A` | `upstream_only` | `src/features/monos/model/floatingMono.test.ts` |
| `A` | `upstream_only` | `src/features/monos/model/floatingMono.ts` |
| `M` | `upstream_only` | `src/features/monos/model/mono.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoActivity.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoCompletionBatches.test.ts` |
| `M` | `clean_overlap` | `src/features/monos/model/monoFiles.test.ts` |
| `M` | `conflict` | `src/features/monos/model/monoFiles.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoHabits.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoRotation.test.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoRotation.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoSessionCompletion.test.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoSessionCompletion.ts` |
| `A` | `upstream_only` | `src/features/monos/model/monoSpawnedSessions.test.ts` |
| `A` | `upstream_only` | `src/features/monos/model/monoSpawnedSessions.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoWorkspace.test.ts` |
| `M` | `upstream_only` | `src/features/monos/model/monoWorkspace.ts` |
| `A` | `upstream_only` | `src/features/monos/ui/FloatingMonoChat.motion.test.ts` |
| `A` | `upstream_only` | `src/features/monos/ui/FloatingMonoChat.test.ts` |
| `A` | `upstream_only` | `src/features/monos/ui/FloatingMonoChat.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoChangesPanel.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoComposer.ime.test.ts` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoComposer.test.ts` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoComposer.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoDetails.test.ts` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoDetails.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoFilePages.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoPreferencesPage.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoProjectCommit.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoRailMascot.tsx` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoSessionsPanel.test.ts` |
| `A` | `upstream_only` | `src/features/monos/ui/MonoSessionsPanel.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoSettingsPage.test.ts` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoSettingsPage.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/MonoSidebar.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/NewHabitPage.tsx` |
| `M` | `upstream_only` | `src/features/monos/ui/monoPanelParts.tsx` |
| `M` | `clean_overlap` | `src/features/notes/notes.test.ts` |
| `M` | `clean_overlap` | `src/features/notes/notes.ts` |
| `M` | `conflict` | `src/features/notes/ui/NotesView.test.ts` |
| `M` | `clean_overlap` | `src/features/notes/ui/NotesView.tsx` |
| `M` | `upstream_only` | `src/features/projects/model/projectOpenRun.test.ts` |
| `M` | `clean_overlap` | `src/features/projects/model/projectReturn.ts` |
| `M` | `upstream_only` | `src/features/projects/model/projectTerminal.test.ts` |
| `M` | `upstream_only` | `src/features/projects/model/projectTerminal.ts` |
| `M` | `clean_overlap` | `src/features/quick-composer/model/quickComposer.ts` |
| `M` | `upstream_only` | `src/features/sessions/data/monoSessionStore.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/data/sessionHistory.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/data/sessionHistory.ts` |
| `M` | `conflict` | `src/features/sessions/data/sessionStore.test.ts` |
| `M` | `conflict` | `src/features/sessions/data/sessionStore.ts` |
| `M` | `upstream_only` | `src/features/sessions/data/sessionStoreRestore.test.ts` |
| `A` | `upstream_only` | `src/features/sessions/model/checkpoint.test.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/checkpoint.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/monocodeToolCall.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/model/monocodeToolCall.ts` |
| `M` | `conflict` | `src/features/sessions/model/session.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/sessionRemoval.test.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/sessionRemoval.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/transcriptActivity.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/model/transcriptActivity.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/transcriptTurnCache.test.ts` |
| `M` | `upstream_only` | `src/features/sessions/model/transcriptTurnCache.ts` |
| `M` | `conflict` | `src/features/sessions/ui/AccessPicker.tsx` |
| `M` | `conflict` | `src/features/sessions/ui/AgentMarkdown.tsx` |
| `M` | `upstream_only` | `src/features/sessions/ui/AgentTranscript.habits.test.ts` |
| `M` | `upstream_only` | `src/features/sessions/ui/AgentTranscript.inlineWork.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/ui/AgentTranscript.test.ts` |
| `M` | `conflict` | `src/features/sessions/ui/AgentTranscript.tsx` |
| `M` | `upstream_only` | `src/features/sessions/ui/AttachmentChip.test.ts` |
| `M` | `conflict` | `src/features/sessions/ui/Composer.tsx` |
| `A` | `upstream_only` | `src/features/sessions/ui/HighlightedCodeBlock.tsx` |
| `M` | `clean_overlap` | `src/features/sessions/ui/ModelPicker.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/ui/ModelPicker.tsx` |
| `M` | `upstream_only` | `src/features/sessions/ui/MonoWorkTicker.tsx` |
| `M` | `clean_overlap` | `src/features/sessions/ui/SessionPane.tsx` |
| `M` | `upstream_only` | `src/features/sessions/ui/SessionPaneScroll.test.ts` |
| `A` | `upstream_only` | `src/features/sessions/ui/SessionReview.test.ts` |
| `M` | `clean_overlap` | `src/features/sessions/ui/SessionReview.tsx` |
| `A` | `upstream_only` | `src/features/sessions/ui/streamingMarkdown.test.ts` |
| `A` | `upstream_only` | `src/features/sessions/ui/streamingMarkdown.ts` |
| `M` | `conflict` | `src/features/settings/model/displayPrefs.test.ts` |
| `M` | `conflict` | `src/features/settings/model/displayPrefs.ts` |
| `M` | `conflict` | `src/features/settings/model/settings.ts` |
| `M` | `conflict` | `src/features/settings/ui/SettingsView.test.ts` |
| `M` | `conflict` | `src/features/settings/ui/SettingsView.tsx` |
| `M` | `conflict` | `src/features/source-control/ui/GitChangesPanel.tsx` |
| `M` | `upstream_only` | `src/features/source-control/ui/SessionChangesDiff.tsx` |
| `M` | `upstream_only` | `src/features/terminal/ui/ProjectTerminalDock.tsx` |
| `M` | `conflict` | `src/integrations/harness/core/child.ts` |
| `M` | `conflict` | `src/integrations/harness/core/registry.test.ts` |
| `M` | `conflict` | `src/integrations/harness/core/registry.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/core/types.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/index.ts` |
| `M` | `conflict` | `src/integrations/harness/providers/codex/codex.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/codex/codexLive.test.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/codex/codexProtocol.test.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/codex/codexProtocol.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/codex/codexStore.test.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/codex/codexStore.ts` |
| `A` | `conflict` | `src/integrations/harness/providers/codex/codexText.test.ts` |
| `M` | `conflict` | `src/integrations/harness/providers/codex/codexText.ts` |
| `M` | `upstream_only` | `src/integrations/harness/providers/grok/grokText.test.ts` |
| `M` | `upstream_only` | `src/integrations/harness/providers/grok/grokText.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/opencode/opencode.ts` |
| `M` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeCatalog.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/opencode/opencodeClient.test.ts` |
| `M` | `conflict` | `src/integrations/harness/providers/opencode/opencodeClient.ts` |
| `M` | `conflict` | `src/integrations/harness/providers/opencode/opencodeLive.test.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/opencode/opencodeProtocol.test.ts` |
| `M` | `clean_overlap` | `src/integrations/harness/providers/opencode/opencodeProtocol.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeService.test.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeService.ts` |
| `M` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeText.test.ts` |
| `M` | `conflict` | `src/integrations/harness/providers/opencode/opencodeText.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeV2Events.test.ts` |
| `A` | `upstream_only` | `src/integrations/harness/providers/opencode/opencodeV2Events.ts` |
| `M` | `clean_overlap` | `src/platform/tauri/fs.ts` |
| `A` | `upstream_only` | `src/platform/tauri/trackpadZoom.test.ts` |
| `A` | `upstream_only` | `src/platform/tauri/trackpadZoom.ts` |
| `M` | `upstream_only` | `src/shared/hooks/useAnimatedReorder.test.ts` |
| `M` | `upstream_only` | `src/shared/hooks/useAnimatedReorder.ts` |
| `M` | `upstream_only` | `src/shared/ui/ImageLightbox.tsx` |
| `M` | `clean_overlap` | `src/shared/ui/PrivateEmail.test.ts` |
| `M` | `clean_overlap` | `src/styles/index.css` |
| `A` | `upstream_only` | `tests/browser/markdown-performance.html` |
| `A` | `upstream_only` | `tests/browser/markdown-performance.spec.ts` |
| `A` | `upstream_only` | `tests/browser/markdown-performance.tsx` |
| `A` | `upstream_only` | `tests/browser/transcript-scroll.spec.ts` |
| `A` | `upstream_only` | `tests/browser/transcript.html` |
| `A` | `upstream_only` | `tests/browser/transcript.tsx` |
| `M` | `upstream_only` | `vite.config.ts` |

## Artifacts and current status

- Full merge-tree output, per-path conflict files and hunk counts: `/tmp/monocode-upstream-0.10.0-intake/`.
- The pinned source merge is integrated locally; all conflicts are resolved and `git diff --name-only --diff-filter=U` is empty. The user approved the grouped keep-both contract on 2026-10-09. Full web/Rust checks, cargo check, production build and release-channel tests passed; the host suite has the documented unchanged-base provider-parity mismatch. Primary source and gate review passed. The parent authorized a normal push of this merge commit to the new branch; the actual commit and remote hashes are recorded in the task handoff.
- The user-authorized base-only branch was normally pushed and verified at `82907ac33c9bfc5cf17fec15e85220fffbd3a439` on both the new branch and the 0.8.0 branch. Required verification and primary review are complete. The four baseline stale `Allow` label expectations were updated before the final gate.
- This merge commit is authorized for a normal push to `origin/nakul/windows-support-upstream-0.10.0`; final remote verification is recorded in the task handoff. No separate docs-only publication commit is planned. The six post-validation main commits at `7d099eb` are a separate follow-up decision and do not block publication of the validated `416396c` snapshot.
- Build-label proposal after approved merge: `0.10.0-local1-upstream-sync`.
