"""Pinned commit ledger and feature/path links; no source mutation or code checks."""
import json, re, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parents[1]
BASE='3344bea70341d8ea4d6dea414aa15c13683372e9'
UP='43aac9d216c323a7e04c9037eb0b251dd840cc7a'
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args],text=True,encoding='utf-8')
tags=['v0.1.55','v0.1.56','v0.2.0','v0.3.0','v0.4.0','v0.4.1','v0.4.2','v0.4.3','v0.5.0','v0.6.0',UP]
release={}
for a,b in zip(tags,tags[1:]):
    for sha in git('rev-list',f'{a}..{b}').splitlines(): release[sha]='post-v0.6.0' if b==UP else b
commits=[]
for line in git('log','--reverse','--format=%H%x09%s',f'{BASE}..{UP}').splitlines():
    sha,subject=line.split('\t',1)
    paths=git('diff-tree','--no-commit-id','--name-only','-r',sha).splitlines()
    assert not any(Path(p).name.startswith('.env') for p in paths), 'Env file in candidate list: stop before diff'
    commits.append(dict(sha=sha,subject=subject,release=release[sha],paths=paths))
assert len(commits)==128 and len(release)==128
# First introduction plus later commits under a stable ID. Windows confidence is explicitly separated from source existence.
features=[
('Compact rail has a temporary sidebar drawer and hidden-rail project menus','9fb7710 3e3a81c c3005b0 5548916 c01e31b dd5c039','L-02,L-09,L-10; local compact-hover overlap','Cross-platform UI; Windows expected, live behavior Not checked','sidebar state, project picker, appearance settings'),
('Haze background effect with preview','778b527','L-09 wallpaper renderer and effects','Cross-platform worker; Windows expected, packaged renderer needs check','shared worker effect union and cache'),
('Choose whether supported files are formatted when saved','28b814a','L-27 line-ending/editor work','Cross-platform editor; Windows expected','persisted formatOnSave setting; Prettier-supported languages'),
('Provider defaults and picker visibility can vary by project','26e66e3','L-04 Cline; L-18 discovery; per-instance provider plan','Cross-platform settings; Windows expected','settings scopes, provider maps and blank-session defaults'),
('Reusable preview tabs become permanent after editing or double-click','b6baa44','L-07,L-08 terminal cleanup; workspace snapshots','Cross-platform workspace; Windows expected','Tab preview state, workspace serialization and tab/pane actions'),
('Pull requests show checks, job steps and repair conversations','3e28087','L-26 review-fix/Pull review overlap','Cross-platform GitHub/UI; Windows requires functioning gh','GitHub check APIs, repair state and linked session persistence'),
('Floating Quick composer starts sessions over other apps','618efe4 b3034f1','new; L-04,L-19 provider/helper lists','Verified macOS-only entry point; Windows unavailable','new quick-composer frontend entry, native global shortcut, screenshot command/capability'),
('BTW gives a read-only side conversation on an answer','67ad7dd 796e03a e611f00 9b1ddc8','duplicates/overlaps L-26 Sidechat; L-19 helper choice','Cross-provider text adapters; Windows expected, Antigravity/Cline coverage needs decision','saved BTW threads/model settings; provider text interfaces; animated sheet'),
('Operator grants a thread opt-in app control, later note writing and worktrees','b6f56e6 69f602d c576783 fce518c','parked orchestration handoff/lead-control overlap; L-28 human origin','Cross-platform local CLI/control; Windows expected','control commands/grants, agentApp schemas, session flag and notes/worktree actions'),
('Account controls show plan and organization, later usage/readiness and hidden identity','47db85e 7646575 312f781 158ce78 adbe2db','L-12 quota; L-19 account-isolated helpers; provider-instance plan','Claude/Codex account APIs; Windows expected','account cache, per-account rate limits, polling and reveal state'),
('Usage-limit notice pauses a queue and can resume after reset','bb46e56','L-05,L-06 durable/held queues; L-12 usage','Cross-platform provider state; Windows expected','usage-limit session state, timer, queue scheduling and stored restore policy'),
('Custom shortcuts can be recorded, disabled and reset','ee56686','menu/keyboard conventions L-01,L-02','Cross-platform keys; macOS native menu extras','keybinding schema/storage, app/editor/tab menus and conflict validation'),
('Set a validated CLI binary path for each provider','fde0d84','duplicates existing override L-13,L-18; L-03 ACP resolver','Backend resolution includes Windows; validation untested in this run','provider override settings, native version probing and maps'),
('Editor and diff preview highlight JSON with comments','1ce9057','new editor language','Cross-platform CodeMirror; Windows expected','JSONC language mapping'),
('A tab menu archives or deletes all its conversations','0d3db9c','L-07 queue/terminal removal ownership','Cross-platform UI; Windows expected','bulk session lifecycle callbacks'),
('Open multiple project folders in one selection','1dd1fc0','project lifecycle','Cross-platform dialog/UI; Windows expected','folder selection arrays, recents/activation order'),
('Paste screenshots or copied files/folders as attachments','d836e22','L-05 queued attachments; L-23 forms unaffected','Native clipboard Windows branches present; Wayland handling added','clipboard paths/screenshots, tauri command wiring, main/Quick composer'),
('Start sessions in adjacent split panes','daaa953','L-07,L-08 workspace lifecycle; Hari plan','Cross-platform layout; Windows expected','pane insertion, operator target options'),
('Pi shows subscription usage','d4a1c5d','L-12 meter provider union','Backend supported provider configuration; Windows expected','Pi usage parser and rate-limit maps'),
('Codex-generated images persist and appear in conversations','0bd9946','L-05 attachments; L-25 branch transcripts','Cross-platform asset handling; Windows expected','image materialization, protocol events, generated asset paths and cleanup'),
('Copy the selected Explorer path with a shortcut','ec59d92','new file action','Cross-platform platform-aware key; Windows expected','Explorer focus/path resolution and keyboard mapping'),
('Completed plan and orchestrator turns celebrate distinctly','38d8f58','parked Hari modes; L-28 intent ownership','Cross-platform motion; Windows expected','saved turn intent and animations/reduced motion'),
('Persistent remote sessions and workspaces over SSH','2515c15 22358b5 a04624f 8bba3cc 6e58a42','duplicates planned/local feature/remote-chat; L-03,L-04 provider support gap','Verified Windows bootstrap/ACL/tests exist; runtime Not checked','new host/ TS build/package, SSH pair/tunnel, native remote bridge, Connections settings, remote persistence, CI host assets'),
('Help menu opens website, repository and issue links','a28a998','L-02 menu ownership','Cross-platform in-app menu; Windows expected','opener links and menu commands'),
('Cancel generated Git commit messages','a7e1f3d','L-19 helper pipeline cancellation overlap','Cross-platform async UI; Windows expected','abort and superseded-result guards'),
('Copy MonoCode or provider session ID','16e9fea','L-25 native fork identity and summary fields','Cross-platform clipboard; Windows expected','session summary native-ID cache and menu actions'),
('Provider usage shows remaining percentage by default','d0943b1','duplicates/competes L-12 remaining quota preference','Cross-platform rate-limit math; Windows expected','meter format/default and tests'),
('Editor Autosave after one idle second, off by default','71fd1b5 0f71918','L-27 editor preservation','Cross-platform timers; Windows expected','autosave storage, Format on save and disk-conflict guard'),
('In-app CLI updates with installed-version verification','1595870 378adad','duplicates L-18 lightweight update toasts; L-13 binaries; L-19 helpers','Backend Windows install paths/child helper; runtime Not checked','harness_updates commands, update methods, cross-window model refresh'),
('MCP settings discover/manage provider connections; /mcp selects server tags','e691b46 1708c42 fec434a e322b7f','planned feature/mcp-hub; L-03,L-04 providers unsupported; L-20,L-23 approvals/forms distinct','Backend provider CLI/config parsing; Windows branches present, CLI compatibility Not checked','new mcp Rust module/commands, toml_edit dependency, provider config writes, project cache and saved draft tags'),
('Linux dark-mode glass can be enabled','1b39ceb 2cbd506','L-09 glass CSS/platform handling','Verified Linux-specific native path; Windows must retain its acrylic','body-glass preference, native transparency and reduced-motion transitions'),
('Slash commands select Plan/Orchestrator mode or save a draft','e833e83','L-01 queue/steer; L-06 holds; parked orchestration modes','Cross-platform main/Quick composer; Windows expected','command parser, inline mode pills and draft save behavior'),
('Codex effort selection animates its choices','43aac9d','new model picker polish','Cross-platform UI; Windows expected','picker motion; post-tag approval required'),
]
items=[]
assigned={}
for n,(description,shorts,relation,windows,depends) in enumerate(features,1):
    selected=[c for c in commits if c['sha'][:7] in shorts.split()]
    assert len(selected)==len(shorts.split()),shorts
    uid=f'U-{n:03}'
    for c in selected:
        assert c['sha'] not in assigned
        assigned[c['sha']]=uid
    paths=sorted(set(p for c in selected for p in c['paths']))
    items.append(dict(id=uid,kind='feature',description=description,release=selected[0]['release'],commits=[c['sha'] for c in selected],paths=paths,relation=relation,windows=windows,depends=depends))
