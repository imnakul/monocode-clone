# Owner decisions — upstream intake after v0.1.55

Written by Claude. This file records Nakul's answers and the questions still open. It replaces the analyst's
[stage 5 brief](05-decision-brief.md) as the place to look for decisions; that file stays as evidence.

The worker's instructions are in the spec:
[Upstream intake in one merge](../../specs/archive/upstream-intake-one-merge.md). This file is the record behind it.

## Answered

| Date (IST) | Question | Nakul's answer (verbatim) | What it means |
|---|---|---|---|
| 2026-10-01 20:18 | Whole series through v0.6.0, or selected features? Include the nine commits after the last release? | "Everything + yes 9 features" | Take every upstream release from v0.1.56 through v0.6.0, and the nine later commits on upstream `main` up to `43aac9d`. |
| 2026-10-01, between 21:20 and 21:42 | One merge, or seven rounds? | "write-spec for Implementation of all features, including 9 commits, from where we are right now, no matter how much time it will take, we will get it done at once" | One merge from our current commit to the pinned upstream `main` `43aac9d`. One spec replaces the round-1 spec. The version label becomes `0.6.0-local1-upstream`. |
| 2026-10-01, about 22:00 | 1. BTW and Sidechat | "yes both for now" | Keep our Sidechat and take upstream's BTW, with different labels. |
| 2026-10-01, about 22:00 | 2. In-app CLI updates | "yes, we can take it, actually ours is not wokring only, we got update a day ago on codex, it never showed, we went and manually updated the CLI - so maybe, we can replace our existing ones with their also - as ours is not working - our guess is that... no need to check - if that is good, just bring that, or if our start working, after their changes, then notice + Button - if that - its your choice, just let us know what u decide" | Claude decides. Decision below: replace ours with upstream's. |
| 2026-10-01, about 22:00 | 3. Remote sessions over SSH | "yes, do it" | Take remote as upstream ships it. Cline, our Antigravity, "Allow for session" and MCP forms are not offered on a remote session. |
| 2026-10-01, about 22:00 | 4. Usage meter | "yes," | Show the percentage left by default, like upstream. Our setting stays, so "used" is still possible. |
| 2026-10-01, about 22:00 | 5. Haze | "No, bring it in both places, chat and wallpaper also" | Haze is a chat background and also a sixth wallpaper effect. Claude's suggestion (chat only) was rejected. |
| 2026-10-01, about 22:00 | 6. Operator mode | "yes" | Take it as upstream ships it: off until switched on for a chat. Hari stays parked. |
| 2026-10-01, about 22:00 | 7. New libraries | "yes" | Accept upstream's five Rust libraries and two npm build packages. Claude's registry check is below. |
| 2026-10-01, about 22:00 | A. Target commit | "yes stay on 43aac9d" | The newer upstream commit `1e97594` waits for the next intake. |
| 2026-10-01, about 22:00 | B. Commit `AGENTS.md` | "Yes commit" | Done: `cde05ca`. Not pushed. |
| 2026-10-01, about 22:00 | C. Who reads the files the analysis skipped | "Yes, for now, you can read and write-spec - just it should be one spec file, not multiple files, and not many stages, and directly mark spec as Todo, not draft this time, WE belive in you,..." | Claude read them. One spec file, three stages, status Todo. |
| 2026-10-01, about 22:00 | D. Free space on C: | "Yes, will handle that, be free for this point" | Nakul frees space himself before the worker reaches the build step. |

Standing calls from `docs/NOTES.md` §0 are not reopened: separate Stop with Queue/Steer, always-visible menu
bar, official Antigravity ACP with the old provider deleted, Cline as the eleventh provider, durable queues,
lazy terminals, Windows wallpaper effects, hover frame, local token accounting.

The "staged rounds" guidance in `docs/NOTES.md` and the seven-round table that used to be in this file no
longer apply. Measured for the one merge: 80 conflicting files, 231 conflict spots.

## Still open — Nakul

Neither blocks the merge.

- **E. The scratch copy.** While researching, Codex made a second copy of the repository in
  `mono-clone-scratch\intake-trial-20261001-1849` (about 63 MB) so it could try the merge without touching
  our real folder. Keep it until the merge is finished (the worker can look at how each conflict appeared
  there), or delete it now? Suggestion: keep it until the merge is done, then delete. It is removed only
  when Nakul says so.
- **F. Git-ignored files in `@` mentions.** Our notes say that on 8 September we made the `@` file picker in
  the chat box also list files that Git ignores (for example `docs/`). That change is not on the branch
  today, so the picker does not show them. Rebuild it later as its own small task, or drop the idea?
  Suggestion: rebuild later; `docs/` is ignored in this repository, so it is useful here.

## Decided by Claude after Nakul's answers (2026-10-01 22:30)

Nakul can overrule any of these.

### In-app CLI updates: replace ours with upstream's (question 2)

