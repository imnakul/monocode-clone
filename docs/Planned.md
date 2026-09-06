# MonoCode — Planned (Nakul fork)

Working roadmap for the personal fork. The north star first, the ladder to reach it second,
current state third, and suggestions/quick wins on top at the end.

---

## North star: Hari Orchestrator

One place to talk. Hari sits on top of everything:

- Knows **all projects and all threads**. You give Hari a task; Hari decides the architecture,
  spawns threads (or continues existing ones), picks providers per thread, and manages them.
- A **kanban board**: `Todos → In Progress → Needs Input → Done`. Hari moves work across it and
  pulls anything that needs a human into **Needs Input** — so instead of checking every thread,
  you check one lane. You can also drop ideas into it ("have this idea") and Hari files them to
  the right project and acts when the time is right.
- Ask Hari anything anytime: "where were we last time?", "status of this task?" — answered from
  thread state, not from re-reading transcripts with AI tokens.
- If you're at the screen, you can bypass Hari (normal mode) or just watch threads run — with
  cost and efficiency visible.

Design constraint learned from Munder Difflin: an agent must **not** be locked to one directory
or one provider, and the orchestrator must not swallow everything into one chat. Threads stay
independent; Hari is a manager over them, not a bottleneck relay.

---

## The ladder (in order)

1. **Terminal on Windows** — in progress on a separate thread (`feature/windows-terminal`).
2. **Central MCP hub** — MonoCode owns a collection of MCP servers; any provider runs them from
   MonoCode, no per-provider installs (mirror of what we already do with skills).
3. **Providers end-to-end** — Claude, Codex, OpenCode, Antigravity solid: no hangs, exits,
   auth surprises. (Antigravity ACP: working; review issues pending.)
4. **Standalone chat** — chat without a project, still continuable later.
5. **Scheduled tasks & workflows** — automations like Antigravity's: run a task on a schedule,
   hooks for triggers, results land as threads/notifications.
6. **CodeRabbit bridge** — pull review issues from a raised PR into a chat *without AI cost*
   (harness/`gh` API work, not agent work).
7. **UltraContext** — cross-provider context transfer so a thread can move between providers
   without losing its brain (research done: claude-mem, ultracontext; not implemented).
8. **Codebase graph view** — harness-side index (files/symbols/relations) that hands the agent
   relevant files cheaply, cutting AI cost on orientation work.
9. **Orchestrator mode (Hari)** — everything above converges here.

---

## Current state (2026-09-06)

- **Antigravity ACP**: working end-to-end on `feature/antigravity-acp` — official runtime,
  Google sign-in, shared long-lived runtime (one process for all chats), catalog, resume,
  attachments. Review found ~5-6 issues → to be fixed next.
- **Terminal (Windows)**: separate thread, ongoing.
- **claude-mem / UltraContext**: research done, nothing implemented yet.
- **Image viewing**: broken — no preview thumbnails, no small inline render, not clickable.
- **Documents**: add/view/send not tried yet.
- **Steering**: native steer exists for Claude (stream-json stdin), Codex (`turn/steer`),
  OpenCode (`promptAsync` queue). Antigravity + Grok + Cline + Pi + omp: refuse mid-turn input.

---

## Suggestions on top (ordered by value ÷ effort)

### 1. Harness-level queue + steer (do first — it's the composer everyone described)

Don't implement steering per provider. Implement **one queue at the harness layer** that works
for every provider, native steer or not:

- The composer always accepts input. `Enter` during an active turn **queues** the message
  (bubble appears in the transcript: "queued — will send when the agent finishes").
- A **Steer** button on the queued bubble sends immediately *if* the provider supports native
  steer (Claude/Codex/OpenCode), otherwise performs cancel-and-queue (Antigravity: send
  `session/cancel`, wait for settle within the 15 s grace, then flush the queue as the next
  prompt).
- When a turn ends, the queue **flushes automatically** in order — including across a crash
  (queue is persisted with the session, like resume refs).
- Implementation lives in `registry.ts` (one wrapper around `sendHarnessTurn` + a per-session
  queue map), so adapters stay untouched. Attachments ride along in queue entries.

This gives every provider the same mental model: *type anytime; Steer = now; otherwise next*.

### 2. Antigravity usage meter (~small)