for c in commits:
    if c['sha'] in assigned: continue
    uid=f'U-{len(items)+1:03}'
    assigned[c['sha']]=uid
    items.append(dict(id=uid,kind='maintenance',description=c['subject'],release=c['release'],commits=[c['sha']],paths=c['paths'],relation='review changed paths against preservation list',windows='platform inferred from diff; runtime Not checked',depends='see changed files and diff evidence'))
for c in commits: c['u_id']=assigned[c['sha']]
OUT.joinpath('scripts/inventory.json').write_text(json.dumps(dict(items=items,commits=commits,tags=tags),indent=2),encoding='utf-8')
panels=[]
for c in commits:
    diff=git('show','--format=','--unified=1',c['sha'],'--',':(exclude)*lock*',':(exclude)CHANGELOG.md',':(exclude)README.md',':(exclude)docs',':(exclude)**/*.svg')
    lines=diff.splitlines()
    signatures=[s for s in lines if s.startswith(('+','-')) and not s.startswith(('+++','---')) and re.search(r'\b(fn |function |export |if |case |cfg\(|pub |invoke|version|scripts|permissions|dependencies|tauri::command|ALTER |CREATE |SELECT |INSERT |return )',s)]
    safe=[s for s in signatures if not re.search(r'\S+@\S+\.\S+|(?i:token|password|secret)\s*[:=]\s*[\"\']',s)]
    panels += [f"### {c['sha'][:7]} {c['u_id']} {c['release']} — {c['subject']}",f"Changed paths: {len(c['paths'])}; diff lines excluding generated/docs/assets: {len(lines)}",*safe[:8],'']