- **Why ours never showed the Codex update.** Read in the source, not tried at runtime. Two reasons:
  1. Our check asks the npm website from inside the app window
     (`src/integrations/harness/core/cliVersions.ts:59–72`). The app's security policy in
     `src-tauri/tauri.conf.json` does not allow the window to reach that website, so the request is refused
     and the check quietly finds nothing.
  2. The check runs only when Settings → Providers is opened (`SettingsView.tsx:3139–3175`), never at start.
- **What upstream does.** The check runs once at each app start from the native side (not blocked). The
  notice has Update, Update all and Retry. It runs each CLI's own updater, then reads the version again to
  confirm, then reloads that provider's model list.
- **Decision.** Remove our notice (`UpdateToasts`, `cliVersions` and their wiring in Settings) and use
  upstream's. One notice, not two.
- **Local changes to upstream's version.** The start-up check does not start the Antigravity runtime. The
  updater runs through our Windows launcher path (no console window, `.cmd` launchers work).
- **Gaps.** Upstream covers Claude, Codex, OpenCode and Pi. Cline gets no update notice (follow-up). On
  Windows an update can fail when the CLI is in use by an open chat; the notice then shows the error and
  Retry. Whether `codex update` and `claude update` work on this PC was not tried — never run a real update
  during investigation; it is on the manual checklist.

### Haze as a wallpaper effect (question 5)

Haze is a live blurred layer, not a processed picture, so it does not go through our wallpaper image
worker. Selecting Haze shows the original picture through upstream's blur layer placed behind the app.
The other five effects are unchanged. The saved Halftone setting from older builds is untouched.

### Remote sessions: nine providers (question 3)

Upstream's remote host includes upstream's own Antigravity provider, which this fork deleted. The remote
provider list therefore drops Antigravity: nine providers on a remote session (Codex, Claude, Cursor, Grok,
OpenCode, Pi, omp, fx, Hermes). Porting our Antigravity and Cline to the remote host is a later task.

One upstream test says "the remote host exposes every local provider". With this decision that cannot be
true, so the test changes to "every provider is either remote or on a named local-only list (Antigravity,
Cline)". This is a deliberate change that follows from the answer to question 3, not a weakened test.

### Remote setup installs upstream's official host package

Found while reading: when the app sets up a remote machine, it downloads the host program for "the app's
own version" from upstream's GitHub releases. Our version label is `0.6.0-local1-upstream`, and no such
release exists, so setup would fail. Decision: for this download only, use the part of the label before the
first dash (`0.6.0`). Checked: upstream's `v0.6.0` release has host packages for macOS, Linux and Windows
with checksums, and nothing in the host changed between `v0.6.0` and `43aac9d`.

Consequence: the program on the remote machine is upstream's build. Our app still offers nine providers
there.

### Custom CLI paths: upstream's store, ours migrated once (analyst's D-04)

Upstream's store wins because its updater, MCP settings and provider start all read from it. Paths saved
by our build are copied into it at first start. Two behaviours change, both upstream's:

- A changed path takes effect after restarting the app (upstream marks it as pending).
- A path must be absolute, and the file name must be the provider's CLI name.

Our additions: Cline is accepted, and the Antigravity path keeps our own rules.

### Libraries (question 7) — checked on the registries, nothing odd

| Library | Source | Notes |
|---|---|---|
| `toml` 0.9 | toml-rs/toml, about 958 million downloads | MIT or Apache-2.0. Pinned to the 0.9 line while 1.x exists; upstream's choice. |
| `time` | time-rs/time, about 936 million downloads | MIT or Apache-2.0. |
| `arboard` | 1Password/arboard, about 49.5 million downloads | MIT or Apache-2.0. Clipboard. |
| `png` | image-rs/image-png, about 242 million downloads | MIT or Apache-2.0. |
| `tauri-plugin-global-shortcut` | tauri-apps/plugins-workspace, about 4.1 million downloads | Apache-2.0 or MIT. Declared for macOS only, so it is not compiled on Windows. |
| `esbuild` 0.28.2 (npm, build only) | evanw/esbuild | MIT. Has an install script that fetches its platform binary; normal for esbuild. Already in our lock file as an indirect package at the same version. |
| `@types/node` 26.5.0 (npm, build only) | DefinitelyTyped | MIT. No install scripts. Already in our lock file at the same version. |

## Decided by the reviewer (Claude) earlier

- Git helpers (commit message, PR text) stay tool-free and separate from BTW; they gain upstream's Cancel (D-07).
- Generated images: check who owns an image before a branch copy can delete it; add a test (D-09).
- Auto-resume after a usage limit lifts only the usage pause; a queue the user held stays held (D-10).
- Clean-merge repairs: add Cline to the new provider map, remove the duplicate line-ending type, drop the
  removed Codex helper call (D-11).
- Old saved workspaces and queues keep loading; new fields get safe defaults (D-12).
- Version label: `0.6.0-local1-upstream` in the same five files as earlier local builds (D-14).
