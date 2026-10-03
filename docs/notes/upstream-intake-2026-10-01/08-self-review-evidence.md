# Stage 8 — Self-review evidence

Verified by scripts/self-review.py. One fresh full merge-tree only in retained scratch, same tree/path set as stage3; all main Git operations read-only. No app checks executed.

## Cross-checks

527 paths reconcile:256 N+144 E+47 B+80 X. All527 group/action values rechecked against fresh Git diffs/tree; 128 ledger SHAs equal rev-list exactly;80X each belongs to one of27C; all new-product C and all15R map to D; all14D placed in rounds;23round1 instructions equal its X set;all28L in spec; all referenced IDs exist.

## Twenty fixed-interval TSV samples

Data-row indexes exclude header: floor(k×526/19)+1, k=0..19. Rechecked group, conflict kind, both Git actions, release range membership and U/L IDs.

| Row | Exact path | Group / kind | Upstream / local |
|---|---|---|---|
| 1 | `.gitattributes` | N  | A / - |
| 28 | `host/owner.ts` | N  | A / - |
| 56 | `scripts/test-remote-ssh.py` | N  | A / - |
| 84 | `src-tauri/src/session_store.rs` | X content | M / M |
| 111 | `src/app/shell/TitleBar.tsx` | B  | M / M |
| 139 | `src/features/connections/model/remoteSessionActions.ts` | N  | A / - |
| 167 | `src/features/files/ui/FileTree.tsx` | B  | M / M |
| 194 | `src/features/projects/model/projectLocationError.ts` | N  | A / - |
| 222 | `src/features/quick-composer/hooks/useQuickComposerLaunches.ts` | N  | A / - |
| 250 | `src/features/quick-composer/ui/QuickProjectIcon.tsx` | N  | A / - |
| 277 | `src/features/sessions/model/mcpCommand.ts` | N  | A / - |
| 305 | `src/features/sessions/ui/AccessPicker.tsx` | B  | M / M |
| 333 | `src/features/sessions/ui/ModelPicker.tsx` | X content | M / M |
| 360 | `src/features/settings/model/nativeGlass.test.ts` | N  | A / - |
| 388 | `src/features/source-control/model/stableDiff.ts` | N  | A / - |
| 416 | `src/features/workspace/ui/WorkspacePicker.tsx` | E  | M / - |
| 443 | `src/integrations/harness/providers/claude/claudeCatalog.ts` | X content | M / M |
| 471 | `src/integrations/harness/providers/fx/fx.ts` | E  | M / - |
| 499 | `src/integrations/harness/providers/pi/piSkills.ts` | E  | M / - |
| 527 | `vite.config.ts` | E  | M / - |

## Every size-L conflict re-verified

Fresh merged blobs re-read for each path; every hunk/side-line count recomputed and reconciled. Review of recommendations remains Inferred, not an executed resolution. Exact seams were read in stage4; tag1 full hunks read in stage7. Full contracts still have the stage4 Not analysed limits.

| C | Hunks | Combined side lines | Exact paths |
|---|---:|---:|---|
| C-02 | 8 | 192 | `src-tauri/src/fs.rs`; `src-tauri/src/lib.rs`; `src-tauri/src/main.rs`; `src-tauri/src/search.rs`; `src-tauri/src/window.rs` |
| C-03 | 9 | 845 | `src-tauri/src/harness.rs`; `src/integrations/harness/core/child.ts` |
| C-04 | 11 | 170 | `src/integrations/harness/core/availability.ts`; `src/features/sessions/ui/ModelPicker.tsx`; `src/integrations/harness/providers/claude/claudeCatalog.ts`; `src/integrations/harness/providers/codex/codexCatalog.ts` |
| C-07 | 7 | 267 | `src/app/shell/MenuBar.tsx`; `src/app/shell/ProjectRail.tsx`; `src/app/shell/Sidebar.tsx` |
| C-13 | 10 | 470 | `src/features/sessions/data/sessionStore.ts`; `src/features/sessions/data/sessionStore.test.ts`; `src/features/sessions/model/session.ts` |
| C-15 | 7 | 189 | `src/features/sessions/ui/AgentTranscript.tsx`; `src/features/sessions/ui/AgentTranscript.test.ts`; `src/features/sessions/ui/SessionPane.tsx`; `src/features/workspace/ui/PaneTree.tsx` |
| C-16 | 13 | 786 | `src/features/sessions/ui/Composer.tsx`; `src/features/sessions/ui/Composer.test.ts` |
| C-17 | 23 | 777 | `src/features/settings/model/appearance.ts`; `src/features/settings/model/settings.test.ts`; `src/features/settings/ui/SettingsView.tsx`; `src/styles/index.css` |
| C-19 | 20 | 380 | `src/features/source-control/ui/GitChangesPanel.tsx`; `src/features/source-control/ui/GitChangesPanel.test.ts`; `src/features/source-control/ui/SwitchBranchDialog.tsx`; `src/features/source-control/ui/SwitchBranchDialog.test.ts` |
| C-22 | 7 | 174 | `src/integrations/harness/core/registry.ts`; `src/integrations/harness/core/registry.test.ts`; `src/integrations/harness/index.ts` |
| C-24 | 9 | 173 | `src/integrations/harness/providers/claude/claude.ts`; `src/integrations/harness/providers/claude/claudeAdapter.ts`; `src/integrations/harness/providers/claude/claudeLive.test.ts`; `src/integrations/harness/providers/claude/claudeProtocol.test.ts` |
| C-25 | 13 | 219 | `src/integrations/harness/providers/codex/codex.ts`; `src/integrations/harness/providers/codex/codexAdapter.ts`; `src/integrations/harness/providers/codex/codexElicitation.test.ts`; `src/integrations/harness/providers/codex/codexLive.test.ts`; `src/integrations/harness/providers/codex/codexProtocol.ts` |
| C-26 | 37 | 702 | `src/integrations/harness/providers/claude/claudeText.ts`; `src/integrations/harness/providers/codex/codexText.ts`; `src/integrations/harness/providers/opencode/opencodeText.ts`; `src/integrations/harness/providers/opencode/opencodeText.test.ts`; `src/integrations/harness/providers/opencode/opencodeAdapter.ts` |

