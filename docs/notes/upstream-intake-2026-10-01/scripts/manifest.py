"""Three-way simulations write objects ONLY in the approved external scratch clone."""
import csv,json,re,subprocess
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parents[1]
SCRATCH=Path(r'E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849')
BASE='3344bea70341d8ea4d6dea414aa15c13683372e9'
LOCAL='c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6'
UP='43aac9d216c323a7e04c9037eb0b251dd840cc7a'
def git(*args,repo=ROOT): return subprocess.check_output(['git','-C',str(repo),*args],text=True,encoding='utf-8')
assert git('rev-parse','HEAD').strip()==LOCAL and git('rev-parse','origin/main').strip()==UP
assert not git('status','--porcelain').strip()
assert git('rev-parse','upstream-main','origin/nakul/windows-support',repo=SCRATCH).splitlines()==[UP,LOCAL]
def actions(a,b):
    rows=[]
    for line in git('diff','--name-status','-M',a,b).splitlines():
        fields=line.split('\t'); action=fields[0]; old=fields[1]; path=fields[-1]
        rows.append(dict(path=path,old=old if len(fields)==3 else None,action=action))
    return rows
inventory=json.loads(OUT.joinpath('scripts/inventory.json').read_text(encoding='utf-8'))
preservation=json.loads(OUT.joinpath('scripts/preservation.json').read_text(encoding='utf-8'))
up=actions(BASE,UP); local=actions(BASE,LOCAL); local_map={r['path']:r for r in local}
for r in local:
    if r['old']:local_map[r['old']]=r
local_tree=set(git('ls-tree','-r','--name-only',LOCAL).splitlines())
def simulate(target):
    process=subprocess.run(['git','-C',str(SCRATCH),'merge-tree','--write-tree',LOCAL,target],capture_output=True,text=True,encoding='utf-8')
    assert process.returncode in (0,1),(target,process.stderr)
    lines=process.stdout.splitlines(); tree=lines[0]; stages={}; messages=[]
    for line in lines[1:]:
        match=re.match(r'([0-7]+) ([0-9a-f]{40}) ([123])\t(.*)',line)
        if match:
            mode,oid,stage,path=match.groups();stages.setdefault(path,{})[stage]=dict(mode=mode,oid=oid)
        elif line.startswith('CONFLICT '):messages.append(line)
    kinds={}
    for path,entries in stages.items():
        matched=[m for m in messages if path in m]
        kinds[path]='; '.join(sorted(set(re.search(r'CONFLICT \(([^)]+)\)',m).group(1) for m in matched))) or ('add/add' if set(entries)=={'2','3'} else 'modify/delete' if set(entries) in ({'1','2'},{'1','3'}) else 'content')
    return dict(target=target,tree=tree,returncode=process.returncode,stages=stages,kinds=kinds,messages=messages)
full=simulate(UP)
tag_sims=[simulate(tag) for tag in inventory['tags'][1:-1]]
ranges={}
for a,b in zip(inventory['tags'],inventory['tags'][1:]):
    for r in actions(a,b):
        for p in [r['path'],r['old']]:
            if p:ranges.setdefault(p,[]).append('post-v0.6.0' if b==UP else b)
rows=[]
for r in up:
    path=r['path']; action=r['action']; loc=local_map.get(path); kind=full['kinds'].get(path,'')
    if path in full['stages']:group='X'
    elif action[0] in 'DRCTUX' or (loc and loc['action'][0] in 'DRCTUX'):group='S'
    elif action=='A' and path not in local_tree:group='N'
    elif loc:group='B'
    elif action=='M':group='E'
    else:group='S'
    u_ids=[i['id'] for i in inventory['items'] if path in i['paths'] or (r['old'] and r['old'] in i['paths'])]
    l_ids=[i['id'] for i in preservation if path in i['owners'] or (r['old'] and r['old'] in i['owners'])]
    rows.append(dict(path=path,group=group,conflict_kind=kind,upstream_action=action+(f" {r['old']} -> {path}" if r['old'] else ''),upstream_ranges=','.join(dict.fromkeys(ranges.get(path,[]))),local_action=(loc['action']+(f" {loc['old']} -> {loc['path']}" if loc['old'] else '') if loc else '—'),u_ids=','.join(u_ids),l_ids=','.join(l_ids)))
