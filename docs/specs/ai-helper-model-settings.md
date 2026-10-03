# Done — AI helper model settings — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review. Approved by Nakul 2026-09-30; use the specified defaults: Antigravity helpers remain gated off and Codex helpers remain eligible.
- Tier: complex · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan, 2026-09-30.
- Umbrella: [provider-daily-work-improvements-plan.md](provider-daily-work-improvements-plan.md), slice 5.
- Revised: 2026-09-30 after the [handoff review](../notes/provider-spec-handoff-review-30sept.md): Antigravity helper path, explicit tool isolation, and a visible PR failure in custom mode.
- Provider versions verified: Claude Code 2.1.283, codex-cli 0.159.0, OpenCode 1.18.30. Antigravity is installed at `C:\Users\gclna\AppData\Local\Programs\Antigravity\Antigravity.exe`; `--version` produced no version text (2026-09-30).

## Baseline, dependencies and worktree
- Position in the batch: fifth of six (umbrella slice 5). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint and slices 1, 2, 4 and 3 integrated and verified. Nakul gives its SHA in the handoff prompt as `<BASELINE_SHA>`, and the checkpoint SHA recorded in the umbrella plan as `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.
- Dependencies: No code dependency on another slice's new APIs. File overlap: slice 1 adds `allowedTools` to `buildClaudeSpawnArgs`; this slice adds `noTools` beside it, so build on slice 1's version. Antigravity stays gated as described under Remaining blockers.
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e <BASELINE_SHA>^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 <BASELINE_SHA>` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor <BASELINE_SHA> nakul/windows-support` succeeds; the SPECS.md rows for slices 1, 2, 3 and 4 read Done. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-ai-helper-model-settings -b feature/ai-helper-model-settings <BASELINE_SHA>`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
Today MonoCode quietly picks which AI writes your chat titles, commit messages and pull request descriptions. Titles use the chat's own provider, while commit and PR text uses the first installed provider it finds. You can't choose the model, and a bad reply is silently dropped or replaced. After this change, Settings → Chat gets an **AI helper** section. You can leave it on **Automatic**, which keeps today's behavior, or pick a main provider, account and model, plus an optional backup. The choice is independent of the chat's provider: a Claude chat can use a Codex helper, for example. Claude, Codex and OpenCode can be chosen. Antigravity appears in the list too, but stays unavailable, with the reason shown, until its isolation is verified (see Remaining blockers). Helpers run with their tools switched off, and a helper that tries to use a tool is stopped. MonoCode checks each reply. If a reply is malformed, it asks the same model to fix it once, then tries your backup once. It never falls back after a sign-in problem, a permission problem, a tool attempt or a cancel. In the chosen-model mode, if the pull request description can't be written, MonoCode no longer creates the PR with a stand-in description. It opens a small dialog where you can try again, or edit a draft and create the PR yourself. If your branch was already pushed, the dialog says so. A generated commit message no longer overwrites text you typed while it was generating.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user, I want to choose which provider, account and model writes my titles, commit messages and PR descriptions, and to name a backup, so that helper text is written by a model I trust and pay for. It should also keep working when one provider misbehaves.

## Scope
1. A persisted helper setting: either `automatic`, or `custom` with a primary target and an optional fallback target. A target is a provider, an optional account and an optional model.
2. A provider-neutral helper pipeline with three steps:
   - build the prompt (existing builders),
   - run it on a target,
   - validate the reply (existing parsers).

   It allows at most one repair attempt on the primary and at most one attempt on the fallback, all within an overall deadline, and it supports cancellation.
3. A new optional adapter method, `runHelperPrompt`, implemented for Claude, Codex, OpenCode and Antigravity. Each implementation honors the model override, and the account override where the provider has accounts. Codex also passes a native output schema.
4. A tool-isolation contract for every helper runner (see Helper isolation), with unit tests. The Codex and Claude hardening applies to Automatic mode too, because Automatic already uses the same runners.
5. An isolation gate per provider. Antigravity's helper path is implemented and tested against a fake runtime, but its gate stays closed until the runtime check in Remaining blockers passes.
6. Routing for the three helper tasks (chat title, commit message, PR description) through the pipeline when the setting is `custom`. `automatic` keeps today's call paths.
7. A PR details dialog used only after a custom-mode PR helper failure: retry, or edit a draft and create the PR by explicit click.
8. The commit-message UI (Git changes panel and Switch branch dialog) no longer overwrites text the user edited while generation was running.
9. Settings UI in Settings → Chat, with search index entries.

## Out of scope
- Branch-name generation (`generateHarnessBranchName`, `App.tsx:6373`). It keeps `pickTextHarness(current.harness)`.
- Helper support for Cursor, Grok, Pi, Omp, Hermes, FX and Cline. They keep working in Automatic mode. (Antigravity is in scope; see Scope 5.)
- Separate settings per task. One primary and one fallback serve all three tasks.
- A PR edit form on the success path. In Automatic mode and on custom-mode success, PR creation stays one click plus the existing confirm.
- Automatic commit, PR creation or push. The failure dialog creates a PR only when the user clicks its button.
- Antigravity provider accounts. There are none today (`PROVIDER_ACCOUNT_PROVIDERS` is Claude and Codex).
- Warmup of helper children. `warmupText` has no callers today.
- Claude `--json-schema` and OpenCode native structured output (see Facts).
- Desktop UI verification by the implementing agent (see Manual checks).

## Current behavior (confirmed in source)
- **Registry.**
  - `HarnessAdapter` text methods are at `src/integrations/harness/core/registry.ts:68-78`: `generateTitle`, `generateCommitMessage`, `generatePrContent`, `generateBranchName` and `warmupText`.
  - `TitleInput {sessionId, cwd, message, providerAccountId?}` is at `registry.ts:17`.
  - The wrappers are at `registry.ts:377-421`. `generateHarnessCommitMessage` throws when the method is missing; the title and PR wrappers return null.
- **Text harness selection.**
  - `src/integrations/harness/core/textHarness.ts` defines `TEXT_HARNESSES = [claude, cursor, codex, grok, opencode]`.
  - `pickTextHarness(preferred)` returns the preferred harness if it is available, otherwise the first available one.
  - `generateCommitMessage(cwd, preferred?)` and `generatePrContent(cwd, preferred?)` route through it.
- **Per-provider helpers.**
  - Claude: `claudeGit.ts` and `claudeTitle.ts`, backed by `runClaudeTextPrompt` in `claudeText.ts`.
  - Codex: `codexGit.ts` and `codexTitle.ts`, backed by `runCodexTextPrompt` in `codexText.ts:78`.
  - OpenCode: `opencodeGit.ts` and `opencodeTitle.ts`, backed by `runOpenCodeTextPrompt` in `opencodeText.ts:51`.
  - Behavior on failure:
    - Commit: throws with a snippet of the model's reply (`claudeGit.ts:16-35`).
    - PR: swallows the error (`console.debug`) and falls back to a deterministic title and body built from the commit summary (`claudeGit.ts:37-67`, same in `codexGit.ts:56`, `opencodeGit.ts:56`).
    - Title: returns null on error (`codexTitle.ts:26`).
  - Timeouts: `GIT_TIMEOUT_MS = 90_000` (`claudeGit.ts:13`). `TITLE_TIMEOUT_MS = 45_000`. The Claude text runner default is `REQUEST_TIMEOUT_MS = 45_000` (`claudeText.ts:22`).
