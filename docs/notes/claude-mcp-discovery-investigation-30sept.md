# Claude MCP discovery investigation

- Recorded: 2026-09-30 13:18 IST.
- Scope: source and official documentation review, not a live Claude-session reproduction.

## Findings

Normal Claude chat launch inherits user/project/local settings. Empty strict
MCP config is applied only to isolated helper/catalog spawns in
claudeProtocol.ts:269-279. Normal launchOptions does not set a tools allowlist
or disable plugins. Claude Code owns MCP discovery and execution; MonoCode
handles permission requests and renders events, rather than needing to load
each deferred tool itself.

ToolSearch deferral is a documented Claude Code feature:
https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search.
The supplied author's admission (never invoking ToolSearch) supports an agent
workflow omission, but is not wire proof of loaded servers or permission state.
Reviewer used SocratiCode status/search successfully in this Codex environment;
that does not establish availability inside the author's Claude process.

## Narrow source-level planning risk

claude.ts:915-927 auto-allows only toolKindFromName values read/search when
live.planning is true. claudeProtocol.ts:909-942 classifies by name substring.
ToolSearch and codebase_search classify as search. codebase_status,
codebase_impact, codebase_flow, codebase_symbol and graph-query tools without
read/search substrings fall through to their names and are denied if they
reach this permission handler. This is a concrete policy limitation, not
evidence that the reported run reached it. Skill calls also have a distinct
kind, so do not assume all plugin skills are usable in planning mode.

Do not fix by allowing every MCP tool: indexing/removal and other mutating
tools must remain restricted. A separate confirmed reproduction should use
explicit read-only capability classification and regression tests while
preserving plan-mode write protection.

## Remaining checks

- In the actual Claude session: ToolSearch for SocratiCode status/search, then
call codebase_status and one semantic search. Record method/tool names and
sanitized errors only. No indexing changes, source edits or builds.
- Confirm selected provider account/config profile and cwd. Named Claude
accounts use isolated configuration directories (harness.rs:785), so the
external default CLI's plugin installation may not prove this account has it.
- Confirm whether MonoCode native Plan mode was active. Writing a spec in a
normal chat does not imply live.planning=true.
- No duplicate SocratiCode prefix pair was observed in this session.

No source/configuration changes or live Claude calls made. No global disabling
of deferral or broad permission bypass recommended.
