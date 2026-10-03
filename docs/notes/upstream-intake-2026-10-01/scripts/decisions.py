"""Render the owner brief; recommendations are analyst inferences, not approvals."""
import json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
i=json.loads((OUT/'scripts/inventory.json').read_text(encoding='utf-8'))
m=json.loads((OUT/'scripts/manifest.json').read_text(encoding='utf-8'))
# Keep machine-readable descriptions consistent with the stage-2 source correction.
i['items'][1]['windows']='Cross-platform gradient-blur UI; Windows expected, packaged renderer Not checked'
i['items'][1]['depends']='GradientBlurBackground and explicit bypass of worker conversion; wallpaper routing requires separation'
(OUT/'scripts/inventory.json').write_text(json.dumps(i,indent=2),encoding='utf-8')
rows=[
('D-01','Sidechat can make a separate conversation from an answer.','BTW adds a read-only question sheet beside the same answer.','These overlap, but a temporary question is different from a new conversation; U-008, L-26, C-15.','Merge both to keep both functionalities','Keep Sidechat for a durable branch and BTW for read-only questions, with distinct labels.','C-15','R-15','2'),
('D-02','Provider settings show lightweight update notices.','Updates can be installed inside the app, with a second notice system.','Two notices and extra startup probing would confuse users; U-029, L-18, C-17, R-06.','Something else','Defer installation until Windows subprocess safety is audited; use one notice flow and lazy ACP discovery.','C-17','R-06,R-12','6'),
('D-03','Our local sessions support Cline, native branches, approval scopes and forms; remote work is parked.','SSH sessions persist on another machine; not all our local controls are supported there.','Host imports our deleted provider, omits Cline, and has a narrower approval contract; U-023, C-23, R-02/R-08/R-11.','Something else','Split remote into its own round; publish an explicit supported-feature matrix and keep remote ACP/Cline unsupported until approved ports exist.','C-03,C-15,C-23,C-26','R-02,R-08,R-11','5'),
('D-04','Existing custom CLI paths work through our validated discovery.','A different settings screen stores provider paths in a new place.','Without migration old overrides may be ignored; U-013, C-03, R-04.','Merge both to keep both functionalities','Use one canonical validated store, migrate old values once, preserve ACP/Cline, and report invalid paths.','C-03,C-04,C-17','R-04','3'),
('D-05','The current app uses our established dependencies and window permissions.','New clipboard, MCP, host and platform features require extra libraries and permissions.','Registry provenance and full new native contracts were not audited; stage 2 dependency supplement and R-11/R-12.','Something else','Approve packages, capabilities and CI per round after reviewer provenance/security checks; do not authorize all changes from this brief.','C-01,C-02','R-11,R-12','1,3,4,5,6'),
('D-06','Users can choose whether quota shows the percentage left.','Quota shows the percentage left by default.','Two implementations of the same preference; U-027, L-12, C-08, R-13.','Bring and overwrite with new change','Prefer the upstream remaining default, preserving clamp/round behavior; decide how old saved preference is honored or retired.','C-08','R-13','6'),
('D-07','Git helpers use the selected helper model and cannot use tools.','BTW uses read-only tools; generated commit messages gain Cancel.','Sharing a runner could broaden helper access; U-008/U-025, L-19, C-19/C-26, R-15.','Keep local change','Keep tool-free structured helpers as a separate mode; add upstream cancellation without allowing their tool use.','C-19,C-22,C-26','R-15','2,5'),
('D-08','Five Windows wallpaper effects and chat backgrounds work independently.','Haze adds a blurred chat background.','The shared effect list can accidentally offer Haze to the wallpaper renderer; U-002, L-09, R-07.','Merge both to keep both functionalities','Take Haze for chat only; keep the existing five wallpaper effects and their renderer.','C-17','R-07','1'),
('D-09','Native branches copy conversation history.','Copied histories can contain persistent generated images.','Deleting one branch might remove another branch\'s image; U-020, L-25, R-10. Ownership is Not checked.','Something else','Require reference-ownership audit and original/branch deletion regression before enabling copied image history.','C-05,C-13','R-10','4'),
('D-10','Held or paused queued messages wait for the user.','A usage limit can resume waiting messages automatically after reset.','Reset must clear only the usage hold, not an independent user hold; U-011, L-05/L-06, R-09.','Merge both to keep both functionalities','Keep independent hold reasons; enable auto-resume only after combined reset/restart tests.','C-06,C-14','R-09','2'),
('D-11','Cline, CRLF editing and scoped Codex confirmations work locally.','Some files merge cleanly but their combined declarations or imports disagree.','R-01 missing Cline map entry; R-03 duplicate type; R-05 removed helper still used by ours-only resolution.','Something else','Repair these source contracts before any round is accepted; preserve validated forms and non-plan grant boundaries.','C-04,C-09,C-25','R-01,R-03,R-05','1,3'),
('D-12','Old workspaces restore Windows paths, local diff tabs and durable queues.','Preview tabs and remote paths extend saved records and bounded session search.','Legacy-record behavior and new Windows spawns need combined evidence; R-12/R-14.','Merge both to keep both functionalities','Keep legacy defaults, local path repair and SQL queue columns; approve stored-data handling after fixtures pass.','C-05,C-13,C-20','R-12,R-14','1,2,4,5'),
('D-13','The build stays on v0.1.55 plus local features, and parked work remains parked.','A sequence of upstream releases adds drawer, editor, account, Operator and MCP features.','33 feature candidates, with existing menu/hover/queue preservation; stages 2–4. Platform-only Quick composer brings no Windows feature.','Something else','Confirm the feature menu and release scope before each round; keep Operator off until separately approved and exclude parked Hari work.','C-06,C-07,C-16,C-17','','1,2,3,4,5,6'),
('D-14','The installed label is 0.1.55-local5-provider-fixes.','A newer local label identifies each accepted intake round.','Newest stable tag is v0.6.0; pinned main has nine additional commits, including U-033 and U-095–U-102.','Something else','Choose each local version label and separately approve or defer all nine post-tag commits. Default plan stops at v0.6.0.','C-01','','1,2,3,4,5,6,7'),
]
dec=[]
for r in rows:
    keys=['id','today','upstream','tradeoff','action','reason','c_ids','r_ids','rounds']
    dec.append(dict(zip(keys,r)))
