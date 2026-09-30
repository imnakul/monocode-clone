This repository is indexed with SocratiCode. Follow the global SocratiCode
usage rules.

Always before making any change, planning feature, finding bug, issues, reviews, testing or anything - make sure to read docs/WORKING-AGREEMENT.md, docs/changelog/CHANGELOG.md, docs/specs/SPECS.md, and docs/WINDOWS-CHANGES.md, then open the relevant numbered changelog, spec, or notes file to understand flow, rules, and history.

Docs directory is local only for features we are developing, bug fixing, enhancements, and all being done locally at imnakul/windows-support

## Desktop UI verification from MonoCode

Do not assign native desktop UI inspection or smoke tests to an agent running
inside MonoCode. This includes trying to drive the Tauri window with
computer-use tools. The MonoCode agent should complete source review,
automated tests, and builds, then report the desktop behaviors still to check
as a short manual checklist. We run those checks ourselves or in a separate
Codex session with desktop access. Specs and handoff prompts must keep that
desktop check as a separate follow-up, not an implementation-agent task.