## Every High R risk re-verified

Narrow source assertions below prove declarations/call sites; failure timing/typecheck/runtime predictions remain Inferred. Also asserted missing Cline map/remote member and absent old Codex helper.

- Verified R-01: `src/integrations/harness/core/availabilityState.ts @ 43aac9d`; `Record<HarnessId` at 8: `export type HarnessAvailability = Record<HarnessId, boolean>;`.
- Verified R-01: `src/integrations/harness/core/availabilityState.ts @ 43aac9d`; `antigravity: false` at 20: `antigravity: false,`.
- Verified R-01: `src/features/sessions/model/session.ts @ c2c8bf6`; `cline` at 30: `| "cline"`; 43: `"cline",`; 478: `cline: "cline",`.
- Verified R-02: `host/providers.ts @ 43aac9d`; `providers/antigravity/` at 10: `import * as antigravity from "../src/integrations/harness/providers/antigravity/antigravity";`.
- Verified R-02: `host/providers.ts @ 43aac9d`; `antigravity.sendAntigravityTurn` at 143: `send: antigravity.sendAntigravityTurn,`.
- Verified R-03: `src/features/files/editor/editorDoc.ts @ be7d599`; `import` at 1: `import { diff } from "@codemirror/merge";`; 2: `import type { Annotation, ChangeSpec, Text } from "@codemirror/state";`; 3: `import { EditorView } from "@codemirror/view";`.
- Verified R-03: `src/features/files/editor/editorDoc.ts @ be7d599`; `LineEnding` at 5: `decodeLineEndings,`; 6: `encodeLineEndings,`; 7: `type LineEnding,`.
- Verified R-04: `src/integrations/harness/core/customBinary.ts @ c2c8bf6`; `monocode.customBinary` at 3: `const CUSTOM_BINARY_KEY_PREFIX = "monocode.customBinary.";`.
- Verified R-04: `src/features/providers/model/providerBinaryPaths.ts @ 43aac9d`; `monocode.providerBinaryPaths.v1` at 6: `const STORAGE_KEY = "monocode.providerBinaryPaths.v1";`.
- Verified R-05: `src/integrations/harness/providers/codex/codex.ts @ c2c8bf6`; `isCodexComputerUseAccessConfirmation` at 48: `isCodexComputerUseAccessConfirmation,`; 1166: `isCodexComputerUseAccessConfirmation(params)`.
- Verified R-05: `src/integrations/harness/providers/codex/codexElicitation.ts @ 43aac9d`; `codexMcpConfirmation` at 4: `export function codexMcpConfirmation(params: unknown): {`.
- Verified R-06: `src/features/providers/ui/HarnessUpdateNotice.tsx @ 43aac9d`; `probeHarnessAvailability` at 6: `probeHarnessAvailability,`; 49: `await probeHarnessAvailability();`.
- Verified R-08: `src/features/connections/model/protocol.ts @ 43aac9d`; `REMOTE_PROVIDERS` at 7: `export const REMOTE_PROVIDERS = [`; 19: `export type RemoteProvider = (typeof REMOTE_PROVIDERS)[number];`; 231: `REMOTE_PROVIDERS.some((provider) => provider === value)`.
- Verified R-08: `host/providers.ts @ 43aac9d`; `approve` at 42: `approve(id: string, request: number, decision: ApprovalDecision): void;`; 59: `approve: codex.respondCodexApproval,`; 70: `approve: claude.respondClaudeApproval,`.
- Verified R-11: `package.json @ 43aac9d`; `host:build` at 13: `"host:build": "tsc --noEmit -p host/tsconfig.json && node host/build.mjs",`; 14: `"host:package": "npm run host:build && node host/package.mjs",`; 16: `"pretest:host": "npm run host:build",`.
- Verified R-11: `package.json @ 43aac9d`; `test:host` at 16: `"pretest:host": "npm run host:build",`; 17: `"test:host": "vitest run --config host/vitest.config.ts",`.
- Verified R-11: `package.json @ 43aac9d`; `esbuild` at 76: `"esbuild": "0.28.2",`.
- Verified R-11: `.github/workflows/ci.yml @ 43aac9d`; `host` at 13: `host:`; 26: `- run: npm run test:host`; 27: `- run: npm run host:package`.
- Verified R-13: `src/integrations/harness/core/registry.test.ts @ 43aac9d`; `runTextPrompt` at 155: `const runTextPrompt = vi.fn(() => new Promise<string>(() => undefined));`; 157: `registerHarness(stub("claude", { runTextPrompt, stopTextPrompt }));`; 169: `expect(runTextPrompt).toHaveBeenCalledOnce();`.
- Verified R-13: `src/features/sessions/ui/ModelPicker.test.ts @ c2c8bf6`; `440` at 170: `expect(modelFlyout.style.height).toBe("440px");`.
- Verified R-13: `src/features/sessions/ui/ModelPicker.test.ts @ c2c8bf6`; `442` at 171: `expect(modelFlyout.dataset.minHeight).toBe("442");`; 172: `expect(modelFlyout.dataset.maxHeight).toBe("442");`.
- Verified R-15: `src/integrations/harness/providers/claude/claudeText.ts @ 43aac9d`; `permission` at 45: `permissionMode?: "plan";`; 97: `...(readOnly ? { permissionMode: "plan" as const, maxTurns: 1 } : {}),`; 300: `permissionMode: settings.permissionMode,`.
- Verified R-15: `src/integrations/harness/providers/claude/claudeText.ts @ 43aac9d`; `maxTurns` at 46: `maxTurns?: number;`; 97: `...(readOnly ? { permissionMode: "plan" as const, maxTurns: 1 } : {}),`; 301: `maxTurns: settings.maxTurns,`.
- Verified R-15: `src/integrations/harness/providers/codex/codexText.ts @ 43aac9d`; `mapCodexNotification` at 14: `mapCodexNotification,`; 434: `const mapped = mapCodexNotification(method, params);`.
- Verified R-15: `src/integrations/harness/providers/opencode/opencodeText.ts @ 43aac9d`; `part` at 44: `partById: Map<string, OpenCodePart>;`; 114: `parts: [{ type: "text", text: input.prompt }],`; 127: `const text = getOpenCodeTextResponse(result.parts);`.

