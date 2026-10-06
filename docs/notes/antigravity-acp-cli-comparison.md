# Antigravity ACP and CLI in MonoCode

Updated: 2026-10-06 (IST). Branch: `nakul/windows-support-upstream-0.7.0`.

Both providers coexist. Existing `antigravity` sessions remain **Antigravity ACP**.
The new `antigravity-cli` provider is **Antigravity CLI**, using Google's standalone
`agy` executable. There is no conversion or context-copy migration between them.

## Selecting and setting up

1. Install the [official CLI](https://antigravity.google/docs/cli/install/) and run
   `agy` in a terminal once to complete sign-in. MonoCode does not install it or
   reuse ACP's helper executable or account profiles.
2. In **Settings → Providers**, find **Antigravity CLI**, optionally choose its
   executable with the existing binary control, then **Recheck**. Changing a
   saved executable path follows the existing restart requirement.
3. In the existing model picker, choose **Antigravity CLI** or **Antigravity ACP**.
   Live CLI model discovery uses `agy models`; the fallback **Configured CLI model**
   uses the model already configured in `agy`. Discovery errors are visible in
   the provider row and keep the current selection/catalog.
4. Start a new chat with the chosen provider. Existing chats retain their original
   provider and native identity. Both normal and quick composers use the same
   provider registrations, model catalogs and attachment capability checks.

## Feature comparison

This table describes what MonoCode exposes, rather than every Antigravity TUI feature.

| Feature | Antigravity ACP | Antigravity CLI |
|---|---|---|
| Runtime | Existing official ACP server and matching helper, shared between chats | Official standalone `agy`; one persistent process per active chat |
| Live replies and tools | Existing streaming | New NDJSON streaming; final response is not replayed after deltas |
| Native resume | Existing ACP session IDs | Exact CLI conversation UUID; retained through Stop/restart, never workspace-wide `--continue` |
| Stop and queued follow-ups | Existing support | Stop kills the owned process; next turn resumes the same ID; follow-ups serialize |
| Images/audio/PDF/files | Existing validated ACP attachment blocks | Text only; attachment controls hidden and adapter rejects attachment input |
| Interactive permissions/questions | Existing ACP permission and question dialogs | No documented headless reply channel; confirmation requests are soft denied |
| Permissions picker | Existing ACP modes/behavior | **CLI policy** uses the CLI's saved permissions; **Full access** explicitly adds the CLI bypass flag |
| Usage | Existing ACP usage/context reporting | Per-turn input/output/cache/thinking usage when emitted; cumulative counters are differenced; `/usage`, `/quota`, `/credits` read account reports |
| Context occupancy/cost estimates | Existing provider-reported fields | No invented occupancy or pricing; unavailable fields remain absent |
| Models | Existing ACP catalog | `agy models` discovery and optional low/medium/high effort selection for discovered models |
| Compaction | Existing ACP behavior; no separate manual MonoCode compaction control | CLI engine compaction retained; no verified manual streaming command, so no manual button |
| Plan / orchestration lead mode | Existing ACP workflow | No verified headless planning control; rejected before any process/input rather than running with edit access |
| Mid-turn steering/native fork | Existing ACP capability limits | Unavailable; queue a follow-up or start a separate chat |
| AI helpers (commit/PR text) | Existing ACP helper integration | Not exposed in this first integration |
| Multiple MonoCode account profiles | Existing ACP/account behavior | Uses the CLI's own signed-in account |
| MonoCode Remote/Cloud controls | Existing provider capability limits | Not exposed for this provider |
| Native conversation discovery folder | Existing Claude/Codex-only folders | No new Antigravity discovery folder in this change; MonoCode-created CLI sessions persist normally |

**CLI policy is not a read-only sandbox.** Its saved policy can allow workspace
reads/edits. Interactive confirmation-required actions are denied in headless
mode. MonoCode does not silently upgrade another permission mode to Full access.
Normal Operator/app-control turns keep MonoCode's existing scoped control CLI;
tool execution still depends on the permissions configured in agy. This has not
been verified with a real provider in this environment.

Usage after a cold native resume uses new per-step counters where available. If
those counters are absent, the first resumed turn omits usage instead of charging
the entire historical conversation as a new turn. Later result counters establish
the baseline. Read-only slash reports run separately; they do not send an agent
message or create a CLI conversation.

The CLI can avoid ACP's helper/runtime requirement. It still stores its own
configuration, conversations and caches under the user profile; on Windows that
can be C:. No zero-disk-use or measured speed claim is made.

## Remote Control research

Google documents an [interactive CLI Remote Control mode and a daemon](https://antigravity.google/docs/remote-control?tab=cli):
- Interactive: `/remote-control on` or `agy --remote-control`.
- Background service: `agy remote-control start`, `status`, `stop` (a scheduled task on Windows).

These are real provider options. The documented headless protocol does not verify
that either attaches to the same persistent stdin/stdout process owned by
MonoCode. This integration therefore adds no Remote toggle and starts no daemon.
Opening a separate CLI/daemon conversation is not advertised as remote control
of the current MonoCode conversation. A future slice needs same-conversation
verification, phone turns, approvals, Stop, reconnect and native-ID preservation.

## Verification and remaining manual checks

Automated protocol/process tests cover single submission, streamed/final response
deduplication, model isolation, failed model discovery, exact native resume,
identity mismatch before send, Stop during startup, stale process output,
parallel tool updates, usage after resume and unsupported controls.

The managed Linux environment has no installed/authenticated `agy`. These fixtures
and builds do not establish an actual Google-account or Windows-provider pass.
Manual follow-up on a development build:
- Recheck both providers; confirm both names, separate model lists and old ACP chats.
- Send two CLI turns and inspect streamed text/tools and usage; test `/usage`.
- Stop an active CLI turn, then continue; reopen after app restart and confirm
  the exact native conversation continues without replaying old messages.
- Compare CLI policy/Full access on a tool requiring confirmation, with the
  chosen access explicitly understood; check expired sign-in errors.
- Switch model/effort between idle turns and confirm native identity is retained.
- Confirm CLI attachments are unavailable while ACP attachments still work.

## Sources

- [Headless protocol](https://antigravity.google/docs/cli/headless/)
- [CLI reference](https://antigravity.google/docs/cli/reference/)
- [CLI changelog](https://antigravity.google/docs/changelog?tab=cli)
- [Existing ACP implementation and verification](antigravity-acp-implementation-notes.md)
