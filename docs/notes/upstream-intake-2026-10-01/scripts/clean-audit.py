"""Structural review aid for clean merges, never a compiler or test runner."""
import json,re,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parents[1];ROOT=Path(__file__).resolve().parents[4]
SCRATCH=Path(r'E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849')
m=json.loads(OUT.joinpath('scripts/manifest.json').read_text(encoding='utf-8'))
def git(repo,*a):return subprocess.check_output(['git','-C',str(repo),*a],encoding='utf-8',text=True)
md=['# Structural clean-merge audit','','Verified full merged blobs read by script; excerpts below are structural evidence, not complete behavioral certification.']
for r in m['rows']:
    if r['group']!='B':continue
    text=git(SCRATCH,'show',m['full']['tree']+':'+r['path']);diff=git(ROOT,'diff','--unified=0','3344bea','c2c8bf6','--',r['path'])
    added=[s[1:] for s in diff.splitlines() if s.startswith('+') and not s.startswith('+++') and re.search(r'\b(export |pub |fn |function |if |invoke|forget|killPty|cfg\(|queued|helper|cline|wallpaper|model:|set[A-Z])',s)]
    kept=[s for s in added if s in text];missing=[s for s in added if s not in text]
    md += [f"## {r['path']} ({r['l_ids'] or 'no mapped L item'})",f"Local structural added lines present: {len(kept)}/{len(added)}; absent/reworded: {len(missing)}."]
    for prefix,lines in [('Present',kept),('Absent/reworded',missing)]:
        for line in lines[:5]:
            if not re.search(r'\S+@\S+',line):md.append(prefix+': '+line.strip())
OUT.joinpath('scripts/clean-merge-audit.md').write_text('\n'.join(md),encoding='utf-8')
print({'B_paths':sum(r['group']=='B' for r in m['rows']),'lines':len(md)})
