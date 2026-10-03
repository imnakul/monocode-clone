"""Evidence-only self-review: Git reads in main; one re-simulation in retained scratch."""
import csv,json,re,subprocess
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parents[1];ROOT=Path(__file__).resolve().parents[4]
SCRATCH=Path(r'E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849')
LOCAL='c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6';UP='43aac9d216c323a7e04c9037eb0b251dd840cc7a';BASE='3344bea70341d8ea4d6dea414aa15c13683372e9'
def git(*args,repo=ROOT):return subprocess.check_output(['git','-C',str(repo),*args],text=True,encoding='utf-8').strip()
def redact(s):return re.sub(r'[^\s\"\'<>]+@[^\s\"\'<>]+\.[^\s\"\'<>]+','[redacted identity]',s)
def read(n):return json.loads((OUT/'scripts'/n).read_text(encoding='utf-8'))
m=read('manifest.json');inv=read('inventory.json');a=read('analysis.json');d=read('decisions.json');p=read('preservation.json');rounds=read('rounds.json')
assert git('rev-parse','HEAD')==LOCAL and git('rev-parse','origin/main')==UP and not git('status','--porcelain')
assert git('rev-parse','upstream-main','origin/nakul/windows-support',repo=SCRATCH).splitlines()==[UP,LOCAL]
corrections=[]
# Normalize absent actions to ASCII; PowerShell's console displayed the valid em dash as a replacement glyph.
changed=0
local_paths={x['path'] for x in m['local']}|{x['old'] for x in m['local'] if x['old']}
for row in m['rows']:
    if row['path'] not in local_paths and row['local_action']!='-':row['local_action']='-';changed+=1
