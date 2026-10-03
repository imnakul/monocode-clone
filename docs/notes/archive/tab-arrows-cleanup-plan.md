# Tab arrows cleanup — plan

Header: worktree `E:\Developing\OpenSource\mono-clone`, branch `nakul/windows-support`, base `437cd34061d60c373b5208623c3f93c2f3371cdc`.

## Initial Idea

Remove visible left/right tab-strip chevron buttons. Keep native overflow scrolling, wheel→horizontal, active-tab `scrollIntoView`, dragging/reordering, clipping.

## Research

- `src/chrome/TitleBar.tsx:339` `TabStripChevron` + `tabStripOverflow` (`:137`), `tabOverflow` state + `syncTabOverflow` + `scrollTabsBy` (`:533-548`), chevron render (`:712-717`). Wheel handler (`:704-710`) and active-tab `scrollIntoView` (`:552-558`) are the retained behaviors. `ChevronLeft/Right` imports (`:2-3`) are chevron-only.
- `src/chrome/TitleBar.test.ts:85` `tabStripOverflow` tests cover arrow visibility only. `tabCopy` + `titleTabClosable` tests cover real tab behavior and stay.

## Discussion

Delete `TabStripChevron`, `scrollTabsBy`, and the chevron render. Keep: `overflow-x-auto` track, wheel handler, `scrollIntoView`, `useSortable` drag/reorder, clipping. No invisible hitbox left behind.

Amendment (2026-09-08, user review): a hard cutoff gives no affordance that
more tabs hide off-strip. Instead of buttons, show a per-side edge fade. This
is a CSS mask on the scrollport — not an overlay, not a button — so it stays
correct over glass/wallpaper backgrounds and intercepts zero pointer events.
`tabStripOverflow` + its scroll/resize tracking were restored to drive the
mask per side; `scrollTabsBy` and all chevron UI stay deleted. Remove
arrow-button tests only insofar as buttons are gone; keep/adjust tests for
the actual overflow behavior (`tabStripOverflow`).

Amendment 2 (2026-09-08, user review): the fade alone is too subtle as an
indicator. Restore the original `TabStripChevron` scroll buttons verbatim and
keep the fade mask alongside them — buttons give the obvious affordance,
the mask smooths the cutoff. The non-clickable glyph cues added in between
were removed again (buttons supersede them). Net vs original: original
buttons + new per-side fade mask.

## Implementation plan

1. Edit `TitleBar.tsx`: remove chevron component, overflow state/sync/scroll-by, chevron render; prune unused imports (`ChevronLeft/Right`, possibly `useState`/`useLayoutEffect` if unused after — check).
2. Edit `TitleBar.test.ts`: drop `tabStripOverflow` describe block + import.
3. Gates: `npx tsc --noEmit`, focused vitest `TitleBar.test.ts`, then full `npx vitest run`.

## Todos

- [x] Chevron UI + exclusive logic removed, retained scroll behaviors intact
- [x] Edge-fade mask per overflow side (no buttons, no hitbox)
- [x] Non-clickable edge chevron cues (pointer-events-none, aria-hidden)
- [x] Restored original scroll buttons alongside the fade (user call)
- [x] Arrow tests removed, overflow-behavior tests green
- [x] Arrow tests removed, overflow-behavior tests green
- [x] tsc + vitest green
- [ ] Manual dev check: overflow tabs fade at the hidden edge(s), scroll via wheel/drag, no arrows, no dead hitbox

## Issues in Dev (+ fixes)

_To be filled during `npm run tauri dev` manual check._

## Issues in Installed (+ fixes)

_To be filled after installer test (not built until dev passes)._

## Learnings

_To be filled after landing._

## Done

_8 Sept 2026: buttons restored + fade kept per review, gated green, built
as `0.1.35-local3-reveal-tabs` (NSIS-only, dirty-tree build — see
LOCAL-CHANGELOG caveats). Installed-test verdict pending user run._
