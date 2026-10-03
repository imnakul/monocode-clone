# Upstream intake analysis — final report

- Snapshot: local `c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6`, upstream `43aac9d216c323a7e04c9037eb0b251dd840cc7a`, merge base `3344bea70341d8ea4d6dea414aa15c13683372e9`.
- Upstream moved since? **Verified: yes**, to `1e97594ddf6f40aa24671f7fa09f2048deb1d5eb`, one later commit (“Soften model picker tile edges with masked glow”). Stage 0 matched the pin; stage 8 detected the move. Analysis stayed pinned; the later diff was not checked.
- Model and settings: GPT-6 based Codex; exact variant/reasoning setting not exposed. Total time: approximately 72 minutes, 2026-10-01 18:46–19:58 IST, measured with PowerShell. Sub-agents: none. Scripts: retained under the output folder; their results were reviewed.

## Stage status

All nine stages produced files in order. Partial means the stated coverage/rule-following gap remains; it does not mean implementation occurred. Minute-resolution stage times include review and reporting, with small gaps between stages.

| Stage | Done / Partial / Not done | File | Time spent | What is missing |
|---|---|---|---|---|
| 0 | Partial | [00-orientation.md](docs/notes/upstream-intake-2026-10-01/00-orientation.md) | about 5 min | Facts checked; identity-output rule breached once; initial read-order caveat logged. |
| 1 | Partial | [01-local-preservation-list.md](docs/notes/upstream-intake-2026-10-01/01-local-preservation-list.md) | 7 min | 28 behaviors checked; some generic test anchors and completeness gaps remain. |
| 2 | Partial | [02-upstream-features.md](docs/notes/upstream-intake-2026-10-01/02-upstream-features.md) | 5 min | All 128 commits placed; full feature/native/platform contracts not exhaustively audited. |
| 3 | Done | [03-files.md](docs/notes/upstream-intake-2026-10-01/03-files.md) | 3 min | No classification gap; complete TSV and nine tag simulations. |
| 4 | Partial | [04-conflicts-and-risks.md](docs/notes/upstream-intake-2026-10-01/04-conflicts-and-risks.md) | 19 min | All 80 X paths covered; long hunk middles/full contracts have exact Not analysed list. |
| 5 | Done | [05-decision-brief.md](docs/notes/upstream-intake-2026-10-01/05-decision-brief.md) | 3 min | 14 open decisions and 33-feature menu; owner answers intentionally pending. |
| 6 | Done | [06-strategy-and-rounds.md](docs/notes/upstream-intake-2026-10-01/06-strategy-and-rounds.md) | 4 min | Six stable rounds plus optional seventh; sequential effort/conflicts unmeasured. |
| 7 | Partial | [07-spec-notes.md](docs/notes/upstream-intake-2026-10-01/07-spec-notes.md) | 11 min | 23 instructions in Draft spec; exact Cargo suffix/lock tooling and reviewer clearance missing. |
| 8 | Done | [08-final-report.md](docs/notes/upstream-intake-2026-10-01/08-final-report.md) | 14 min | Self-review complete; no code checks by design. |

Stage 3 also has [03-files.tsv](docs/notes/upstream-intake-2026-10-01/03-files.tsv). Stage 7 created [upstream-intake-round-1.md](docs/specs/upstream-intake-round-1.md) and exactly one Draft index row.

## Ten findings that matter most

1. **Verified — U-001–U-102:** the ledger covers 128 commits: 119 through v0.6.0 and nine post-tag commits; 33 feature groups and 69 maintenance groups.
2. **Verified — stage 3:** 527 paths reconcile as 256 new, 144 upstream-only edits, 47 both-changed clean merges, 80 actual conflicts and zero special paths.
3. **Verified — C-01–C-27:** 27 groups cover every conflicting path exactly once; 231 textual hunks, including 13 size-L groups. Round 1 has 23 paths/63 hunks.
4. **Verified source — R-01/R-03:** a new provider map omits Cline and a clean editor merge declares LineEnding twice; typecheck consequences are Inferred.
5. **Verified source — R-02/R-08:** remote host imports our deleted Antigravity module and its provider/approval contracts omit local capabilities; support policy needs D-03.
6. **Verified source — R-04:** CLI overrides use two storage keys; retaining old settings requires an explicit authority/migration choice, D-04.
7. **Inferred integration risk — R-15/D-07:** tool-capable read-only BTW runners must not silently replace our tool-free structured helpers.
8. **Inferred — R-07/D-08:** Haze should stay chat-only until wallpaper routing is proven; preserve the existing five Windows effects.
9. **Not checked — R-09/R-10:** combined queue-reset/held-state behavior and cross-branch image ownership need regressions before acceptance.
10. **Inferred recommendation — D-13/D-14:** take six stable release rounds, group v0.4.0–v0.4.3 with its Windows fix, and approve post-tag work separately.

