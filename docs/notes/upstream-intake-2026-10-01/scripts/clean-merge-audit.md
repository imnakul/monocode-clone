# Structural clean-merge audit

Verified full merged blobs read by script; excerpts below are structural evidence, not complete behavioral certification.
## src-tauri/Cargo.toml (L-03,L-13,L-14)
Local structural added lines present: 0/0; absent/reworded: 0.
## src-tauri/capabilities/default.json (L-17)
Local structural added lines present: 0/0; absent/reworded: 0.
## src-tauri/src/control.rs (no mapped L item)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: if inner
## src-tauri/src/pty.rs (L-14)
Local structural added lines present: 42/42; absent/reworded: 0.
Present: #[cfg(unix)]
Present: #[cfg(windows)]
Present: fn push(&mut self, chunk: &[u8]) {
Present: if self.bytes.len() > REPLAY_CAP {
Present: fn from(&self, offset: u64) -> (u64, &[u8]) {
## src/app/model/appLifecycle.test.ts (no mapped L item)
Local structural added lines present: 5/5; absent/reworded: 0.
Present: import { killPty } from "../../platform/tauri/pty";
Present: killPty: vi.fn().mockResolvedValue(undefined),
Present: expect(vi.mocked(killPty)).toHaveBeenCalledWith(dockFile.id);
Present: expect(vi.mocked(killPty)).toHaveBeenCalledWith(paneFile.id);
Present: expect(vi.mocked(killPty)).toHaveBeenCalledWith(dockFile.id);
## src/app/shell/SettingsRail.tsx (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/app/shell/SidebarRename.test.ts (L-09)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/app/shell/TitleBar.tsx (no mapped L item)
Local structural added lines present: 6/6; absent/reworded: 0.
Present: * (glass, wallpaper) and adds zero hitbox — it intercepts no pointer.
Present: function tabStripFadeMask(overflow: { left: boolean; right: boolean }): string {
Present: if (overflow.left && overflow.right) {
Present: if (overflow.left) {
Present: if (overflow.right) {
## src/features/files/editor/editorDoc.ts (L-27)
Local structural added lines present: 3/3; absent/reworded: 0.
Present: export type EditorDiskSession = {
Present: export function createEditorDiskSession(
Present: export function isDocDirty(current: Text, saved: Text | null): boolean {
## src/features/files/editor/editorGit.ts (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/files/ui/FilePaneNavigation.test.ts (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/files/ui/FileTree.tsx (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/inbox/model/githubTasks.ts (no mapped L item)
Local structural added lines present: 17/17; absent/reworded: 0.
Present: export function isCodeRabbitAuthor(login: string): boolean {
Present: export type ReviewIssue = {
Present: export type CodeReviewReport = {
Present: function capReportText(text: string, max: number): string {
Present: if ([...trimmed].length <= max) return trimmed;
## src/features/notes/notes.ts (no mapped L item)
Local structural added lines present: 6/6; absent/reworded: 0.
Present: export type NoteProjectChoice =
Present: export function noteProjectChoices(
Present: if (hasCurrent) {
Present: if (projects >= MAX_CREATE_PROJECT_CHOICES) break;
Present: if (!recent.path || !looksLikeProject(recent.path)) continue;
## src/features/projects/ui/SearchableProjectPicker.tsx (L-09)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/providers/model/rateLimits.ts (L-12)
Local structural added lines present: 3/3; absent/reworded: 0.
Present: export function formatRemainingPercent(usedPercent: number): string {
Present: export function formatQuotaPercent(
Present: if (remainingQuota) {
## src/features/sessions/model/attachments.ts (no mapped L item)
Local structural added lines present: 19/19; absent/reworded: 0.
Present: function bytesAt(bytes: Uint8Array, offset: number, prefix: number[]): boolean {
Present: if (bytes.length < offset + prefix.length) return false;
Present: export function sniffImageMime(bytes: Uint8Array): string | null {
Present: if (bytesAt(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
Present: if (bytesAt(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
## src/features/sessions/model/models.ts (no mapped L item)
Local structural added lines present: 12/12; absent/reworded: 0.
Present: id: "cline:anthropic/claude-sonnet-5",
Present: harness: "cline",
Present: id: "cline:anthropic/claude-opus-5",
Present: harness: "cline",
Present: id: "cline:z-ai/glm-5.3-flash",
## src/features/sessions/model/secondOpinion.ts (no mapped L item)
Local structural added lines present: 2/2; absent/reworded: 0.
Present: if (!options.probed(id)) return true;
Present: if (
## src/features/sessions/model/transcriptActivity.ts (L-25)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: if (block.role === "handoff" || block.branchOrigin) {
## src/features/sessions/ui/AccessPicker.tsx (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/sessions/ui/AttachmentChip.tsx (no mapped L item)
Local structural added lines present: 4/4; absent/reworded: 0.
Present: const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
Present: if (!loadPath) {
Present: setLoadedUrl(null);
Present: if (!cancelled) setLoadedUrl(url);
## src/features/sessions/ui/ModelPicker.test.ts (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/sessions/ui/SecondOpinionButton.tsx (no mapped L item)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: if (!available && hasProbedHarnessAvailability()) return;
## src/features/settings/model/appearance.test.ts (L-09)
Local structural added lines present: 14/14; absent/reworded: 0.
Present: const WALLPAPER_PATH_KEY = "monocode.wallpaperPath";
Present: const WALLPAPER_OPACITY_KEY = "monocode.wallpaperOpacity";
Present: const WALLPAPER_HALFTONE_KEY = "monocode.wallpaperHalftone";
Present: const WALLPAPER_EFFECT_KEY = "monocode.wallpaperEffect";
Present: localStorage.setItem(UI_FONT_KEY, "comic-sans");
## src/features/settings/model/newThreadBackgroundEffects.test.ts (L-09)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: it("allows wallpaper blob URLs to be read under both Tauri CSPs", () => {
## src/features/settings/model/settings.ts (L-09,L-19)
Local structural added lines present: 63/63; absent/reworded: 0.
Present: keywords: "glass tint blur wallpaper acrylic strength",
Present: id: "windows-wallpaper",
Present: label: "Windows wallpaper",
Present: keywords: "wallpaper image background picture desktop",
Present: id: "wallpaper-opacity",
## src/features/settings/ui/SettingsView.test.ts (L-19)
Local structural added lines present: 6/6; absent/reworded: 0.
Present: it("saves a custom helper and exposes account selection only for Claude and Codex", async () => {
Present: const helperRow = container.querySelector(
Present: '[data-setting-id="ai-helper"]',
Present: const modeButtons = helperRow.querySelectorAll<HTMLButtonElement>(
Present: container.querySelector('[data-setting-id="ai-helper-primary"]'),
## src/features/skills/model/skills.ts (L-17)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/skills/ui/SkillPicker.tsx (no mapped L item)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: export function ScopeButton({
## src/features/terminal/ui/TerminalView.tsx (L-08)
Local structural added lines present: 26/26; absent/reworded: 0.
Present: if (!started) {
Present: function DormantTerminalView({ id, cwd }: { id: string; cwd: string }) {
Present: function LiveTerminalView({ id, cwd, active, onMetaChange }: Props) {
Present: const [exitCode, setExitCode] = useState<number | null | undefined>(() =>
Present: const [spawnError, setSpawnError] = useState<string | null>(null);
## src/features/workspace/model/layout.test.ts (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/features/workspace/ui/SurfaceTabs.tsx (no mapped L item)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: if (isDiffTab(file)) {
## src/integrations/harness/core/apply.test.ts (L-20,L-23,L-24)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/integrations/harness/core/types.ts (L-03,L-20,L-23,L-24,L-25,L-28)
Local structural added lines present: 3/3; absent/reworded: 0.
Present: export type ApprovalScope = "once" | "session";
Present: export type NativeForkRequest = {
Present: export class NativeForkError extends Error {
## src/integrations/harness/providers/claude/claudeGit.ts (L-19)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/integrations/harness/providers/claude/claudeProtocol.ts (L-03,L-19,L-20,L-22,L-24,L-25,L-28)
Local structural added lines present: 55/55; absent/reworded: 0.
Present: export type ClaudeLiveKey = {
Present: model: string;
Present: export type ClaudeSwitchStep =
Present: | { type: "set_model"; model: string }
Present: export type ClaudeLiveSwitchPlan =
## src/integrations/harness/providers/codex/codexElicitation.ts (L-20,L-23)
Local structural added lines present: 78/78; absent/reworded: 0.
Present: export const CODEX_MCP_APPROVAL_KIND_KEYS: readonly string[] = [
Present: export function setCodexMcpApprovalKindKeysForTest(
Present: export function codexMcpApprovalKindKeys(): readonly string[] {
Present: export type CodexMcpToolGrant = { key: string };
Present: export type CodexInProgressMcpTool = { server: string; tool: string };
## src/integrations/harness/providers/codex/codexGit.ts (L-19)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/integrations/harness/providers/codex/codexProtocol.test.ts (L-19,L-20,L-25)
Local structural added lines present: 15/15; absent/reworded: 0.
Present: expect(buildThreadForkParams({ threadId: "source", lastTurnId: "turn-2", cwd: "/repo", runtimeMode: "auto", controlsAgents: true, model: "gpt-5.4", serviceTier: "fast" })).toEqual({
Present: threadId: "source", lastTurnId: "turn-2", excludeTurns: true, cwd: "/repo", approvalPolicy: "on-request", approvalsReviewer: "auto_review", sandbox: "workspace-write", model: "gpt-5.4", serviceTier: "fast",
Present: codexModelPage({ data: [{ model: "gpt-5.6-luna" }], nextCursor: "c1" }),
Present: ).toEqual({ rows: [{ model: "gpt-5.6-luna" }], nextCursor: "c1" });
Present: models: [{ model: "gpt-5.6-terra" }],
## src/integrations/harness/providers/opencode/opencode.ts (L-25)
Local structural added lines present: 5/5; absent/reworded: 0.
Present: if (!input.resume && input.fork) {
Present: if (forkPoint) {
Present: if (!messages.some(message => message.info?.id === forkPoint)) {
Present: if (!forked?.id) throw new NativeForkError("OpenCode could not open the original conversation.");
Present: if (id && role === "user" && !hidden && payloadSessionId === live.openCodeSessionId && live.activeTurn && !live.turnUserMessageId) {
## src/integrations/harness/providers/opencode/opencodeGit.ts (L-19)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/integrations/harness/providers/opencode/opencodeLive.test.ts (L-25)
Local structural added lines present: 2/2; absent/reworded: 0.
Present: if (input.method === "POST" && url.pathname === "/session/session_1/fork") {
Present: if (input.method === "GET" && url.pathname === "/session/session_2") {
## src/platform/tauri/fs.ts (L-09)
Local structural added lines present: 13/13; absent/reworded: 0.
Present: export async function pickFile(title = "Select binary"): Promise<string | null> {
Present: export async function pickImage(
Present: title = "Choose wallpaper",
Present: export function persistWallpaper(path: string): Promise<string> {
Present: invoke<string>("persist_wallpaper", { path }),
## src/platform/tauri/platform.ts (no mapped L item)
Local structural added lines present: 1/1; absent/reworded: 0.
Present: export const IS_WINDOWS = IS_WIN;
## src/shared/lib/paths.ts (no mapped L item)
Local structural added lines present: 0/0; absent/reworded: 0.
## src/shared/ui/Popover.tsx (L-10)
Local structural added lines present: 0/0; absent/reworded: 0.