- **Text runners.** Each keeps one live child per provider, serializes prompts through a module-level `turns` promise chain, and drops the child after every prompt (`finally dropLive()`).
  - Claude (`claudeText.ts`):
    - Model: fixed by `pickTextModel()`, which picks a Haiku from the catalog, otherwise `claude-haiku-4-5`.
    - Spawn: `buildClaudeSpawnArgs({isolated: true, model})` (`claudeText.ts:171-179`). Isolated means no `--permission-prompt-tool`, `--no-session-persistence`, `--strict-mcp-config` with an empty `--mcp-config`, and `--settings` with `disableAllHooks: true` (`claudeProtocol.ts:245-285`).
    - Isolation gap: the isolated spawn passes no `--setting-sources` and no tool restriction. User, project and local settings still load, including their `permissions.allow` rules, and every built-in tool (Read, Edit, Write, Bash and others) stays available. A tool covered by an allow rule would run without a prompt. So "no permission prompt tool" alone does not prove the helper can't write files.
    - Other isolated callers: `claudeCatalog.ts:302`. `piText.ts:219` has its own spawn.
    - `ensureLive` restarts on a different cwd or account (`claudeText.ts:121-133`).
  - Codex (`codexText.ts`):
    - Model: `pickTextModel()`, which picks `gpt-5.6-luna` or the catalog's luna model. Effort: `pickTextEffort`.
    - Runtime mode: `TEXT_RUNTIME_MODE = "supervised"`, which maps to `approvalPolicy: "untrusted"`, `sandbox: "read-only"` and `sandboxPolicy: {type: "readOnly"}` (`codexProtocol.ts:64-69`).
    - `handleServerRequest` (`codexText.ts:318-336`) declines command and file-change approvals and answers `permissions: {}` to permission requests. It answers `{}` to every other request, including MCP elicitations. `{}` is not an explicit decline.
    - It spawns its own `codex app-server` (`codexText.ts:227`), separate from any chat's process, and opens the thread with `buildThreadStartParams` (`codexProtocol.ts:97-119`; the other caller is `codex.ts:512`). 0.159.0 `ThreadStartParams` also accepts `ephemeral`, `config`, `developerInstructions` and `baseInstructions`; the runner doesn't send `ephemeral` today.
    - MCP gap: the user's Codex MCP servers load in the helper too. On this machine `codex mcp list --json` shows 11 servers, 3 enabled (cua_repl, node_repl, socraticode). Verified 2026-09-30: `-c 'mcp_servers={}'` doesn't remove them, `-c mcp_servers.<name>.enabled=false` fails bootstrap with "invalid transport", and `--disable plugins --disable apps` still leaves node_repl enabled. There is no verified way to start the helper without them. The read-only sandbox covers shell commands and patches, not MCP servers, which run as their own processes. Codex asks for approval before an MCP tool call unless the server annotates the tool read-only (`codex-rs/core/src/mcp_tool_call.rs`, 0.159.0).
    - `ensureLive` restarts on an account change and re-opens the thread on a model change (`codexText.ts:146-172`).
  - OpenCode (`opencodeText.ts`):
    - Model: `pickTextModel()` from the catalog, otherwise `opencode/glm-5`.
    - The session is created with permission deny-all, `permission: [{permission: "*", pattern: "*", action: "deny"}]` (`opencodeText.ts:137-139`). It runs its own `opencode serve --hostname=127.0.0.1 --port=<free>`.
    - It has no account support. `PROVIDER_ACCOUNT_PROVIDERS = ["claude", "codex"]` (`providerAccounts.ts:23-26`).
  - Antigravity: no text runner. `antigravityAdapter.ts` has only live-chat methods (`sendTurn`, `steer`, `cancel`, `respondApproval`, `respondQuestion`, `stop`, `forget`, `bindSession`).
    - All Antigravity sessions share one ACP runtime process (`acquireAntigravityRuntime`, `antigravityRuntimeHost.ts:54`). It is a PyInstaller onefile that extracts about 500 MB per launch, so a helper must never retire or relaunch it.
    - `initialize` declares `clientCapabilities: {fs: {readTextFile: false, writeTextFile: false}, terminal: false}` (`antigravityRuntimeHost.ts:202`). MonoCode provides no file or terminal access, so the agent uses its own built-in tools.
    - Sessions are created with `session/new {cwd, mcpServers: []}` (`antigravity.ts:438`, `antigravityCatalog.ts:62`).
    - Mode is a config option with id `"mode"`: `"default"` (Ask), `"auto_edit"` or `"yolo"` (`antigravityMode`, `antigravityAcpProtocol.ts:31`), set with `session/set_config_option`.
    - The agent can change its own mode or model mid-session (`antigravity.ts:478`).
    - Tool permission requests arrive as `session/request_permission`; the reject options are `reject_once` and `reject_always` (`antigravity.ts:633`).
    - Missing capability: ACP gives the client no switch to disable the agent's built-in tools. Nothing in source or local tests shows that `"default"` mode asks before every tool that writes or runs something, or that helper sessions stay out of Antigravity's own history.
- **Parsers.**
  - `parseGeneratedSessionTitle(raw, message)` (`sessionTitle.ts:70`) returns null on invalid output.
  - `parseCommitMessage` (`gitText.ts:90`) and `parsePrContent` (`gitText.ts:118`) return null on invalid output.
  - `formatCommitMessage` is at `gitText.ts:114`.
  - Prompt builders: `buildThreadTitlePrompt` (`sessionTitle.ts:48`), `buildCommitMessagePrompt` and `buildPrContentPrompt` (`gitText.ts`).
  - Git context: `gitStagedContext` (`src/platform/tauri/fs.ts:282`) and `gitRangeContext` (`fs.ts:306`).
- **Callers.**
  - Title: `launchTitleGeneration` (`App.tsx:6241-6295`) calls `generateHarnessTitle(current.harness, {sessionId, cwd, message, providerAccountId})`. It replaces the title only when `refreshTitle` is set or `canReplaceSessionTitle(s.title, s.harness, titleSeed)` holds (`session.ts:525`). If there is no result, the placeholder excerpt stays.
  - Commit, Git changes panel: `GitChangesPanel.tsx:525-535` calls `setMessage(await generateCommitMessage(cwd, textHarness))`. It overwrites the field even if the user typed during generation. `textHarness={pickTextHarness(active?.harness)}` is passed at `App.tsx:9530`. Errors go through `fail` (`GitChangesPanel.tsx:441`, `window.alert`).
  - Commit, Switch branch dialog: `SwitchBranchDialog.tsx:59-70` calls `setMessage(await generateCommitMessage(cwd))` and alerts on error.
  - PR: `openCreatedPr` (`GitChangesPanel.tsx:613-626`) generates content, calls `gitPrCreate(cwd, title, body, base, head)` immediately, then `recordPrActivity` and `openUrl`. There is no PR edit surface. `createPr` (`GitChangesPanel.tsx:628-643`) runs `canCreatePr` → `confirmDefault("pr")` → `setBusy("pr")` → `gitPush` when the branch is ahead → `openCreatedPr` → `onMutated` → `reloadPr`; errors go to `fail`.
  - Dialog pattern to reuse: `CreateBranchDialog.tsx` uses `Modal` from `src/shared/ui/Modal` (`title`, `description`, `size="sm"`, `onClose`), a form with labelled inputs, autofocus via `requestAnimationFrame`, and a `role="alert"` error line. It is opened from `BranchPicker.tsx:338`.
- **Settings.**
  - `src/features/settings/model/settings.ts` follows a pattern: a `monocode.*` localStorage key, a hand-written guard in `load*`, `save*` dispatching a `CustomEvent`. Example: `MODEL_CONTROLS_KEY` at 533, `MODEL_CONTROLS_CHANGE_EVENT` at 667 and `loadModelControls` at 669.
  - Search entries live in the array around `settings.ts:320-350`, for example `id: "model-controls", section: "chat"`.
  - `ChatPage` is at `SettingsView.tsx:945`. It uses the `Group`, `Row`, `Segmented` and `Toggle` components, and `Select` is exported at `SettingsView.tsx:4155`.
  - There is no Zod in the repo; guards are hand-written.
- **Catalog and accounts.**
  - Models: `modelsFor(harness)` (`models.ts:349`) returns `AgentModel[]` (`id`, `name`, `nativeId?`).
  - Accounts: `providerAccounts(provider)` (`providerAccounts.ts:52`), `providerAccountExists` (186), `providerAccountLabel` and `subscribeProviderAccounts`.
  - Availability: `isHarnessAvailable` (`availability.ts:106`).

## Proposed behavior and invariants

### Data model (in `settings.ts`)
```ts
export const AI_HELPER_PROVIDERS = ["claude", "codex", "opencode", "antigravity"] as const satisfies readonly HarnessId[];
export type AiHelperProvider = (typeof AI_HELPER_PROVIDERS)[number];
export type AiHelperTarget = {
  provider: AiHelperProvider;
  accountId?: string;   // only for claude/codex; undefined = provider default account
  model?: string;       // native model id; undefined = the runner's current automatic pick
};
export type AiHelperSettings =
  | { mode: "automatic" }
  | { mode: "custom"; primary: AiHelperTarget; fallback: AiHelperTarget | null };
```
- Storage key: `monocode.aiHelper`. Change event: `AI_HELPER_CHANGE_EVENT = "monocode:ai-helper-change"`.
- `parseAiHelperSettings(raw: unknown): AiHelperSettings` is exported, pure and a hand-written guard. `loadAiHelperSettings()` reads the storage key, parses the JSON inside a try/catch, and passes the result through the guard.
- The guard returns `{mode: "automatic"}` for:
  - anything that isn't an object;
  - an unknown `mode`;
  - a `custom` value whose `primary` is invalid.
- A target is invalid when:
  - `provider` is not in `AI_HELPER_PROVIDERS`;
  - `accountId` is present but not a non-empty string of at most 200 characters;
  - `accountId` is present for `opencode` or `antigravity`;
  - `model` is present but not a non-empty string of at most 200 characters after trimming.
- An invalid `fallback` becomes `null`. A `fallback` identical to `primary` (same provider, same `accountId` after `sameProviderAccountId`, same `model`) becomes `null`.
- `saveAiHelperSettings(next)` writes JSON and dispatches `AI_HELPER_CHANGE_EVENT` with `detail: next`.
- The guard accepts an `antigravity` target even while its isolation gate is closed, so a saved choice survives until the gate opens. The gate is applied at run time by `isAvailable` (see Helper isolation), not by the guard.

### Adapter contract (in `registry.ts`)
```ts
export type HelperPromptInput = {
  cwd: string;
  prompt: string;
  timeoutMs: number;
  providerAccountId?: string;
  model?: string;
  outputSchema?: Record<string, unknown>; // honored only where the provider supports native schemas
};
// on HarnessAdapter:
runHelperPrompt?(input: HelperPromptInput): Promise<string>;
// wrapper:
export async function runHarnessHelperPrompt(harness: HarnessId, input: HelperPromptInput): Promise<string>
// throws Error(`${harness} does not support AI helper prompts`) when the method is missing.
```
Wire it for:
- Claude: `claudeAdapter.ts`, wrapping `runClaudeTextPrompt` with `noTools: true`.
- Codex: `codexAdapter.ts`, wrapping `runCodexTextPrompt`.
- OpenCode: `opencodeAdapter.ts`, wrapping `runOpenCodeTextPrompt`.
- Antigravity: `antigravityAdapter.ts`, wrapping the new `runAntigravityHelperPrompt` (see Antigravity helper path).

No other adapter gets the method.

