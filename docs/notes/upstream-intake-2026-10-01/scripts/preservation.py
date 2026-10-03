"""Read pinned Git blobs only; write stage-1 evidence inside this run's folder."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
LOCAL = 'c2c8bf6c2127521b55f3a16e4a1ae58e25014eb6'
def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True, encoding='utf-8')
def blob(path):
    assert not Path(path).name.startswith('.env')
    return git('show', f'{LOCAL}:{path}').splitlines()
def proof(path, token):
    lines = blob(path)
    matches = [(i+1, line.strip()) for i, line in enumerate(lines) if token in line and (token != 'it(' or line.strip().startswith('it('))]
    if not matches: raise ValueError((path, token))
    return matches[0]
S='src/features/sessions/'
H='src/integrations/harness/'
F='src/features/settings/'
# behaviour, primary path, source token, test path, test token, standing source, Windows-only, supporting commits
rows = [
('Busy chats keep Stop and Queue/Steer-aware send',S+'ui/Composer.tsx','resolveComposerButtonAction',S+'ui/Composer.test.ts','keeps Stop visible','NOTES §0.1; archive 2026-09-23 product calls','No',[]),
('Menu bar stays visible', 'src/app/App.tsx','<MenuBar','src/app/shell/TitleBar.test.ts','it(', 'NOTES §0.2; archive 2026-09-23 round 2.3','No',['e87571f']),
('Antigravity uses the shared official ACP runtime',H+'core/antigravityRuntimeHost.ts','export async function acquireAntigravityRuntime',H+'core/antigravityAcpLive.test.ts','it(', 'NOTES §0.3; archive 2026-09-23 round 2.1','No',['15198ec','80a5e2f','a65bd4e']),
('Cline remains a selectable eleventh provider',S+'model/session.ts','"cline"',S+'ui/ModelPicker.test.ts','440px','NOTES §0.4; archive 2026-09-23 round 2.4','No',['f894c6e']),
('Queued text and attachments persist safely across restart',S+'model/queueDurability.ts','export class QueueDurabilityScheduler',S+'model/queueDurability.test.ts','preserves a pasted image','NOTES §0.5; archive 2026-09-24 standing calls','No',['ae0c675','8ebde6d']),
('Steer cancellation and held queues do not dispatch unsafely',S+'model/messageQueue.ts','steer',S+'model/messageQueue.test.ts','it(', 'NOTES §0.5','No',['a8928e3','730c428']),
('Removing a chat evicts queue state and kills disappearing terminals','src/app/App.tsx','for (const id of disappearedTerminalIds','src/features/workspace/model/terminalPanes.test.ts','it(', 'NOTES §0.5; archive 2026-09-23 round 2.5','No',[]),
('Terminals start lazily and release on close','src/features/terminal/ui/TerminalView.tsx','isTerminalWanted',S+'ui/TerminalView.test.ts','it(', 'NOTES §0.6; archive 2026-09-24 standing calls','No',['b865de6']),
('Wallpaper and menu controls, five effects and packaged rendering remain',F+'model/appearance.ts','applyWallpaperPath',F+'model/appearance.wallpaper.test.ts','it(', 'NOTES §0.7; archive 2026-09-23 settings call','Yes',['49eb636','4a57b56','9397898']),
('Shared sliding hover uses a stable glass frame','src/shared/ui/Popover.tsx','<SharedHoverHighlight','src/shared/ui/Popover.hover.test.ts','it(', 'NOTES §0.8; archive 2026-09-23 hover provenance','No',['5a209ca']),
('Context and dollar accounting share usage and turn metrics',S+'model/tokenAccounting.ts','export',S+'model/tokenAccounting.test.ts','it(', 'NOTES §0.9; archive 2026-09-23 theme decisions','No',['e88d26c','a31ee53']),
('Remaining quota can be shown as a percentage','src/features/providers/model/rateLimits.ts','remaining','src/features/providers/model/rateLimits.test.ts','it(', 'NOTES §0.9','No',['122ba13']),
('Windows provider discovery hides helpers and controls process trees','src-tauri/src/harness.rs','let assigned = AssignProcessToJobObject','src-tauri/src/harness.rs','fn which_in_path_takes_the_first_executable_hit', 'NOTES §0.10; WORKING-AGREEMENT Windows rules','Yes',['80faf07','dbe21cf','43381fc']),
('Windows terminal uses ConPTY with stalled-output replay','src-tauri/src/pty.rs','fn spawn_windows','src-tauri/src/pty.rs','fn conpty_spawns_shell_and_echoes', 'NOTES §0.10','Yes',['7e02029','437cd34']),
('Reveal errors are testable without launching Explorer','src-tauri/src/fs.rs','pub fn reveal_path','src-tauri/src/fs.rs','fn reveal_path_rejects_missing_path','No new product call; Done explorer spec and a8e43b8','Yes',['a8e43b8']),
('Import existing CLI conversations with resume or replay',H+'core/sessionImport.ts','export',H+'core/sessionImport.test.ts','it(', 'Not decided against new upstream; Done SESSION-MIGRATION-PLAN','No',['f00cf72','ddc6dad']),
('Skills settings can choose discovered skills without a command runner','src/features/skills/model/skills.ts','export','src-tauri/src/skills.rs','let skills = list_skills_from','Not decided against new upstream; 7af1091','No',['7af1091']),
('Provider discovery shows failures and retry/update notices',H+'core/availability.ts','error',F+'ui/UpdateToasts.test.ts','it(', 'Not decided against upstream; d5ca807; archive 2026-09-24 additions','No',['d5ca807']),
('Local helper-model preference has validated primary and fallback',F+'model/settings.ts','parseAiHelperSettings',H+'core/helperPipeline.test.ts','it(', 'Not decided against upstream; Done ai-helper-model-settings','No',['84fbe89']),
('Claude and Codex offer session-scoped tool approvals',H+'providers/codex/codex.ts','const sessionGrant',H+'providers/codex/codexElicitation.test.ts','it(', 'Not decided against upstream; Done session-approval-scopes and follow-ups','No',['bf41013','b905b8c','0a27328']),
('Session grants never auto-answer Plan or stopped/replaced chats',H+'providers/codex/codex.ts','live.planning || live.cancelled',H+'providers/codex/codexLive.test.ts','it(', 'Not decided against upstream; Done provider-batch-followup-fixes','No',['0a27328']),
('Claude model and permission changes update the live runtime',H+'providers/claude/claude.ts','await sendControl(existing, buildSetModelRequest',H+'providers/claude/claudeLive.test.ts','it(', 'Not decided against upstream; Done claude-live-controls','No',['9dfeaa0']),
('Codex renders typed MCP forms and validation',S+'ui/McpForm.tsx','export function McpForm',S+'model/mcpForm.test.ts','it(', 'Not decided against upstream; Done codex-mcp-forms (real server untried)','No',['3a47202']),
('Claude/Codex native context totals distinguish estimates',S+'model/contextBreakdown.ts','nativeSegments',S+'model/contextBreakdown.test.ts','it(', 'Not decided against upstream; Done context-accuracy','No',['11981c0']),
('Branch uses provider-native forks with honest summary fallback',S+'model/branchPlan.ts','mode: reason',S+'model/branchPlan.test.ts','it(', 'Not decided against upstream; Done native-branch/followups','No',['f1a4712','4423fd8','d691035']),
('Sidechat and review-fix controls remain in a session',S+'ui/SessionPane.tsx','onSidechat={',S+'ui/ChatPanel.test.ts','it(', 'archive 2026-09-23 weaves; 2026-09-24 SessionPane delta','No',[]),
('Editor and Git staging preserve CRLF text','src/features/files/editor/editorDoc.ts','lineEnding','src/features/files/editor/editorDoc.test.ts','it(', 'Not decided against upstream; 0b9122a','No',['0b9122a']),
('Human-origin Claude turns are distinguished from managed turns','src/app/App.tsx','humanAuthored: !options?.managed',H+'providers/claude/claudeProtocol.test.ts','it(', 'Not decided against upstream; parking record retained code','No',['a65bd4e']),
]
records=[]
tree=set(git('ls-tree','-r','--name-only',LOCAL).splitlines())
for n,row in enumerate(rows,1):
    behaviour,path,token,test,ttoken,standing,windows,commits=row
    line,excerpt=proof(path,token)
    tline,texcerpt=proof(test,ttoken)
    owners={path}
    for commit in commits:
        owners.update(p for p in git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines() if not p.startswith('docs/') and not Path(p).name.startswith('.env'))
    owners={p for p in owners if p in tree}
    records.append(dict(id=f'L-{n:02}',behaviour=behaviour,owners=sorted(owners),proof=f'{path}:{line}',excerpt=excerpt,test=f'{test}:{tline}',test_excerpt=texcerpt,standing=standing,windows=windows))
OUT.joinpath('scripts/preservation.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
md=['# Stage 1 — Local preservation list','','Verified: source and test anchors are read from pinned `c2c8bf6` blobs with `scripts/preservation.py`. Owner sets include surviving source paths from the named local feature commits. Tests were read, never executed. Test-name anchors establish relevant suites; inferred coverage gaps are listed below.','','| ID | Behaviour in plain words | Owner files | Proof (file:line @ c2c8bf6) | Tests that lock it | Standing call? (source) | Windows-only? |','|---|---|---|---|---|---|---|']
for r in records:
    md.append('| '+' | '.join([r['id'],r['behaviour'],'; '.join('`'+p+'`' for p in r['owners']),'Verified: `'+r['proof']+'` — `'+r['excerpt'].replace('|','\\|')+'`','Verified existing suite: `'+r['test']+'`',r['standing'],r['windows']])+' |')
md += ['','## Source/test evidence excerpts','', 'Verified excerpts below are navigation anchors, not claims of a green suite.']
for r in records: md.append(f"- {r['id']}: `{r['test']}` — `{r['test_excerpt']}`.")
md += ['','## Limits and missing coverage','','- Inferred: removing source contracts should break their focused suites, but mutation testing is forbidden in this trial. Generic `it`/Rust `fn` anchors must be supplemented by targeted tests in the worker spec; they are not proof that every wiring line is locked.','- Not checked live: real MCP-form server; Claude `--session-id` with `--fork-session`; individual local5 manual checklist results (docs explicitly preserve these caveats).','- L-02/L-13/L-14/L-17: native/UI coverage is partial. Preserve source checks alongside tests; generic suite anchors alone do not prove always-visible menus, zero consoles or every provider registration.','','## Off-branch, parked and planned work','','Verified names from stage 0 and documentation only; no stash, other worktree or archive source opened.','- `hari-orchestration-changes-30sept`: unfinished Hari board over orchestration; archive tip documented in parking record, not contacted.','- `park-other-orchestration-mode-changes-30sept`: local-file handoff, lead controls, Resume/send, Efficient/Live supervision; checkout chooser removed.','- `feature/hari-orchestrator` / `mono-clone-hari`: parked working context; untouched.','- `feature/remote-chat` / `mono-clone-remote`: local remote-chat effort; likely upstream SSH overlap, details Not checked.','- `feature/mcp-hub`: central MCP manager idea; possible provider-settings overlap.','- `feature/scheduled-tasks`, `feature/tasks-foundation`: schedule/task work; upstream automations/orchestrator overlap.','- FEATURES/PLANNED: remote device, preview/browser, provider instances, MCP/skills manager, code graph, UltraContext, standalone chat, sidechat, native fork, queue reorder/conversion/idle queue, advanced lead transfer, all-project Kanban. Some are already partially implemented; dated plans are not live status.','','## Items in NOTES section 0 no longer accurate','','- Verified: section 0 predates local5; add L-19–L-25 and human-origin retention L-28 to the eventual preservation baseline. Do not edit NOTES during this run.','- Verified: Antigravity old provider adapter is detected as R072 to `core/antigravityAdapter.ts`, not a simple deletion; all references must follow core implementation.','- Verified: Cline eleventh-tab 440/442 assertion still exists; no correction to that standing call.','- Verified: queue migration reconciliation is now v14 with upstream migrations through v18; FEATURES still refers to its original v12 lineage.']
OUT.joinpath('01-local-preservation-list.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps({'rows':len(records),'anchors':[(r['id'],r['proof'],r['test']) for r in records]}))
