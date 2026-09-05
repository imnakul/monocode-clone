# Session Migration Plan — Sessions-only MVP (both resume modes)

> **Goal:** let a user close T3/other agents for good by importing past
> Claude/Codex (/OpenCode/AGY) sessions into MonoCode — native resume where
> faithful, transcript replay anywhere else.
> **Status:** build-ready spec. Target: a new implementation worktree.
> **Repo conventions (must follow):** strict TypeScript (no `any`, explicit
> return types, `npx tsc --noEmit` clean), `npx vitest run` green for touched
> areas, Rust `cargo fmt --check` + `cargo check` clean for backend changes,
> Tailwind-only styling, no shell-string concatenation, every Windows
> `Command` hidden or supervised (the scanner below needs NO spawns at all —
> pure file reads).

## 0. Verified ground facts (do not re-research)

- Claude transcripts: `~/.claude/projects/<cwd-slug>/*.jsonl` (JSONL:
  user/assistant/tool_use/tool_result/system/summary envelopes, session id,
  cwd, model, timestamps). Native resume: `claude --resume <id>`
  (already plumbed in `src/lib/harness/claude.ts`).
- Codex sessions: `~/.codex/sessions/2026/...` (rollout/session JSONL,
  thread ids). Native resume: `thread/resume` (already supported in
  `src/lib/harness/codex.ts`).
- AGY conversations: `--conversation <id>` (already in
  `buildAgyArgs`, `src/lib/harness/antigravityProtocol.ts`).
- OpenCode: session continue/fork via its local HTTP API
  (`src/lib/harness/opencodeClient.ts`).
- OpenCode/AGY on-disk session stores: NOT yet located on this machine —
  verify at build time; treat as optional sources (skip silently if absent).
- MonoCode session model: threads keyed by session id with
  `bindHarnessSession(threadId, providerSessionId, cwd)` per harness
  (`src/lib/harness/registry.ts`); catalogs via `refreshHarnessCatalogs`
  with `hasLiveCatalog` guard (`src/lib/models.ts`); message/turn storage
  per harness adapter.
- Import targets that already exist: skills → `.agents/skills` (NOT in MVP
  scope); MCP/commands/memory have NO native MonoCode target (explicitly
  deferred — see §5).

## 1. Scope (MVP — sessions only, both modes per user vote)

**IN:** scan external sessions → workspace checklist → session list →
mode picker (native resume vs replay) → import into a MonoCode thread.
Claude + Codex sources first; OpenCode/AGY sources only if their stores
are found (else skip silently, no errors).
**OUT:** Skills, MCP servers, slash-commands, AGENTS.md/memory, orchestrator.
Each has no loss-free target today; do not sneak them in.

## 2. Phase 1 — Read-only scanner (backend)

New Tauri command `scan_external_sessions({ since_days: number,
limit: number })` in `src-tauri/src/` (new file `session_import.rs`,
registered in `src-tauri/src/lib.rs`):

- Walk (pure `std::fs` reads, **zero child processes** — this is a hard
  requirement; spawning CLIs here would reintroduce the console-window
  class of bugs):
  - `~/.claude/projects/*/` → per dir = one workspace (decode cwd from
    the slug: `-` separators, drive-letter prefix like `C--Users-…`);
    each `*.jsonl` = one session (first-line/last-line parse for id,
    title/summary, timestamps, message count; skip unparseable files).
  - `~/.codex/sessions/**` → same grouping by rollout cwd field.
- Return JSON: `[{ workspacePath, sessionCount, sessions: [{ id,
  title, updatedAt, messageCount, source: "claude"|"codex"|… }] }]`,
  sorted by recency, capped at `limit`, filtered by `since_days`.
- Errors (missing dirs, bad files) yield empty lists, never `Err` —
  a missing agent install is normal, not a failure.
- **Tests (no live CLIs):** fixture dirs under
  `src-tauri/src/test_fixtures/session_import/` (a fake
  `.claude/projects` + `.codex/sessions` tree with 2 workspaces, one
  corrupt file) with golden expectations: grouping, counts, ordering,
  corrupt-file tolerance, limit cap. Cover Windows paths with spaces and
  drive-letter slugs.

## 3. Phase 2 — Native resume (same harness, faithful, cheap)

- Frontend `src/lib/harness/sessionImport.ts` (new): `importSessionNative(
  { source, nativeId, cwd, harness })`.
