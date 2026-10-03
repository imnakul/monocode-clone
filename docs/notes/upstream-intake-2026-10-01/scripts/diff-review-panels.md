### 81486bd U-034 v0.1.56 — Reconcile streamed Claude tool inputs
Changed paths: 2; diff lines excluding generated/docs/assets: 120
-    if (live.toolsById.has(use.id)) continue;
+    if (streamed) {
+      if (JSON.stringify(streamed.input) !== JSON.stringify(use.input)) {
+      if (use.name === "ExitPlanMode") {
+        if (plan) live.onEvent({ type: "plan", text: plan });

### ef17ac0 U-035 v0.1.56 — Deduplicate Codex text by item
Changed paths: 2; diff lines excluding generated/docs/assets: 230

### 9fb7710 U-001 v0.1.56 — Add slide-out sidebar drawer in compact rail
Changed paths: 2; diff lines excluding generated/docs/assets: 281
+    if (!drawerMode || !sidebarAvailable) setDrawerOpen(false);
+    if (drawerVisible) setDrawerMounted(true);
+    else if (!drawerClosing) setDrawerMounted(false);
+    if (!drawerRendered || !drawer) {
+    if (typeof drawer.animate !== "function" || reduceMotion) {
+      if (drawerClosing) setDrawerMounted(false);
+      if (drawerAnimation.current !== animation) return;
+      if (drawerClosing) setDrawerMounted(false);

### 4504eb0 U-036 v0.1.56 — Show background work when Claude yields
Changed paths: 12; diff lines excluding generated/docs/assets: 801
+        if (block.tool?.background) {
+          if (toolCallState(block) === "pending") tally.backgroundLive += 1;
+      if (tally.backgroundLive > 0) return "Running in background";
+      if (tally.runs === 0 && tally.background > 0) {
+        return "Finished in background";
-  return (
+  return background?.length ? (
+function backgroundLabel(tasks: string[]): string {

### 778b527 U-002 v0.1.56 — feat(appearance): add Haze chat background effect (#390)
Changed paths: 12; diff lines excluding generated/docs/assets: 567
-    if (!sourceKey || !src || effect === "none" || !key) return;
+    if (
-  if (!src || effect === "none") return src;
+  if (!src || effect === "none" || effect === "gradient-blur") return src;
+      return 1;
-  if (effect === "none") {
+  if (effect === "none" || effect === "gradient-blur") {
+export function GradientBlurBackground({

### 3e3a81c U-001 v0.1.56 — feat(sidebar): open project context menu while the rail is hidden (#389)
Changed paths: 9; diff lines excluding generated/docs/assets: 1848
-function projectMenuExtraItems(
-  if (canConfigureNotifications) {
-  if (canRemove) {
-  return items;
-        if (active) setExternalEditors(Array.isArray(installed) ? installed : []);
-        if (active) setExternalEditors([]);
-    return () => {
-      if (next.length === prev.length) return prev;

### c3005b0 U-001 v0.1.56 — Default collapsed project rail to icon mode
Changed paths: 3; diff lines excluding generated/docs/assets: 70

### 5548916 U-001 v0.1.56 — Adjust sidebar spacing and hide empty action groups
Changed paths: 2; diff lines excluding generated/docs/assets: 30

### b8e9a7f U-037 v0.1.56 — Preserve assistant message boundaries in streamed output
Changed paths: 5; diff lines excluding generated/docs/assets: 150
-  if (
+  if (last?.role === role && last.streaming) {
+  if (snapshot) closePendingAssistantMessage(live);
+function closePendingAssistantMessage(live: Live): void {
+  if (!live.pendingAssistantBoundary) return;

### 28b814a U-003 v0.1.56 — Added format on save toggle in settings (#396)
Changed paths: 4; diff lines excluding generated/docs/assets: 183
-        if (disposed || generation !== saveGeneration) return;
+        if (loadFormatOnSave()) {
+          if (disposed || generation !== saveGeneration) return;
-        if (
+          if (
+export const FORMAT_ON_SAVE_DEFAULT = true;
+export function loadFormatOnSave(): boolean {
+  return readFlag(FORMAT_ON_SAVE_KEY) ?? FORMAT_ON_SAVE_DEFAULT;

### 26e66e3 U-004 v0.1.56 — feat(settings): scope the Providers defaults to a project or globally (#395)
Changed paths: 16; diff lines excluding generated/docs/assets: 1410
+          if (s.id !== sessionId) return s;
+          return {
+ * `preferred` unless the project hides it, in which case the first provider the
+export function firstEnabledHarness(
+  if (enabled(preferred)) return preferred;
+  return HARNESSES.find(enabled) ?? preferred;
-export function defaultSessionChoice(): LastModelChoice {
+export function defaultSessionChoice(cwd?: string): LastModelChoice {

### e724cdf U-038 v0.1.56 — Remember the terminal dock side across projects (#400)
Changed paths: 6; diff lines excluding generated/docs/assets: 327
-          return [...prev, createProjectTerminal(projectPath, file)];
+          return [
+  function dockWorkspace(side: DockSide | null) {
+    return {
+  async function lastSavedDockSide(): Promise<DockSide | undefined | null> {
+    const { invoke } = await import("@tauri-apps/api/core");
+      .mocked(invoke)
+    return snapshot?.lastDockSide;

### 38a797e U-039 v0.1.56 — fix: open the file that match the activity log label, not preview.path (#330)
Changed paths: 6; diff lines excluding generated/docs/assets: 527
+    // versions") rather than a path. That description does not look like a
+    const label = "Edit dependency versions";
+export type ToolCallDisplay = {
+export function resolveToolCallDisplay(
+  // "Edit dependency versions"), and treating that phrase itself as a
+  if (!action || !target) {
+    return { fileName: "file", isFile: false, previewMatchesFile: true };
+  // unknown match must not render as if it were one. Only "no write preview

### 879ae4b U-040 v0.1.56 — Fix Codex Full Access MCP approvals (#402)
Changed paths: 6; diff lines excluding generated/docs/assets: 171
-    if (
+    if (!live.planning && live.runtimeMode === "full-access") {
-export function isCodexComputerUseAccessConfirmation(params: unknown): boolean {
-  return (

### b6baa44 U-005 v0.1.56 — feat(workspace): add preview tabs that reuse one temporary tab (#385)
Changed paths: 16; diff lines excluding generated/docs/assets: 702
-          if (existing) {
+              return result.tabs;
+          if (target?.paneId) activateTab(target.tabId, target.paneId);
+          else if (target) setActiveTabId(target.tabId);
-      if (prev.has(fileId) === dirty) return prev;
-      if (dirty) next.add(fileId);
-      return next;
+      return next.some((tab, index) => tab !== prev[index]) ? next : prev;

### bffe301 U-041 v0.1.56 — fix(pi): ignore tool progress updates after the tool ends (#391)
Changed paths: 2; diff lines excluding generated/docs/assets: 87
-    if (tool) {
+    if (tool && !tool.finished) {

### 3e28087 U-006 v0.1.56 — Add GitHub PR checks, job details, and AI repair tracking (#364)
Changed paths: 33; diff lines excluding generated/docs/assets: 6973
+pub struct GitHubPrCheck {
+    pub name: String,
+    pub workflow: String,
+    pub state: String,
+    pub url: Option<String>,
+    pub started_at: Option<String>,
+    pub completed_at: Option<String>,
+pub struct GitHubPrChecks {

### 618efe4 U-007 v0.1.56 — Add macOS floating quick composer (#398)
Changed paths: 65; diff lines excluding generated/docs/assets: 8336
-objc2-app-kit = { version = "0.3", features = ["NSApplication", "NSButton", "NSColor", "NSControl", "NSDockTile", "NSGraphics", "NSImage", "NSLayoutAnchor", "NSLayoutConstraint", "NSMenu", "NSMenuItem", "NSPasteboard", "NSPasteboardItem", "NSResponder", "NSUserInterfaceItemIdentification", "NSView", "NSVisualEffectView", "NSWindow", "objc2-core-foundation"] }
+objc2-app-kit = { version = "0.3", features = ["NSApplication", "NSButton", "NSColor", "NSControl", "NSDockTile", "NSGraphics", "NSImage", "NSLayoutAnchor", "NSLayoutConstraint", "NSMenu", "NSMenuItem", "NSPanel", "NSPasteboard", "NSPasteboardItem", "NSResponder", "NSUserInterfaceItemIdentification", "NSView", "NSVisualEffectView", "NSWindow", "objc2-core-foundation"] }
+#[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+            #[cfg(target_os = "macos")]
+            #[cfg(target_os = "macos")]
+            #[cfg(target_os = "macos")]
+            #[cfg(target_os = "macos")]

### 611e05b U-042 v0.1.56 — Release v0.1.56
Changed paths: 6; diff lines excluding generated/docs/assets: 27
-version = "0.1.55"
+version = "0.1.56"
-  "version": "0.1.55",
+  "version": "0.1.56",
-  "version": "0.1.55",
+  "version": "0.1.56",

### 0f8da85 U-043 v0.2.0 — fix: make composer controls responsive (#414)
Changed paths: 8; diff lines excluding generated/docs/assets: 135
-  return <Icon className={className} strokeWidth={1.75} />;
+  return (
-export const LockOpen = wrap(SquareUnlock01Icon, "LockOpen");
+export const Shield = wrap(ShieldAlertIcon, "Shield");

### 67ad7dd U-008 v0.2.0 — Add a BTW conversation feature on every agent message (#353)
Changed paths: 36; diff lines excluding generated/docs/assets: 5331
+      if (liveSessionIds.has(request.sessionId)) continue;
+        if (session.id !== sessionId) return session;
+        if (blockIndex < 0) return session;
+        if (!nextThread) return session;
+        return updatedSession;
+      if (!updatedSession) return undefined;
+      return updatedSession;
+        if (session.id !== sessionId) return session;

### 47db85e U-010 v0.2.0 — Show plan, email and org on provider accounts (#372)
Changed paths: 5; diff lines excluding generated/docs/assets: 475
+pub struct ProviderAccountIdentity {
+    pub email: Option<String>,
+    pub name: Option<String>,
+    pub plan: Option<String>,
+    pub organization: Option<String>,
+#[tauri::command]
+pub async fn provider_account_identity(
+fn home() -> Option<PathBuf> {

### 796e03a U-008 v0.2.0 — Embed BTW controls within transcript metadata
Changed paths: 2; diff lines excluding generated/docs/assets: 265
-    return <InitialThinking live />;
+    return <InitialThinking live embedded />;
-function InitialThinking({ live }: { live: boolean }) {
+function InitialThinking({

### dc5345a U-044 v0.2.0 — Fix model selection when resuming interrupted sessions (#422)
Changed paths: 5; diff lines excluding generated/docs/assets: 148
+  if (available.length === 0) {
+    return {
-  return (
+  return (fallbackId ? findModel(fallbackId) : undefined) ?? available[0];
+  if (modelsFor(model.harness).length === 0) return { ...current };
+  if (modelsFor(model.harness).length === 0) return { ...current };

### 762f1f8 U-045 v0.2.0 — fix: exit app when last window closes on Linux (#419)
Changed paths: 1; diff lines excluding generated/docs/assets: 44
+fn should_request_quit(code: Option<i32>) -> bool {
-            if code.is_none() {
-                #[cfg(target_os = "windows")]
+            if !should_request_quit(code) {
+#[cfg(test)]
+    fn explicit_exit_requests_quit() {
+    #[cfg(any(target_os = "linux", target_os = "windows"))]
+    fn last_window_close_requests_quit_without_dock() {

### b6f56e6 U-009 v0.2.0 — Add opt-in MonoCode app CLI for agent sessions (#423)
Changed paths: 41; diff lines excluding generated/docs/assets: 3687
+    fn prepare_app_grant(&mut self, session: &str, window: &str, cwd: &str) -> bool {
+        if self.workers.contains_key(session) || self.grants.contains_key(session) {
+            return false;
+fn request_grant(host: &Inner, namespace: &str, token: &str) -> Result<Grant, String> {
+        _ => return Err("Unknown control namespace".into()),
+    if namespace == "app"
+        return Err(APP_TURN_INACTIVE.into());
+        if error == APP_TURN_INACTIVE {

### 8257a97 U-046 v0.2.0 — Remember the selected sidebar tab per project
Changed paths: 7; diff lines excluding generated/docs/assets: 328
-      if (options.purgeData) forgetProjectLocation(normalized);
+      if (options.purgeData) {
+function isProjectSidebarTab(value: unknown): value is ProjectSidebarTab {
+  return value === "sessions" || value === "files" || value === "changes";
+function readAll(): StoredTabs {
+    if (!raw) return {};
+    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
+      return {};

### 2242bcd U-047 v0.2.0 — Defer Escape handling past later keydown listeners
Changed paths: 2; diff lines excluding generated/docs/assets: 41

### bb46e56 U-011 v0.2.0 — Add usage limit handling with auto-resume option
Changed paths: 21; diff lines excluding generated/docs/assets: 829
+      if (!session?.usageLimit || session.busy) return;
+      if (!limit?.resumeAtReset || limit.resetsAt == null) continue;
+      if (!usageLimitResumeDue(session, now)) {
+      if (usageResumingRef.current.has(session.id)) continue;
+          if (latest && usageLimitResumeDue(latest, Date.now())) {
+    if (Number.isFinite(nextCheck)) {
+    return () => {
+      if (!limit || limit.resetsAt != null) continue;

### e611f00 U-008 v0.2.0 — Refine metrics badge and BTW popover button styling
Changed paths: 2; diff lines excluding generated/docs/assets: 26

### 69f602d U-009 v0.2.0 — Rename the MonoCode command to /operator
Changed paths: 22; diff lines excluding generated/docs/assets: 695
-          if (monocodeCommand.matched) {
+          if (operatorCommand.matched) {
-            sendText += `\n\n<monocode_app>\nThe user's MonoCode command enables app access in this thread, including later turns without the command. You can start session tabs, read and continue other project sessions, save unsent drafts, organize session folders, and read saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs, read and continue other project sessions, save unsent drafts, organize session folders, and read saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
-  if (consumeMonocodeCommand(prompt).matched)
+  if (consumeOperatorCommand(prompt).matched)
-export const MONOCODE_COMMAND: BuiltinSkill = {
-export function consumeMonocodeCommand(text: string): {

### b3034f1 U-007 v0.2.0 — Add customizable Quick Composer global shortcut
Changed paths: 10; diff lines excluding generated/docs/assets: 884
-fn shortcut() -> Shortcut {
+fn parse_shortcut(value: &str) -> Result<Shortcut, String> {
+    if !shortcut
+        return Err("Use Command or Control with another key.".into());
-pub fn quick_composer_set_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
+pub fn quick_composer_set_enabled(
-    if enabled && !registered {
+    if enabled {

### 5725987 U-048 v0.2.0 — Add stableDiff utilities to prevent unnecessary re-renders
Changed paths: 2; diff lines excluding generated/docs/assets: 132
+export function reuseIfShallowEqual<T extends object>(
+  if (!previous) return next;
+  if (previousKeys.length !== nextKeys.length) return next;
+    if (!Object.is(previous[key], next[key])) return next;
+  return previous;
+export function reuseUnchangedById<T extends { id: string }>(
+    if (kept !== previous[index]) same = false;
+    return kept;

### 19b9922 U-049 v0.2.0 — Release v0.2.0
Changed paths: 6; diff lines excluding generated/docs/assets: 27
-version = "0.1.56"
+version = "0.2.0"
-  "version": "0.1.56",
+  "version": "0.2.0",
-  "version": "0.1.56",
+  "version": "0.2.0",

### 0d3db9c U-015 v0.3.0 — Add archive and delete actions to title tab menus
Changed paths: 3; diff lines excluding generated/docs/assets: 237
+    if (!tab) return [];
+    return leafIds(tab.layout).filter((id) => openSessionIds.has(id));
+      if (sessionIds.length === 1) {
+      } else if (sessionIds.length > 1) {
+    if (id === "archive") {
+    if (id === "delete") {
+function tab(id: string, sessionCount = 1): Tab {
+  return {

### f028d9e U-050 v0.3.0 — Restore Claude shell commands in session transcripts
Changed paths: 9; diff lines excluding generated/docs/assets: 334
+#[tauri::command(async)]
+pub fn claude_shell_commands(
+    if provider_session_id.is_empty()
+        return Err("Invalid Claude provider session id".into());
+    if tool_ids.is_empty() {
+        return Ok(HashMap::new());
+        Some(id) if id != "default" => crate::harness::provider_account_path(&app, "claude", id)?,
+        return Ok(HashMap::new());

### ed3c44c U-051 v0.3.0 — Support macOS terminal editing shortcuts
Changed paths: 3; diff lines excluding generated/docs/assets: 121
+function key(
+  return {
+export function macTerminalShortcutData(
+  if (event.ctrlKey || event.shiftKey) return null;
+  if (event.altKey && !event.metaKey) {
+    if (event.key === "ArrowLeft") return "\x1bb";
+    if (event.key === "ArrowRight") return "\x1bf";
+    return null;

### fde0d84 U-013 v0.3.0 — feat(settings): add configurable Agent CLI binary paths (#407)
Changed paths: 41; diff lines excluding generated/docs/assets: 2035
+pub struct ConfiguredBinary {
+    pub path: String,
+    pub args: Option<Vec<String>>,
+#[tauri::command(async)]
+pub fn harness_resolve_configured(
+fn initialize_runtime_binary_paths(
+    if runtime.is_none() {
+#[tauri::command]

### 1ce9057 U-014 v0.3.0 — feat(editor): highlight .jsonc files (#382)
Changed paths: 3; diff lines excluding generated/docs/assets: 37
+  if (extension === ".jsonc") {
+    return legacyLanguage(json);

### fd3ee03 U-052 v0.3.0 — Drop word-fade spans when fade animation finishes
Changed paths: 3; diff lines excluding generated/docs/assets: 57
-  if (streaming) streamed.current = true;

### ee56686 U-012 v0.3.0 — Feat/customizable keybindings (#438)
Changed paths: 23; diff lines excluding generated/docs/assets: 2852
+            #[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+pub struct KeybindingOverride {
+fn custom_accelerator(shortcut: &str) -> String {
+        value if value.starts_with("Key") => &value[3..],
+        value if value.starts_with("Digit") => &value[5..],

### c01e31b U-001 v0.3.0 — Refine compact sidebar icons and activity indicator
Changed paths: 3; diff lines excluding generated/docs/assets: 78
+export const Chatting = wrap(Chatting01Icon, "Chatting");
-export const Files = wrap(Files02Icon, "Files");
+export const FileScript = wrap(FileScriptIcon, "FileScript");

### d2a625e U-053 v0.3.0 — Run the same claude the user's shell does (#448)
Changed paths: 1; diff lines excluding generated/docs/assets: 131
-    #[cfg(not(windows))]
+    #[cfg(unix)]
+    #[cfg(not(any(unix, windows)))]
+/// So a binary written seconds ago — a CLI mid-upgrade, or a `--version` probe
+#[cfg(unix)]
+fn spawn_retrying_text_file_busy(cmd: &mut Command) -> std::io::Result<std::process::Child> {
+            Err(e) if is_text_file_busy(&e) => thread::sleep(Duration::from_millis(20) * attempt),
+            settled => return settled,

### c43c209 U-054 v0.3.0 — Fix completed GitHub issue status icon (#455)
Changed paths: 4; diff lines excluding generated/docs/assets: 113
+    pub state_reason: String,
+    fn parse_github_work_items_reads_issue_state_reason() {
-function inboxStatusMark(item: InboxItem): InboxStatusMark {
+export function inboxStatusMark(item: InboxItem): InboxStatusMark {
+    if (
+      return { Icon: CheckCircle, className: "text-violet-400/90", label };

### da554f5 U-055 v0.3.0 — Remove redundant Explorer changes button (#466)
Changed paths: 3; diff lines excluding generated/docs/assets: 118
-function FileTreeDiffButton({
-  return (

### 3fb4c11 U-056 v0.3.0 — fix(files): preserve CRLF line endings in the editor (#412)
Changed paths: 7; diff lines excluding generated/docs/assets: 706
+export function normalizeLineBreaks(value: string): string {
+  return value.includes("\r") ? value.replace(/\r\n?/g, "\n") : value;
+export type LineEnding = "\n" | "\r\n" | "\r";
+export function detectLineEnding(value: string): LineEnding {
+  return value.includes("\r\n") ? "\r\n" : value.includes("\r") ? "\r" : "\n";
+export function restoreLineEnding(value: string, eol: LineEnding): string {
+  return eol === "\n" ? value : value.replace(/\n/g, eol);
-  if (from === to) return [];

### 4186e97 U-057 v0.3.0 — Clash a keybinding against the modifier the platform uses (#453)
Changed paths: 1; diff lines excluding generated/docs/assets: 14

### 7aa645d U-058 v0.3.0 — fix(git): keep diff file paths relative to nested workspaces (#465)
Changed paths: 2; diff lines excluding generated/docs/assets: 123
-        if let Some(text) = git_run(root, &["diff", "--no-ext-diff", "--numstat", "--", "."]) {
+        if let Some(text) = git_run(
-    if let Some(names) = git_run(root, &["diff", "--name-only", "--no-renames", "--", "."]) {
+    if let Some(names) = git_run(
+    fn git_diff_files_keep_paths_relative_to_nested_workspace() {

### 90c5a65 U-059 v0.3.0 — fix: offer a second opinion from the same harness when only one is enabled (#421)
Changed paths: 4; diff lines excluding generated/docs/assets: 255
-    return activeHarness ? modelsFor(activeHarness) : [];
+    if (!activeHarness) return [];
+    return excludeFromModel && activeHarness === from && fromModel
+  // if it still has a model left to offer once that exclusion is applied.
+          if (!hasLiveCatalog(harness)) return true;
+          return harness === from

### ed696cc U-060 v0.3.0 — Clarify second opinion disabled state
Changed paths: 3; diff lines excluding generated/docs/assets: 33

### dd5c039 U-001 v0.3.0 — Reduce compact project picker mascot size
Changed paths: 1; diff lines excluding generated/docs/assets: 9

### 9b1ddc8 U-008 v0.3.0 — Move BTW side conversations into an animated sheet (#476)
Changed paths: 24; diff lines excluding generated/docs/assets: 4404
+          if (controller.signal.aborted) return;
+          if (controller.signal.aborted) return;
+        return false;
-      if (!sourceBlock) return;
+      if (!sourceBlock) return false;
-      if (existing?.status === "running") return;
-      if (existing && existing.sourceEndBlockId !== sourceEndBlockId) return;
+      if (existing?.status === "running") return false;

### 8463340 U-061 v0.3.0 — fix: don't crash pty-data listener on a malformed chunk (#472)
Changed paths: 2; diff lines excluding generated/docs/assets: 52
+export function decodePtyChunk(data: string): Uint8Array | null {
+    return decodeBase64(data);
+    return null;
+      if (!chunk) return;

### 6b313ab U-062 v0.3.0 — Let the turn go once an inline subagent has reported back (#452)
Changed paths: 5; diff lines excluding generated/docs/assets: 247
+export function planTurnKey(gen: number): string {
+  return `turn:${gen}:${crypto.randomUUID()}`;
+    if (isAgentToolName(tool.name)) settleInlineAgentTask(live, tool.id);
+function settleInlineAgentTask(live: Live, toolUseId: string): void {
+    if (task.toolUseId !== toolUseId || task.backgrounded) continue;
+  if (!settled) return;
+function emitInlineSubagent(taskId = "t1") {

### c9cdc57 U-063 v0.3.0 — Release v0.3.0
Changed paths: 6; diff lines excluding generated/docs/assets: 27
-version = "0.2.0"
+version = "0.3.0"
-  "version": "0.2.0",
+  "version": "0.3.0",
-  "version": "0.2.0",
+  "version": "0.3.0",

### c576783 U-009 v0.4.0 — Add Operator note writing support
Changed paths: 9; diff lines excluding generated/docs/assets: 325
-            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs, read and continue other project sessions, save unsent drafts, organize session folders, and read saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+              return saved;
+      return created;
+function noteBody(value: unknown): string {
+  if (typeof value !== "string" || value.length > 240_000)
+  return value.replace(/\r\n?/g, "\n");
+function noteTags(value: unknown): string[] {

### 1dd1fc0 U-016 v0.4.0 — Open several projects from one folder picker (#443)
Changed paths: 5; diff lines excluding generated/docs/assets: 539
+      if (!last) return;
-      if (!looksLikeProject(normalized)) return;
+      if (blank) onCwdChange(blank.sessionId, blank.path);
+      if (created.length > 0) {
+        case "create":
+        case "activate":
-        case "activate":
-        case "create":

### 04da09f U-064 v0.4.0 — perf: bound and cancel work across search hot paths (#462)
Changed paths: 15; diff lines excluding generated/docs/assets: 2320
-rusqlite = { version = "0.40.2", features = ["bundled"], default-features = false }
+rusqlite = { version = "0.40.2", features = ["bundled", "hooks"], default-features = false }
+pub(crate) fn list_project_files_sync_cancellable(
-    if let Some(files) = git_ls_files(&root) {
+    if cancel.is_some_and(|token| token.load(Ordering::Acquire)) {
+        return Ok(Vec::new());
+    if let Some(files) = git_ls_files(&root, cancel) {
+    if cancel.is_some_and(|token| token.load(Ordering::Acquire)) {

### d836e22 U-017 v0.4.0 — Paste a screenshot into the composer, and attach a copied file or folder (#479)
Changed paths: 24; diff lines excluding generated/docs/assets: 2215
+arboard = { version = "3.6", features = ["wayland-data-control"] }
+    #[cfg(unix)]
-#[tauri::command]
-pub fn clipboard_file_paths() -> Vec<String> {
+fn wl_paste(mime: &str) -> WlPaste {
+    if std::env::var_os("WAYLAND_DISPLAY").is_none() {
+        return WlPaste::Unavailable;
+        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return WlPaste::Unavailable,

### bef7c90 U-065 v0.4.0 — Clear terminal on Cmd+K when App: Search is disabled or rebound (#491)
Changed paths: 3; diff lines excluding generated/docs/assets: 72
+export function isMacTerminalClearShortcut(event: TerminalKeyEvent): boolean {
+  return (
+      if (IS_MAC && isMacTerminalClearShortcut(event)) {
+        if (event.isComposing) return false;
+        if (event.type === "keydown") {
+        return false;

### 7646575 U-010 v0.4.0 — Show per-account usage and readiness in Settings and the footer picker (#492)
Changed paths: 10; diff lines excluding generated/docs/assets: 1119
+function SwitchSuggestion({
+  return (
-function barClass(pct: number): string {
-  if (pct >= 90) return "bg-red-400";
-  if (pct >= 80) return "bg-amber-400";
-  return "bg-content/45";
+vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
+function window(

### 4f6c17e U-066 v0.4.0 — Let git find gpg when MonoCode is launched from Finder (#484)
Changed paths: 2; diff lines excluding generated/docs/assets: 75
+fn with_signing_hint(error: String) -> String {
+    if !error.contains("failed to sign") && !error.contains("ssh-keygen") {
+        return error;
+    fn git_cmd_uses_gui_search_path() {
+    fn signing_hint_ignores_other_errors() {
+    fn git_commit_reports_signing_failure_with_hint() {
+        if !init_git_commit(&dir.0, &[("a.txt", "a\n")]) {

### daaa953 U-018 v0.4.0 — Support splitting new sessions into adjacent panes
Changed paths: 7; diff lines excluding generated/docs/assets: 322
-            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs or split session panes right or down, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be used as besideSessionId to split its pane again or moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+          if (!anchor || !sameProjectPath(anchor.cwd, cwd) || !tab)
+          return tab.id;
+      if (!tab) throw new Error("Target pane unavailable");
+      return tab.id;
+    // leave behind an orphaned launch if placement fails.
+    if (!tabId) throw new Error("The target pane is unavailable");

### 52640dc U-067 v0.4.0 — Fedora rpm packaging (#362)
Changed paths: 6; diff lines excluding generated/docs/assets: 369
+        # scripts/install-linux-deps-fedora.sh (EPEL 10 + CRB), which is the
+      - name: Install system dependencies
+        run: bash scripts/install-linux-deps-fedora.sh
+          node-version: 20
+          if (( ${#bundle[@]} != 1 )); then
+            if ! grep -qx "$dep" <<<"$requires"; then
+          if (( ${#bundle[@]} != 1 )); then
+          # when a library or GLIBC version is actually missing.

### 312f781 U-010 v0.4.0 — Cache provider rate limits across views and remounts
Changed paths: 9; diff lines excluding generated/docs/assets: 995
-      if (inflight.current) return inflight.current;
-      if (!fetchClaude && !fetchCodex && !fetchOpencode) return;
-      if (force) setRefreshing(true);
-      if (fetchClaude) {
-            if (accountId === claudeAccountRef.current) setClaude(value);
-      if (fetchCodex) {
-            if (accountId === codexAccountRef.current) setCodex(value);
-      if (fetchOpencode) {

### f8769ee U-068 v0.4.0 — Disable persisted checkout credentials in release workflow
Changed paths: 1; diff lines excluding generated/docs/assets: 9

### d4a1c5d U-019 v0.4.0 — Add pi usage (#431)
Changed paths: 13; diff lines excluding generated/docs/assets: 1315
+time = { version = "0.3", features = ["parsing"] }
+pub enum PiUsageProvider {
+pub struct UsageWindows {
+pub enum PiUsageResult {
+    fn key(self) -> &'static str {
+    fn endpoint(self) -> &'static str {
+#[tauri::command]
+pub async fn fetch_pi_usage(provider: PiUsageProvider) -> PiUsageResult {

### fce518c U-009 v0.4.0 — Add worktree management to agent app CLI
Changed paths: 5; diff lines excluding generated/docs/assets: 301
-            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs or split session panes right or down, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be used as besideSessionId to split its pane again or moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+            sendText += `\n\n<monocode_app>\nThe user's Operator command enables app access in this thread, including later turns without the command. You can start session tabs or split session panes right or down, list and create project worktrees, choose a new session's checkout, read and continue other project sessions, save unsent drafts, organize session folders, and read or write saved notes through its local CLI. Run \`${cli} --help\` for exact commands and JSON fields, then use it as needed for the user's request. When reading another session, start with its latest two or three user/assistant exchanges. Request older exchanges with nextBefore or a larger excerpt only if needed. The CLI uses a session credential already in your environment; never print it. New sessions inherit this session's permission mode unless runtimeMode is set explicitly. For a new session with a draft, call sessions.start with its prompt and draft:true; do not submit a seed prompt. The returned ID can be used as besideSessionId to split its pane again or moved into a folder immediately. A normal sessions.start submits its prompt but returns after acceptance, so do not wait for that agent to finish before organizing it.\n</monocode_app>`;
+  if (worktreeCwd && workspaceMode !== "current")
+      if (input.worktreeCwd !== undefined) {
+        if (!chosen)
+    case "worktrees.list":
+      return host.worktrees(requireProject(source));
+    case "worktrees.create": {

### 158ce78 U-010 v0.4.0 — Add rate limit polling intervals
Changed paths: 1; diff lines excluding generated/docs/assets: 9
+export const RATE_LIMIT_POLL_MS = 15 * 60_000;
+export const RATE_LIMIT_MIN_REFETCH_MS = 5 * 60_000;

### 6b8376f U-069 v0.4.0 — Keep Claude versioned models on their full native ids (#488)
Changed paths: 4; diff lines excluding generated/docs/assets: 453
+  it("keeps saved Claude versions distinct from a live alias", () => {
+  it("prefers the bundled versioned model over a singleton fuzzy match", () => {
+  it("keeps a lone fuzzy match for a versioned id", () => {
+  it("keeps a saved alias when live discovery lists only versions", () => {
+function expectedNative(id: string, nativeId?: string): string {
+  if (nativeId !== undefined) return nativeId;
+  return colon >= 0 ? id.slice(colon + 1) : id;
+function bundledByHarness(): Map<string, AgentModel[]> {

### 79ca374 U-070 v0.4.0 — Preserve unknown Claude model versions
Changed paths: 2; diff lines excluding generated/docs/assets: 66
+  it("keeps a saved Claude version missing from both catalogs", () => {
+    // A saved concrete Claude version may be absent from both catalogs.
+    if (harness === "claude" && /^claude:[a-z][a-z0-9-]*-\d/.test(requested)) {
+      return { id: requested, harness, name: nativeId, nativeId };
-  return harness === "claude" ? claudeNativeId("claude", slug) : slug;
+  // Picker keys can use dotted versions (`opus-4.8`), while Claude's CLI
+  return harness === "claude"

### 4171683 U-071 v0.4.0 — fix(projects): keep project name visible in picker when parent path is long (#507)
Changed paths: 1; diff lines excluding generated/docs/assets: 13

### 0bd9946 U-020 v0.4.0 — fix(codex): persist and render generated images (#399)
Changed paths: 23; diff lines excluding generated/docs/assets: 1433
+pub struct GeneratedImageAsset {
+#[tauri::command]
+pub async fn save_generated_image(
+fn save_generated_image_sync(
+    if data.len() as u64 > MAX_GENERATED_IMAGE_DATA_BYTES {
+        return Err(format!(
+    if bytes.is_empty() || bytes.len() as u64 > MAX_GENERATED_IMAGE_BYTES {
+        return Err(format!(

### ec59d92 U-021 v0.4.0 — Add `Cmd/Ctrl+Shift+C` to copy the explorer path (#404)
Changed paths: 2; diff lines excluding generated/docs/assets: 123
+function press(el: HTMLElement, init: KeyboardEventInit) {
+  return act(async () => {
+    if (!rootRow) throw new Error("Root row not rendered");
+function shortcutLetter(e: ReactKeyboardEvent): string {
+  if (/^[a-z]$/.test(key)) return key;
+  return /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : key;
+    if (mod && !e.altKey && e.shiftKey && key === "c") {

### 38d8f58 U-022 v0.4.0 — Add plan and orchestrator turn celebrations
Changed paths: 12; diff lines excluding generated/docs/assets: 930
+  if (
-export function shouldCelebrateMonocode(
-  if (startedAt == null || celebrated.has(blockId)) return false;
-  return age >= 0 && age < FRESH_MS;
-    if (!sparkles) return;
-    return () => clearTimeout(timer);
-  if (!sparkles || done) return null;
+  if (!active) return null;

### 7288fb6 U-072 v0.4.0 — Release v0.4.0
Changed paths: 6; diff lines excluding generated/docs/assets: 27
-version = "0.3.0"
+version = "0.4.0"
-  "version": "0.3.0",
+  "version": "0.4.0",
-  "version": "0.3.0",
+  "version": "0.4.0",

### 413d699 U-073 v0.4.1 — Fix project rail reopening lag and release v0.4.1
Changed paths: 11; diff lines excluding generated/docs/assets: 148
-version = "0.4.0"
+version = "0.4.1"
-  "version": "0.4.0",
+  "version": "0.4.1",
-  "version": "0.4.0",
+  "version": "0.4.1",
+    if (visible) return;
+  if (railVisible) railMounted.current = true;

### 9eebd89 U-074 v0.4.2 — Reduce startup and transcript UI performance costs
Changed paths: 9; diff lines excluding generated/docs/assets: 459
+fn git_cmd_with_gui_path() -> Command {
+fn git_cmd_for_args(args: &[&str]) -> Command {
+    if matches!(
-pub(crate) fn cleanup_orphaned_generated_images(
-        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
-        Err(error) => return Err(error.to_string()),
-        if !path.starts_with(&root) || !path.is_file() || referenced.contains(&path) {
-    fn git_cmd_uses_gui_search_path() {

### e3220ca U-075 v0.4.2 — Add performance regression guards and release v0.4.2
Changed paths: 10; diff lines excluding generated/docs/assets: 197
-version = "0.4.1"
+version = "0.4.2"
-  "version": "0.4.1",
+  "version": "0.4.2",
+[dev-dependencies]
+tauri = { version = "2", features = ["test"] }
-fn git_cmd_with_gui_path() -> Command {
+fn git_cmd_for_args_with_path(args: &[&str], gui_path: impl FnOnce() -> String) -> Command {

### 6ffc995 U-076 v0.4.3 — Make startup regression test work on Windows and prepare v0.4.3
Changed paths: 8; diff lines excluding generated/docs/assets: 127
-version = "0.4.2"
+version = "0.4.3"
-  "version": "0.4.2",
+  "version": "0.4.3",
-[dev-dependencies]
-tauri = { version = "2", features = ["test"] }
-fn init_with<R: tauri::Runtime>(
+fn init_with(

### 2515c15 U-023 v0.5.0 — Add remote agent sessions with SSH setup for Windows, macOS, and Linux (#432)
Changed paths: 128; diff lines excluding generated/docs/assets: 20669
+          node-version: 24
+          node-version: 24
+export const MAX_REMOTE_ATTACHMENT_BYTES = 20 * 1024 * 1024;
+export function attachmentPath(store: HostStore, id: string): string {
+  if (!UUID.test(id)) throw new Error("Invalid attachment ID");
+  return join(store.attachmentDir, id);
+export function writeAttachmentChunk(
+  if (

### 67ffc0b U-077 v0.5.0 — Publish updater feed after host release assets (#528)
Changed paths: 1; diff lines excluding generated/docs/assets: 95
+          if (( ${#HOST_ARCHIVES[@]} != 6 )); then
+            if [[ ! -f "$archive.sha256" ]]; then
+          if ! gh release view "$GITHUB_REF_NAME" >/dev/null 2>&1; then
+          if (release.isDraft !== (process.argv[3] === "true")) {
+            if (!names.has(name)) {
+          if [[ "$IS_DRAFT" == true ]]; then

### 553b1a2 U-078 v0.5.0 — Wait for provider guard before Windows test cleanup
Changed paths: 1; diff lines excluding generated/docs/assets: 27

### d8377d2 U-079 v0.5.0 — Improve automation card layout and accessibility
Changed paths: 1; diff lines excluding generated/docs/assets: 57

### 6c4b1c6 U-080 v0.5.0 — Prevent auto-scroll re-pinning when scrolling away from bottom
Changed paths: 2; diff lines excluding generated/docs/assets: 94
-      if (isNearBottom(el)) stickToBottom.current = true;
+      if (isNearBottom(el) && distance <= lastDistance) {

### 52cc279 U-081 v0.5.0 — Hold reader's place when turns above viewport resize
Changed paths: 2; diff lines excluding generated/docs/assets: 144
+function useTurnScrollAnchor(
+    if (!enabled || !el || !inner) return;
+      if (!el.isConnected) return;
+        if (previous === undefined || stickToBottom.current) continue;
+        if (top + previous <= viewportTop) shift += height - previous;
+      if (shift) el.scrollTop += shift;
+        if (observed.has(turn) || !turn.classList.contains("transcript-turn"))
+          if (!(node instanceof Element)) continue;

### 70bb586 U-082 v0.5.0 — Simplify turn removal handling in scroll anchor
Changed paths: 1; diff lines excluding generated/docs/assets: 23
-          if (!(node instanceof Element)) continue;
+      if (records.some((record) => record.removedNodes.length > 0)) {

### 22358b5 U-023 v0.5.0 — Add remote access support for remaining providers (#539)
Changed paths: 32; diff lines excluding generated/docs/assets: 1733
+      const resolved = await backend.invoke<{ path: string; args?: string[] }>(
+      if (provider === "antigravity")
+    const output = await backend.invoke<string>("harness_exec", {
+      backend.invoke("harness_exec", {
+      await backend.invoke("harness_read_text_file", {
+      await backend.invoke("harness_read_text_file", {
+    if (request.url === "/event") {
+  if (!address || typeof address === "string")

### 1a3215d U-083 v0.5.0 — Optimize app startup and batched harness updates
Changed paths: 18; diff lines excluding generated/docs/assets: 742
+  return { default: module.SearchView };
+  return { default: module.SettingsView };
+  return { default: module.InboxView };
+  return { default: module.LinkedWorkItemPanel };
+  return { default: module.NotesView };
+  return { default: module.AutomationsView };
-function cancelScheduledFlush(handle: ScheduledFlush | null) {
-  if (!handle) return;

### bf32549 U-084 v0.5.0 — Increase Windows integration test timeouts
Changed paths: 2; diff lines excluding generated/docs/assets: 32

### a28a998 U-024 v0.5.0 — Add Help menu links for website and GitHub
Changed paths: 1; diff lines excluding generated/docs/assets: 40
-        return Menu::with_items(app, &[&app_menu, &file, &edit, &view, &window_menu]);
+        return Menu::with_items(app, &[&app_menu, &file, &edit, &view, &window_menu, &help]);

### a7e1f3d U-025 v0.5.0 — Allow canceling generated commit messages
Changed paths: 16; diff lines excluding generated/docs/assets: 623
-  return document.querySelector<HTMLButtonElement>(
+  return document.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
+      if (generateAbortRef.current) {
-    if (!canGenerate) return;
+    if (!canGenerate || generateAbortRef.current) return;
+      if (!controller.signal.aborted) setMessage(generated);
+      if (!controller.signal.aborted) fail(error);
+      if (generateAbortRef.current === controller) {

### b46230e U-085 v0.5.0 — Prepare v0.5.0 release
Changed paths: 7; diff lines excluding generated/docs/assets: 27
-version = "0.4.3"
+version = "0.5.0"
-  "version": "0.4.3",
+  "version": "0.5.0",
-  "version": "0.4.3",
+  "version": "0.5.0",

### 16e9fea U-026 v0.6.0 — Add session ID copying to the sidebar
Changed paths: 5; diff lines excluding generated/docs/assets: 211
+      .prepare("SELECT summary FROM sessions WHERE id=?")
-        return cached?.model && cached.needsInput !== undefined
+        if (
+          return cached;
+        return fresh;
+    if (id === "copy-harness-session-id" || id === "copy-monocode-session-id") {
+      if (value) {
+  function openCopyIdMenu(sessionId: string) {

### d0943b1 U-027 v0.6.0 — Show remaining usage in provider meters
Changed paths: 4; diff lines excluding generated/docs/assets: 176

### a04624f U-023 v0.6.0 — Fix Windows host ACLs, PowerShell errors, and stale remote catalogs (#567)
Changed paths: 8; diff lines excluding generated/docs/assets: 273
+ * modification time, which invalidates the catalog the old version reported. */
+async function providerBinaries(providers: RemoteProvider[]): Promise<string> {
+        return `${file}:${(await stat(file)).mtimeMs}`;
+        return "";
+  return binaries.join("\n");
-          if (catalogs.get(cwd) === catalog) catalogs.delete(cwd);
+          if (catalogs.get(cwd)?.catalog === catalog) catalogs.delete(cwd);
+export function powershellErrorText(stderr: string): string {

### af4c01d U-086 v0.6.0 — Stop triple-click in agent replies from running to the end of the reply (#535)
Changed paths: 3; diff lines excluding generated/docs/assets: 117
+function DirectionalBlock({ dir, ...props }: BlockProps) {
+  return dir ? (
-  return renderToStaticMarkup(
+  return renderToStaticMarkup(createElement(AgentMarkdown, { text: sample }));

### 877ab2c U-087 v0.6.0 — Show one row per background subagent (#536)
Changed paths: 2; diff lines excluding generated/docs/assets: 221
+function unclaimedAgentCall(
+    if (!isAgentToolName(tool.name) || claimed.has(tool.id)) continue;
+    if (stringField(tool.input, "description") === description) match = tool.id;
+  return match;

### dad02c1 U-088 v0.6.0 — Fix launch crash on macOS 12 caused by empty Window menu (#509)
Changed paths: 1; diff lines excluding generated/docs/assets: 15

### 41b0b8e U-089 v0.6.0 — Fix/claude subagent error output (#569)
Changed paths: 23; diff lines excluding generated/docs/assets: 684
+export function isFailedStatus(status?: string): boolean {
+  return (
-  if (
-    return "rejected";
+  if (isFailedStatus(status)) return "rejected";
-  return tools === 1 ? "1 step" : `${tools} steps`;
+  if (!failed) return count;
+  return `${count}, ${failed === 1 ? "1 failed" : `${failed} failed`}`;

### c9892f0 U-090 v0.6.0 — fix: highlight text and untagged code fence as js (#471)
Changed paths: 3; diff lines excluding generated/docs/assets: 185
+function highlightLanguageFor(language: string): string {
+  return PLAINTEXT_FENCE_LANGUAGES.has(language.toLowerCase()) ? "js" : language;

### 71fd1b5 U-028 v0.6.0 — Add configurable file editor autosave (#475)
Changed paths: 8; diff lines excluding generated/docs/assets: 471
+            #[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+#[cfg(target_os = "macos")]
+fn set_autosave_menu_checked(app: &AppHandle, enabled: bool) {
+#[cfg(target_os = "macos")]
+#[tauri::command]
+pub fn autosave_set_enabled(app: AppHandle, enabled: bool) {

### 1595870 U-029 v0.6.0 — Add harness update detection and in-app update UI
Changed paths: 10; diff lines excluding generated/docs/assets: 822
-fn is_resolved_harness_binary(
+pub(crate) fn is_resolved_harness_binary(
+    if output.status.success() || !stdout.trim().is_empty() {
+        return Ok(stdout);
+pub(crate) fn exec_output(
-            if output.status.success() || !stdout.trim().is_empty() {
-                return Ok(stdout);
+/// their own installers with no public version feed to compare against.

### cdc1441 U-091 v0.6.0 — Use dashboard icon for session sidebar toggle
Changed paths: 2; diff lines excluding generated/docs/assets: 25
+export const DashboardSquare = wrap(DashboardSquare01Icon, "DashboardSquare");

### adbe2db U-010 v0.6.0 — Protect provider account emails until revealed
Changed paths: 9; diff lines excluding generated/docs/assets: 399
+import { invoke } from "@tauri-apps/api/core";
+  invoke: vi.fn(async () => null),
+  vi.mocked(invoke).mockReset().mockResolvedValue(null);
+    vi.mocked(invoke).mockImplementation(async (command) =>
-export function identitySubtitle(
-  return parts.length ? parts.join(" · ") : null;
+export function ProviderAccountSubtitle({
+  if (!identity?.plan && !identity?.email) {

### b4f5bef U-092 v0.6.0 — Fix interface scale breaking the UI while dragging (#559)
Changed paths: 5; diff lines excluding generated/docs/assets: 85
+export const UI_SCALE_PERCENTS = Array.from(

### 0f71918 U-028 v0.6.0 — Use fake timers before mounting the file editor
Changed paths: 1; diff lines excluding generated/docs/assets: 30

### e691b46 U-030 v0.6.0 — feat(mcp): add provider-wide MCP settings and server modal (#458)
Changed paths: 27; diff lines excluding generated/docs/assets: 3866
-    if !inner
+    if inner
+fn claude_mcp_command(args: Vec<String>, cwd: String, timeout: Duration) -> Result<String, String> {
+fn mcp_command(
+    if !workdir.is_dir() {
+        return Err("Project directory does not exist".into());
+            return Err("Claude MCP command timed out".into());
+    if output.status.success() {

### 2cfc178 U-093 v0.6.0 — fix(claude): show TaskCreate/TaskUpdate in the todo panel (#513)
Changed paths: 15; diff lines excluding generated/docs/assets: 957
-    if (key) return block.taskList?.key === key;
+    if (key) {
+      if (block.taskList?.key !== key) return false;
+      return (
+  if (!blocks || !adapter?.restoreTaskLists) return;
+  if (lists.length > 0) adapter.restoreTaskLists(threadId, lists);
+  if (tasksByThread.get(threadId)?.providerSessionId !== sessionId) {
+export function restoreClaudeTaskLists(

### 8bba3cc U-023 v0.6.0 — Preserve host session creation timestamps
Changed paths: 2; diff lines excluding generated/docs/assets: 58

### 1b39ceb U-031 v0.6.0 — Enable transparent glass on Linux in dark mode (#561)
Changed paths: 12; diff lines excluding generated/docs/assets: 522
-pub fn disable_glass(window: &WebviewWindow) {
+pub fn disable_glass(window: &WebviewWindow, r: u8, g: u8, b: u8) {
-#[cfg(any(target_os = "macos", target_os = "windows"))]
+#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
+pub struct Rgb {
+    pub r: u8,
+    pub g: u8,
+    pub b: u8,

### 2cbd506 U-031 v0.6.0 — Preserve glass transitions for reduced-motion tabs
Changed paths: 1; diff lines excluding generated/docs/assets: 28

### 1708c42 U-030 v0.6.0 — fix(mcp): allow OpenCode 2 global timeout settings (#580)
Changed paths: 1; diff lines excluding generated/docs/assets: 144
+fn is_opencode_timeout_settings(value: &Value) -> bool {
-            if mcp
+            if mcp.iter().any(|(key, value)| {
+    fn adds_opencode_two_server_without_changing_existing_timeouts_or_servers() {
+    fn rejects_legacy_server_named_timeout_without_changing_config() {
+    fn adds_opencode_two_server_with_timeouts_and_no_existing_servers_map() {

### fec434a U-030 v0.6.0 — Cache MCP settings and add project selection
Changed paths: 4; diff lines excluding generated/docs/assets: 492
+import { invoke } from "@tauri-apps/api/core";
+export type McpServerRow = McpConnection & { status: string };
+export function getCachedMcpSettings(cwd: string) {
+  return snapshots.get(cwd);
+export function loadMcpSettings(cwd: string, force = false) {
+  if (cached && !force) return cached;
+    if (requests.get(cwd) === request) snapshots.set(cwd, snapshot);
+    return snapshot;

### 6e58a42 U-023 v0.6.0 — Normalize Unix bootstrap scripts to LF line endings
Changed paths: 2; diff lines excluding generated/docs/assets: 56
+# Shell scripts are also embedded in the desktop app and sent to Unix hosts.
+fn bootstrap_script_from_template(platform: HostPlatform, template: &str) -> String {
+    fn unix_bootstrap_accepts_windows_checkout_line_endings() {

### e322b7f U-030 v0.6.0 — Cache MCP discovery and honor provider binary settings
Changed paths: 11; diff lines excluding generated/docs/assets: 1017
+    pub(crate) fn runtime_binary_path(&self, provider: &str) -> Option<String> {
-fn claude_mcp_command(args: Vec<String>, cwd: String, timeout: Duration) -> Result<String, String> {
+fn resolve_mcp_binary(provider: &str, binary_path: Option<&str>) -> Result<PathBuf, String> {
+    if !matches!(provider, "claude" | "codex" | "cursor" | "opencode") {
+        return Err("Unsupported MCP provider".into());
+fn claude_mcp_command(
-            return Err("Claude MCP command timed out".into());
-pub async fn claude_mcp_list(cwd: String) -> Result<String, String> {

### 378adad U-029 v0.6.0 — Broadcast harness updates across windows
Changed paths: 3; diff lines excluding generated/docs/assets: 168
+  return {
+        return () => {
-  return emit(HARNESS_UPDATED_EVENT, harness);
+  return emit(HARNESS_UPDATED_EVENT, { harness, source: updateEventSource });
-  return listen<HarnessId>(HARNESS_UPDATED_EVENT, (event) =>
+  return listen<HarnessUpdatedEvent>(HARNESS_UPDATED_EVENT, (event) => {
+    if (event.payload.source === updateEventSource) return;
+      return () => {

### e833e83 U-032 v0.6.0 — Add mode commands (/plan, /orchestrator, /draft)
Changed paths: 17; diff lines excluding generated/docs/assets: 1791
+    fn launch_mode_fields_survive_the_bridge() {
+import { invoke } from "@tauri-apps/api/core";
+vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
+    if (name === "quick_composer_shown") native.shown = callback;
+    return () => {};
+function commands() {
+  return container.querySelector('[role="listbox"][aria-label="Commands"]');
+function input(text: string, cursor = text.length) {

### 48fe62a U-094 v0.6.0 — Prepare v0.6.0 release
Changed paths: 6; diff lines excluding generated/docs/assets: 27
-version = "0.5.0"
+version = "0.6.0"
-  "version": "0.5.0",
+  "version": "0.6.0",
-  "version": "0.5.0",
+  "version": "0.6.0",

### 7ce63cb U-095 post-v0.6.0 — Fix ARM64 Linux build: use libc::c_char for the ptsname_r buffer (#584)
Changed paths: 1; diff lines excluding generated/docs/assets: 9

### 4e876a8 U-096 post-v0.6.0 — Improve navigation responsiveness with idle preloading
Changed paths: 10; diff lines excluding generated/docs/assets: 748
-  return { default: module.SearchView };
-  return { default: module.SettingsView };
-  return { default: module.InboxView };
+    return { default: module.SearchView };
+    return { default: module.SettingsView };
+    return { default: module.InboxView };
-  return { default: module.NotesView };
-  return { default: module.AutomationsView };

### 8fae566 U-097 post-v0.6.0 — Restore previous view after closing settings
Changed paths: 1; diff lines excluding generated/docs/assets: 41
+      if (!settingsOpenRef.current) {

### fea2c0a U-098 post-v0.6.0 — Scope the Changes review to the section it was opened from (#582)
Changed paths: 10; diff lines excluding generated/docs/assets: 185

### 5c00fe2 U-099 post-v0.6.0 — Diff whole files line by line in the changes view (#590)
Changed paths: 5; diff lines excluding generated/docs/assets: 276
-function chunksFor(original: Text | null, current: Text): readonly Chunk[] {
+function chunksFor(
-  return Chunk.build(original, current, DIFF_CONFIG);
+  return Chunk.build(original, current, diffConfig);
+function bigFile(lines: number): string {
+  return Array.from(
+/** Edits spread through the whole file, the case char-level diff gives up on. */
+function scatterEdits(text: string): { next: string; changed: number } {

### 4bb4a00 U-100 post-v0.6.0 — Fix chat bubbles overflowing narrow session panes (#575)
Changed paths: 3; diff lines excluding generated/docs/assets: 346
+function declarations(body: string): Map<string, string> {
+    if (separator === -1) continue;
+  return parsed;
+function rules(css: string): Rule[] {
+  return [
+function splitArguments(value: string): string[] {
+    if (character === "(") depth += 1;
+    if (character === ")") depth -= 1;

### 36bb26c U-101 post-v0.6.0 — Recover Codex commands for bare Shell rows (#581)
Changed paths: 5; diff lines excluding generated/docs/assets: 586
+  if (session.harness === "codex") {
+    if (blocks !== session.blocks) {
+function shellPlaceholderIds(blocks: Block[]): string[] {
+  return blocks.flatMap((block) =>
+export function backfillCodexShellCommands(blocks: Block[]): Block[] {
+    if (
+      return block;
+    if (!saved || isWeakToolTitle(saved)) return block;

### a67e614 U-102 post-v0.6.0 — fix(markdown): keep a document's lines on their own lines (#595)
Changed paths: 7; diff lines excluding generated/docs/assets: 429
+function render(text: string, hardBreaks = true): string {
+  return renderToStaticMarkup(
+export function rehypeHardBreaks() {
+  return (tree: Root) => {
+function walk(
+    if (
+      if (child.type === "element" && !LITERAL_TAGS.has(child.tagName)) {
+function isWrappedLine(

### 43aac9d U-033 post-v0.6.0 — Add cool animations for Effort selection in Codex (#516)
Changed paths: 3; diff lines excluding generated/docs/assets: 360
+function effortTileTone(
+  if (harness !== "codex" || !isEffortSetting(setting)) return undefined;
+  return normalized === "ultra"
+function EffortTileShimmer() {
+  return (
+          return (