OUT.joinpath('scripts/diff-review-panels.md').write_text('\n'.join(panels),encoding='utf-8')
md=['# Stage 2 — Upstream inventory','','Verified: 128-commit ancestry ledger from pinned merge base to `43aac9d`; `scripts/inventory.py` assigns each commit exactly once. Source of release behavior: upstream `CHANGELOG.md @ 43aac9d`, corroborating changed-source declarations in `scripts/diff-review-panels.md`. This is source analysis, not runtime verification.','', '## Summary','', '| Release range | Commits | New feature IDs | Maintenance IDs |','|---|---:|---:|---:|']
for rel in dict.fromkeys(c['release'] for c in commits):
    md.append(f"| {rel} | {sum(c['release']==rel for c in commits)} | {sum(i['kind']=='feature' and i['release']==rel for i in items)} | {sum(i['kind']=='maintenance' and i['release']==rel for i in items)} |")
md+=['','## Features by first release','','Windows expected means Inferred from shared UI/backend and code paths, not a verified desktop pass. Mac-only and Linux-only gates are separate. Dependencies below are an integration checklist, not package-install authorization.','','| ID | Feature in plain words | First release | Main commits / source paths | Windows? + evidence | Depends on | Relation to our side | Confidence |','|---|---|---|---|---|---|---|---|']
for i in items:
    if i['kind']!='feature':continue
    # Exact complete path linkage is saved mechanically, main paths only here.
    main=[p for p in i['paths'] if not p.endswith(('.test.ts','.test.tsx')) and p not in ('package-lock.json','Cargo.lock','CHANGELOG.md')][:4]
    md.append('| '+' | '.join([i['id'],i['description'],i['release'],', '.join(s[:7] for s in i['commits'])+'; '+'; '.join(f'`{p} @ 43aac9d`' for p in main),i['windows'],i['depends'],i['relation'],'Verified release description; source declarations reviewed; Windows expectation Inferred'])+' |')
md+=['','## Fixes and maintenance by release','','Verified commit identity and changed declarations; subjects alone are not proof of full behavior. The diff panels distinguish the inspected source from runtime claims.','','| ID | Release | Change | Commit | Evidence |','|---|---|---|---|---|']
for i in items:
    if i['kind']=='maintenance':md.append(f"| {i['id']} | {i['release']} | {i['description']} | {i['commits'][0][:7]} | Verified diff-panel declarations; `{i['paths'][0] if i['paths'] else 'no changed paths'} @ 43aac9d`; runtime Not checked |")
md+=['','## New dependencies, permissions, commands, settings and stored-data changes','','- Verified candidate areas: host/ build/package/tests; new quick composer Vite entry; Rust remote/SSH/bootstrap/askpass; mcp and harness_updates native modules and command registrations. Exact names and package deltas are recorded below after manifest review.','- Settings/data: preview-tab state, provider defaults by project, format-on-save, keybindings, BTW conversation state, Operator access flag, usage-limit restore state, remote connections/projects/sessions, autosave, MCP draft tags and project/cache selection, session-summary provider IDs, Linux glass. Preserve local queues, helper preferences, native-fork blocks and wallpaper keys.','- Not checked: compatibility of these shapes with every older on-disk data version; stage 4 examines the material risks.','','## Commit ledger','','Verified: one row per commit; **128 rows**; `git rev-list --count 3344bea..43aac9d` = 128. Full SHAs ensure repeatable attribution.','','| Commit | Range | U ID | Subject |','|---|---|---|---|']
for c in commits: md.append(f"| {c['sha']} | {c['release']} | {c['u_id']} | {c['subject'].replace('|','/')} |")
OUT.joinpath('02-upstream-features.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps({'commits':len(commits),'features':len(features),'maintenance':len(items)-len(features),'panels':len(panels)}))
