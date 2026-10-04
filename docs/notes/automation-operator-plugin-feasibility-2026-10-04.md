# Operator automations and plugin compatibility research

Checked: 2026-10-04 (IST), combined branch
`nakul/windows-support-upstream-0.7.0`, repair base `f79364f`.
Implementation checkpoint: [automation spec](../specs/automation-custom-triggers-plan.md).
Plugins are research only; no plugin runtime, catalogue or scope setting was built.

## Operator automations: feasible with existing app tools

The new automation Operator switch activates the same `/operator` path as a
regular chat. It does not implement a fixed workflow or change permissions.
Instructions can ask the coordinator to read tasks and start worker sessions.

| Request | Existing capability / condition |
|---|---|
| Run at 9pm | Daily 21:00, or custom `0 21 * * *`, in the computer's local timezone. MonoCode must run; sleep/offline recovery follows the existing missed-run grace. |
| Read all open tasks | `tasks.list` supports multiple statuses, all projects when `projectCwd` is omitted, paging, tags, query and archived filters. Open is not a literal status: select Todo/Progress/Blocked/Review as intended; usually launch only ready Todo items. `tasks.read` returns full task Markdown. |
| One Luna 6 Max session per task | `models.list` supplies available provider/model IDs and allowed effort settings. `sessions.start` accepts harness/model/modelSettings/effort/prompt. The model and Max must actually be available; report missing choices rather than downgrade silently. |
| Different branches | Request a fresh worktree per worker, or use `worktrees.create` and the returned path with `sessions.start`. Ordinary sessions default to the current checkout and may inherit the parent's worktree; isolation must be requested. |
| Tasks from different projects | Direct `sessions.start`/`worktrees.create` target the coordinator's project. For another local project, use `session_manager.write` with `projectCwd`, followed by `session_manager.start`. Personal tasks need an explicit target project for coding. |
| Separate ClickUp export session | Feasible if an authenticated ClickUp MCP/API is configured for the chosen worker/provider and permits writes. The local app CLI manages MonoCode tasks; it does not itself supply ClickUp. A dedicated export worker can receive the task payloads. |

Useful instruction outline (adapt project scope and limits before using):

> Read unarchived Todo tasks for this project, paging through the results. Skip
> tasks already linked to an active worker. Resolve Luna 6 and its Max setting
> using models.list; if unavailable, stop and explain. Start one worker per
> eligible task, each in a fresh worktree with only that task's instructions.
> Record each accepted session ID in the task notes and move it to Progress.
> Report created sessions and failures. Do not duplicate a previous launch.

For ClickUp, add a separate export worker and check/store external task links
so a repeated run does not create duplicates. The switch gives the agent app
access; these instructions are not an enforced concurrency/deduplication engine.
A guaranteed worker limit, durable task-to-worker ledger, automatic per-worker
completion updates and a parent that waits for all children would be a separate
workflow feature. The current automation run tracks its coordinator turn;
`sessions.start` returns after acceptance, not worker completion.
Approvals, unavailable models, missing projects, worktree failures and MCP auth
can leave a run needing input. Do not assume unattended completion.

Source: `src/features/agent-app/model/agentApp.ts`,
`src-tauri/src/control_cli.rs`, App's `launchAutomation` / `submitSession`.

## Operator persistence

A submitted Operator turn is saved with `monocode: true`. Later turns derive
app access from that marker (`operatorEnabledInThread`). The old composer chip
reset after Send, but access stayed enabled, including when the chat reopens.
The repaired chip is a persistent status, including compact composers; it has
no misleading Turn off/remove button once access is active. Before submission,
the draft chip remains removable. No thread-level revoke capability was added.
Turning an automation's Operator switch off affects new activations; continuing
an already enabled chat retains access. Choose Start fresh for a new normal run.

## A separate MonoCode plugin mode is feasible

Use a dedicated Tools/Plugins chat space, with each plugin scoped to Disabled,
Chat only (recommended default), or Chat + projects. Load only allowed servers,
skills and instructions for the chosen space. Enforce scope at tool discovery
and provider/process startup, rather than merely hiding a button: a globally
enabled CLI plugin/MCP can otherwise still load into project sessions.
Do not rewrite a user's global provider config just to implement per-chat scope.
Existing tools/project chats and automation permission choices stay independent.

