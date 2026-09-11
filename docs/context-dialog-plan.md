# Context Window & Costing Inspector Dialog (Claude & Codex) Plan

- **Worktree path**: `E:\Developing\OpenSource\mono-clone`
- **Branch name**: `fix/titles-and-token-usage`
- **Base commit**: `013cdde` (feat(harness): harmonize session titles and track live turn and thread token usage)

---

## 1. Initial Idea

Provide an informative, visually clear Context Window & Costing Inspector Dialog for Claude Code and Codex sessions in MonoCode (similar to Claude Desktop's context breakdown inspector):
- Horizontal stacked bar showing proportion of context occupied by components (messages/history, cached/system overhead, autocompact buffer, free space).
- Clear readout of tokens used / context window limit (e.g. `72.3k / 200k (36%)`).
- Granular breakdown of context and token usage:
  - System overhead & MCP tools (when configured/available)
  - Memory files (e.g. `CLAUDE.md`, `MEMORY.md`, `AGENTS.md`)
  - Skills (`.claude/skills`, `.codex/skills`, `.agents/skills`)
  - Conversation messages (user, assistant, tool results in active session)
  - Autocompact buffer & remaining free space
- Costing breakdown:
  - Active turn cost (input uncached, cache read/write, output, reasoning)
  - Cumulative session cost
  - Transparent model pricing rates (per 1M tokens)

---

## 2. Research

### Claude Wire Telemetry
Claude CLI in stream-json mode emits:
- `result.usage`: `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`.
- `result.modelUsage.<model>`: `contextWindow`.
- In MonoCode, `contextFromResult` maps this to `{ used, window }`, and `parseClaudeUsage` normalizes it to `ProcessedUsage`.

### Codex Wire Telemetry
Codex CLI in JSON-RPC app-server mode emits:
- `thread/tokenUsage/updated`: `last` and `total` records containing `inputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`, `outputTokens`, `reasoningOutputTokens`, `modelContextWindow`.
- In MonoCode, `diffCodexUsage` extracts turn deltas and cumulative session totals.

### Workspace & Prompt Structure (Client-Side Inspection)
Neither CLI sends the exact breakdown of internal prompt components over their standard stdout/JSON-RPC stream. However, MonoCode has direct access to:
1. **Memory Files**:
   - For Claude: Project `CLAUDE.md`, `~/.claude/CLAUDE.md`, `.claude/MEMORY.md`.
   - For Codex: Project `AGENTS.md`, `.codex/`.
2. **Skills**:
   - `listSkills` in `skills.ts` discovers file skills in `.claude/skills`, `.codex/skills`, `.agents/skills`.
3. **Session Transcript**:
   - `session.blocks` has exact text of user turns, assistant messages, and tool outputs.

### Model Costing
Models have standard token rates per 1M tokens:
- Claude 3.5 Sonnet: $3.00 / 1M input, $0.30 / 1M cache read, $3.75 / 1M cache write, $15.00 / 1M output.
- Claude 3 Opus: $15.00 / 1M input, $1.50 / 1M cache read, $18.75 / 1M cache write, $75.00 / 1M output.
- Claude 3.5 Haiku: $0.80 / 1M input, $0.08 / 1M cache read, $1.00 / 1M cache write, $4.00 / 1M output.
- Codex / GPT-4o: $2.50 / 1M input, $1.25 / 1M cache read, $10.00 / 1M output.
- Codex / o3-mini: $1.10 / 1M input, $0.55 / 1M cache read, $4.40 / 1M output.

---

## 3. Discussion

- **Authoritative vs Estimated**: The dialog must strictly distinguish authoritative numbers received directly from CLI telemetry (total context used, context window, actual turn cache reads/writes/outputs) vs locally estimated file/skill measurements.
- **Provider Filtering**: The user requested this specifically for Claude and Codex. For other providers or when no data is available, fallback gracefully or show available metrics.
- **UI Ergonomics**: Expand `ContextMeter.tsx`'s popover into an elegant inspector with a stacked bar, expandable sections, and costing tabs. Clicking the meter pins it open; clicking outside dismisses.

---

## 4. Implementation Plan

1. **Token Costing & Memory Inspection Module (`src/lib/tokenCosting.ts`)**:
   - Define model pricing structure (`ModelPricing`: input, cachedInput, cacheWrite, output).
   - Calculate turn and session dollar costs from `ProcessedUsage`.
   - Utility to estimate token counts for text/files (heuristic ~4 chars per token or whitespace tokenizer).
   - Inspect memory files for Claude (`CLAUDE.md`, etc.) and Codex (`AGENTS.md`).
2. **Context Inspector Component Upgrade (`src/chrome/ContextMeter.tsx`)**:
   - Render horizontal stacked progress bar:
     - Blue: System / Tool overhead
     - Purple: Skills & Memory files
     - Green/Teal: Messages
     - Amber/Orange: Compaction buffer / Headroom
     - Neutral: Free space
   - Top summary: Context used vs limit, percent used, and estimated session cost.
   - Expandable breakdowns:
     - Memory files (with file names and token counts)
     - Skills (with skill names and token counts)
     - Processed turn & session token accounting (Input, Cached, Output, Reasoning)
     - Costing summary ($ per turn and cumulative $)
3. **Connect to Composer & SessionPane**:
   - Pass harness, model, cwd, blocks/session metadata to `ContextMeter`.
4. **Unit Tests**:
   - Test pricing calculations, token estimation, and context breakdown logic in `src/lib/tokenCosting.test.ts`.
5. **Quality Gates**:
   - `npm run check:web` (vitest + tsc --noEmit).

---

## 5. Todos

- [x] Create `src/lib/tokenCosting.ts` with pricing and inspection utilities
- [x] Add unit tests in `src/lib/tokenCosting.test.ts`
- [x] Upgrade `src/chrome/ContextMeter.tsx` with stacked bar, costing, and breakdown dialog
- [x] Wire up `Composer.tsx` and `SessionPane.tsx` with model/harness/cwd/blocks context
- [x] Add unit tests in `src/chrome/ContextMeter.test.ts`
- [x] Verify test suite and TypeScript checking (`npm run check:web`)
- [x] Document in `LOCAL-CHANGELOG.md`

---

## 6. Issues in Dev (+ fixes)
- **Model pricing pattern priority**: In `resolveModelPricing`, `"o3"` was matching before `"o3-mini"`. Fixed by sorting keys descending by length before regex/inclusion check so more specific model IDs match first.
- **Vitest test pattern**: Named test file `ContextMeter.test.tsx` originally, but vitest config specifies `src/**/*.test.ts`. Renamed to `src/chrome/ContextMeter.test.ts`.
- **TypeScript strict checks in ContextMeter**: `ratio` was `number | null`, fixed with `ratio !== null && ratio > 0` check. Unread `busy` prop re-connected to the gauge's pulse animation.

---

## 7. Issues in Installed (+ fixes)
- **Detailed context information density**: Raw inspector was too prominent by default on every session. Moved under Settings → Experimentation with `Detailed context` toggle (default OFF). When OFF, ContextMeter renders a compact two-line summary (`Tokens used / limit` + percentage); when ON, renders full segmented bar, memory files, skills, and model costing inspector.
- **Quota percentage clarity**: Switching between quota consumed vs quota remaining left (`42% left`) needed user configuration. Added `Remaining quota` toggle under Settings → Experimentation (default OFF) and synchronized across ContextMeter and UsageFooter.
- **Skills color contrast**: Added distinct emerald/green bar representation for Skills tokens to separate from memory files and tool schemas.
- **Installed runtime verdict**: Manually tested in installed NSIS build `MonoCode_0.1.35-local4-token-usage_x64-setup.exe`; verified working with live Claude and Codex sessions, reactive settings toggling, and clean popover layout.

---

## 8. Learnings
- Claude CLI and Codex app-server wire protocols provide turn and thread token accounting (`input`, `cachedInput`, `cacheWrite`, `output`, `reasoning`), while memory files and skills are discovered directly in the local workspace, allowing a complete hybrid model that mirrors Claude Desktop's inspector dialog without requiring internal provider telemetry changes.
- Setting toggles (Experimentation) must be reactive via window custom events (`monocode:detailed-context-change`, `monocode:remaining-quota-change`) to immediately update pinned popovers and footer status bars across windows without requiring app reloads.

---

## 9. Done
- Context Window & Costing Inspector dialog implemented and hardened for Claude and Codex.
- Fully verified in dev mode and installed NSIS runtime (`0.1.35-local4-token-usage`).
- Status: **Done**.

