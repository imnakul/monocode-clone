import json,re,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parents[1];ROOT=Path(__file__).resolve().parents[4]
SCRATCH=Path(r'E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849')
m=json.loads((OUT/'scripts/manifest.json').read_text(encoding='utf-8')); t=m['tags'][0]
def git(repo,*args):return subprocess.check_output(['git','-C',str(repo),*args],text=True,encoding='utf-8')
def safe(s):return re.sub(r'[^\s\"\'<>]+@[^\s\"\'<>]+\.[^\s\"\'<>]+','[redacted identity]',s)
lines=[];records=[]
for p in t['stages']:
    text=git(SCRATCH,'show',t['tree']+':'+p);hunks=[]
    lines += ['## '+p]
    for match in re.finditer(r'(?m)^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>[^\n]*$',text):
        h=dict(line=text[:match.start()].count('\n')+1,ours=safe(match.group(1)),theirs=safe(match.group(2)))
        hunks.append(h);lines+=['### @'+str(h['line']),'ours:',h['ours'],'theirs:',h['theirs']]
    records.append(dict(path=p,hunks=hunks))
(OUT/'scripts/round-one-evidence.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
(OUT/'scripts/round-one-hunks.md').write_text('\n'.join(lines),encoding='utf-8')
print('paths',len(records),'hunks',sum(len(r['hunks']) for r in records),'lines',len('\n'.join(lines).splitlines()))
