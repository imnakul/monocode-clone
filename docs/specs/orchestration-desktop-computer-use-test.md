# Blocked — Orchestration desktop computer-use test — spec

- Tier: complex (live providers, concurrent workers, recovery and filesystem isolation).
- Snapshot: `9397898` on `nakul/windows-support`, 2026-09-30. The four-feature source is preserved as unverified WIP on `personal/park-other-orchestration-mode-changes-30sept` at `ac546f3769ab2b69dc1c6df31a1b33ef94378e2c`; create a clean worktree at that branch before any future test run.
- Parking record: [orchestration-parking-30sept.md](../notes/orchestration-parking-30sept.md). T1 remains inconclusive and the remaining desktop cases are still untested.
- Test directory: `<TEST_ROOT>` = `E:\Developing\Temptesting`, confirmed by the external test report. It now contains retained test material; do not reinitialize or overwrite it.
- Execution owner: a separate Codex session with native Windows desktop access, outside MonoCode.

## In plain words

Test the four orchestration features in a disposable project inside the empty temporary directory.
Start with Antigravity Gemini 3.8 Flash High as the lead, Super Bunny through OpenCode as the first worker, and Muse Spark 1.3 Free as the second worker.
Check file handoff, stopping and resuming the lead, Efficient/Live supervision, and message/attachment retention.
The tester may ask Nakul to select a model or perform a step that computer use cannot reliably control, then continue from the observed screen.
Record actual results and screenshots; incomplete cases remain unverified.

## Goal and user story

As the reviewer, I want evidence from the actual desktop app and live providers so that I can decide whether these features are ready for an installer build.
This is a test procedure, not a request to implement or fix code.

## Scope and execution boundary

- Use the current uncommitted development app built from this checkout. An older installed release cannot validate this work. Record app executable/version and how its provenance was established; a matching version string alone is insufficient.
- The agent inside MonoCode prepares this document only. The external desktop tester loads the computer-use skill and its runtime, guidance, API and confirmation instructions.
- Check native desktop access before touching the app. If no accessible native window is available, report Blocked and hand the checklist to Nakul. Browser-only automation cannot establish native Tauri behavior.
- Nakul supplies and confirms `<TEST_ROOT>`, which must be empty, a real directory and not a symlink/junction into another project. Resolve absolute paths before setup. Stop if it contains existing files or is inside this source checkout.
- Use `<TEST_ROOT>/project` as the selected app project and the only lead-session working directory. MonoCode creates isolated workers under `<TEST_ROOT>/project-worktrees`; this is intentional containment inside the same test root.
- Reports/screenshots go under `<TEST_ROOT>/evidence`, outside the test Git repository. App session/history storage in its normal app-data location is expected; the test-root boundary governs project edits and test artifacts, not the app's normal settings/storage.
- Open a new project-specific test session; do not reuse or alter existing sessions, orchestration runs, provider credentials or global settings.
- The user may handle model selection and app startup. The tester records what was actually selected before continuing.

## Out of scope

- Editing application source, resolving lint/test failures, changing dependencies or provider accounts, deliberately exhausting quotas, or modifying auth/env configuration.
- Installer builds, releases, commits or pushes in `mono-clone`, and changing any existing source branch/worktree.
- Running native desktop tests from inside MonoCode.
- Silently substituting requested models or claiming a simulated pause is a real provider failure.
- Automatic deletion of the test directory or retained worker worktrees. Leave them for review.

## Facts confirmed in source

