"""Read scratch simulation blobs and pinned side diffs; save redacted hunk evidence."""
import json,re,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
ROOT=Path(__file__).resolve().parents[4]
SCRATCH=Path(r'E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849')
manifest=json.loads(OUT.joinpath('scripts/manifest.json').read_text(encoding='utf-8'))
def git(repo,*args):return subprocess.check_output(['git','-C',str(repo),*args],text=True,encoding='utf-8')
def redact(text):
    return re.sub(r'[^\s\"\'<>]+@[^\s\"\'<>]+\.[^\s\"\'<>]+','[redacted identity]',text)
records=[]
for row in manifest['rows']:
    if row['group']!='X':continue
    path=row['path']
    text=git(SCRATCH,'show',f"{manifest['full']['tree']}:{path}")
    hunks=[]
    for match in re.finditer(r'(?m)^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>[^\n]*$',text):
        hunks.append(dict(line=text[:match.start()].count('\n')+1,ours=redact(match.group(1)),theirs=redact(match.group(2))))
    ours=git(ROOT,'diff','--unified=1','3344bea','c2c8bf6','--',path)
    theirs=git(ROOT,'diff','--unified=1','3344bea','43aac9d','--',path)
    records.append(dict(**row,hunks=hunks,ours_diff_lines=len(ours.splitlines()),upstream_diff_lines=len(theirs.splitlines()),ours_diff=redact(ours),upstream_diff=redact(theirs)))
OUT.joinpath('scripts/conflict-evidence.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
md=[]
for r in records:
    md += [f"## {r['path']} — {r['conflict_kind']}; {len(r['hunks'])} hunks; side diffs {r['ours_diff_lines']}/{r['upstream_diff_lines']} lines"]
    for h in r['hunks']:
        md += [f"Hunk @{h['line']} ({len(h['ours'].splitlines())}/{len(h['theirs'].splitlines())} side lines)"]
        for label,side in [('ours',h['ours']),('upstream',h['theirs'])]:
            lines=side.splitlines();keep=lines if len(lines)<=8 else lines[:4]+['[middle retained in evidence JSON]']+lines[-3:]
            md += [label+':',*keep]
OUT.joinpath('scripts/hunk-review.md').write_text('\n'.join(md),encoding='utf-8')
print(json.dumps({'paths':len(records),'hunks':sum(len(r['hunks']) for r in records),'lines':len(md),'largest':[(r['path'],len(r['hunks']),r['ours_diff_lines'],r['upstream_diff_lines']) for r in records if len(r['hunks'])>5]}))