`HelperToolAttemptError` (new, in `helperIsolation.ts`) is thrown by every runner when its watchdog sees a tool attempt. Its message starts with `"AI helper tried to use a tool"`, followed by the provider and the tool kind only (no arguments).

### Runner changes
- **Claude.**
  - `runClaudeTextPrompt` and `ensureLive` accept `model?`. The spawn uses `input.model ?? pickTextModel()`.
  - `LiveText` stores `model`, and `ensureLive` restarts when `model` differs.
  - `outputSchema` is ignored.
- **Codex.**
  - `runCodexTextPrompt` accepts `model?` and `outputSchema?`. `ensureLive` uses `input.model ?? pickTextModel()`, and `pickTextEffort` is computed for that model.
  - `buildTurnStartParams` (`codexProtocol.ts:134`) gains an optional `outputSchema?: Record<string, unknown>`. When set, it adds `outputSchema` to the returned params. Fact: `TurnStartParams.outputSchema` in 0.159.0 is "Optional JSON Schema used to constrain the final assistant message for this turn." When unset, the params must be byte-for-byte unchanged.
- **OpenCode.**
  - `runOpenCodeTextPrompt` accepts `model?`. When set, parse it with `parseOpenCodeModelSlug`. If parsing fails, throw `Error("OpenCode model id must look like provider/model.")`.
  - `outputSchema` is ignored.
- All existing callers keep passing no model, so their model choice stays the same. The isolation hardening below does change how the Claude and Codex text runners start; that applies to Automatic mode too.

### Helper isolation (all modes)
A helper must not be able to modify project files, run commands, change the active chat, or leave a resumable session behind. A missing permission prompt is not treated as proof. Each runner gets a structural restriction plus a watchdog that stops the run the moment a tool is attempted.

| Provider | Structural restriction | Watchdog | Gate |
|---|---|---|---|
| Claude | Add `noTools?: boolean` to `buildClaudeSpawnArgs`. When set (only from `claudeText.ts`), push `--tools` followed by an empty-string argv element (Claude 2.1.283 help: `Use "" to disable all tools`) and `--disable-slash-commands`, on top of the existing isolated flags. `claudeCatalog.ts` and live chats don't pass it. | In `claudeText.ts`, any assistant content block with `type: "tool_use"` or any `control_request` with subtype `can_use_tool` fails the prompt with `HelperToolAttemptError`. For `can_use_tool`, first write a deny response, then kill the child. | open |
| Codex | Keep `approvalPolicy: "untrusted"` and the read-only sandbox. Add `ephemeral: true` to the helper's `thread/start` (an optional `ephemeral` field on `buildThreadStartParams`; unset keeps today's params for `codex.ts:512`). `handleServerRequest` answers every MCP elicitation with `{action: "decline", content: null, _meta: null}` instead of `{}`, and keeps declining command, file-change and permission requests. | Any `item/started` whose item type is not `userMessage`, `agentMessage`, `reasoning` or `contextCompaction` (so `commandExecution`, `fileChange`, `mcpToolCall`, `webSearch`, `collabAgentToolCall` and any unknown type) sends `turn/interrupt` for the turn and fails with `HelperToolAttemptError`. Any approval or elicitation request also fails the prompt after the decline is written. | open, with the residual below |
| OpenCode | Keep the session deny-all permission rule. | Any message part of type `tool` fails with `HelperToolAttemptError` and aborts the session (`session.abort`, already used for cancel). | open |
| Antigravity | See Antigravity helper path. | Any `session/request_permission`, `tool_call` or `tool_call_update` update, or a mode change away from `"default"`, fails with `HelperToolAttemptError`. | closed (`ANTIGRAVITY_HELPER_ISOLATION_VERIFIED = false`) |

- Codex residual: an MCP tool that its server annotates read-only can run without an approval request, and only the watchdog stops the turn afterwards. The read-only claim comes from the MCP server. MonoCode cannot unload the user's MCP servers for the helper (Current behavior, MCP gap). Automatic mode already runs this same runner today, so custom mode adds no new exposure. This residual is listed in Remaining blockers for Nakul to accept or reject before Todo.
- The active chat is never touched. Claude and Codex helpers run in their own child processes, and OpenCode in its own server. The Antigravity helper uses its own ACP session, which is never bound to a MonoCode session. None of them read or write the chat's live state, model, account or approvals.
- Gate: `src/integrations/harness/core/helperIsolation.ts` exports `HELPER_ISOLATION: Record<AiHelperProvider, { verified: boolean; reason?: string }>`. Claude, Codex and OpenCode are `{verified: true}`. Antigravity is `{verified: false, reason: "MonoCode can't switch off Antigravity's built-in tools yet, so it can't be used as an AI helper."}`. `isAvailable` returns false when `verified` is false. Opening the gate is a one-line change made only after Nakul approves the runtime check in Remaining blockers.
- Failure kind: a `HelperToolAttemptError` is classified as `tool-attempt`. A tool attempt never triggers repair or fallback; the output of that run is discarded.

### Antigravity helper path
New `runAntigravityHelperPrompt(input: HelperPromptInput): Promise<string>` in `src/integrations/harness/core/antigravityHelper.ts`. It uses the shared runtime and never retires it.
1. `acquireAntigravityRuntime()`. If the runtime isn't ready, fail with `unavailable`. Never launch a second runtime and never call the runtime's retire or restart path from the helper.
2. Create a MonoCode-owned empty helper folder, `<app data>/antigravity-helper/` (create if missing; it must contain no project files). Call `session/new {cwd: <helper folder>, mcpServers: []}`. The project path never becomes the helper's cwd; the prompt already carries the needed context.
3. Call `session/set_config_option {configId: "mode", value: "default"}` explicitly, even if the current value is already `"default"`. Read `currentValue` from the response. If it isn't `"default"`, fail with `unavailable` ("Antigravity couldn't start in Ask mode.").
4. If `input.model` is set, set the `"model"` config option the same way `applyModelSelection` does (`antigravity.ts:543-556`), with the same unavailable-model error.
5. Send the prompt with `session/prompt` and collect agent message text only.
6. Watchdog, while the prompt runs:
   - `session/request_permission`: reply with the option whose kind is `reject_once`, then `session/cancel`, then fail with `HelperToolAttemptError`.
   - A `tool_call` or `tool_call_update` session update: `session/cancel` and fail with `HelperToolAttemptError`.
   - A mode config update whose value isn't `"default"`: `session/cancel` and fail with `HelperToolAttemptError`.
7. Timeout: `session/cancel`, then fail with `Error("Antigravity text generation timed out")`.
8. `finally`: detach every listener for this helper session. The session is never registered in the adapter's session maps, `bindSession` is never called for it, and no `usage_update` from it reaches a chat's context meter.
9. Account: none. `providerAccountId` is ignored for Antigravity.

The gate stays closed until the runtime check proves that, in `"default"` mode, every tool that writes files or runs commands raises `session/request_permission` before it acts, and states whether helper sessions appear in Antigravity's own history. The code path above is implemented and unit-tested now against a fake runtime, so opening the gate needs no new code.

### Output schemas (for Codex only; new `src/integrations/harness/core/helperSchemas.ts`)
```ts
TITLE_OUTPUT_SCHEMA = { type:"object", additionalProperties:false, required:["title","workItem"],
  properties:{ title:{type:"string"}, workItem:{ anyOf:[{type:"null"},
    {type:"object", additionalProperties:false, required:["kind","number"],
     properties:{ kind:{type:"string", enum:["issue","pr"]}, number:{type:"integer"} } }] } } }
COMMIT_OUTPUT_SCHEMA = { type:"object", additionalProperties:false, required:["subject","body"],
  properties:{ subject:{type:"string"}, body:{type:"string"} } }
PR_OUTPUT_SCHEMA = { type:"object", additionalProperties:false, required:["title","body"],
  properties:{ title:{type:"string"}, body:{type:"string"} } }
```
Local validation always runs, even when the provider enforced a schema.

### Pipeline (new pure module `src/integrations/harness/core/helperPipeline.ts`)
```ts
export type HelperFailureKind = "auth" | "tool-attempt" | "cancelled" | "timeout" | "invalid" | "unavailable" | "failed";
export type HelperResult<T> =
  | { ok: true; value: T; target: AiHelperTarget; calls: number }
  | { ok: false; kind: HelperFailureKind; target: AiHelperTarget | null; message: string; calls: number };
export async function runHelperPipeline<T>(input: {
  targets: readonly AiHelperTarget[];            // [primary] or [primary, fallback]
  prompt: string;
  outputSchema: Record<string, unknown>;
  parse: (raw: string) => T | null;
  describeExpected: string;                       // e.g. 'JSON {"subject": string, "body": string}'
  perCallTimeoutMs: number;
  deadlineMs: number;
  isAvailable: (target: AiHelperTarget) => boolean;
  run: (target: AiHelperTarget, prompt: string, opts: { timeoutMs: number; outputSchema?: Record<string, unknown> }) => Promise<string>;
  signal?: AbortSignal;
  now?: () => number;                             // injectable clock for tests
}): Promise<HelperResult<T>>
export function classifyHelperError(error: unknown): "auth" | "tool-attempt" | "schema-rejected" | "timeout" | "failed";
export function buildRepairPrompt(prompt: string, invalidReply: string, describeExpected: string): string;
```

Algorithm. The implementer must follow this exactly.
1. `start = now()`. `remaining() = deadlineMs - (now() - start)`. `calls = 0`. `last: HelperResult | null = null`.
2. Before every model call:
   - If `signal?.aborted`, return `{ok:false, kind:"cancelled", target, message:"Cancelled.", calls}`.
   - If `remaining() < 5_000`, return `{ok:false, kind:"timeout", message:"The AI helper ran out of time.", …}`.
   - Otherwise, the call's timeout is `Math.min(perCallTimeoutMs, remaining())`.