MCP supplies executable tool servers. A plugin package can bundle MCP tools,
skills/workflows, dependencies, authentication/setup, commands and UI resources.
Skills alone cannot edit a video or create an external artifact: a real tool
or execution service is needed. A plugin does not inherently supply a model.

- Video work: use a video/render service or a local editor/FFmpeg tool server,
  with upload/input selection, progress, cancellation and returned media files.
  Installing a manifest does not provide its external binaries or service.
- HTML from content: a content/template/generation tool can return an HTML
  artifact and preview/export it without putting it in a project checkout.
- To avoid the main coding agents entirely, MonoCode can use its own MCP client
  with direct tool forms/recipes. Free-text requests still need an inference
  provider, such as a separate chat model/API. Do not assume a ChatGPT/Claude
  subscription supplies a general-purpose API or transferable login.
- A Chat-only plugin will also be absent from project Operator automations.
  A ClickUp automation therefore needs its integration allowed in that project's
  run, or a future separate Tools automation type.

## Can existing Claude / ChatGPT plugins be reused?

| Package/service | Feasibility |
|---|---|
| Claude Code plugin | Yes for its supported components via Claude Code or a MonoCode importer. Bundles include skills, agents, hooks and MCP servers; Claude can load local directories with `--plugin-dir`. Not all hooks/agents/commands are portable to another execution engine. Installed CLI version and plugin dependencies matter. |
| Newer Codex plugin | Current official Codex source recognizes `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`. This is evidence of manifest discovery, not proof every component of every Claude plugin works. Probe the installed Codex version and supported runtime before offering import. |
| Claude Desktop MCP connector | Its accessible MCP server/tools can be reused with appropriate transport and separate credentials/client registration. Desktop-specific presentation or proprietary services are not automatically imported. |
| ChatGPT App backed by MCP | Potentially reuse the server's tools if the vendor exposes its endpoint and authorizes other clients. ChatGPT catalogue access/login does not automatically transfer. OAuth/client restrictions may require vendor support. |
| ChatGPT App widget | Requires a compatible UI host. Apps SDK examples use UI resources and host APIs such as `window.openai`; ordinary MCP tool calling alone will not reproduce that interface. A future standard MCP Apps renderer plus any required host extensions is additional work. |
| Custom GPT / legacy ChatGPT plugin | Not a directly loadable MonoCode package. Reusable instructions or documented API/OpenAPI actions can be adapted into skills/MCP tools where available; private GPT/app backends and ChatGPT-only runtime cannot be imported automatically. |

Recommended first version: generic MCP tools plus small skill/recipe bundles,
isolated in Tools chats. Add provider-specific plugin imports and interactive
app rendering after verifying actual packages/servers; no promise of blanket
Claude/ChatGPT store compatibility. Small metadata/lazy instructions help
context cost, but real tool/skill exclusion is needed to prevent project bloat.

## Sources and verification limits

Direct official web downloads were denied by this environment's network policy.
Context7 returned official documentation excerpts; GitHub connector reads also
confirmed the Codex discovery constants and the OpenAI examples README:

- [Claude plugin structure and supported components](https://code.claude.com/docs/en/agent-sdk/plugins)
- [Claude local plugin loading](https://code.claude.com/docs/en/plugins/create)
- [Claude plugin context costs](https://code.claude.com/docs/en/plugins/measure)
- [Codex manifest discovery constants](https://github.com/openai/codex/blob/main/codex-rs/exec-server-protocol/src/protocol.rs)
- [OpenAI Apps SDK examples and MCP/host UI contracts](https://github.com/openai/openai-apps-sdk-examples/blob/main/README.md)
- [OpenAI MCP OAuth example](https://github.com/openai/openai-apps-sdk-examples/blob/main/authenticated_server_python/README.md)

No real third-party plugin or ClickUp workflow was run, and no private APIs,
subscription tokens or installed provider plugins were modified.
