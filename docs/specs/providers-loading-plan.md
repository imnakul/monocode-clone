# Done — Providers initial-discovery feedback — plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Worktree path: `E:\Developing\OpenSource\mono-clone` (direct integration checkout, as previously authorized by Nakul for this line)
- Branch name: `nakul/windows-support`
- Base commit of `nakul/windows-support`: `7095e9f`

## Initial Idea

Opening Settings → Providers already checks availability and attempts live catalog discovery for every eligible provider row. Show a compact progress indicator beside the page title and disable all row Recheck buttons until that initial discovery settles.

## Research

- `ProvidersPage` probes availability on mount while each `ProviderRow` starts its own catalog request. The page cannot currently know when the row work finishes.
- `PageHeader` is shared by Settings sections. The indicator belongs in its title row, with the Providers page owning the loading state.
- Existing `TerminalSpinner` and `SecondaryButton` cover visual and disabled states. React 19's effect cleanup guidance requires ignoring completion from an unmounted or Strict Mode replayed effect.
- SocratiCode status for this checkout reports Qdrant unavailable; targeted source reads and tests are the fallback.

## Discussion

Keep MonoCode's restrained settings design: small spinner and descriptive text in the header's right side. The initial state is loading from the first render, so no button is briefly clickable. Wait for both availability and all eligible catalog requests to settle; one failed provider must not hide pending work from the others. Recheck remains per-row after initial discovery.

## Implementation plan

1. Give `ProvidersPage` ownership of the initial discovery Promise and loading state, preserving the current concurrent probe/catalog behavior.
2. Render a top-right `role="status"` indicator through a small optional `PageHeader` action slot.
3. Pass the pending state to every `ProviderRow` and block Recheck until the initial work settles; preserve catalog discovery after a binary-path change.
4. Add focused regression coverage, run TypeScript, Vitest, lint command, and Rust checks as required by the working agreement. Record local-only changelog notes.

## Todos

- [x] Wire initial discovery completion and indicator
- [x] Disable Recheck buttons while pending
- [x] Verify focused behavior, TypeScript, production build, and Rust gates
- [ ] Manual dev-app visual check by Nakul

## Issues in Dev (+ fixes)

- Full Vitest on this machine has three existing `ContextMeter.test.ts` assertion failures: the OS locale formats `200000` as `2,00,000`, while tests expect `200,000`. The file is untouched by this change. All other 280 web test files / 3,075 tests pass, including the new Providers tests.
- ESLint cannot inspect changed files: no local ESLint package or `eslint.config.*` exists; the first repo-wide invocation reported the missing config, and the later changed-file `npx` attempt stalled looking for a package and was stopped without source changes.
- During verification another checkout operation advanced `nakul/windows-support` from `7095e9f` to `56a2212` (upstream round-1 merge). The initial Providers implementation landed in that commit; only its explicit error state and matching assertion remain as this task's uncommitted diff. No unrelated changes were altered.

## Issues in Installed (+ fixes)

Manual app verification pending; no installer is planned for this UI-only step.

## Learnings

- The Providers page now owns the initial probe and catalog promises; leaving discovery in individual row effects made its completion unobservable to the page header.
- Windows WebView2 may reuse an existing browser process across MonoCode instances, so process parentage alone can misattribute per-instance renderer memory.

## Done

Code ready for manual dev-mode verification. No browser/UI automation or installer was run.