3. Primary (`targets[0]`):
   1. If `!isAvailable(primary)`, set `last = unavailable` and go to step 4.
   2. First call: `run(primary, prompt, {timeoutMs, outputSchema})`, with `calls++`.
      - If it throws, apply `classifyHelperError`:
        - `auth` or `tool-attempt`: return that failure at once, with no repair and no fallback.
        - `schema-rejected`: go to 3.3 without a schema, using the original `prompt`.
        - `timeout` or `failed`: set `last` and go to step 4.
      - If `parse(raw)` is not null, return ok.
      - Otherwise, go to 3.3 with `buildRepairPrompt(prompt, raw, describeExpected)`.
   3. Repair call, at most once: `run(primary, repairPrompt, {timeoutMs})`, with no `outputSchema` when coming from `schema-rejected`, and `calls++`.
      - If it throws with `auth` or `tool-attempt`, return that kind.
      - If it throws with anything else, set `last` and go to step 4.
      - If parse succeeds, return ok. Otherwise set `last = invalid`.
4. Fallback (`targets[1]`), if present:
   - If it isn't available, return `last`, or `unavailable` if `last` is null.
   - Otherwise make exactly one call, with `outputSchema`, and `calls++`.
     - If it throws with `auth` or `tool-attempt`, return that kind with the fallback as the target.
     - Any other throw, including `schema-rejected`, returns that kind.
     - If parse succeeds, return ok. Otherwise return `invalid`.
5. With no fallback, return `last`.
6. `calls` is never more than 3. Abort checks happen only between calls. An in-flight call is not killed; it ends by its own timeout, and the pipeline discards the result if `signal.aborted` became true meanwhile (it returns `cancelled`).