- `src-tauri/src/worktrees.rs:122`, `default_root`: worker roots are sibling `<project-name>-worktrees` directories. `create_seeded` at line 351 uses Git HEAD. A truly empty non-Git directory cannot support this isolated-worker test as-is.
- `src/features/orchestration/model/orchestrationPlan.ts:295`: producer and consumer must both declare the exact ignored file in `handoffFiles`; the consumer depends on the producer.
- `src/features/orchestration/ui/OrchestrationPreview.tsx:567`: startup uses `Confirm & start`. Handoff files appear at line 665 and supervision controls at line 804.
- `src/features/orchestration/model/leadControls.ts:3`: separate labels are `Stop lead response`, `Resume and send`, and `Cancel orchestration`.
- `src/app/App.tsx:7655`: the lead Stop calls `stopLeadResponse`; the paused-send flow uses `resumeAndSend` at line 5776.
- `src/features/orchestration/model/orchestration.ts:1695`: Efficient waits are tracked at the control boundary. The lead receives explicit turn-ending guidance after two empty waits. Real model obedience still needs observation.
- Existing deterministic coverage: `orchestrationLeadControl.test.ts:347` handoff; line 387 conflict; line 541 quiet waits; line 670 Stop; line 722 model switch; line 873 Cancel; line 902 pause; line 913 resume; line 979 persistence. `Composer.test.ts:786` pending send/attachments and line 894 failure restoration.
- Recorded post-chooser-removal verification: focused tests 67/67, TypeScript, Rust fmt/check and web build passed; latest full web runs had intermittent Composer attachment failures; ESLint lacked a flat config. This spec does not clear those outstanding automated gates.
- Antigravity's reported maximum-call-stack error was not reproduced by fake ACP tests. Record it if encountered during live planning; do not hide it by immediately switching providers.

## Prerequisites and setup

1. Resolve the test directory and current development-app provenance. If the app is not running, Nakul may start it with `npm run tauri dev` from the source checkout. Ask before starting a new dev process if startup is not already authorized; do not install or build an installer. Before any live model call, require successful build/start evidence from the current working tree and the running executable/process. Matching HEAD or a Development badge is insufficient for uncommitted changes; timestamps alone are also insufficient because a live development webview may use newer frontend code with an older native backend. If freshness cannot be established, stop as Blocked before consuming provider turns.
2. Before initialization, show the planned paths to Nakul. Obtain authorization for the one local seed commit in the disposable test repository. This is separate from any source-repo commit; no source commit or push is authorized by this spec.
3. Inside `<TEST_ROOT>/project`, initialize a local Git repository, no remote. Create a minimal tracked `README.md` describing this disposable test and `.gitignore` containing `docs/`. Make one seed commit of only those two files after the preceding authorization. Use existing identity; if unavailable, ask Nakul rather than changing global Git identity. Verify HEAD exists and status is clean.
4. Create ignored `docs/seed.txt` containing `HANDOFF-SEED-v1`. Prepare a small harmless `attachment.txt` under `<TEST_ROOT>/evidence` for the Composer cases. These are test fixtures, not production files.
5. Add/select `<TEST_ROOT>/project` in MonoCode and create a fresh session titled `Orchestration desktop test`. Verify the displayed checkout path before every new run and confirm worker checkout paths stay under `<TEST_ROOT>/project-worktrees`.
6. Select the lead provider Antigravity and requested display model **Gemini 3.8 Flash High** (including High effort if the UI exposes it separately). Select worker 1 **Super Bunny**, provider **OpenCode**, and worker 2 **Muse Spark 1.3 Free**. Worker 2's provider is not specified: resolve it from the actual catalog or ask Nakul; do not assume an ID/provider.
7. Record exact displayed labels and actual provider/model IDs where observable. Availability and aliases are unverified; if the exact requested options are missing, let Nakul choose the intended options. Wait for the answer rather than substituting.
8. Record any provider budget/call limit Nakul supplies. Run the bounded cases below; stop at a quota/billing warning or repeated provider failure. Do not retry unavailable models in a loop.

## Test task prompt and proposal review

Submit in orchestration mode using the selected lead:

