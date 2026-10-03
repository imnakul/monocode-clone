"""Release-round plan; independent baseline conflict measurements are not forecasts."""
import json, subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]; ROOT=Path(__file__).resolve().parents[4]
inv=json.loads((OUT/'scripts/inventory.json').read_text(encoding='utf-8'))
m=json.loads((OUT/'scripts/manifest.json').read_text(encoding='utf-8'))
a=json.loads((OUT/'scripts/analysis.json').read_text(encoding='utf-8'))
d=json.loads((OUT/'scripts/decisions.json').read_text(encoding='utf-8'))
LOCAL='c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6';BASE='3344bea70341d8ea4d6dea414aa15c13683372e9';UP='43aac9d216c323a7e04c9037eb0b251dd840cc7a'
ends=[('v0.1.56',['v0.1.56'],['R-01','R-05','R-07','R-13','R-14'],'L'),('v0.2.0',['v0.2.0'],['R-01','R-09','R-13','R-14','R-15'],'L'),('v0.3.0',['v0.3.0'],['R-03','R-04','R-12','R-13'],'L'),('v0.4.3',['v0.4.0','v0.4.1','v0.4.2','v0.4.3'],['R-10','R-12','R-13','R-14'],'L'),('v0.5.0',['v0.5.0'],['R-02','R-08','R-11','R-12','R-14','R-15'],'L'),('v0.6.0',['v0.6.0'],['R-04','R-06','R-07','R-12','R-13'],'L'),(UP,['post-v0.6.0'],['R-12'],'M')]
notes=[
('Drawer/Haze/editor/provider-default/preview/CI repair, macOS Quick composer; source-level streamed-input and confirmation fixes.','Drawer keeps local menu/hover; editor format/preview preserve dirty CRLF saves; Cline appears; wallpaper retains five effects; scoped forms, branches and Stop/Queue remain usable.'),
('BTW, opt-in Operator, account information, usage-limit resumes; provider maintenance.','Sidechat vs BTW labels; no helper tool access; held queue survives reset/restart; Plan never replays stored grants.'),
('Custom keys, configured CLI binaries, JSONC, bulk tab lifecycle; CRLF preservation and provider fixes.','Migrated custom binary still launches ACP/Cline; JSONC and formatted CRLF saves round-trip; shortcut conflicts are clear; bulk deletion clears queues and terminals.'),
('Multiple folders, native clipboard, adjacent panes, Pi usage, generated images, path copy, celebrations and performance work; include the v0.4.3 Windows regression patch and v0.4.1/v0.4.2 fixes together.','Paste image/file attachments and queue them; branches retain generated images after sibling deletion; native clipboard/reveal have no consoles; copy Windows paths; navigation/drawer performance; Windows window startup; celebrations respect reduced motion and never consume human turn ownership.'),
('Remote SSH/host, Help links, cancel commit messages and account readiness refinements.','Separate desktop session: connect/reconnect local-to-remote; unsupported provider/scopes/forms shown honestly; cancel helpers without overwriting edits; no extra consoles or credential exposure.'),
('Copy session IDs, remaining quota default, Autosave, executable updates, MCP management, Linux glass, slash modes and later account/usage refinements.','Old quota setting policy; Autosave off until enabled and CRLF preserved; MCP forms remain local typed forms; ACP startup remains lazy; updates disabled unless separately approved; Windows wallpaper/glass/hover unchanged.'),
('Optional nine post-tag commits, including Codex effort animation, Linux ARM artifacts, lazy restore and diff fixes.','Windows restored panes/diff navigation, Composer overflow and effort selection; Linux artifacts checked by separate appropriate platform reviewer.')]
plans=[];prev=BASE
for idx,(target,releases,risks,size) in enumerate(ends,1):
    sh=subprocess.check_output(['git','-C',str(ROOT),'rev-parse',target+'^{commit}'],text=True).strip()
    cs=[x for x in inv['commits'] if x['release'] in releases]
    paths=set(p for x in cs for p in x['paths'])
    cids=[x['id'] for x in a['conflicts'] if set(x['paths'])&paths]
    measurement=next((len(x['stages']) for x in m['tags'] if x['target']==target),len(m['full']['stages']))
    decisions=[x['id'] for x in d if str(idx) in x['rounds'].split(',')]
    plans.append(dict(round=idx,target=target,sha=sh,previous=prev,releases=releases,commits=len(cs),u_ids=sorted({x['u_id'] for x in cs}),c_ids=cids,r_ids=risks,d_ids=decisions,size=size,baseline_x=measurement,contents=notes[idx-1][0],manual=notes[idx-1][1]))
    prev=sh