The runtime logs its backend `usageUpdate` frames on stderr — `trajectoryId` equals our ACP
session id, fields `promptTokenCount` / `totalTokenCount` (strings). Parse in the shared
runtime host's stderr path, forward as a synthetic `session/update`, map to
`{type:"context", used}` in `antigravityEvents`. Degrades silently if Google changes the log
format. (Verified live; counts match real turns.)

### 3. Image preview fix (small, frontend-only)

Attachments already flow to Antigravity (image blocks). What's missing is local display:
render thumbnails inline via the asset protocol, click to open full-size (lightbox or OS
viewer). No provider work needed.

### 4. CodeRabbit bridge (small, zero AI cost — high value)

A "Pull review" action on a PR-linked thread: fetch CodeRabbit review comments via `gh api`
(reviews + inline comment threads for PR #N), format into the chat as a structured report with
per-issue "fix this" buttons that send the issue text as a normal message. The agent then only
works on fixing — never on fetching/reading the review. Same pattern generalizes to any
review bot.

### 5. MCP hub (medium — bigger than it looks, start narrow)

MonoCode owns one MCP config; providers get it injected:
- Antigravity: the runtime already reads `~/.monocode/providers/antigravity/config/mcp_config.json`
  (seen in its logs) — we own that file today.
- Claude/Codex/OpenCode each have their own MCP config mechanisms — the hub writes into each.
- Phase 1: shared *stdio* server list, one toggle per provider. Phase 2: health/status UI.

### 6. Standalone chat (small-medium)

A "Scratch" root directory (e.g. `~/.monocode/scratch/<id>/`) as the cwd for projectless
chats; resume already works off provider session ids, so continuity is mostly a UI concern
(list scratch threads alongside project threads).

### 7. Branch / fork a thread (ChatGPT/Codex-style clone)

"Branch" on any message (or the thread menu): clone the conversation up to that point into a
new thread; the original stays untouched. Two levels:

- **UI-level fork (do first, works everywhere):** the new thread copies the transcript up to
  the chosen message and starts a **fresh native session** whose first prompt carries a
  compacted transcript ("conversation so far — continue from here"). No protocol needed, every
  provider works; this is the handoff mechanic, and UltraContext later becomes the
  high-fidelity version of the same bundle.
- **Native fork (later, where supported):** clone server-side history where a provider allows
  it. Never let two branches *share* one native session — a fork must copy, or the branches'
  turns interleave into one history.

Pairs well with the rest: a branch optionally carries queued messages; on the kanban a branch
is naturally a "try another approach" card; Hari can fan one task out to N branches and keep
the winner.

### 8. Scheduled tasks (medium)

In-app scheduler (the app is already long-running): a task = cron/human schedule + prompt +
project/thread. Runs create real threads so results appear in the kanban, not in a log.
Hooks (pre/post turn, on-question, on-error) fall out of the same engine — and `Needs Input`
can be one of the hook targets.

### 9. Hari, phase 0 — kanban without AI (medium, and worth doing early)

The kanban does **not** need Hari's brain to be useful on day one:
- `Needs Input` can be fed mechanically from events that already exist: `question.asked`,
  `approval.requested`, `session.error` → card in the lane; resolving the question/approval
  closes the card.
- "Where were we?" = session store query (last activity per thread/project), no AI.
- Only *routing* (which thread next, spawn or continue, which provider) needs the model —
  and by then, the queue, usage meter, and review bridge give Hari cheap tools to work with.

### 10. Later / big: codebase graph, UltraContext, full Hari

- **Code graph**: tree-sitter/ctags-style index built by the harness; expose "relevant files"
  to any provider as attachable context. Pairs with UltraContext (pack a thread's brain into a
  portable bundle so Claude→Codex→Antigravity handoffs don't restart from zero).
- **Full Hari**: autonomous routing and spawning — only after providers are boring-reliable
  and the kanban lanes are fed by real events.

---

## Principles picked up from the other harnesses

- From **Munder Difflin**: never lock an agent to one directory/provider; let humans drop
  ideas into a lane and let the system file them; low-tech (files) beats clever (RPC) for
  coordination.
- From **T3Code**: long-lived runtimes, honest failure, ACP where it exists — already ported;
  next borrowed items are the browser-helper preflight and multiple auth methods per provider.
- From **MonoCode itself**: the differentiator is the integrated workbench — UI, git, file
  explorer, notes, multi-provider in one window. Everything on this ladder should deepen that,
  never require leaving the app.