```text
This is a disposable orchestration test. Work only in this selected project and its app-created isolated worker checkouts. Do not commit, push, change branches, install packages, or read another project.

Create exactly two dependent tasks using the selected catalog models:
1. Super Bunny through OpenCode: read docs/seed.txt and write docs/handoff-test.md using a shell command. Its content must contain HANDOFF-SEED-v1 and HANDOFF-RESULT-v1. Declare both docs/seed.txt and docs/handoff-test.md as exact handoffFiles. Edit no tracked source file.
2. Muse Spark 1.3 Free (provider chosen in the card): depend on task 1's acceptance. Declare docs/handoff-test.md as a handoffFile, read the accepted content and write only result.txt containing those two markers. Do not recreate the input if missing; report the missing handoff.

Use Efficient supervision for this run. Do not delegate duplicate workers. Review exact file changes before acceptance. I will inspect the proposed models, paths and dependency before Confirm & start.
```

Before confirmation, verify both models/providers, handoff paths, write scopes, dependency and Efficient mode on the card. If any cannot be exposed or corrected through the existing UI, ask Nakul for assistance; if the proposal still lacks the required metadata, mark the setup Blocked. Prompt text alone is not proof the actual task metadata is correct.

## Test matrix and acceptance criteria

Run the cases in this order. A result is Pass only with the stated observation; inability to induce a state is Not tested/Blocked, never Pass. Stop the live sequence immediately if T1 loses control access, fails to transfer the producer's bytes, or cannot start its consumer after acceptance. Capture evidence and return for source investigation; do not spend further turns attempting unrelated cases or asking the lead to inspect app-data/source paths.

| Case | Steps | Required observations |
|---|---|---|
| T1: ignored-file handoff | Start the reviewed two-task proposal. Observe task 1 completion/review and task 2 startup. Inspect input/output and Git status read-only. | Task 2 starts after acceptance and reads exact accepted markers. `docs/` remains ignored; neither index nor ignore rules were changed by the handoff. `result.txt` contains both markers. Record the run/task IDs and handoff evidence, not just the lead's summary. |
| T2: conflict protection | In a new proposal, have worker 1 change existing `docs/handoff-test.md` to include `WORKER-v2`, with its exact handoff declaration. Before acceptance, change the lead copy to `LEAD-EDIT-v2` through the test project editor and save. Tell the lead not to accept until this edit is made; observe the actual review error. | Integration reports conflict and does not overwrite `LEAD-EDIT-v2`. Worker bytes remain available. If automatic review happened before the edit, timing was missed: use a fresh bounded case or mark Not tested. Do not count that run as a conflict pass. |
| T3: stop and model change | Create a new run with worker 1 performing one bounded 75-second quiet task before writing `stop-proof.txt`; worker 2 depends on it and writes `stop-consumer.txt`. While the lead streams, click Stop lead response. Observe worker status, then select a different available lead model with Nakul and submit a uniquely marked continue message. | Only the lead response stops; run stays active, worker continues, and the new lead can inspect the same task IDs with control access. The continue message is submitted once; no duplicate worker is created. If there is no streaming lead to interrupt, report that timing case untested. |
| T4: Efficient and result wake | Use T3's long quiet worker, or a fresh equivalent if interruption interfered. Observe lead control/transcript activity over the quiet interval and worker completion. | After at most two empty bounded waits, the lead ends its turn while the worker/run remain active. Worker progress alone does not start lead turns; terminal result/question wakes an idle lead once. Inspect visible tool activity when available; a quiet screen alone cannot prove the wait count. |
| T5: Live supervision | Start a separate two-worker run, same selected workers, Live supervision chosen on the card; use one bounded 75-second quiet worker and a dependent consumer. | Card and run summary show Live supervision. Continued bounded waiting is permitted without cancelling the run; mode is distinct from Efficient. A model choosing to end its turn early is not by itself a failure. No repeated unchanged progress narration should be reported as useful updates. |
| T6: confirmed Cancel | While T5 or a dedicated run is active, open Cancel orchestration, first dismiss with Keep running; reopen and confirm. | Dismissal leaves the run active. Confirmation stops/cancels active and queued workers; the run does not auto-wake. Existing worker edits remain recoverable. Cancel and lead Stop remain clearly different actions. |
| T7: paused Resume and send | When a run naturally pauses due to model/provider failure, capture run/task IDs. Choose an available replacement lead model with Nakul. Type `RESUME-ONCE-1` and attach the harmless fixture; click Resume and send, including one attempted repeated submit while pending. | Pending state prevents a duplicate submission; success sends the message once with the attachment and resumes the same run/tasks/checkouts. If resume fails, typed message and attachment remain usable. Do not deliberately alter credentials or provoke billed quota exhaustion to create a pause. Without a safe pause, mark this case Not tested and offer a user-assisted attempt. |
| T8: restart recovery | With a paused run and saved draft/attachment, let Nakul close/reopen the dev app or restart it after confirming unrelated sessions are safe. Open the test session and resume. | Same run, task IDs, worktree edits and saved supervision mode are recovered; message is sent once. Record attachment/draft restoration separately. If draft persistence was not saved/visible before closing, do not treat an absent unsaved draft as proof of a regression. |
| T9: ordinary Composer failure | In the test session, send `COMPOSER-FAIL-1` with the harmless attachment when an actual safe submission failure can be observed; recover and resend once. | Failed submission retains text/attachment, pending UI settles, and recovery creates one accepted message. Separate a send rejected before acceptance from a provider error after acceptance: an accepted message remaining in the transcript is not a duplicate-send failure. Without a safe reproducible failure, mark Not tested. |