assert len(rows)==len(up)==len({r['path'] for r in rows})
assert {r['path'] for r in rows if r['group']=='X'}==set(full['stages']), 'Simulation conflict includes path outside manifest; handle explicitly'
with OUT.joinpath('03-files.tsv').open('w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter='\t');writer.writeheader();writer.writerows(rows)
OUT.joinpath('scripts/manifest.json').write_text(json.dumps(dict(rows=rows,upstream=up,local=local,full=full,tags=tag_sims),indent=2),encoding='utf-8')
groups=Counter(r['group'] for r in rows);acts=Counter(r['action'][0] for r in up);areas=Counter(r['path'].split('/')[0] for r in rows)
md=['# Stage 3 — Complete changed-file classification','','Verified: `git diff --name-status -M 3344bea 43aac9d` and same local range; scratch `git merge-tree --write-tree c2c8bf6 <target>` (one full target, then each tag). Main checkout objects/index/working files were not used for simulations. Script: `scripts/manifest.py`.','','## Counts and reconciliation','',f'Upstream action totals: {dict(acts)}; **{len(up)}** exact destination-path records. Renames, if present, preserve the old path in the action column.',f'Groups: {dict(groups)}; '+' + '.join(f'{groups[g]} {g}' for g in 'NEBXS')+f' = **{len(rows)}**.',f"X = {groups['X']} = {len(full['stages'])} simulation unmerged paths, with exact set equality asserted. No overlap is treated as a conflict unless simulation reports it.",'', '| Top-level area | Paths |','|---|---:|']
md += [f'| {a} | {n} |' for a,n in sorted(areas.items())]
md += ['','## Conflict arrival by tag','','| Our pinned HEAD versus target | Unmerged paths |','|---|---:|']
md += [f"| {s['target']} | {len(s['stages'])} |" for s in tag_sims]
md += [f'| pinned post-tag {UP[:7]} | {len(full["stages"])} |','','Verified these compare the **same local HEAD** independently to each tag. Inferred: they indicate where conflict load first appears. They do not measure conflicts in sequential rounds after earlier resolutions; counts cannot be summed to predict repair effort.','','## Full X list','','| Path | Kind | U IDs | L IDs |','|---|---|---|---|']
md += [f"| `{r['path']}` | {r['conflict_kind']} | {r['u_ids']} | {r['l_ids']} |" for r in rows if r['group']=='X']
md += ['','## Full B list','','Textual clean merges remain subject to stage 4 behavior review.','','| Path | U IDs | L IDs |','|---|---|---|']
md += [f"| `{r['path']}` | {r['u_ids']} | {r['l_ids']} |" for r in rows if r['group']=='B']
md += ['','## S list and explanations','']
md += [f"- Verified `{r['path']}`: upstream {r['upstream_action']}; local {r['local_action']}. Special action does not fit plain addition/edit; inspect placement/removal before implementation." for r in rows if r['group']=='S']
if not groups['S']:md+=['Verified: none. Actual modify/delete or rename conflicts live in X, which takes precedence over S.']
md += ['','## Local deletions, renames and moves','','Verified from local `git diff --name-status -M 3344bea c2c8bf6`; no parked-tree inspection.','','| Action | Old path | New path (if rename) |','|---|---|---|']
md += [f"| {r['action']} | `{r['old'] or r['path']}` | `{r['path'] if r['old'] else '—'}` |" for r in local if r['action'][0] in 'DR']
OUT.joinpath('03-files.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps(dict(paths=len(rows),actions=dict(acts),groups=dict(groups),tags=[(s['target'],len(s['stages'])) for s in tag_sims],conflicts=list(full['stages']))))