(OUT/'scripts/decisions.json').write_text(json.dumps(dec,indent=2),encoding='utf-8')
lines=['# Stage 5 — Decision brief','',
'All suggestions below are **Inferred** from the verified source evidence linked by C/R/U/L ID in [stage 4](04-conflicts-and-risks.md) and [stage 2](02-upstream-features.md). No new product question is decided. “Today” describes pinned local source, not a fresh desktop observation.','',
'## The five things to know first','',
'1. **Verified:** upstream has 128 commits since our integrated v0.1.55, through v0.6.0 plus nine post-tag commits. The ledger includes every commit.',
'2. **Verified:** 527 changed paths include 80 actual Git conflicts. 47 additional paths changed on both sides but merged cleanly; clean does not mean compatible.',
'3. **Verified:** we must preserve local Stop + Queue/Steer, official ACP, Cline, durable queues, Windows process safety, wallpaper, hover and usage accounting. Earlier owner calls remain binding.',
'4. **Inferred:** the largest product choices are BTW versus Sidechat, helper isolation, override migration, remote support and updates. Whole-file ours/theirs choices discard useful behavior.',
'5. **Not checked:** no compiler, test, build or desktop run occurred. Full new remote/MCP/native contract and dependency provenance reviews remain gates for later work.','',
'## Decisions','',
'Each row is open. The last column points to exact paths in stage 4; High means strong evidence for the issue, not proven runtime integration.','',
'| ID | Today in our build | With upstream\'s change | Trade-off and evidence | Suggested action | Paths and confidence |',
'|---|---|---|---|---|---|']
for d in dec:
    lines.append('| '+' | '.join([d['id'],d['today'],d['upstream'],d['tradeoff'],d['action']+' — '+d['reason'],d['c_ids']+'; '+d['r_ids']+'; Medium recommendation / source as stage 4'])+' |')