For T3–T6, make unique task/output names for each run to avoid confusing old artifacts. Keep worker instructions bounded: no repeated sleeps, no background helpers, no infinite polling. A tester may observe longer than 60 seconds, but tool waits must be broken into short intervals with progress updates.

## States, owners and ordering rules

| Owner | State/resource | Ordering to verify |
|---|---|---|
| Desktop tester | Selected project/session and model choices | Confirm path and catalog choices before submitting; confirm proposal metadata before starting. Never edit a real project to make a test pass. |
| Orchestration run | Tasks, dependencies, supervision and control grant | Producer completion → review/integration → acceptance → consumer eligible. Lead Stop preserves run; confirmed Cancel wins over later completion/wake. |
| Handoff integration | Lead baseline, worker bytes, accepted bytes | Read baseline before dispatch; lead edit before integration blocks overwrite. Retain worker copy on conflict/cancel. |
| Composer | Text, attachment and pending submit | Resume succeeds before send; repeated actions during pending cannot submit twice. Failed pre-acceptance send restores owned input. |
| App persistence | Run identity, worktrees and mode | Record IDs before restart; compare after restart rather than inferring recovery from a similar title. |

Out-of-order observations: stop near completion must not cancel the worker; a result arriving while the lead is busy must not interrupt it or be submitted twice; confirmed cancellation must not be undone by a late result. Attempt these only if naturally observable; deterministic tests cover precise races. Do not label unobserved race cases as verified by this live run.

## Evidence and report

- Create `<TEST_ROOT>/evidence/report.md` with app/source provenance, timestamp, confirmed root, models/providers/effort, run/task IDs, case results, screenshots and short sanitized errors.
- Record Pass / Fail / Blocked / Not tested per T1–T9. Include what was observed, whether computer use or Nakul performed the action, and why any case was skipped.
- Screenshots should show labels/status/diff relevant to the assertion. Avoid account details, secrets, control tokens and unrelated conversations. Do not dump environment variables or whole app databases.
- Read-only filesystem and Git/hash checks may corroborate UI observations. They cannot replace the desktop actions under test. Report inaccessible internal details as unavailable.
- Record all retained test worktrees and their files; finish/cancel only the test runs when safe, keep artifacts and evidence for review. Do not delete retained worktrees containing changes.
- Report the Antigravity planning error separately if reproduced, preserving sanitized visible stack/error detail. Ask before adding diagnostic code.

## Readiness decision

This document is a test plan, not a passing test report. No UI case has been executed by the author.
Even passing desktop cases do not resolve the existing full-suite/lint gaps. Before installer readiness, obtain current automated gate results and review failures separately. Dev-app testing precedes an installer build; installed-build verification is a later follow-up. Source commit/push requires Nakul's explicit approval.

## Skills for the external tester

