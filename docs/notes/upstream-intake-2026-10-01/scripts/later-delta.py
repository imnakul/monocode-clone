import json,re,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
data=json.loads((OUT/'scripts/self-review.json').read_text(encoding='utf-8'))
start='43aac9d216c323a7e04c9037eb0b251dd840cc7a';end=data['remote']
cmd=['gh','api',f'repos/hardbeat920/monocode/compare/{start}...{end}']
result=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8')
if result.returncode:
    print('Upstream compare read unavailable; response not printed. Exit',result.returncode)
else:
    raw=json.loads(result.stdout)
    commits=[dict(sha=x['sha'],subject=re.sub(r'\S+@\S+\.\S+','[redacted identity]',x['commit']['message'].splitlines()[0])) for x in raw['commits']]
    saved=dict(start=start,end=end,status=raw['status'],ahead_by=raw['ahead_by'],total_commits=raw['total_commits'],commits=commits)
    (OUT/'scripts/later-delta.json').write_text(json.dumps(saved,indent=2),encoding='utf-8')
    lines=['# Later upstream delta observed during stage 8','',
    f'Verified: permitted `gh api repos/hardbeat920/monocode/compare/{start}...{end}` reports {raw["ahead_by"]} commits ahead, status {raw["status"]}. At stage0 remote main matched the pin; at final recheck it moved. No fetch, no cache update, and no expansion of the 128-commit intake. Commit subjects below are identity/ledger facts, not source-behavior proof; diffs Not checked.','',
    '| SHA | Subject |','|---|---|']+[f"| {x['sha']} | {x['subject'].replace('|','/')} |" for x in commits]
    (OUT/'08-later-delta.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(saved))