lines+=['','## Standing calls touched again','',
'Verified historical decisions: `docs/NOTES.md` §0 and `docs/notes/archive/upstream-merge-2026-09-23.md`, with queue/lazy-terminal additions in `upstream-merge-2026-09-24.md`: keep separate Stop with Queue/Steer (L-01); always-visible menu (L-02); official core ACP and deleted old Antigravity provider (L-03); Cline as the eleventh provider (L-04); persistent queues and terminal cleanup (L-05–L-08); Windows wallpaper/menu styling (L-09); hover wash on the stable Popover frame (L-10); local token accounting reaching usage and context (L-11). These are shown for confirmation, not reopened. Source/proof coverage limits are in stage 1.','',
'## Feature menu','',
'Conflict cost is **Verified**: count of final-target X paths touched by the feature\'s commits, from stage 3. Shared paths are counted in multiple rows; costs cannot be added and are not sequential-round forecasts. Suggestions are **Inferred**. Fix/maintenance U-034–U-102 travel with their ledger releases, subject to the same gates and post-tag approval.','',
'| Feature | Suggestion | Reason / decision | X paths |',
'|---|---|---|---|']
specific={
2:('take now','Chat-only Haze; D-08'),7:('skip','macOS-only Quick composer; Windows gains no floating composer, D-05/D-13'),8:('needs decision','Distinct BTW and Sidechat roles; D-01/D-07'),9:('take but keep hidden or off','Operator control needs separate approval; D-13'),11:('needs decision','Independent holds before reset resumes; D-10'),13:('needs decision','One override authority and old values; D-04'),20:('needs decision','Image lifetime across branches; D-09'),23:('take in a later round','Dedicated remote support/protocol review; D-03/D-05'),25:('take in a later round','Preserve selected tool-free helper; D-07'),27:('needs decision','Default and old setting policy; D-06'),29:('take but keep hidden or off','Defer executable updates pending safety and one notice flow; D-02/D-05'),30:('take in a later round','MCP support/configuration and permissions review; D-05/D-13'),31:('take in a later round','Linux-only option; preserve Windows CSS; D-13'),33:('needs decision','Post-tag commit; D-14')}
for x in i['items']:
    if x['kind']!='feature':continue
    num=int(x['id'][2:]);choice,reason=specific.get(num,('take now' if x['release']=='v0.1.56' else 'take in a later round','Part of release scope D-13; preserve linked L behavior'))
    count=sum(r['group']=='X' and r['path'] in x['paths'] for r in m['rows'])
    lines.append(f"| {x['id']} — {x['description']} | {choice} | {reason} | {count} |")
lines+=['',
'In the recommended tag-round strategy, “skip” is a product instruction to disable or remove a complete feature after its ancestry arrives; it does not exclude that commit from the merge. Quick composer should remain macOS-gated and need not be stripped from a cross-platform fork. Rejecting a broad subsystem such as remote may make selected ports preferable; never remove a shared file or one commit without checking its dependents.','',
'## Approvals needed','',
'Verified requirement: working agreement / AGENTS Ask-first rules. Before implementation Nakul must authorize the merge, its feature choices, the local version label and stored-data compatibility plan. New production libraries require exact registry/maintainer/license/download/publish checks; analysis did not perform those checks.','',
'Stage 2 enumerates candidate changes: Rust toml/time/arboard/png and rusqlite hooks; macOS shortcut/NSPanel dependencies; dev esbuild and Node types; native clipboard/MCP/remote/update commands; `core:window:allow-set-theme`; Quick composer Vite entry; host and Fedora scripts/workflows; provider settings and snapshots. Approve the subset present in each target, rather than treating this final-target list as round-1 additions. Remote authentication/SSH, provider configuration writes, executable updates and approval semantics require explicit scope review; payments are not identified in this range (source audit, not an exhaustive security proof). No new SQL migration above 18 was found, but existing queue fields still need preservation.','',
'D-14 separately covers post-tag inclusion and build labels. Desktop dev verification precedes any installer. Commit/push/deployment permissions are separate; this analysis grants none.','',
'## What I could not determine','',
'Not checked: desktop experience, Windows host/update/MCP process behavior, full host protocol security, dependency provenance, runtime migration behavior and image reference lifetime. Inferred: feature menu value, all integration resolutions and sequential effort. Stage 1 has some generic test anchors; stage 4 lists exact unanalysed paths. A reviewer should close those gaps before approving the affected implementation spec.','']
(OUT/'05-decision-brief.md').write_text('\n'.join(lines),encoding='utf-8')
print('14 open decisions; 33 feature menu rows')
