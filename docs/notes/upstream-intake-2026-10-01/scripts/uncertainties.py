import json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1];ROOT=Path(__file__).resolve().parents[4]
def read(n):return json.loads((OUT/'scripts'/n).read_text(encoding='utf-8'))
i=read('inventory.json');a=read('analysis.json');d=read('decisions.json')
md=['# Stage 8 — Decision-relevant uncertainty register','',
'This lists the decision-relevant Inferred / Not checked statements in stages2,4,5, including repeated caveats grouped by the IDs to which they apply. Verified source declarations and Git counts remain distinct from these predictions. No uncertainty is silently treated as an owner decision.','',
'## Stage 2: all feature applicability and dependency expectations','',
'| ID | Inferred / Not checked statement | Decision affected |','|---|---|---|']
for x in i['items']:
    if x['kind']!='feature':continue
    md.append(f"| {x['id']} | Applicability: {x['windows']}. Dependency checklist: {x['depends']}; full integration/old-data/platform behavior Not checked. | D-13 release/feature scope; specific D links in stage5 |")
md+=['',
'All 69 maintenance rows U-034–U-102 have runtime Not checked. Their commit identities/declaration changes were inspected; correctness/performance across Windows/macOS/Linux, packaging and CI is not established by eight declaration samples or a title. This affects D-05/D-13/D-14 and the release gate cost.','',
'New dependencies/capabilities/commands/settings supplement: actual manifest/registration deltas Verified; registry provenance, complete platform compatibility, stored-record round-trips, new MCP/remote/auth/update security and exact version-specific CLI configuration behavior Not checked. These affect D-03/D-04/D-05/D-12. The post-tag nine commits have source/ledger evidence only, and the later single live delta has title/compare evidence only (D-14).','',
'## Stage 4: every proposed conflict resolution','',
'Every proposed resolution is Inferred from source seams; compilation, tests and runtime are Not checked for all27groups. The following rows preserve each specific proposed handling, rather than suggesting the generic caveat makes any of them proven.','',
'| C | Inferred resolution | Missing verification |','|---|---|---|']
for x in a['conflicts']:
    md.append(f"| {x['id']} | {x['resolution']} | {x['tests']}; executions Not checked; full contracts as Not analysed list |")
md+=['','## Stage 4: every non-conflict risk prediction','',
'| R | Inferred failure timing / handling; source evidence in stage4 | Decision |','|---|---|---|']
for x in a['risks']:
    ds=','.join(y['id'] for y in d if x['id'] in y['r_ids'].split(','))
    md.append(f"| {x['id']} | {x['when']}; proposed {x['handling']} Runtime failure/exposure Not checked. | {ds} |")
md+=['',
'R-07 wallpaper route compatibility is Inferred; R-09 reset/held-queue interaction requires combined tests; R-10 cross-branch image ownership is Not checked; R-12 added spawn-path and SQL/bridge combinations are Not checked; R-14 old-data union behavior is Inferred; R-15 a permission broadening is a risk if one runner replaces the other, not a claim that upstream BTW can write.','',
'The 47 B blobs were structurally checked against surviving local source lines. Inferred: these preserved lines keep the L behavior. No full runtime/consumer proof; SharedHoverHighlight/Popover presence alone does not prove stable geometry. All exact full-contract omissions remain in stage4\'s Not analysed section (including long shared-file diffs, host files and new native MCP/remote/updater modules).','',
'## Stage 5: every recommendation and feature-menu choice','',
'| D | Inferred recommendation / owner answer Not checked |','|---|---|']
for x in d:md.append(f"| {x['id']} | {x['action']} — {x['reason']} |")
md+=['',
'All33 feature-menu suggestions (U-001–U-033) are value/scope recommendations, not owner acceptance. Conflict costs are Verified final-target path associations, but effort/sequential conflicts are Inferred and cannot be summed. “Skip” after a tag merge may require coherent feature disabling/removal; cost of doing that is Not checked.','',
'Stage5 What I could not determine: desktop experience; Windows host/update/MCP behavior; full host protocol security; package provenance; override/snapshot migrations; image reference lifetime. Stage1 preservation completeness and several generic test anchors need further source review. No compiler/test/build/native inspection is appropriate in this analysis; the future worker/reviewer must obtain that evidence after authorization.','']
(OUT/'08-uncertainties.md').write_text('\n'.join(md),encoding='utf-8')
print('33 feature expectations,27 C resolutions,15 R predictions,14 D recommendations registered')