(OUT/'scripts/rounds.json').write_text(json.dumps(plans,indent=2),encoding='utf-8')
lines=['# Stage 6 — Strategy and round plan','',
'Verified measurements come from [stage 3](03-files.md); source/decision seams from stages 4–5. Every implementation choice below is **Inferred**, pending Nakul and reviewer approval. No implementation is authorized by this analysis.','',
'## Strategy comparison','',
'| Strategy | Conflict / repair load | Gates and unwanted features | Future intake and abandoning a failed step | Disk |',
'|---|---|---|---|---|',
'| Tag rounds (recommended) | Verified independent X counts: 23,45,60,68,68,68,68,74,76; optional main 80. Sequential load is Not checked: an accepted earlier weave changes later conflicts. More repeated seam work, smaller release attribution. | Six stable rounds, each full web/Rust/build gates plus manual follow-up; host adds its gates in round 5. Keep disabled features coherent across later merges. | Each accepted tag becomes an ancestor, simplifying next intake. Before committing a failed merge, stop and let owner authorize `git merge --abort`; committed rounds need an owner-approved revert/recovery plan, never reset/stash automatically. | Reuse main dependencies/target; retained analysis scratch is small. No extra worktree. |',
'| One merge to v0.6.0 / pinned main | Verified 76 / 80 X paths; 527 final-target changed paths. Every interdependent subsystem lands at once; fewer repeated resolutions but largest diagnostic surface. | One gate cycle may still have many repair cycles. Disabled/deferred features must still compile and preserve dependencies. | Upstream ancestry clean after acceptance. Failed uncommitted merge can be aborted with approval; largest rollback and review unit. | Same main checkout footprint; build capacity still must be verified. |',
'| Selected cherry-picks / ports | Not checked conflict count: final path manifest cannot predict per-commit cherry-pick conflicts. Each dependency chain needs a new simulation/review, potentially much more work for provider/editor changes. | Excludes unwanted subsystems more precisely; tests/build for each logical batch, selected ports still need upstream fixes. | Cherry-picks do not establish the original tag ancestry; later sync can repeat patches/conflicts. Ported fixes need a source ledger. Abort cherry-pick only with owner authorization; never discard unrelated WIP. | Main reuse possible; extra review scratch simulations cheap, extra build worktrees costly. |','',
'Recommend six stable release rounds, grouping v0.4.0–v0.4.3 to include its Windows fix rather than stopping on the earlier release. **Inferred:** this gives the best chance to diagnose regressions against named releases while retaining normal upstream ancestry. It is not the cheapest approach: large local files recur, and all gates repeat. Choose selected ports instead if Nakul rejects a major integrated subsystem such as remote; choose one merge only if reviewer closes full contract gaps and Nakul accepts the whole product scope.','',
'## Round plan','',
'C lists below include final-target conflict groups whose paths are touched by that round; some of those paths may merge cleanly at that particular tag. Only the stage-3 per-tag list proves actual round-1 conflicts; the worker/reviewer must remeasure every subsequent round from its accepted starting commit. R lists are source-risk checkpoints, not claims that every risk already exists at that tag.','']
for p in plans:
    n=p['round']; lines += [f"### Round {n} — {'optional post-tag main' if n==7 else p['target']}",
    f"- Verified target `{p['sha']}`; range after `{p['previous']}`; {p['commits']} commits. Contents: {p['contents']}",
    '- U IDs: '+', '.join(p['u_ids'])+'.',
    '- Related C IDs: '+', '.join(p['c_ids'])+'.',
    '- R checkpoints: '+', '.join(p['r_ids'])+'; decisions before start: '+', '.join(p['d_ids'])+'.',
    f"- Independent pinned-local simulation: {p['baseline_x']} X paths. Proposed effort {p['size']} (Inferred): "+('broad provider/workspace/Windows contract repair, not just version strings.' if p['size']=='L' else 'contained release group, but still full regression gates.'),
    '- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.',
    '- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. '+('Also `npm run host:build` and `npm run test:host` for host code; inspect their scripts before running.' if n==5 else ''),
    f"- Local label: proposed `{p['target'].lstrip('v') if n!=7 else '0.6.0'}-local1-intake-r{n}`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul\'s dev checks pass and a separate build authorization.",
    '- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): '+p['manual'],
    f"- Records proposed for later authorized work: `docs/specs/upstream-intake-round-{n}.md`; `docs/notes/upstream-intake-round-{n}-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.",'']
lines+=['## Where the work happens','',
'Recommend one worker directly in `E:\\Developing\\OpenSource\\mono-clone` on `nakul/windows-support`, matching the trial\'s standing handoff preference. The 23 round-1 conflicts justify careful reviewer-approved instructions, but do not alone justify another Rust build tree. Trade-off: this blocks the shared checkout during repair; if another session needs it or Nakul requests isolation, stop and agree an alternative before changing location. Do not touch parked worktrees or the three stashes.','',
'Verified stage-0 free bytes: C 7,610,978,304; E 19,266,637,824. Working agreement estimates ~400 MB dependencies and 3–14 GB Rust target per additional worktree; actual upcoming requirements are Not checked. Reuse existing caches, remeasure all relevant drives before checks, and stop on insufficient capacity. Do not delete or relocate anything as a workaround. Retain the analysis scratch clone for review; measure its final size in stage 8.','',
'## Who does what','',
'- Nakul: feature/behavior decisions, merges and version labels, dependency/CI/capability/auth/stored-data approvals, manual dev acceptance, later installer and commit/push permissions.',
'- Reviewer: recompute conflict manifests at each actual start; validate full remote/MCP/native contracts and dependency provenance; audit preservation source/test coverage; approve file instructions and judge gate failures.',
'- Worker: only after authorization and D answers, perform the specified merge/weaves, repair source contracts, add meaningful regression tests and run gates; record exact evidence. Stop on unknown conflicts, unclear product semantics, storage blockers or failures outside approved scope. No independent product choices or native UI inspection.','',
'## Decisions that block rounds','',
'| Open decision | Blocks rounds | Assumption pending owner (changes on other answer) |','|---|---|---|']
for x in d:
    lines.append(f"| {x['id']} | {x['rounds']} | **Assumed pending Nakul: {x['id']} = {x['reason']}** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |")
lines+=['','## Risks to the plan','',
'Not checked: sequential conflicts, build duration/storage peak, desktop behavior, complete native/host contracts and package provenance. The seven blocks are a review structure, not an estimated calendar promise. Stage 1\'s incomplete generic test anchors and stage 4\'s exact Not analysed paths must be closed before the affected round. If round 1 preserves fewer behaviors than its table anticipates, stop and revise later instructions; do not push failures forward.','']
(OUT/'06-strategy-and-rounds.md').write_text('\n'.join(lines),encoding='utf-8')
print([(p['round'],p['commits'],p['baseline_x']) for p in plans])