- For the chosen session, create a MonoCode thread in the SAME harness and
  bind the native id through the existing seam, exactly as a normal new
  thread would, then let the adapter resume:
  - Claude → thread creation passes the stored session id so `claude.ts`
    issues `--resume`.
  - Codex → `bindHarnessSession(threadId, providerThreadId, cwd)` so
    `codex.ts` issues `thread/resume` (falls back to fresh `thread/start`
    on `isRecoverableThreadResumeError`, same as today).
  - AGY → pass `conversationId` so `antigravity.ts` issues `--conversation`.
  - OpenCode → continue/fork via `opencodeClient`.
- If native resume fails (deleted session, expired id, auth), surface the
  provider's error honestly and offer replay (Phase 3) as fallback — never
  silently start an empty thread.
- **Tests:** mock the adapter seam (`resolveXBinaryImpl`-style injection
  already exists per harness, e.g. `setAntigravityBinaryResolver`); assert
  the resume id reaches the spawn args. No live CLIs.

## 4. Phase 3 — Replay handoff (any harness, lossy, labeled)

- New parsers (frontend, pure functions + vitest, modeled on
  `antigravityProtocol.ts` style):
  - `parseClaudeTranscript(jsonl: string)` → ordered turns
    `{ role, text, toolCalls?: [...], timestamp? }`, tolerant of unknown
    envelope types (skip, don't throw).
  - `parseCodexRollout(jsonl: string)` → same shape.
- Import creates a new MonoCode thread in the USER-CHOSEN harness with:
  1. replayed turns inserted as **read-only history** (visually badged
     "Imported history — not re-executable"),
  2. an auto-generated summary turn as the first live context (reuse the
     existing title/summary helpers; keep it short — one paragraph + key
     file paths).
- What does NOT transfer (must be stated in the UI, same honesty rule as
  the AGY no-approval work): approvals, live tool results, attachments,
  cwd-specific absolute paths, model-specific blocks.
- Cap replayed turns (e.g. 200) with truncation notice; paginate in the
  thread view if needed.
- **Tests:** golden transcripts (small, checked in as fixtures) covering
  user/assistant/tool blocks, unknown envelopes, empty files, huge files
  (cap behavior).

## 5. Phase 4 — Wizard UI (greenfield, existing patterns only)

- New Settings section reusing `SettingsView`/`SettingsRail` patterns
  (`src/surfaces/SettingsView.tsx`, `src/chrome/SettingsRail.tsx`,
  `src/lib/settings.ts` section persistence).
- Steps (trimmed MVP): **Scan** (since-days + limit + Scan button, calls
  Phase-1 command) → **Workspaces** (checkbox list with session counts,
  like the Zcode reference) → **Sessions** (per-session list with mode
  picker: native resume where the source supports it, replay otherwise)
  → **Import** (progress, per-item ok/fail, summary).
- Progress persisted in `localStorage` (`monocode.migration.*` keys,
  following the `monocode.*` convention) so it is resumable from Settings
  later. Reuse `WhatsNewDialog` mechanics if a resume nudge is wanted.
- Styling: Tailwind only, mobile-first, `aria-label`s on all interactive
  elements, `SelectMenu`/`SecondaryButton`/`Toggle` primitives where they
  fit.

## 6. Acceptance criteria

- [ ] Scanner finds this machine's real Claude + Codex sessions grouped by
  workspace, skips corrupt files, respects since/limit.
- [ ] Native resume opens a working continued session for at least one
  Claude and one Codex thread (manual smoke: send a follow-up, get a
  coherent reply referencing prior context).
- [ ] Replay import renders labeled history + summary in a chosen harness
  without errors on a 100+ turn transcript.
- [ ] `tsc` clean, full `vitest` green, `cargo fmt --check` + `cargo check`
  clean, no new clippy warnings.
- [ ] No spawned consoles on Windows during scan/import (spot-check with
  Task Manager while importing).

## 7. Risks & mitigations

- Transcript schema drift across CLI versions → version-tolerant parsers
  (skip unknown, never throw) + golden tests per format.
- Codex `sessions/2026` layout unconfirmed in detail → verify from disk at
  build start; adapt grouping, keep the return shape.
- Large imports → cap + paginate; scan runs off the UI thread (Tauri
  `async` command).
- Stale `localStorage` overrides (old `monocode.customBinary.*` seeder
  values) can make a healthy CLI look broken → the wizard's preflight
  should suggest **Reset** when a resolve fails but auto-detect succeeds.

## 8. Explicitly NOT in this plan

Skills/MCP/commands/memory import (no loss-free targets — see Agent C gap
report), orchestrator, ConPTY, SDK migrations, auto-update artifacts.
