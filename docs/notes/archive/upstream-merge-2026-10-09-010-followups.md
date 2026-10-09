# Upstream 0.10 follow-up merge decisions — 2026-10-09

* Branch: `nakul/windows-support-upstream-0.10.0`
* Base: `8ea88359bf7c1c14e2c8b7889e1fbcd71bef525f`
* Pinned target: `7d099eb8e1d3a544a9221cda66de251f25e6c4a0`

The user approved bringing the six pinned upstream commits into the Windows fork
with the keep-both contracts recorded below. The three-way preview covered 83
paths: 17 additions and 66 modifications. It identified 25 conflict paths (24
content conflicts and one modify/delete). All additions are present; all
conflicts were resolved by integrating behavior at the affected call sites,
not by taking whole files from one side. The detailed task scope, tests and
manual checklist are in the [follow-up spec](../../specs/upstream-010-followups-and-session-polish-plan.md).

## Decisions and reasons

| Area | Resolution | Reason |
|---|---|---|
| Devin provider and ACP | Add Devin through provider IDs, native/host launch, usage, MCP, settings and exhaustive capability maps. Keep account profiles limited to Claude and Codex. Keep `devinAskEdits` after the existing `codexStore` argument. | Devin is an additional provider; it must not be cast into unrelated Claude/Codex account-profile flows or displace local native options. |
| Existing ACP and CLI providers | Keep local Cline, Antigravity ACP and the separate Antigravity CLI. Reuse the incoming `antigravityProtocol.ts` parser/helper where Devin needs it, but do not restore or register a second Antigravity ACP provider. Keep `antigravity-cli` local-only in the remote allowlist. | The old upstream Antigravity provider was already replaced by the fork's `core/antigravity*` implementation. The extra host parity assertion equating local and remote providers is incompatible with the intentional local-only CLI and remains unchanged. |
| Mono store and permissions | Keep Codex's isolated Mono store for Monos only; keep helper-only tools read-only and outside the Mono store. Preserve ordinary Codex native resume/account/RC/cloud behavior. Keep task/operator controls while adding collapsed-rail Mono pins. | Storage isolation and existing permission boundaries must not depend on UI mode, task view or caller-supplied helper flags. |
| Windows process and path handling | Retain hidden child creation, job/process-tree lifetime, launcher identity checks, Windows path handling, temp-directory behavior and checkpoint safeguards while adding Devin and upstream process changes. | New provider and checkpoint paths must follow existing no-console and cleanup contracts on Windows. |
| Source Control | Add selected-file context and commit support while preserving ordinary commit behavior, editable-message semantics, generation cancellation and abort cleanup. | The new selected-file operation is additive; it must not discard current full-change commits or allow stale async results to replace user edits. |
| Session/schema state | Union upstream session fields with local provider identities, queues, tasks, sidechat metadata and `sidebar_hidden`; retain SQL projection/index ordering and existing stored values. | A partial row/model selection could silently lose persisted fork metadata or change native identity. |
| App, settings and usage surfaces | Add Devin usage/settings and collapsed Mono pins while keeping visible remaining-usage defaults, provider-specific labels, Tasks/session entries and local controls. | Provider surfaces share components, but the new provider must not change existing defaults or hide fork-owned actions. |
| User session/task polish | Keep run-scoped display-only working-card dismissal, save-before-create task flow, durable separate sidechats, actual-turn Claude RC metadata, wrapped code/tool text, canonical project-only images, and second-opinion titles. | The approved user choices are captured in the spec; automation and native desktop behavior are recorded separately. |

No installer was requested or built. The reviewed merge is approved for normal
publication to the authorized branch. The remote branch was last verified at
the base SHA before this push; verify and report the final remote SHA in the
task handoff. Native Windows/provider checks remain in the manual checklist.