## Questions for Nakul

- **D-13/D-14:** accept the stable release series or selected features? Include the nine pinned post-tag commits? Which exact local label should round 1 use?
- **D-01/D-07:** keep durable Sidechat alongside temporary BTW? Keep tool-free helpers separate while adding cancellation?
- **D-02/D-03:** defer executable updates pending safety review? Accept remote in a dedicated round with an explicit unsupported-feature policy?
- **D-04/D-06/D-08:** migrate existing binary overrides into one store; adopt remaining-quota default with a defined old-setting policy; keep Haze chat-only?
- **D-05/D-09/D-10/D-11/D-12:** approve round-specific dependencies/capabilities/CI and compatible saved-data handling after reviewer checks; require image-lifetime, queue-hold and clean-merge contract repairs?
- **Stage 7/D-14, for reviewer:** provide the exact suffix-compatible Cargo version/lock tooling recipe. The existing bump script accepts only numeric versions; the Draft stops rather than improvises.

These questions do not authorize any merge. Existing standing calls remain binding and are cited in stage 5.

## What I am least sure about

**Not checked:** full host/remote/MCP/updater security and Windows process contracts; runtime compatibility of old settings/snapshots and image references. These deserve review before the affected rounds. Stage 4 names the exact unanalysed files.

**Partial source coverage:** local preservation rows do not exhaustively prove every fork behavior; some tests are generic. Typography, ignored-file mentions and review variants are grouped or insufficiently traced rather than separately proven. Stage 2 inspected declaration samples per commit, not every implementation path; stage 4 retained full diff evidence but did not read every long hunk middle. Round 1 hunks were read in full.

**Inferred:** all proposed integrations, feature-menu value and sequential repair effort. No compiler, test, build or desktop observation validates them. The Draft is not ready for an unattended worker until its stated prerequisites are closed.

The complete decision-relevant uncertainty register is [08-uncertainties.md](docs/notes/upstream-intake-2026-10-01/08-uncertainties.md).

## Self-review results

**Verified:** all 527 classifications/actions rechecked against Git; exact 128-SHA ledger equality; every X path in one C group; every new-product C and every material R linked to D; every D placed in rounds; every round 1 conflict given an instruction; all referenced IDs exist.

Twenty TSV rows were rechecked at fixed indexes `floor(k×526/19)+1`: 1, 28, 56, 84, 111, 139, 167, 194, 222, 250, 277, 305, 333, 360, 388, 416, 443, 471, 499, 527. All eight columns were checked. All 13 size-L groups had fresh scratch-blob hunk counts recomputed; all 10 High risks had source checks. Detailed evidence: [08-self-review-evidence.md](docs/notes/upstream-intake-2026-10-01/08-self-review-evidence.md).

Corrections include Haze rendering/dependency descriptions, feature-to-round placement, two unrelated preservation-test references, L-21’s source guard, R-06’s exact path/line and C-19’s unrelated decision link. Absent-action em dashes were valid UTF-8; misleading console rendering led to normalization to ASCII. Self-review helpers stopped on parser/source-token mistakes before their complete successful run; this is logged.

**Rule-following limitation:** an early unpeeled annotated-tag read unexpectedly printed a public tagger email. I recorded the breach, omitted its value from artifacts and used peeled, identity-free reads thereafter. Initial batched documentation reads were followed by rereading in the prescribed order. No later step required either exception.

## State left behind

**Verified:** only authorized ignored documentation was written: the stage reports, TSV, run log and evidence/scripts under `docs/notes/upstream-intake-2026-10-01/`; the new round 1 Draft; one SPECS.md row; one top changelog entry. Existing source was not changed.

Scratch retained at `E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849`: **65,877,470 logical file bytes**, approximately 62.8 MiB. Nothing deleted. Nakul or Claude can remove it after review.

**Verified final main state:** clean `git status --porcelain`; pinned HEAD/cache unchanged; branch `nakul/windows-support`, 17 local branch names, three stash names and three worktree names match stage 0. Other worktrees/stashes were not opened. Final free space: C: 7,528,595,456 bytes; E: 19,788,636,160 bytes. These measurements do not establish future build capacity.

No source merge/resolution, installation, build, test, lint, commit, push, browser or desktop run occurred. Scratch merge-tree simulations were the explicitly authorized exception. No `.env*` files were read and no contact with `personal` occurred.

SocratiCode: used (codebase_status, codebase_search).