## Corrections

- L-21 test anchor corrected from unrelated fork test to src/integrations/harness/providers/codex/codexLive.test.ts:1279
- L-22 test anchor corrected from unrelated fork test to src/integrations/harness/providers/claude/claudeLive.test.ts:296
- Removed unrelated D-02 update-notice reference from C-19 helper cancellation resolution.

## Main state and scratch

Verified HEAD/cache unchanged; clean porcelain; branch,17 branch names,3 stash names and3 worktree names equal stage0. Remote main now `1e97594ddf6f40aa24671f7fa09f2048deb1d5eb`; moved, analysis remains pinned; new uncached source Not checked.
Scratch `E:\Developing\OpenSource\mono-clone-scratch\intake-trial-20261001-1849`; logical file-byte sum 65877470 bytes (not allocated disk size); retained.

## Supplemental direct-source confirmation

- Verified R-03: scratch tree be7d599 editorDoc.ts:7 imports LineEnding and :22 declares/export type LineEnding; duplicate binding source fact confirmed manually. Typecheck failure remains Inferred.
- Verified R-13: registry.test.ts:75-111 @43aac9d explicitly lists ten text-prompt providers without Cline; preserved local ModelPicker.test.ts:170-172 dimensions are440/442.
- Verified R-11: ci.yml:23 and release.yml:406 @43aac9d use Node24.
- Correction: L-21 source anchor moved from unrelated form guard1324 to stopped-grant liveness1229-1231, with separate Plan guard1177. R-06 path/line corrected to providers/ui/HarnessUpdateNotice.tsx:49.
- Absent local action markers were valid UTF-8 em dashes; console rendered them misleadingly. Normalized to ASCII -; no Git classification changed.
- Self-review helper initially stopped on expected representation/parser mistakes (em-dash comparison, Counter(dict), guessed source token/path). No code operation occurred; assertions corrected against actual source before successful complete run.