Error classification, checked in this order (use `String(error)` when it isn't an `Error`):
- `tool-attempt`: `error instanceof HelperToolAttemptError`, or a message starting with `"AI helper tried to use a tool"`.
- `auth`: against `error.message`, `/\b(401|403)\b|unauthori[sz]ed|not (logged|signed) in|log ?in required|authenticat|invalid api key|credential|expired token|permission denied/i`
- `schema-rejected`: `/output_?schema|json schema|response_format/i`
- `timeout`: `/timed out|timeout/i`
- `failed`: everything else.

Repair prompt, exactly:
```
${prompt}

Your previous reply could not be used because it was not valid ${describeExpected}.
Previous reply (truncated):
${invalidReply.trim().slice(0, 2000)}

Reply again with only ${describeExpected}. No prose, no code fences.
```

### Task wrappers (new `src/integrations/harness/core/helperText.ts`)
- `generateHelperTitle(input: TitleInput & { chatHarness: HarnessId; signal?: AbortSignal }): Promise<GeneratedSessionTitle | null>`
  - `automatic`: return `generateHarnessTitle(input.chatHarness, {sessionId, cwd, message, providerAccountId})`, exactly as today.
  - `custom`: run the pipeline with:
    - prompt `buildThreadTitlePrompt(message)`,
    - `parse = raw => parseGeneratedSessionTitle(raw, message)`,
    - `TITLE_OUTPUT_SCHEMA`,
    - `describeExpected = 'JSON {"title": string, "workItem": null | {"kind": "issue" | "pr", "number": integer}}'`,
    - `perCallTimeoutMs 45_000`, `deadlineMs 60_000`.

    It returns `value` on ok. On failure it returns null and logs `console.debug("[monocode] helper title", {kind, provider, calls})`, with no message text or prompt in the log.
- `generateHelperCommitMessage(cwd: string, preferred?: HarnessId, signal?: AbortSignal): Promise<string>`
  - `automatic`: `generateCommitMessage(cwd, preferred)`, exactly as today.
  - `custom`:
    - Get `context = await gitStagedContext(cwd)`.
    - Run the pipeline with the prompt `buildCommitMessagePrompt({branch, stagedSummary, stagedPatch})`, `parseCommitMessage`, `COMMIT_OUTPUT_SCHEMA`, `describeExpected = 'JSON {"subject": string, "body": string}'`, `perCallTimeoutMs 90_000` and `deadlineMs 180_000`.
    - On ok, return `formatCommitMessage(value)`.
    - On failure, throw `new HelperFailedError(task:"commit", result)`. Its message is the user-facing copy below.
- `generateHelperPrContent(cwd: string, preferred?: HarnessId, signal?: AbortSignal): Promise<HelperPrOutcome>`, where
  ```ts
  type PrDraft = PrContent & { base: string; head: string };
  type HelperPrOutcome =
    | { status: "ready"; content: PrDraft }                    // create the PR as today
    | { status: "needs-review"; draft: PrDraft; failure: HelperResult<never> & { ok: false } } // custom-mode failure
    | { status: "cancelled" };
  ```
  - `automatic`: `{status: "ready", content: await generatePrContent(cwd, preferred)}`. Today's behavior, including the per-provider silent commit-summary fallback, is unchanged.
  - `custom`:
    - Get `range = await gitRangeContext(cwd)`.
    - Run the pipeline with `buildPrContentPrompt(…)`, `parsePrContent`, `PR_OUTPUT_SCHEMA`, `describeExpected = 'JSON {"title": string, "body": string}'`, `90_000` and `180_000`.
    - Ok: `{status: "ready", content: {...value, base: range.base, head: range.head}}`.
    - Failure of kind `cancelled`: `{status: "cancelled"}`.
    - Any other failure: `{status: "needs-review", draft: {...fallbackPrContent(range), base: range.base, head: range.head}, failure}`. Log `console.debug("[monocode] helper pr", {kind, provider, calls})`. The draft is only a prefill for the dialog; it is never sent to `gitPrCreate` without a user click.
    - `fallbackPrContent(range)`: the title is the commit summary's first line, otherwise `Update ${range.head}`, and the body is `range.commitSummary.trim()`. This is today's per-provider code (`claudeGit.ts:59-66`). Move it into a shared exported helper in `gitText.ts` and have `claudeGit`, `codexGit` and `opencodeGit` call it, with no change to their output.
- `run` for the pipeline: `(target, prompt, opts) => runHarnessHelperPrompt(target.provider, {cwd, prompt, timeoutMs: opts.timeoutMs, providerAccountId: target.accountId, model: target.model, outputSchema: target.provider === "codex" ? opts.outputSchema : undefined})`.
- `isAvailable(target)` is `HELPER_ISOLATION[target.provider].verified && isHarnessAvailable(target.provider) && (target.accountId === undefined || (supportsProviderAccounts(target.provider) && providerAccountExists(target.provider, target.accountId)))`. A model missing from `modelsFor` does not make a target unavailable, because the provider decides. The settings UI shows a warning instead.
- Settings are read with `loadAiHelperSettings()` once per call, at the start. A settings change mid-run does not affect that run.

### PR creation after a custom-mode helper failure
`createPr` in `GitChangesPanel.tsx` changes only in what happens after generation:
1. `canCreatePr` → `confirmDefault("pr")` → `setBusy("pr")` → `pushed = false`; if ahead, `gitPush` and set `pushed = true` (as today).
2. `outcome = await generateHelperPrContent(cwd, textHarness, signal)`.
3. `ready`: `gitPrCreate(cwd, content.title, content.body, content.base, content.head)` → `recordPrActivity` → `openUrl` → `onMutated` → `reloadPr`, as today.
4. `cancelled`: stop. No PR, no alert. If `pushed`, still call `onMutated` so the ahead count refreshes.
5. `needs-review`: don't call `gitPrCreate`. Call `onMutated` if `pushed`. Open `PrDetailsDialog` with `{draft, failure, pushed, head: draft.head}` and clear the busy state.
6. Errors thrown by `gitPush` or `gitPrCreate` still go to `fail`, as today.

New `src/features/source-control/ui/PrDetailsDialog.tsx`, following `CreateBranchDialog.tsx`:
- `Modal` with title "Pull request details" and `size="sm"`.
- A `role="alert"` line with the failure copy (see UI details), and, when `pushed` is true, a second line: "Your branch was pushed to origin/<head>. No pull request was created."
- Labelled fields "Title" (single line, required, trimmed length 1–256) and "Description" (multi-line), prefilled from `draft`, with the note "Draft from your commit messages. Edit it before creating the pull request."
- Buttons, in this order:
  - "Try again": reruns `generateHelperPrContent`. While running, "Try again" and "Create pull request" are disabled, the button reads "Trying again…", and "Cancel" stays enabled (it aborts the retry and closes). On `ready`: if the Title and Description fields still equal the text they held when the retry started, replace them with the result; otherwise keep the user's text and show "A new description was generated, but you edited the fields, so it wasn't applied." On `needs-review`: keep the fields and update the alert. On `cancelled`: nothing. The retry never creates the PR by itself.
  - "Create pull request": calls `gitPrCreate(cwd, title.trim(), body, draft.base, draft.head)` → `recordPrActivity` → `openUrl` → `onMutated` → `reloadPr`, then closes. Disabled while the title is empty or a request is in flight, so a double click creates one PR. On error, show the error in the dialog's alert line and keep the fields.
  - "Cancel": closes the dialog. No PR. The pushed branch stays pushed.
- Closing the dialog or unmounting the panel aborts an in-flight retry, and its late result is discarded.
- Auth and permission failures (`auth`) and tool attempts (`tool-attempt`) get the dialog too, with their own copy. They never trigger another model; "Try again" reruns the same settings, so it reaches the same targets in the same order.

### Invariants
- In `automatic` mode, the three tasks call exactly today's functions with today's arguments. The exceptions are the commit UI edit guard and the runner isolation hardening, which apply in both modes.
- No helper run edits files, runs commands, commits, pushes, creates a PR, or touches the chat's live session, its model or its account. Helper runs use only the isolated helper runners described in Helper isolation, and a tool attempt ends the run.
- At most 3 model calls per task run, and at most 1 on the fallback.
- An `auth`, `tool-attempt` or `cancelled` result never tries another target.
- Invalid output is never applied. Title: the placeholder stays. Commit: the field is unchanged and the error is shown. PR in custom mode: no PR is created until the user clicks "Create pull request" in the dialog. PR in Automatic mode: today's deterministic commit-summary content is used.
- A push that already happened is never undone, and the dialog says it happened.
- Antigravity is never used as a helper while `HELPER_ISOLATION.antigravity.verified` is false.
- A title the user edited is never replaced. The existing `canReplaceSessionTitle` / `refreshTitle` check in `App.tsx` stays in front of the update.
- A generated commit message is applied only if the field still holds exactly the text it held when generation started.
- Only the task's prompt goes to a helper target: the first message, the staged patch or the range patch. That is today's prompt content, sent only to the targets the user chose.

## States and transitions

Settings UI:

| State | Event | Next | User sees |
|---|---|---|---|
| Automatic | pick "Choose a model" | Custom, primary = first available of claude → codex → opencode, no account, no model | Primary row with provider, account (Claude/Codex only) and model selects; "Add backup" button |
| Custom | change primary provider | Custom, account and model reset to undefined | Selects update; the fallback is kept unless it now equals the primary, in which case it is removed |
| Custom | "Add backup" | Custom with fallback = first provider other than the primary, otherwise the same provider | Fallback row appears |
| Custom | "Remove backup" | fallback null | Fallback row disappears |
| Custom | pick "Automatic" | Automatic | Rows hidden; saved targets are discarded |
| Custom | saved account deleted elsewhere (`subscribeProviderAccounts`) | unchanged storage | Row shows the warning "This account was removed. MonoCode will skip it." |
| Custom | saved model not in `modelsFor` | unchanged storage | Row shows "Not in the current model list. The provider will decide if it works." |
| Custom | open the provider select | unchanged | "Antigravity" is listed but disabled, with the gate reason as its description |
| Custom | saved target is Antigravity (gate closed) | unchanged storage | Row shows the gate reason; runs skip it as unavailable |

Helper run (custom mode):

| State | Event | Next | User sees |
|---|---|---|---|
| idle | user action or first turn | primary call | Commit: the Generate button shows its existing busy state. Title: nothing new |
| primary call | valid reply | done ok | Text applied, subject to the guards |
| primary call | invalid reply | repair call | No change |
| primary call | auth error or tool attempt | done auth / tool-attempt | Commit: error alert. Title: placeholder stays. PR: details dialog, no PR created |
| primary call / repair call | timeout, exit or schema rejection | fallback call, or done if there is no fallback | No change |
| repair call | invalid reply | fallback call, or done invalid | No change |
| fallback call | any | done | As above |
| any | unmount or abort | done cancelled | Nothing applied |

PR details dialog (custom mode only):

| State | Event | Next | User sees |
|---|---|---|---|
| closed | `needs-review` outcome | open, idle | Failure alert, pushed note if a push happened, prefilled draft |
| open, idle | Try again | retrying | Try again and Create disabled, "Trying again…"; Cancel enabled |
| retrying | `ready`, fields unchanged | open, idle | Fields replaced with the generated text; alert cleared |
| retrying | `ready`, fields edited | open, idle | User text kept; "edited the fields" notice |
| retrying | `needs-review` | open, idle | Fields kept; alert updated |
| open, idle | Create pull request | creating | Buttons disabled |
| creating | success | closed | PR opens in the browser; panel refreshes |
| creating | error | open, idle | Error in the alert line; fields kept |
| creating | Escape | creating | Ignored until the request settles, so the user sees its result |
| open, idle or retrying | Cancel or Escape | closed | No PR; retry aborted; branch stays pushed |
| any | panel unmounts | closed | Retry aborted; a `gitPrCreate` already sent is not undone |

## Acceptance criteria
- **AC-1 (settings guard).** `parseAiHelperSettings` behaves as follows:
  - `null`, `"x"`, `{mode:"other"}`, and `{mode:"custom", primary:{provider:"cursor"}}` each give `{mode:"automatic"}`.
  - `{mode:"custom", primary:{provider:"opencode", accountId:"a"}}` gives `{mode:"automatic"}`.
  - `{mode:"custom", primary:{provider:"codex", model:"gpt-5.5"}, fallback:{provider:"codex", model:"gpt-5.5"}}` gives the same value with `fallback: null`.
  - `{mode:"custom", primary:{provider:"claude"}, fallback:{provider:"grok"}}` gives `fallback: null`.
  - A model of 201 characters makes that target invalid.
- **AC-2 (persistence).** Given `saveAiHelperSettings(x)`, then `loadAiHelperSettings()` deep-equals `x`, and one `AI_HELPER_CHANGE_EVENT` is dispatched with `detail` equal to `x`. Given the storage holds malformed JSON, `loadAiHelperSettings()` returns `{mode:"automatic"}` without throwing.
- **AC-3 (automatic is unchanged).** Given `{mode:"automatic"}`:
  - `generateHelperTitle({chatHarness:"claude", …})` calls `generateHarnessTitle("claude", {sessionId, cwd, message, providerAccountId})` once.
  - `generateHelperCommitMessage(cwd, "codex")` calls `generateCommitMessage(cwd, "codex")` once.
  - `generateHelperPrContent(cwd, "codex")` calls `generatePrContent(cwd, "codex")` once.
  - `runHarnessHelperPrompt` is never called.
- **AC-4 (valid first reply).** Given custom primary `{provider:"codex", accountId:"work", model:"gpt-5.5"}`, when the commit helper runs and the fake runner returns `{"subject":"Fix x","body":""}`, then:
  - exactly one call is made,
  - `runHarnessHelperPrompt` receives `{provider "codex", providerAccountId "work", model "gpt-5.5", outputSchema: COMMIT_OUTPUT_SCHEMA, timeoutMs 90000}`,
  - the result is `"Fix x"`.
- **AC-5 (repair).** Given the primary returns `"Sure! Here's a message"` and then `{"subject":"Fix x","body":"b"}`:
  - the result is `"Fix x\n\nb"`,
  - `calls = 2`,
  - the second prompt equals `buildRepairPrompt(original, "Sure! Here's a message", describeExpected)`,
  - the second call has no `outputSchema`.
- **AC-6 (fallback after two invalid replies).** Given the primary returns invalid output twice and the fallback `{provider:"claude"}` returns valid JSON:
  - the result comes from the fallback,
  - `calls = 3`,
  - the fallback call's `providerAccountId` and `model` are `undefined`,
  - there is no Claude `outputSchema`.
- **AC-7 (no fallback on auth, permission or tool attempt).** Given the primary throws `Error("Not logged in · Please run /login")`, then the result is `{ok:false, kind:"auth"}`, `calls = 1`, and the fallback runner is never called. The same holds for `Error("permission denied")` (`auth`) and for a `HelperToolAttemptError` (`tool-attempt`), on the first call and on the repair call. A fallback that throws either gives that kind with the fallback as the target.
- **AC-8 (timeout and fallback).** Given the primary throws `Error("Codex text generation timed out")`, then no repair is attempted, the fallback is called once, and `calls = 2`.
- **AC-9 (schema rejected).** Given a Codex primary whose first call throws `Error("invalid output_schema")`, then the second call uses the original prompt without `outputSchema`. If that call returns valid JSON, the result is ok with `calls = 2`.
- **AC-10 (deadline and cancel).** With a fake clock:
  - Given the deadline is 60 000 and the first call consumes 56 000 ms before returning invalid output, then no repair call is made and the result is `timeout`.
  - Given `signal` aborts while the first call is pending, when that call resolves with valid JSON, then the result is `cancelled` and nothing is applied.
- **AC-11 (unavailable primary).** Given the primary's account id is not in `providerAccounts("claude")`, then the primary is skipped with no call, the fallback is called once, and `calls = 1`. With no fallback, the result is `{ok:false, kind:"unavailable"}` and `calls = 0`.
- **AC-12 (commit UI edit guard).** In `GitChangesPanel`:
  - Given the message field holds `"draft"` when Generate is clicked, and the user types `"draft 2"` before the helper resolves `"Fix x"`, then the field shows `"draft 2"` and `fail` is called with "A commit message was generated, but you edited the field, so it wasn't applied."
  - Given the field is unchanged, then it shows `"Fix x"`.
  - The same two cases hold in `SwitchBranchDialog`.
- **AC-13 (commit failure copy).** Given a custom helper failure of kind `invalid` on provider Codex with no fallback, then `fail` receives "Couldn't write a commit message with Codex: the reply wasn't in the expected format. Write one yourself or try again." and the field is unchanged. The other kinds use the copy in UI details.
- **AC-14 (PR outcome).**
  - Given custom mode and a pipeline failure of kind `invalid`, then `generateHelperPrContent` returns `{status: "needs-review", draft: {title: <first commit summary line>, body: <commit summary>, base, head}, failure}`.
  - Given custom mode and `cancelled`, it returns `{status: "cancelled"}`.
  - Given Automatic mode, it returns `{status: "ready", content}` with `content` equal to `generatePrContent(cwd, preferred)`'s result, including when that function used its silent commit-summary fallback.
  - The per-provider `generate*PrContent` functions return identical output before and after the `fallbackPrContent` extraction.
- **AC-14a (no PR after a custom failure).** In `GitChangesPanel`, given the branch is ahead, custom mode, and `generateHelperPrContent` resolves `needs-review`, when the user confirms Create PR, then `gitPush` is called once, `gitPrCreate` is never called, `onMutated` is called, and `PrDetailsDialog` opens showing the failure copy and "Your branch was pushed to origin/<head>. No pull request was created." Given the branch was not ahead, the pushed line is absent.
- **AC-14b (dialog actions).**
  - "Create pull request" with the title edited to "My PR" calls `gitPrCreate(cwd, "My PR", <body field>, base, head)` once, even when clicked twice quickly, then `openUrl` with the returned URL, then closes.
  - An empty title disables "Create pull request".
  - A `gitPrCreate` error shows in the dialog and keeps the fields.
  - "Try again" resolving `ready` with the fields unchanged replaces them and does not call `gitPrCreate`. With the fields edited during the retry, the fields keep the user's text and the notice appears.
  - "Cancel" during a retry aborts it: its later `ready` result changes nothing and `gitPrCreate` is never called.
- **AC-14c (Automatic PR unchanged).** Given Automatic mode, when Create PR runs, then the call order is `gitPush` (if ahead) → `generateHelperPrContent` → `gitPrCreate` with the returned content, and no dialog opens.
- **AC-15 (title guards).** Given custom mode and a user who renamed the chat while the helper runs, then the title is not replaced (existing `canReplaceSessionTitle` path). Given a helper failure, then the title stays the placeholder excerpt and `linkedWorkItem` resolution still runs with `generated = null`.
- **AC-16 (runner overrides).**
  - `runClaudeTextPrompt({…, model:"claude-sonnet-5"})` spawns with `--model claude-sonnet-5` in the args. A second call with a different model restarts the child.
  - `runCodexTextPrompt({…, model:"gpt-5.5", outputSchema:S})` sends `turn/start` with `model:"gpt-5.5"` and `outputSchema:S`.
  - `buildTurnStartParams` without `outputSchema` deep-equals today's output.
  - `runOpenCodeTextPrompt({…, model:"anthropic/claude-sonnet-5"})` prompts with `{providerID:"anthropic", modelID:"claude-sonnet-5"}`. The model `"bad"` throws the parse error.
- **AC-17 (settings UI).** In Settings → Chat, the "AI helper" group:
  - renders "Automatic" by default;
  - switching to "Choose a model" saves a custom value with an available primary;
  - the account select appears only for Claude and Codex;
  - the model select lists `modelsFor(provider)` plus "Automatic model";
  - "Add backup" and "Remove backup" update storage.

  The settings search finds `ai-helper` with the keywords "title commit pull request pr description helper model fallback".
  - The provider select lists Antigravity as a disabled option described by the gate reason. It can't be picked while the gate is closed.
- **AC-18 (Claude helper has no tools).**
  - `buildClaudeSpawnArgs({isolated: true, noTools: true, model: "m"})` contains `--tools` immediately followed by `""` (an empty argv element), and `--disable-slash-commands`, plus every existing isolated flag. `--permission-prompt-tool` is absent.
  - `buildClaudeSpawnArgs({isolated: true, model: "m"})` (the catalog call) is unchanged from today, and a non-isolated call never contains `--tools`.
  - `runClaudeTextPrompt` always spawns with `noTools: true`.
- **AC-19 (Claude watchdog).** With a fake child:
  - an assistant message with a `tool_use` block makes the prompt reject with `HelperToolAttemptError` and kills the child; the partial text is not returned;
  - a `can_use_tool` control request gets a deny response written first, then the same rejection.
- **AC-20 (Codex helper hardening).** With a fake app-server:
  - `thread/start` params include `ephemeral: true`, `approvalPolicy: "untrusted"` and `sandbox: "read-only"`; `buildThreadStartParams` without `ephemeral` deep-equals today's output (the `codex.ts:512` path);
  - an `mcpServer/elicitation/request` gets `{action: "decline", content: null, _meta: null}` and the prompt rejects with `HelperToolAttemptError`;
  - command-execution and file-change approvals get `decline`, and the prompt rejects the same way;
  - `item/started` with type `mcpToolCall` (or `commandExecution`, `fileChange`, `webSearch`, or an unknown type) sends `turn/interrupt` for that turn and rejects with `HelperToolAttemptError`; `agentMessage` and `reasoning` don't.
- **AC-21 (OpenCode helper).** The session is created with `permission: [{permission: "*", pattern: "*", action: "deny"}]`. A message part of type `tool` aborts the session and rejects with `HelperToolAttemptError`.
- **AC-22 (Antigravity helper path and gate).** With a fake ACP runtime:
  - the helper calls `session/new` with `cwd` equal to the helper folder (never the project path) and `mcpServers: []`, then `session/set_config_option {configId: "mode", value: "default"}`, then (when a model is set) the model option, then `session/prompt`, and returns the concatenated agent message text;
  - a mode response whose `currentValue` isn't `"default"` fails with `unavailable` before any prompt is sent;
  - a `session/request_permission` is answered with the `reject_once` option, followed by `session/cancel`, and the prompt rejects with `HelperToolAttemptError`; the same for a `tool_call` update and for a mode update to `"auto_edit"` or `"yolo"`;
  - the runtime's retire or relaunch path is never called, including after a timeout or a tool attempt;
  - the helper session never appears in the adapter's session maps and no `usage.updated` event is emitted for it;
  - with `HELPER_ISOLATION.antigravity.verified === false`, `isAvailable({provider: "antigravity"})` is false, so a custom primary of Antigravity makes zero runner calls and falls to the backup or `unavailable`.

## Ordering contracts
- **Commit generate (UI):**
  1. Capture `startText = messageRef value` and create an `AbortController` held in a ref.
  2. `setBusy("generate")`.
  3. Await `generateHelperCommitMessage(cwd, textHarness, controller.signal)`.
  4. If the component unmounted (the controller aborted), return without state updates.
  5. If the current message is not `startText`, call `fail(edited copy)`.
  6. Otherwise, call `setMessage(result)`.
  7. `finally`: `setBusy(null)`.

  On unmount, call `controller.abort()`. A second Generate click while busy is already blocked by `canGenerate`/`busy`; keep that.
- **Title:** settings are read at launch. The result is applied inside the existing `setSessions` updater, which rechecks `canReplaceSessionTitle` against the latest session. The stale-generation check for `refreshTitle` (`turnGen`) is unchanged.
- **PR:** `createPr` keeps its order: confirm → push if ahead → generate. Then `ready` → `gitPrCreate` → open URL; `needs-review` → refresh if pushed → dialog; `cancelled` → refresh if pushed → stop. The helper never pushes or creates anything itself. In the dialog, a retry holds its own `AbortController`; closing aborts it, and a result that arrives after the abort is discarded. "Create pull request" sets an in-flight flag before calling `gitPrCreate`, so a second click is ignored.
- **Tool attempt:** the runner writes any required decline or deny first, then interrupts or cancels the turn, then rejects. A reply that completes after the tool attempt is discarded.
- **Runners:** each provider's prompts stay serialized through its `turns` chain. A model or account override restarts that provider's single text child. Because every runner already drops the child after each prompt, an override cannot leak into the next caller. Keep the `finally dropLive()`.
- **Pipeline:** abort and deadline checks happen before each call and after each call resolves. A resolved result after an abort is discarded.

## Implementation plan
0. Storage check (see blocker). Verify the baseline (see Baseline, dependencies and worktree), create the worktree, and run `npm install` there. Record `claude --version`, `codex --version`, `opencode --version` and the Antigravity runtime version in this spec's Facts.
1. `src/features/settings/model/settings.ts`
   - Add the types, `AI_HELPER_PROVIDERS`, key, event, `parseAiHelperSettings`, `loadAiHelperSettings` and `saveAiHelperSettings` next to the model-controls block (around 667-706).
   - Add a search entry `{id:"ai-helper", section:"chat", label:"AI helper", keywords:"title commit pull request pr description helper model fallback"}` after `model-controls` (339).
   - Import `HarnessId` as a type only. Use `sameProviderAccountId` from `providerAccounts.ts` if that import creates no cycle. If it does, compare with `(a ?? "default") === (b ?? "default")` using `DEFAULT_PROVIDER_ACCOUNT_ID`.
2. `src/integrations/harness/core/registry.ts`: add `HelperPromptInput`, the adapter method and the `runHarnessHelperPrompt` wrapper next to the text wrappers (377-421). Export them through `src/integrations/harness/index.ts` the same way `generateHarnessTitle` is exported (`index.ts:177`).
3. Runners:
   - `claudeProtocol.ts` `buildClaudeSpawnArgs`: the `noTools` option (AC-18). `claudeText.ts`: `model` in `LiveText`, in `ensureLive`/`startLive` and in the input; always `noTools: true`; the tool watchdog.
   - `codexText.ts`: `model` and `outputSchema` in the input; `ensureLive` uses the override; `ephemeral: true`; explicit elicitation decline; the item watchdog.
   - `codexProtocol.ts`: optional `outputSchema` passthrough in `buildTurnStartParams` (134) and optional `ephemeral` in `buildThreadStartParams` (97-119).
   - `opencodeText.ts`: `model` in the input, with slug parsing; the tool-part watchdog.
   - New `src/integrations/harness/core/antigravityHelper.ts`: `runAntigravityHelperPrompt` (see Antigravity helper path). It reuses the runtime host's request and notification plumbing; it must not change `antigravity.ts` session handling.

   Do not change the default model pickers.
4. Adapters: `runHelperPrompt` in `claudeAdapter.ts`, `codexAdapter.ts`, `opencodeAdapter.ts` and `antigravityAdapter.ts`, next to the existing methods (for example `claudeAdapter.ts:35-39`).
5. New `src/integrations/harness/core/helperSchemas.ts` (the three schemas), `helperIsolation.ts` (`HELPER_ISOLATION`, `HelperToolAttemptError`) and `helperPipeline.ts` (pure, with no imports from provider files).
6. New `src/integrations/harness/core/helperText.ts`: the three task wrappers and `HelperFailedError` (with `kind`, `provider` and `message`). Export them from `src/integrations/harness/index.ts` next to the `./core/textHarness` exports (`index.ts:134`).
7. `src/features/source-control/model/gitText.ts`: add the exported `fallbackPrContent(range: {base; head; commitSummary})`. Replace the duplicated code in `claudeGit.ts:59-66` and the equivalents in `codexGit.ts` and `opencodeGit.ts`.
8. Callers:
   - `App.tsx:6254`: `generateHarnessTitle(current.harness, {...})` becomes `generateHelperTitle({chatHarness: current.harness, ...})`.
   - `GitChangesPanel.tsx:530` and `:614` use the helper wrappers, and the generate flow gets the edit guard and abort. `createPr` handles the three PR outcomes and opens the new `PrDetailsDialog.tsx`.
   - `SwitchBranchDialog.tsx:63` gets the same commit edit guard.

   Don't touch branch-name generation.
9. `SettingsView.tsx` `ChatPage`: add the "AI helper" group after "Composer" (see UI details). Subscribe to `AI_HELPER_CHANGE_EVENT` and `subscribeProviderAccounts` for live updates.
10. Tests: see the test matrix.

It must not affect: chat sessions (including Antigravity chats sharing the runtime), the default text models, branch names, Automatic mode routing, or the providers without `runHelperPrompt`.

## UI details
Group: title "AI helper". Description: "Which model writes chat titles, commit messages and pull request descriptions."

Row `ai-helper`:
- Label: "AI helper".
- Description: "Automatic uses the chat's provider for titles and the first installed provider for commits and PRs."
- Control: `Segmented` with `automatic` → "Automatic" and `custom` → "Choose a model".

When custom, show these rows:
- "Main model" (`id="ai-helper-primary"`), with three `Select`s:
  - Provider: "Claude", "Codex", "OpenCode" or "Antigravity". Use the existing harness display labels. Uninstalled providers show " (not installed)" and stay selectable. While its gate is closed, "Antigravity" is a disabled option labelled "Antigravity (not available yet)", with the gate reason as its `title` and shown as muted text under the row when the select is focused.
  - Account: Claude and Codex only. "Default account", then `providerAccounts(p)` labels.
  - Model: "Automatic model", then `modelsFor(p)` by `name`, with the value `nativeId ?? id`.
- "Backup model" (`id="ai-helper-fallback"`): the same three selects plus a "Remove backup" text button. When there is no fallback, show only an "Add backup" button.
- Helper copy under the rows: "If the main model's reply is unusable, MonoCode asks it to fix the reply once, then tries the backup once. Sign-in or permission errors never switch to the backup. Helpers run without tools and can't change your files."

Warnings (small muted text under the affected row):
- "This account was removed. MonoCode will skip it."
- "Not in the current model list. The provider will decide if it works."
- "Not installed. MonoCode will skip it."

Error copy for commit failures, `HelperFailedError.message`, where `<Provider>` is the display label of the failing target:

| Kind | Copy |
|---|---|
| auth | "Couldn't write a commit message: <Provider> needs you to sign in. Sign in, or choose another AI helper in Settings." |
| invalid | "Couldn't write a commit message with <Provider>: the reply wasn't in the expected format. Write one yourself or try again." |
| timeout | "Couldn't write a commit message: <Provider> took too long. Write one yourself or try again." |
| unavailable | "Couldn't write a commit message: the chosen AI helper isn't available. Check Settings → Chat → AI helper." |
| failed | "Couldn't write a commit message with <Provider>. Write one yourself or try again." |
| tool-attempt | "Couldn't write a commit message: <Provider> tried to use a tool, so MonoCode stopped it. Nothing was changed. Try again or write one yourself." |
| cancelled | no message |

Edited-field copy: "A commit message was generated, but you edited the field, so it wasn't applied."

PR details dialog alert copy (the same kinds; the dialog replaces "commit message" with "pull request description" and "write one yourself" with "edit the draft below"):

| Kind | Copy |
|---|---|
| auth | "Couldn't write the pull request description: <Provider> needs you to sign in. Edit the draft below, or sign in and try again." |
| invalid | "Couldn't write the pull request description with <Provider>: the reply wasn't in the expected format. Edit the draft below or try again." |
| timeout | "Couldn't write the pull request description: <Provider> took too long. Edit the draft below or try again." |
| unavailable | "Couldn't write the pull request description: the chosen AI helper isn't available. Edit the draft below, or check Settings → Chat → AI helper." |
| failed | "Couldn't write the pull request description with <Provider>. Edit the draft below or try again." |
| tool-attempt | "Couldn't write the pull request description: <Provider> tried to use a tool, so MonoCode stopped it. Nothing was changed. Edit the draft below or try again." |

Pushed line: "Your branch was pushed to origin/<head>. No pull request was created." Draft note: "Draft from your commit messages. Edit it before creating the pull request." Retry edited notice: "A new description was generated, but you edited the fields, so it wasn't applied." Buttons: "Try again" / "Trying again…", "Create pull request", "Cancel".

Reuse `Group`, `Row`, `Segmented`, `Select` and the existing muted text and button tokens from `SettingsView.tsx`. The PR dialog reuses `Modal` and the field, button and alert styles of `CreateBranchDialog.tsx`; its title field gets initial focus. Don't add new tokens. Controls keep their existing hover and focus micro-interactions. Keyboard: every select and button is reachable by Tab and labelled with the row label.

## Skills to load
frontend-ui, ai-integration, testing.

## Test matrix
| AC or risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, AC-2 | unit | `src/features/settings/model/settings.test.ts` | Guard table; save/load round trip; malformed JSON; event detail |
| AC-3 | unit | `src/integrations/harness/core/helperText.test.ts` (new) | Mock `./registry` and `./textHarness`; automatic mode routes to the old functions only |
| AC-4 to AC-11 | unit | `src/integrations/harness/core/helperPipeline.test.ts` (new) | Fake `run` with scripted replies and throws; fake `now`; `AbortController`; assert call count, targets, prompts and opts |
| AC-4, AC-6 routing | unit | `helperText.test.ts` | Custom mode: `runHarnessHelperPrompt` args per target; Codex gets the schema, Claude doesn't |
| AC-12, AC-13 | feature | `src/features/source-control/ui/GitChangesPanel.test.ts` | Mock `../../../integrations/harness` `generateHelperCommitMessage` with a deferred promise; type during the pending call; assert field and `window.alert` |
| AC-12 dialog | feature | `src/features/source-control/ui/SwitchBranchDialog.test.ts` (new, same style as `GitChangesPanel.test.ts`) | Same two cases |
| AC-14 | unit | `src/features/source-control/model/gitText.test.ts` (new) and `helperText.test.ts` | `fallbackPrContent` output; the three outcomes by mode |
| AC-14a, AC-14c | feature | `GitChangesPanel.test.ts` | Mock `gitPush`, `gitPrCreate`, `openUrl` and `generateHelperPrContent`; assert call order; `gitPrCreate` never called on `needs-review`; dialog visible with the pushed line only when ahead |
| AC-14b | feature | `src/features/source-control/ui/PrDetailsDialog.test.ts` (new) | Create with edited title; double click → one call; empty title disabled; create error kept in dialog; retry with deferred promise, fields unchanged vs edited; cancel during retry discards the late result |
| AC-18, AC-19 | unit + fake child | `claudeProtocol.test.ts`; `claudeText.test.ts` (new, mocking `../../core/child` as in `claudeLive.test.ts:13`) | Spawn args table; `tool_use` and `can_use_tool` watchdog; child killed |
| AC-20 | unit + fake app-server | `codexProtocol.test.ts`; `codexText.test.ts` (new, same fake-process style as `codexLive.test.ts`) | Thread params; elicitation decline payload; approval declines; item watchdog per type |
| AC-21 | fake server | `opencodeLive.test.ts` or new `opencodeText.test.ts` | Deny-all session body; tool part aborts |
| AC-22 | fake ACP runtime | `src/integrations/harness/core/antigravityHelper.test.ts` (new, reusing the fake runtime style of `antigravityAcpLive.test.ts`) | Call order and params; mode verification; permission/tool/mode watchdog; no retire; no session registration; gate closed → zero calls |
| AC-15 | unit | `helperText.test.ts` | Failure returns null. The App-level guard is unchanged; covered by the manual check |
| AC-16 | unit | `claudeLive.test.ts` or new `claudeText.test.ts` (mock `../../core/child` as in `claudeLive.test.ts:13`); `codexProtocol.test.ts`; `codexLive.test.ts`; `opencodeLive.test.ts` | Spawn args contain the model; restart on model change; `turn/start` params; slug parsing |
| AC-17 | feature | `src/features/settings/ui/SettingsView.test.ts` | Render `ChatPage`; switch mode; selects appear and persist; search entry exists |
| Risk: Codex rejects the schema shape | manual | — | Manual check 3 |
| Risk: extraction changes provider PR output | unit | existing provider tests plus AC-14 | Same output |

## Verification
- Implementer runs:
  - `npx tsc --noEmit`
  - `npx vitest run src/features/settings src/integrations/harness/core/helperPipeline.test.ts src/integrations/harness/core/helperText.test.ts src/integrations/harness/core/antigravityHelper.test.ts src/integrations/harness/core/antigravityAcpLive.test.ts src/features/source-control src/integrations/harness/providers/claude src/integrations/harness/providers/codex src/integrations/harness/providers/opencode`
  - `git diff --check`

  There is no ESLint config in the repo; report lint as unavailable.
- Later full checks (not the implementer): `npm test`, `npm run check:web`, and a packaged build.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. Settings → Chat → AI helper shows Automatic. Switching to "Choose a model" shows the main-model row, and the account select appears only for Claude and Codex.
2. Custom primary = Claude with a non-default account and a Sonnet model. Start a new chat in Codex. The title is generated, and the Claude account's usage shows the call. The Codex chat is unaffected.
3. Custom primary = Codex with a specific model. Generate a commit message. It succeeds, which confirms the 0.159.0 `outputSchema` accepts `COMMIT_OUTPUT_SCHEMA`. Repeat for a new chat title (the `TITLE_OUTPUT_SCHEMA` `anyOf` shape).
4. Primary = a signed-out provider account, backup = another provider. Generating a commit shows the sign-in error, and the backup is not used.
5. Primary = OpenCode with an invalid model id, backup = Claude. The commit message comes from Claude.
6. Click Generate, then type in the commit field before it finishes. Your text stays, and the "edited the field" notice appears.
7. Rename a chat during its first turn with a slow helper. Your name stays.
8. Automatic mode: titles, commits and PRs behave as before (spot check one of each).
9. Custom mode with a signed-out primary, on a branch that is ahead: Create PR pushes, then the PR details dialog opens with the sign-in copy and "Your branch was pushed to origin/<branch>. No pull request was created." Cancel: no PR exists on GitHub. Reopen, edit the title, Create pull request: exactly one PR with your title.
10. In the Antigravity provider select, "Antigravity (not available yet)" is disabled and shows its reason.
11. With an Antigravity chat open and working, generate a commit message with a Claude helper. The Antigravity chat keeps working and its context meter doesn't change.

Isolation checks for the helpers are covered by the unit tests. The Antigravity runtime check in Remaining blockers is separate and needs Nakul's approval before anyone runs it.

## Facts, decisions, assumptions
**Facts (verified this session)**
- Codex 0.159.0 `TurnStartParams` has `outputSchema`, "Optional JSON Schema used to constrain the final assistant message for this turn." (generated schema).
- The Claude 2.1.283 binary accepts a `--json-schema` flag. Its behavior with a persistent `--input-format stream-json` child is unverified.
- All three text runners drop their child after each prompt and serialize prompts.
- Claude 2.1.283 `claude --help`: `--tools <tools...>` "Use \"\" to disable all tools"; `--disable-slash-commands` "Disable all skills". `--restricted` still leaves file tools inside the working directories, so it is not used.
- The Claude isolated spawn loads user, project and local settings and all built-in tools (Current behavior, Isolation gap). Without `--tools ""`, a tool covered by an allow rule could run without a prompt.
- The Codex text runner uses `approvalPolicy: "untrusted"` and a read-only sandbox, declines command and file-change approvals, and answers other requests with `{}`. User MCP servers can't be unloaded for it (verified 2026-09-30, Current behavior).
- The OpenCode text session is created with permission deny-all.
- Antigravity: one shared ACP runtime, no client tool switch, the agent can change its own mode, and helper-session history behavior is unknown.
- `PROVIDER_ACCOUNT_PROVIDERS` is Claude and Codex only.
- There is no PR edit surface today; PR creation uses generated content directly.

**Decisions**
- One primary and fallback serve all three tasks. This is simpler to understand, and the plan asks for "one primary … and optional fallback".
- Eligible providers are Claude, Codex, OpenCode and Antigravity. Each has a structural tool restriction plus a watchdog, proven by unit tests. Antigravity's path is built now but gated closed, because its only structural restriction (Ask mode) depends on unverified runtime behavior. The gate keeps the choice visible instead of silently dropping it.
- Tool isolation is enforced in the runners, so Automatic mode benefits too. Claude's `--tools ""` is scoped to `claudeText.ts` so the catalog probe and live chats are unaffected.
- A tool attempt is a hard stop, like auth: repairing or falling back would send the same prompt to a model that just tried to act.
- Only the primary gets a repair attempt, and the fallback gets one attempt, for a maximum of 3 calls. This follows the plan: "at most one configured fallback attempt after bounded schema repair".
- A native schema is used for Codex only. Claude and OpenCode use prompt JSON plus local parsing.
- Cancellation is cooperative between calls, and a late result is discarded. Killing a shared text child mid-call could break another task's queued prompt.
- In custom mode a PR helper failure stops before `gitPrCreate` and opens the PR details dialog, with retry and explicit manual creation. The already-completed push is kept and disclosed; it is not rolled back, because deleting a remote branch is destructive. Automatic mode keeps today's silent commit-summary content.
- The commit-field edit guard applies in both modes. It is a UI safety fix the plan requires ("No automatic replacement of user-edited titles/text").

**Assumptions (unverified)**
- Claude honors `--tools ""` in `--input-format stream-json` mode the same way as in print mode. The watchdog (AC-19) catches it if not.
- The auth regex covers the sign-in and permission errors of Claude, Codex, OpenCode and Antigravity. The exact wording varies by version.
- Codex accepts `anyOf` with `null` in `outputSchema`. If it doesn't, the schema-rejected path retries without a schema (AC-9), so the feature still works.
- Codex `ephemeral: true` keeps helper threads out of the saved thread list. Not observed live; manual check 3 can look at Codex history.

## Remaining blockers (need Nakul's decision before Todo)
1. **Antigravity isolation — concrete missing capability.** ACP has no client-side switch to disable Antigravity's built-in tools, and it is unverified that `"default"` (Ask) mode requests permission before every tool that writes files or runs commands. It is also unknown whether helper sessions appear in Antigravity's history. The helper path is fully specified and tested against a fake runtime, but its gate stays closed. Opening it needs a bounded runtime check Nakul approves, run in a desktop-access session, not by the implementer: in an empty scratch folder, prompt an Ask-mode session to create a file and to run a command, and confirm each raises `session/request_permission` before acting and that nothing is written after `reject_once`; then check Antigravity's history for the session.
2. **Codex MCP residual.** User MCP servers still load in the Codex helper and can't be disabled with verified config. Tools that are not annotated read-only need approval, which the helper declines; a tool annotated read-only can run once before the watchdog interrupts the turn. This matches Automatic mode today. Nakul accepts this residual (spec default: Codex eligible), or gates Codex off in custom mode (set `HELPER_ISOLATION.codex.verified` to false).

## Open questions
1. Should the chat's own provider be preferred as an implicit backup when no backup is set? The default in this spec is no.

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · deviations and why · open questions · checks run with exact results · files changed · the manual checklist above, unchanged, as a follow-up.

## Handoff prompt
Use only after Nakul approves this contract, moves it to Todo and fills in `<BASELINE_SHA>` and `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.

```text
Implement umbrella slice 5 of the provider batch: AI helper model settings.

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\ai-helper-model-settings.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: <BASELINE_SHA> on nakul/windows-support, containing the umbrella baseline checkpoint and slices 1, 2, 4 and 3 integrated and verified.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-ai-helper-model-settings -b feature/ai-helper-model-settings <BASELINE_SHA>
   If the path or branch already exists, stop and ask. Run npm install inside that worktree only. Work only there.
5. Load the skills listed in the spec and the spec-implement skill.
6. Set this spec's status to Progress (its heading and its row in the main-checkout SPECS.md) when you start, Review when you finish,
   or Blocked with the reason if you stop.
7. Implement the spec exactly. Run its Verification commands in the worktree.
8. Add the changelog entry to the Current numbered changelog file in the main checkout (Commit: uncommitted).
9. Don't commit, push, merge, build a package, run native desktop or smoke tests, or drive the Tauri window.
   Don't touch the main checkout's source, mono-clone-hari, mono-clone-remote or the stashes.
10. Report in the spec's Implementer report format. Copy the spec's Manual checks unchanged as a separate follow-up for Nakul;
    they are not your task.
```

## Handoff retro
- Implemented on the existing `nakul/windows-support` checkout per Nakul's combined batch prompt; no worktree or branch was created. Commit: `84fbe89` (`feat(helpers): choose the AI helper model`).
- Verification: the spec's focused Vitest command passed (43 files, 793 tests); `npx tsc --noEmit` passed; `npm run check:rust` passed (`cargo fmt --check`, Clippy, 416 tests passed and 4 ignored). Lint is unavailable because the repository has no ESLint config. Desktop manual checks remain with Nakul.
- Antigravity helper code and fake-runtime tests are present, but `HELPER_ISOLATION.antigravity` remains closed as approved. The installed binary did not report its version, so no live runtime check was attempted.
- The five-feature batch prompt replaced the baseline/worktree and slice-1-through-4 completion checks. The other source dependencies remained available from the existing checkout; the remaining-blockers note did not stop work as directed.
