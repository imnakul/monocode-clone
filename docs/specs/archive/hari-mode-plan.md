# Done — Hari mode — one-button mode switcher + phase-0 kanban

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Worktree: `E:\Developing\OpenSource\mono-clone` (main checkout — **no separate worktree**)
- Branch: `nakul/windows-support`
- Base commit: `f06b6be` (feat(ci): add build:windows script with automated installer archiving)

> Deviation from the working agreement (step 1): this feature is being built in
> the main checkout rather than a `feature/hari-mode` worktree. Reason: the E:
> drive has ~9.5 GB free of 200 GB. A fresh worktree costs ~400 MB of
> `node_modules` plus a cold `target/` of 3–14 GB, which does not fit alongside
> the existing build. The change is frontend-only (no Rust), so the usual
> reason for an isolated `target/` does not apply. **Assumed, not agreed** -
> flagged to Nakul in the same report as this build; revisit if he wants the
> worktree anyway.

---

## Initial idea

`docs/PLANNED.md` item **#10** asks for a Projects / Chat / Hari mode switcher, and
item **#11** asks for "Hari phase 0" — a kanban board that is useful *before* any
orchestrator brain exists, fed mechanically from events the app already has.

Today a `ModeSwitcher` already exists in `src/chrome/ProjectRail.tsx` as a
three-tab segmented control with **Hari permanently disabled**. Two things are
missing: a decision on the control's shape, and a surface behind the Hari tab.

## Discussion / decision

Two shapes were on the table:

1. **Three-tab segmented control** (what exists) — all modes always visible,
   but it eats a full row of the rail and two of the three tabs are always dead
   pixels.
2. **One button, three modes** — a single control showing the current mode;
   clicking cycles Projects → Chat → Hari → Projects.

**Chosen: one button, three modes.** It costs a third of the width, matches the
rail's compact action language, and the rail is a place you glance at rather
than aim at. The known weakness of a cycling button is discoverability, so the
implementation compensates:

- The button always names the **current** mode (icon + label), never an
  abstract state.
- Three dots show position (1 of 3), so you can see there are two more lenses.
- The tooltip and `aria-label` both name what the *next* click will do.
- `Shift`-click cycles backwards, so a three-step cycle is never more than one
  click away from any mode.

## Implementation plan

Frontend only. No Rust, no backend, no new persistence beyond one existing
localStorage key gaining a third legal value.

1. **`src/lib/appearance.ts`** — `AppMode` gains `"hari"`; `loadAppMode` parses
   all three values and still falls back to `"projects"` for junk/absent.
2. **`src/lib/hariBoard.ts` (new, pure + tests)** — turn the live session list
   into four lanes. No AI, no new events; every lane is derived from state that
   already drives the rail's live-agents preview:
   - **Needs Input** — `sessionNeedsInput()` (pending approval or pending
     question).
   - **In Progress** — `session.busy`.
   - **Todos** — idle session with `queuedMessages` waiting.
   - **Done** — idle, has at least one user turn, nothing queued.
   Sessions with no user turn at all (blank tabs) are not cards.
3. **`src/chrome/ModeSwitcher.tsx` (new)** — the one-button control, extracted
   out of `ProjectRail` so the rail file stops growing and the control is
   testable on its own.
4. **`src/chrome/ProjectRail.tsx`** — drop the inline tablist, render the new
   control.
5. **`src/chrome/Sidebar.tsx`** — Hari mode hides the workspace sidebar (as chat
   mode already does), so the board gets the full body width.
6. **`src/surfaces/HariView.tsx` (new)** — the board: four lanes, cards that
   carry project, provider, activity and elapsed time; clicking a card opens
   that thread and returns to the matching mode.
7. **`src/App.tsx`** — render `HariView` in the body when `mode === "hari"` and
   no fullscreen overlay is up; hide the tab area behind it, exactly like the
   search/inbox/notes overlays do.

### Deliberate non-goals (phase 0)

- No AI routing, no spawning, no idea inbox — those are Hari's brain (Planned #12).
- No drag between lanes: lanes are *derived*, so a dragged card would snap back.
- Board covers **open threads** (live sessions across tabs), not all history.
  That is the honest scope of what the app knows without a new backend query,
  and it is stated in the board's empty state rather than hidden.

## Todos

- [x] `AppMode` gains `"hari"` + loader parses three values
- [x] `hariBoard.ts` pure lane derivation
- [x] `hariBoard.test.ts` unit tests
- [x] `ModeSwitcher.tsx` one-button control
- [x] `ProjectRail.tsx` uses the new control
- [x] `Sidebar.tsx` hides the workspace pane in Hari mode
- [x] `HariView.tsx` board surface
- [x] `App.tsx` wiring
- [ ] Dev-mode testing by Nakul (`npm run tauri dev`) — **STOP point**
- [x] Installable build `0.1.35-local4-hari` (built ahead of the STOP point,
      on "proceed and build" - treat as throwaway if dev-testing comes first)
- [x] `docs/changelog/LOCAL-CHANGELOG.md` entry
- [ ] `docs/WINDOWS-CHANGES.md` entry (nothing Windows-specific to log yet -
      frontend-only change; add if dev/installed testing surfaces anything)

## Issues in dev

_(to be filled after `npm run tauri dev` testing)_

## Issues in installed

_(to be filled after the installer round)_

## Learnings

_(to be filled)_