- `computer-use`: load the complete skill and its guidance/API/confirmation references before controlling native apps. Use its documented tool runtime; do not create a custom automation helper.
- `testing`: report meaningful pass/fail evidence and keep skipped/inaccessible cases honest.
- Do not use `spec-implement` to implement this procedure: no application code change is requested.

## Decisions and open questions

- User-specified display models are preserved exactly; their current availability is not established by this source checkout.
- Nakul may select all three models and then let computer use continue testing.
- Confirmed by report: test root and seed commit `0f38049d0e2915f7f14f6524d2202c511c213b4e`; Muse Spark 1.3 Free was selected through OpenCode. The actual worker 1 label was Space Bunny Free, not the original requested Super Bunny; preserve this difference in future evidence and confirm the desired label before rerun.
- A safe live pause/failure may be unavailable. Those recovery cases remain explicitly untested until user-assisted or safely reproducible.
- The user's status vocabulary and status-prefixed headings/index layout override the spec-writing skill's different `In progress` and index-only status conventions. Execution is now Blocked pending control-path investigation, app provenance and safe run-level cancellation.
- Updating the index and changelog is required by the user's documentation rules; this overrides the skill's blanket spec-only file limitation. No application code is changed.

## Handoff prompt

Read this spec and the repository working agreement. You are a separate Codex desktop-testing session outside MonoCode. Load the listed skills. First resolve the blocking setup questions, verify native desktop access and confirm the current development app. Execute only the scoped tests inside the confirmed temporary root and its nested project/worker paths. Let Nakul select models when needed. Do not implement fixes, build an installer, commit source or push. Save evidence and report each case as Pass, Fail, Blocked or Not tested, with the remaining build-readiness gates.

## Handoff retro

### 2026-09-30 — External desktop attempt reviewed

- Report: `E:\Developing\Temptesting\evidence\report.md`, recorded 08:24 IST. Retain this original evidence unchanged.
- Result: T1 failed in the observed app; remaining cases are blocked or untested. This is not a verified regression against the current working tree because native/frontend provenance was not established.
- Producer task: `a0475894-8f1c-4a91-ad99-2686a183f3a8`. Consumer: `13876f9d-0051-43d1-86dc-de283782db26`. Producer wrote ignored markers; consumer never started; the lead's control command reported missing control environment. Project-side integration was not independently established. Later T2 fixture creation cannot prove T1 integration.
- The lead made out-of-test-root reads. Prompt instructions did not enforce that boundary. Stop at the first unexpected read; do not label prompt compliance as a sandbox guarantee.
- Source investigation: `antigravityRuntimeHost.ts:16` uses one shared runtime session ID and line 196 spawns that runtime. `antigravity.ts:432`/`:439` passes cwd and empty mcpServers to session load/new. `src-tauri/src/control.rs:390` configures child control environment only when the spawned session ID has a grant. This is a strong explanation for missing lead control credentials in shared-runtime shell execution; targeted reproduction is still needed before implementing a fix. Do not inject a lead token into a process shared by unrelated sessions.
- `orchestration.ts:998` blocks independent work while another run remains active; `finish` at line 1605 performs the actual lifecycle transition; `stopRun` at line 2176 cancels the run. Cancelling the consumer or writing a final summary does not itself finish the run. The warning is not proof of a corrupt/stale database lock.
- The original handoff did not explicitly stop the tester when provenance was inconclusive or T1 lost control. Added those gates to prevent a prolonged blocked attempt.
- Safe next UI action belongs to Nakul/external desktop tester: open the original lead session, use the run-level Cancel orchestration confirmation (not Stop lead response or the worker Cancel), then verify the checkout warning clears and retained worker files remain. If the control is unavailable or cancellation fails, capture the screen and stop for diagnosis. Do not clear app storage, delete sessions, alter the database, or delete worktrees to bypass the warning.
- A fresh dev build and a minimal lead-control connectivity check must precede another two-worker handoff attempt. If connectivity fails, skip T2–T9 and return the blocker immediately. Existing untested cases remain untested.