if changed:
    (OUT/'scripts/manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
    with (OUT/'03-files.tsv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(m['rows'][0]),delimiter='\t');w.writeheader();w.writerows(m['rows'])
    corrections.append(f'Normalized {changed} absent-local-action em dashes in manifest JSON/TSV to ASCII -; original UTF-8 data was valid, console glyph was misleading. No classifications changed.')
# Generic test anchors falsely suggested grant/live-control protection; replace with actual relevant tests.
for lid,lineno,name in [('L-21',1279,'does not reuse a stored MCP grant during a Plan turn'),('L-22',296,'waits for the matching model response before sending the next user message')]:
    item=next(x for x in p if x['id']==lid);old=item['test'];old_excerpt=item['test_excerpt']
    path=old.split(':')[0];source=git('show',LOCAL+':'+path).splitlines();assert name in source[lineno-1]
    item['test']=path+':'+str(lineno);item['test_excerpt']=source[lineno-1].strip()
    doc=OUT/'01-local-preservation-list.md';s=doc.read_text(encoding='utf-8').replace(old,item['test']).replace(old_excerpt,item['test_excerpt']);doc.write_text(s,encoding='utf-8')
    corrections.append(lid+' test anchor corrected from unrelated fork test to '+item['test'])
(OUT/'scripts/preservation.json').write_text(json.dumps(p,indent=2),encoding='utf-8')
# C-19 cancellation is a helper decision, not the unrelated notice decision.
doc=OUT/'04-conflicts-and-risks.md';s=doc.read_text(encoding='utf-8').replace('D-02/D-07 parameters','D-07 parameter');doc.write_text(s,encoding='utf-8')
next(x for x in a['conflicts'] if x['id']=='C-19')['resolution']=next(x for x in a['conflicts'] if x['id']=='C-19')['resolution'].replace('D-02/D-07 parameters','D-07 parameter')
(OUT/'scripts/analysis.json').write_text(json.dumps(a,indent=2),encoding='utf-8')
corrections.append('Removed unrelated D-02 update-notice reference from C-19 helper cancellation resolution.')
up_lines=git('diff','--name-status','-M',BASE,UP).splitlines();lo_lines=git('diff','--name-status','-M',BASE,LOCAL).splitlines()
def actionmap(lines):
    out={}
    for line in lines:
        fs=line.split('\t');v=(fs[0],fs[1] if len(fs)==3 else None,fs[-1]);out[fs[-1]]=v
        if len(fs)==3:out[fs[1]]=v
    return out
um=actionmap(up_lines);lm=actionmap(lo_lines)
tree=set(git('ls-tree','-r','--name-only',LOCAL).splitlines())
proc=subprocess.run(['git','-C',str(SCRATCH),'merge-tree','--write-tree',LOCAL,UP],capture_output=True,text=True,encoding='utf-8');assert proc.returncode==1
fresh_tree=proc.stdout.splitlines()[0];fresh={};messages=[]
for line in proc.stdout.splitlines()[1:]:
    match=re.match(r'([0-7]+) ([0-9a-f]{40}) ([123])\t(.*)',line)
    if match:fresh.setdefault(match.group(4),{})[match.group(3)]=match.group(2)
    elif line.startswith('CONFLICT '):messages.append(line)
assert fresh_tree==m['full']['tree'] and set(fresh)==set(m['full']['stages'])
samples=[];sample_indices=[(k*(len(m['rows'])-1))//19 for k in range(20)]
for idx,row in enumerate(m['rows']):
    path=row['path'];u=um[path];l=lm.get(path)
    group='X' if path in fresh else 'S' if u[0][0] in 'DRCTUX' or (l and l[0][0] in 'DRCTUX') else 'N' if u[0]=='A' and path not in tree else 'B' if l else 'E' if u[0]=='M' else 'S'
    ua=u[0]+(f' {u[1]} -> {u[2]}' if u[1] else '');la=l[0]+(f' {l[1]} -> {l[2]}' if l[1] else '') if l else '-'
    assert row['group']==group and row['upstream_action']==ua and row['local_action']==la,(idx,row)
    if idx in sample_indices:
        kind='; '.join(sorted({re.search(r'CONFLICT \(([^)]+)\)',msg).group(1) for msg in messages if path in msg})) if path in fresh else ''
        assert row['conflict_kind']==kind
        # Independent range membership and ID association recomputation for sampled rows.
        ranges=[]
        for before,after in zip(inv['tags'],inv['tags'][1:]):
            paths=set(actionmap(git('diff','--name-status','-M',before,after).splitlines()))
            if path in paths:ranges.append('post-v0.6.0' if after==UP else after)
        assert row['upstream_ranges']==','.join(ranges)
        assert row['u_ids']==','.join(x['id'] for x in inv['items'] if path in x['paths'])
        assert row['l_ids']==','.join(x['id'] for x in p if path in x['owners'])
        samples.append(dict(row=idx+1,path=path,group=group,kind=kind,upstream_action=ua,local_action=la,ranges=ranges))
counts=Counter(x['group'] for x in m['rows']);assert counts==dict(N=256,E=144,B=47,X=80)
xpaths={x['path'] for x in m['rows'] if x['group']=='X'};assigned=[path for c in a['conflicts'] for path in c['paths']]
assert Counter(assigned)==Counter(xpaths)
assert len(inv['commits'])==int(git('rev-list','--count',BASE+'..'+UP))==128
assert {c['sha'] for c in inv['commits']}==set(git('rev-list',BASE+'..'+UP).splitlines())
assert sum(x['commits'] for x in rounds)==128
assert all(any(c['id'] in x['c_ids'].split(',') for x in d) for c in a['conflicts'] if c['classification']=='new product question')
assert all(any(rr['id'] in x['r_ids'].split(',') for x in d) for rr in a['risks'])
assert all(any(x['id'] in rr['d_ids'] for rr in rounds) for x in d)
spec=(ROOT/'docs/specs/upstream-intake-round-1.md').read_text(encoding='utf-8')
instructions=re.findall(r'^\| `([^`]+)` \| (?:ours|theirs|both|weave) \|',spec,re.M)
assert Counter(instructions)==Counter(list(m['tags'][0]['stages']))
assert all(l['id'] in spec for l in p)
defined={x['id'] for xs in [p,inv['items'],a['conflicts'],a['risks'],d] for x in xs}
references=set()
for file in list(OUT.glob('0*.md'))+[spec and ROOT/'docs/specs/upstream-intake-round-1.md']:
    references.update(re.findall(r'\b[LUCRD]-\d{2,3}\b',file.read_text(encoding='utf-8')))
assert not references-defined,references-defined
# R source excerpts: exact files and narrow tokens, source facts only (no compiler execution).
H='src/integrations/harness/';S='src/features/settings/model/'
all_paths=git('ls-tree','-r','--name-only',LOCAL).splitlines()
custom=next(x for x in all_paths if x.endswith('/customBinary.ts'))
binary=next(x for x in git('ls-tree','-r','--name-only',UP).splitlines() if x.endswith('/providerBinaryPaths.ts'))
highchecks={
'R-01':[(UP,H+'core/availabilityState.ts',['Record<HarnessId','antigravity: false']), (LOCAL,'src/features/sessions/model/session.ts',['cline'])],
'R-02':[(UP,'host/providers.ts',['providers/antigravity/','antigravity.sendAntigravityTurn'])],
'R-03':[(fresh_tree,'src/features/files/editor/editorDoc.ts',['import','LineEnding'])],
'R-04':[(LOCAL,custom,['monocode.customBinary']), (UP,binary,['monocode.providerBinaryPaths.v1'])],
'R-05':[(LOCAL,H+'providers/codex/codex.ts',['isCodexComputerUseAccessConfirmation']), (UP,H+'providers/codex/codexElicitation.ts',['codexMcpConfirmation'])],
'R-06':[(UP,'src/features/providers/ui/HarnessUpdateNotice.tsx',['probeHarnessAvailability'])],
'R-08':[(UP,'src/features/connections/model/protocol.ts',['REMOTE_PROVIDERS']), (UP,'host/providers.ts',['approve'])],
'R-11':[(UP,'package.json',['host:build','test:host','esbuild']), (UP,'.github/workflows/ci.yml',['host'])],
'R-13':[(UP,H+'core/registry.test.ts',['runTextPrompt']), (LOCAL,'src/features/sessions/ui/ModelPicker.test.ts',['440','442'])],
'R-15':[(UP,H+'providers/claude/claudeText.ts',['permission','maxTurns']), (UP,H+'providers/codex/codexText.ts',['mapCodexNotification']), (UP,H+'providers/opencode/opencodeText.ts',['part'])],
}
evidence=[]
for risk in a['risks']:
    if risk['confidence']!='High':continue
    for commit,path,tokens in highchecks[risk['id']]:
        source=git('show',commit+':'+path,repo=SCRATCH if commit==fresh_tree else ROOT).splitlines()
        for token in tokens:
            matches=[(idx+1,line.strip()) for idx,line in enumerate(source) if token in line]
            assert matches,(risk['id'],path,token)
            evidence.append((risk['id'],commit[:7],path,token,[(n,redact(s)) for n,s in matches[:3]]))
assert 'cline:' not in git('show',UP+':'+H+'core/availabilityState.ts')
assert 'isCodexComputerUseAccessConfirmation' not in git('show',UP+':'+H+'providers/codex/codexElicitation.ts')
remote=git('show',UP+':src/features/connections/model/protocol.ts');assert '"cline"' not in remote.split('REMOTE_PROVIDERS',1)[1].split(']',1)[0]
large=[]
for c in a['conflicts']:
    if c['size']!='L':continue
    hunks=0;lines=0
    for path in c['paths']:
        source=git('show',fresh_tree+':'+path,repo=SCRATCH)
        for match in re.finditer(r'(?m)^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>[^\n]*$',source):
            hunks+=1;lines+=len(match.group(1).splitlines())+len(match.group(2).splitlines())
    assert hunks==c['hunks'] and lines==c['side_lines'] and lines>150
    large.append(dict(id=c['id'],hunks=hunks,lines=lines,paths=c['paths']))
branch=git('branch','--show-current');branches=git('for-each-ref','--format=%(refname:short)','refs/heads').splitlines()
stashes=git('stash','list','--format=%gd').splitlines()
worktree=[Path(x.split(' ',1)[1]).name for x in git('worktree','list','--porcelain').splitlines() if x.startswith('worktree ')]
expectedbranches=['codex/antigravity-acp','feat/windows-token-usage-and-context','feature/antigravity-acp','feature/cline-provider','feature/compact-rail-hover','feature/hari-orchestrator','feature/mcp-hub','feature/queue-durability-local5','feature/remote-chat','feature/scheduled-tasks','feature/session-migration','feature/tasks-foundation','feature/wallpaper-halftone','fix/titles-and-token-usage','main','nakul/windows-support','temp-backup-context']
assert branch=='nakul/windows-support' and branches==expectedbranches and stashes==['stash@{0}','stash@{1}','stash@{2}'] and worktree==['mono-clone','mono-clone-hari','mono-clone-remote']
remote_sha=git('ls-remote','origin','refs/heads/main').split()[0]
scratch_bytes=sum(x.stat().st_size for x in SCRATCH.rglob('*') if x.is_file())
assert not git('status','--porcelain')
result=dict(counts=dict(counts),samples=samples,large=large,high_risks=sorted(highchecks),corrections=corrections,branch=branch,branches=branches,stashes=stashes,worktrees=worktree,remote=remote_sha,scratch=str(SCRATCH),scratch_bytes=scratch_bytes,ledger=128,instructions=23,references=len(references))
(OUT/'scripts/self-review.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
md=['# Stage 8 — Self-review evidence','',
'Verified by scripts/self-review.py. One fresh full merge-tree only in retained scratch, same tree/path set as stage3; all main Git operations read-only. No app checks executed.','',
'## Cross-checks','',
'527 paths reconcile:256 N+144 E+47 B+80 X. All527 group/action values rechecked against fresh Git diffs/tree; 128 ledger SHAs equal rev-list exactly;80X each belongs to one of27C; all new-product C and all15R map to D; all14D placed in rounds;23round1 instructions equal its X set;all28L in spec; all referenced IDs exist.','',
'## Twenty fixed-interval TSV samples','',
'Data-row indexes exclude header: floor(k×526/19)+1, k=0..19. Rechecked group, conflict kind, both Git actions, release range membership and U/L IDs.','',
'| Row | Exact path | Group / kind | Upstream / local |','|---|---|---|---|']
for x in samples:md.append(f"| {x['row']} | `{x['path']}` | {x['group']} {x['kind']} | {x['upstream_action']} / {x['local_action']} |")
md+=['','## Every size-L conflict re-verified','',
'Fresh merged blobs re-read for each path; every hunk/side-line count recomputed and reconciled. Review of recommendations remains Inferred, not an executed resolution. Exact seams were read in stage4; tag1 full hunks read in stage7. Full contracts still have the stage4 Not analysed limits.','',
'| C | Hunks | Combined side lines | Exact paths |','|---|---:|---:|---|']
for x in large:md.append(f"| {x['id']} | {x['hunks']} | {x['lines']} | "+'; '.join('`'+p+'`' for p in x['paths'])+' |')
md+=['','## Every High R risk re-verified','',
'Narrow source assertions below prove declarations/call sites; failure timing/typecheck/runtime predictions remain Inferred. Also asserted missing Cline map/remote member and absent old Codex helper.','']
for rid,commit,path,token,matches in evidence:
    md.append(f"- Verified {rid}: `{path} @ {commit}`; `{token}` at "+'; '.join(f'{n}: `{s.replace(chr(96),chr(39))}`' for n,s in matches)+'.')
md+=['','## Corrections','']+['- '+s for s in corrections]
md+=['','## Main state and scratch','',f'Verified HEAD/cache unchanged; clean porcelain; branch,17 branch names,3 stash names and3 worktree names equal stage0. Remote main now `{remote_sha}`; '+('no later delta.' if remote_sha==UP else 'moved, analysis remains pinned; new uncached source Not checked.'),f'Scratch `{SCRATCH}`; logical file-byte sum {scratch_bytes} bytes (not allocated disk size); retained.','']
(OUT/'08-self-review-evidence.md').write_text('\n'.join(md),encoding='utf-8')
print(json.dumps({k:result[k] for k in ['counts','corrections','remote','scratch_bytes','references']}))
