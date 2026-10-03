## Cargo.lock
### @2245
ours:
version = "0.1.55-local5-provider-fixes"

theirs:
version = "0.1.56"

## Cargo.toml
### @7
ours:
version = "0.1.55-local5-provider-fixes"

theirs:
version = "0.1.56"

## package-lock.json
### @3
ours:
  "version": "0.1.55-local5-provider-fixes",

theirs:
  "version": "0.1.56",

### @13
ours:
      "version": "0.1.55-local5-provider-fixes",

theirs:
      "version": "0.1.56",

## package.json
### @4
ours:
  "version": "0.1.55-local5-provider-fixes",

theirs:
  "version": "0.1.56",

## src-tauri/src/window.rs
### @121
ours:
    #[cfg(target_os = "windows")]
    prepare_windows_window(&window);

    let _ = window.set_focus();
    Ok(())

theirs:
    if reveal {
        let _ = window.set_focus();
    }
    Ok(window)

## src-tauri/tauri.conf.json
### @4
ours:
  "version": "0.1.55-local5-provider-fixes",

theirs:
  "version": "0.1.56",

## src/app/App.tsx
### @3444
ours:
      optionsOrSession?: OpenDiffOptions | { sessionId: string; cwd: string },
      changeKindParam?: GitFileDiffKind,

theirs:
      session?: { sessionId: string; cwd: string },
      changeKind?: GitFileDiffKind,
      pin = false,

### @3522
ours:
    (
      path: string,
      options?:
        | GitFileDiffKind
        | { kind?: "staged" | "unstaged"; status?: string },
    ) => {
      const kind =
        typeof options === "string"
          ? options
          : options && "kind" in options
            ? options.kind
            : undefined;
      return onOpenDiff(path, undefined, kind);
    },

theirs:
    (path: string, kind?: GitFileDiffKind, pin?: boolean) =>
      onOpenDiff(path, undefined, kind, pin),

## src/app/shell/ProjectRail.tsx
### @83
ours:
import { SharedHoverHighlight } from "../../features/sessions/ui/SharedHoverHighlight";
import { type AppMode } from "../../features/settings/model/appearance";

const REVEAL_LABEL = IS_MAC
  ? "Reveal in Finder"
  : IS_WIN
    ? "Reveal in File Explorer"
    : "Open Containing Folder";

function projectMenuExtraItems(
  pinned: boolean,
  canRemove: boolean,
  canConfigureNotifications: boolean,
  notificationReady: boolean,
  externalEditors: ExternalEditor[] | null,
  projectGroups: ProjectGroup[],
  currentProjectGroupId?: string,
): TabGroupMenuExtraItem[] {
  const groupSubmenu: ExplorerMenuItem[] = [
    { kind: "item", id: "project-group:new", label: "New group…" },
    ...(projectGroups.length > 0 ? [{ kind: "sep" } as const] : []),
    ...projectGroups.map((group) => ({
      kind: "item" as const,
      id: `project-group:${group.id}`,
      label: group.name,
      checked: group.id === currentProjectGroupId,
    })),
    ...(projectGroups.length > 0 ? [{ kind: "sep" } as const] : []),
    {
      kind: "item",
      id: "project-group:none",
      label: "Ungrouped",
      checked: currentProjectGroupId == null,
    },
  ];
  const items: TabGroupMenuExtraItem[] = [
    {
      id: "background",
      label: "Background image",
      icon: ImagePlus,
    },
    {
      id: "project-group",
      label: "Move to group",
      icon: FolderTree,
      submenu: groupSubmenu,
    },
    pinned
      ? { id: "unpin", label: "Unpin project", icon: PinOff }
      : { id: "pin", label: "Pin project", icon: Pin },
    { id: "reveal", label: REVEAL_LABEL, icon: FolderOpen },
    {
      id: "external-editor",
      label: "Open in editor",
      icon: AppWindow,
      disabled: externalEditors === null,
      submenu:
        externalEditors === null
          ? [
              {
                kind: "item",
                id: "external-editor:loading",
                label: "Looking for editors…",
                disabled: true,
              },
            ]
          : externalEditors.length > 0
            ? externalEditors.map((editor) => ({
                kind: "item" as const,
                id: `external-editor:${editor.id}`,
                label: editor.name,
              }))
            : [
                {
                  kind: "item",
                  id: "external-editor:none",
                  label: "No supported editors found",
                  disabled: true,
                },
              ],
    },
    {
      id: "notifications-mute",
      label: "Mute notifications",
      icon: BellOff,
      sepBefore: true,
      disabled: !notificationReady,
      submenu: notificationMuteActions(),
    },
  ];
  if (canConfigureNotifications) {
    items.push({
      id: "notifications-settings",
      label: "Notification settings…",
      icon: Settings,
    });
  }
  if (canRemove) {
    items.push(
      { id: "archive", label: "Archive", icon: Archive, sepBefore: true },
      { id: "delete", label: "Delete", icon: Trash2, danger: true },
    );
  }
  return items;
}

theirs:
import { useProjectMenu } from "./useProjectMenu";

## src/app/shell/Sidebar.tsx
### @32
ours:

theirs:
  useId,
  useLayoutEffect,

### @252
ours:
  onOpenDiff?: (
    path: string,
    options?: GitFileDiffKind | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;

theirs:
  onOpenDiff?: (path: string, kind?: GitFileDiffKind, pin?: boolean) => void;

### @629
ours:
  // Chat mode swaps the workspace for the chat list, so it skips the
  // project gate but honors the same overlays (search, inbox, notes,
  // settings) — otherwise chats linger over fullscreen views.
  const chatVisible =
    mode === "chat" &&
    open &&
    !searchActive &&
    !inboxActive &&
    !notesActive &&
    !settingsOpen;
  const gitStatuses = useGitFileStatuses(gitRoot, open && tab === "files");
  const changeStats = useProjectDiffStats(gitRoot, open);

theirs:
  const sidebarVisible = open && sidebarAvailable;
  // With the sidebar collapsed beside the compact rail, its tab shortcuts
  // open the sidebar temporarily until the user clicks away.
  const drawerMode = compactRailVisible && !open;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerVisible = drawerMode && drawerOpen && sidebarAvailable;
  // A dismissed drawer stays mounted while it slides shut. Anything that takes
  // its place (the pinned sidebar, another view) drops it at once.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const drawerClosing =
    drawerMounted && !drawerVisible && drawerMode && sidebarAvailable;
  const drawerRendered = drawerVisible || drawerClosing;
  const drawerAnimation = useRef<Animation | null>(null);
  const panelOpen = open || drawerVisible;
  const gitStatuses = useGitFileStatuses(gitRoot, panelOpen && tab === "files");
  const changeStats = useProjectDiffStats(gitRoot, panelOpen);

  useEffect(() => {
    if (!drawerMode || !sidebarAvailable) setDrawerOpen(false);
  }, [drawerMode, sidebarAvailable]);

  useEffect(() => {
    if (drawerVisible) setDrawerMounted(true);
    else if (!drawerClosing) setDrawerMounted(false);
  }, [drawerVisible, drawerClosing]);

  // Grow the drawer's width so the workspace is pushed along with it. A
  // reversal mid-slide starts from wherever the width currently is.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    if (!drawerRendered || !drawer) {
      drawerAnimation.current = null;
      return;
    }
    const full =
      drawer.firstElementChild instanceof HTMLElement
        ? drawer.firstElementChild.offsetWidth
        : 0;
    const from = drawerAnimation.current
      ? drawer.getBoundingClientRect().width
      : drawerClosing
        ? full
        : 0;
    drawerAnimation.current?.cancel();
    drawerAnimation.current = null;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (typeof drawer.animate !== "function" || reduceMotion) {
      if (drawerClosing) setDrawerMounted(false);
      return;
    }
    const animation = drawer.animate(
      [{ width: `${from}px` }, { width: `${drawerClosing ? 0 : full}px` }],
      drawerClosing
        ? {
            duration: 160,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          }
        : { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    drawerAnimation.current = animation;
    animation.onfinish = () => {
      if (drawerAnimation.current !== animation) return;
      drawerAnimation.current = null;
      if (drawerClosing) setDrawerMounted(false);
    };
  }, [drawerRendered, drawerClosing]);

  useEffect(() => {
    if (!drawerVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setDrawerOpen(false);
    };
    // The rail's own shortcuts toggle the drawer, and menus opened from it
    // stay usable; anything else dismisses it.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const el = target instanceof Element ? target : null;
      if (drawerRef.current?.contains(el)) return;
      if (el?.closest("[data-compact-project-rail],[data-popover-side]")) {
        return;
      }
      setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [drawerVisible]);

### @2086
ours:
      {(mode === "chat" ? chatVisible : sidebarVisible)
        ? sidebarContent
        : null}

theirs:
      {sidebarVisible ? sidebarContent : null}
      {drawerRendered ? (
        // Pinned to the right edge, so the sidebar slides in as the width grows.
        <div
          ref={drawerRef}
          data-sidebar-drawer={drawerClosing ? "closing" : "open"}
          inert={drawerClosing || undefined}
          className={`flex shrink-0 justify-end overflow-hidden ${
            drawerClosing ? "pointer-events-none" : ""
          }`}
        >
          {sidebarContent}
        </div>
      ) : null}

## src/features/inbox/ui/InboxView.tsx
### @374
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;

theirs:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];

### @399
ours:
  onPullReview,

theirs:
  repairSessions,
  onRepairChecks,

### @1401
ours:
  onPullReview,

theirs:
  repairSessions,
  onRepairChecks,

### @1417
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;

theirs:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];

### @1444
ours:
      onPullReview={onPullReview}

theirs:
      repairSessions={repairSessions}
      onRepairChecks={onRepairChecks}

### @1996
ours:
  onPullReview,

theirs:
  repairSessions,
  onRepairChecks,

### @2014
ours:
  onPullReview?: (item: InboxItem, report: CodeReviewReport) => void;

theirs:
  repairSessions?: CiRepairProps["repairSessions"];
  onRepairChecks?: CiRepairProps["onRepairChecks"];

## src/features/sessions/data/sessionStore.ts
### @584
ours:
  const review = sanitizeReview(block.review);
  if (review) next.review = review;

theirs:
  if (
    block.role === "user" &&
    typeof block.ciContext === "string" &&
    block.ciContext
  ) {
    next.ciContext = block.ciContext;
  }

## src/features/sessions/model/session.ts
### @1
ours:
import type { ContextUsage } from "./contextUsage";
import type { ProcessedUsage } from "./tokenAccounting";
import { deriveLocalSessionTitle } from "./sessionTitle";

theirs:
import { dropContextWindow, type ContextUsage } from "./contextUsage";

### @23
ours:
import { type CodeReviewReport } from "../../inbox/model/githubTasks";

theirs:
import { loadProjectProviderSettings } from "./projectProviders";

### @311
ours:
  /** CodeRabbit review report with per-issue fix buttons. Survives reloads. */
  review?: CodeReviewReport;

theirs:
  /** Exact CI repair instructions and evidence supplied with this user turn. */
  ciContext?: string;

### @406
ours:
  /** Persisted follow-ups waiting for the current turn. */

theirs:
  /**
   * What the live turn is waiting on after the agent yielded with work still
   * running in the background. In-memory only.
   */
  backgroundTasks?: string[];
  /** Follow-ups waiting for current turn. In-memory only. */

## src/features/sessions/ui/AgentTranscript.test.ts
### @49
ours:
  it("renders native, composer and prefix origins as separate accessible divider rows", () => {
    const source = { ...newSession("claude", "/repo"), id: "source", title: "Original", providerSessionId: "provider", blocks: [
      { id: "u1", role: "user" as const, text: "hello" }, { id: "a1", role: "assistant" as const, text: "reply" },
    ] };
    const native = planBranch({ source, turn: source.blocks, newSessionId: "branch" });
    const copied = planBranch({ source: { ...source, providerSessionId: undefined }, turn: source.blocks, newSessionId: "branch" });
    if (!native || !copied) throw new Error("missing plans");
    const prefix = convertToPrefixSummary({ ...source, id: "branch", blocks: native.blocks }, "fork-failed");
    for (const blocks of [native.blocks, copied.blocks, prefix.blocks]) {
      const divider = blocks[blocks.length - 1];
      expect(groupTurns(blocks)).toEqual([blocks.slice(0, 2), [divider]]);
      const markup = render(blocks);
      const container = document.createElement("div"); container.innerHTML = markup;
      const separator = container.querySelector('[role="separator"]');
      expect(separator?.getAttribute("aria-label")).toBe(divider.text); expect(separator?.textContent).toBe(divider.text);
    }
  });

theirs:
  it("offers the saved CI context in a collapsed disclosure beside the short request", () => {
    const markup = render([
      {
        id: "ci-repair",
        role: "user",
        text: "Fix 1 failed CI check for acme/web PR #42.",
        ciContext:
          "Checked commit: abc123\n\nRun tests: expected <main>, received <script>",
      },
    ]);
    expect(markup).toContain("Fix 1 failed CI check for acme/web PR #42.");
    expect(markup).toMatch(/<details\b[^>]*>/);
    expect(markup).not.toMatch(/<details\b[^>]*\bopen[\s=>]/);
    expect(markup).toContain("CI context</span>");
    expect(markup).toContain(
      "Checked commit: abc123\n\nRun tests: expected &lt;main&gt;, received &lt;script&gt;",
    );
  });


## src/features/sessions/ui/AgentTranscript.tsx
### @164
ours:
  onApproval?: (
    requestId: number,
    decision: ApprovalDecision,
    scope?: ApprovalScope,
  ) => void;

theirs:
  /** Work the agent left running when it yielded; the turn waits on it. */
  backgroundTasks?: string[];
  onApproval?: (requestId: number, decision: ApprovalDecision) => void;

## src/features/sessions/ui/ModelPicker.tsx
### @40
ours:
  hasHarnessEvidence,

theirs:
  isProviderHidden,
  projectProvidersRevision,
  subscribeProjectProviders,
} from "../model/projectProviders";
import {

### @316
ours:
    // Per-harness evidence (not the global probe flag): Antigravity is
    // excluded from blanket probes, so it must stay listed until its own
    // catalog discovery reports — never hidden as "not installed" merely
    // because probing was deferred.
    return HARNESSES.filter((id) =>
      showProviderInModelPicker(
        id,
        isHarnessAvailable(id),
        hasHarnessEvidence(id),
      ),

theirs:
    void projectVersion;
    return HARNESSES.filter(
      (id) =>
        !isProviderHidden(project, id) &&
        showProviderInModelPicker(
          id,
          isHarnessAvailable(id),
          hasProbedHarnessAvailability(),
        ),

## src/features/settings/ui/SettingsView.tsx
### @230
ours:
  hasLiveCatalog,
  isPickerProviderVisible,

theirs:

### @348
ours:
  loadRemainingQuota,

theirs:
  loadQuickComposerEnabled,

### @368
ours:
  saveRemainingQuota,

theirs:
  saveQuickComposerEnabled,

### @1231
ours:
        title="AI helper"
        description="Which model writes chat titles, commit messages and pull request descriptions."
      >
        <Row
          id="ai-helper"
          label="AI helper"
          description="Automatic uses the chat's provider for titles and the first installed provider for commits and PRs."
        >
          <Segmented
            label="AI helper"
            value={aiHelper.mode}
            options={[
              { value: "automatic", label: "Automatic" },
              { value: "custom", label: "Choose a model" },
            ]}
            onChange={onAiHelperMode}
          />
        </Row>
        {aiHelper.mode === "custom" ? (
          <>
            <AiHelperTargetEditor
              id="ai-helper-primary"
              label="Main model"
              target={aiHelper.primary}
              onChange={(target) => onAiHelperTarget("primary", target)}
            />
            {aiHelper.fallback ? (
              <AiHelperTargetEditor
                id="ai-helper-fallback"
                label="Backup model"
                target={aiHelper.fallback}
                onChange={(target) => onAiHelperTarget("fallback", target)}
                action={
                  <button
                    type="button"
                    onClick={onRemoveAiHelperFallback}
                    className="text-[12px] text-content/55 hover:text-content"
                  >
                    Remove backup
                  </button>
                }
              />
            ) : (
              <Row label="Backup model">
                <button
                  type="button"
                  onClick={onAddAiHelperFallback}
                  className="text-[12px] text-content/55 hover:text-content"
                >
                  Add backup
                </button>
              </Row>
            )}
            <p className="px-4 py-3 text-[12px] leading-relaxed text-content/45">
              If the main model's reply is unusable, MonoCode asks it to fix the
              reply once, then tries the backup once. Sign-in or permission
              errors never switch to the backup. Helpers run without tools and
              can't change your files.
            </p>
          </>
        ) : null}

theirs:
        title="Editor"
        description="What happens when you save a file in the workspace editor."
      >
        <Row
          id="format-on-save"
          label="Format on save"
          description="Run Prettier on supported files before writing. Off keeps the text you typed, including quote style."
        >
          <Toggle
            label="Format on save"
            on={formatOnSave}
            onChange={onFormatOnSave}
          />
        </Row>

### @3231
ours:
/** Settings page that owns the initial provider discovery lifecycle. */
export function ProvidersPage(): ReactElement {

theirs:
const GLOBAL_PROVIDER_SCOPE = "global";

function ProvidersPage({
  cwd,
  recents,
}: {
  cwd?: string;
  recents?: RecentProject[];
}) {

### @3264
ours:
  const [updateNotices, setUpdateNotices] = useState<CliUpdateNotice[]>([]);
  const notifiedRef = useRef<Set<HarnessId>>(new Set());
  const runUpdateCheck = useCallback(async () => {
    const notices = await checkCliUpdates({
      claude: getCustomBinary("claude") ?? "claude",
      codex: getCustomBinary("codex") ?? "codex",
      pi: getCustomBinary("pi") ?? "pi",
      cline: getCustomBinary("cline") ?? "cline",
    });
    setUpdateNotices((current) => {
      const fresh = notices.filter(
        (entry) => !notifiedRef.current.has(entry.harness),
      );
      for (const entry of fresh) notifiedRef.current.add(entry.harness);
      return fresh.length > 0 ? [...current, ...fresh] : current;
    });
  }, []);

theirs:
  const [scope, setScope] = useState<string>(GLOBAL_PROVIDER_SCOPE);
  const [hiddenGlobally, setHiddenGlobally] = useState(loadHiddenPickerProviders);

  const scopeOptions = useMemo(() => {
    const options: { value: string; label: string; icon?: ReactNode }[] = [
      {
        value: GLOBAL_PROVIDER_SCOPE,
        label: "Global",
        icon: (
          <Globe
            className="size-3.5 shrink-0 text-content/60"
            strokeWidth={1.75}
          />
        ),
      },
    ];
    const seen = new Set<string>();
    for (const path of [cwd, ...(recents ?? []).map((entry) => entry.path)]) {
      if (!path || !looksLikeProject(path)) continue;
      const key = pathKey(path);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        value: path,
        label: projectName(path),
        icon: <ProjectScopeIcon path={path} />,
      });
    }
    return options;
  }, [cwd, recents]);

  const project = scope === GLOBAL_PROVIDER_SCOPE ? null : scope;
  const projectSettings = project ? loadProjectProviderSettings(project) : {};
  // A project without overrides inherits the global default provider, the same
  // way `defaultSessionChoice` resolves it for new conversations.
  const effectiveDefaultHarness = project
    ? firstEnabledHarness(
        project,
        projectSettings.defaultHarness ?? choice?.harness ?? "cursor",
      )
    : (choice?.harness ?? null);

### @3471
ours:
                : defaultModelId(harness))
            }
            isDefault={choice?.harness === harness}
            initialLoading={initialLoading}
            onDefault={onDefault}
            onModelChange={onModelChange}
            onCatalogRefreshed={runUpdateCheck}
          />
        ))}

theirs:
                : defaultModelId(harness)))
            : (defaultModels[harness] ??
              (choice?.harness === harness
                ? choice.model
                : defaultModelId(harness)));
          const isDefault = project
            ? effectiveDefaultHarness === harness
            : choice?.harness === harness;
          return (
            <ProviderRow
              key={harness}
              harness={harness}
              selectedModel={selectedModel}
              isDefault={isDefault}
              inPicker={inPicker}
              pickerLocked={pickerLocked}
              onDefault={onDefault}
              onModelChange={onModelChange}
              onPickerVisible={(visible) => onPickerVisible(harness, visible)}
            />
          );
        })}

### @3850
ours:
  initialLoading,
  onDefault,
  onModelChange,
  onCatalogRefreshed,

theirs:
  inPicker,
  pickerLocked = false,
  onDefault,
  onModelChange,
  onPickerVisible,

### @3866
ours:
  initialLoading?: boolean;
  onDefault: (harness: HarnessId, model: string) => void;
  onModelChange: (harness: HarnessId, model: string) => void;
  onCatalogRefreshed?: () => void;
}): ReactElement {

theirs:
  inPicker: boolean;
  /** Globally hidden providers cannot be turned on per project. */
  pickerLocked?: boolean;
  onDefault: (harness: HarnessId, model: string) => void;
  onModelChange: (harness: HarnessId, model: string) => void;
  onPickerVisible: (visible: boolean) => void;
}) {

### @3886
ours:
  const [inPicker, setInPicker] = useState(() =>
    isPickerProviderVisible(harness),
  );
  const [customBinaryPath, setCustomBinaryPath] = useState<string | null>(() =>
    getCustomBinary(harness),
  );
  const [rechecking, setRechecking] = useState(false);
  const initialDiscoveryFinished = useRef(false);

theirs:

### @3911
ours:
  const onPickerVisible = (visible: boolean) => {
    savePickerProviderVisible(harness, visible);
    setInPicker(visible);
  };

  const handlePickBinary = async () => {
    const file = await pickFile(
      `Choose ${HARNESS_TITLE[harness]} binary executable`,
    );
    if (file) {
      setCustomBinary(harness, file);
      setCustomBinaryPath(file);
      void probeHarnessAvailability({ force: true });
    }
  };

  const handleClearBinary = () => {
    setCustomBinary(harness, null);
    setCustomBinaryPath(null);
    void probeHarnessAvailability({ force: true });
  };

  // Manual health check + model refresh for this row: re-probes every CLI
  // (fast `--version` checks, no quota) and refreshes this harness's model
  // catalog. Auto-refresh on visit stays as the no-click path. Antigravity
  // must rerun real ACP discovery even when a previous catalog succeeded —
  // a stale "ready" would hide sign-in and runtime errors.
  const handleRecheck = async () => {
    if (initialLoading || rechecking) return;
    setRechecking(true);
    try {
      await probeHarnessAvailability({ force: true });
      if (harness === "antigravity") {
        await recheckAntigravityCatalog();
      } else {
        await refreshHarnessCatalogs([harness], { force: true });
      }
      void onCatalogRefreshed?.();
    } finally {
      setRechecking(false);
    }
  };

  const antigravitySetup =
    harness === "antigravity" ? (
      <AntigravityProviderSetup available={available} catalog={catalog} />
    ) : null;


theirs:

### @4719
ours:
  options: {
    value: string;
    label: string;
    disabled?: boolean;
    title?: string;
    description?: string;
  }[];

theirs:
  options: { value: string; label: string; icon?: ReactNode }[];

### @4902
ours:
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-content/45">
                      {option.description}
                    </span>
                  ) : null}
                </span>

theirs:
                {option.icon ? (
                  <span className="grid size-4 shrink-0 place-items-center">
                    {option.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>

## src/features/source-control/ui/GitChangesPanel.tsx
### @116
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;
  onOpenCommit: (commit: GitHistoryCommit) => void;

theirs:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges: () => void;
  onOpenCommit: (commit: GitHistoryCommit, pin?: boolean) => void;

### @371
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;
  onOpenAllChanges?: () => void;

theirs:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;
  onOpenAllChanges: () => void;

### @1275
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;

theirs:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;

### @1487
ours:
  onOpenFile: (
    path: string,
    options?:
      | GitFileDiffKind
      | { kind?: "staged" | "unstaged"; status?: string },
  ) => void;

theirs:
  onOpenFile: (path: string, kind: GitFileDiffKind, pin?: boolean) => void;

### @1525
ours:
          className="flex h-full w-full min-w-0 items-center gap-1.5 px-2 text-left rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"

theirs:
          onDoubleClick={() => {
            if (canOpen) onOpenFile(file.path, kind, true);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"

## src/integrations/harness/core/apply.ts
### @496
ours:
    const settled = settlePendingApprovals(session);
    let blocks = settled.blocks.map(stopBlockProgress);
    if (session.liveTurnUsage) {
      blocks = stampTurnUsage(blocks, session.liveTurnUsage);
    }
    blocks = stampTurnDuration(blocks);

theirs:
  const { backgroundTasks: _cleared, ...settled } =
    settlePendingApprovals(session);

## src/integrations/harness/core/availability.ts
### @61
ours:
let availability: HarnessAvailability = {
  claude: false,
  codex: false,
  cursor: false,
  grok: false,
  opencode: false,
  pi: false,
  omp: false,
  fx: false,
  antigravity: false,
  cline: false,
  hermes: false,
};
let version = 0;
let inflight: Promise<void> | null = null;
let probedAt = 0;
/** Harnesses with backend-authoritative evidence (a probe or catalog run). */
const evidenced = new Set<HarnessId>();
let antigravityProbeError: string | null = null;
const listeners = new Set<() => void>();

theirs:
let inflight: Promise<void> | null = null;

### @94
ours:
function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeHarnessAvailability(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHarnessAvailabilitySnapshot(): number {
  return version;
}

export function hasProbedHarnessAvailability(): boolean {
  return probedAt > 0;
}

/**
 * True once this harness has backend-authoritative evidence in this session
 * (a completed probe, or catalog discovery that proved the runtime answers).
 * Before that the UI must render "not checked yet" — never "not installed".
 */
export function hasHarnessEvidence(id: HarnessId): boolean {
  return evidenced.has(id);
}

export function isHarnessAvailable(id: HarnessId): boolean {
  return availability[id];
}

/**
 * Record availability evidence without running a probe. Used when catalog
 * discovery already proved the runtime answers, so the expensive Antigravity
 * ACP handshake and the shared-runtime acquisition never run side by side.
 */
export function noteHarnessEvidence(
  id: HarnessId,
  ok: boolean,
  error?: string,
): void {
  availability = { ...availability, [id]: ok };
  evidenced.add(id);
  if (id === "antigravity") {
    antigravityProbeError = ok ? null : (error ?? antigravityProbeError);
  }
  emit();
}


theirs:

### @289
ours:
      const next = { ...availability };
      for (const entry of entries) {
        if (!entry) continue;
        const [id, ok] = entry;
        next[id] = ok;
        evidenced.add(id);
      }
      availability = next;
      emit();

theirs:
      const next = {} as HarnessAvailability;
      for (const [id, ok] of entries) next[id] = ok;
      setHarnessAvailability(next);
      emitHarnessAvailability();

## src/integrations/harness/providers/claude/claude.ts
### @200
ours:
  requestsById: Map<string, ProcessedUsage>;
  priorTurnsUsage?: ProcessedUsage;
  turnUsage?: ProcessedUsage;

theirs:
  pendingAssistantBoundary: boolean;

### @218
ours:
const CONTROL_TIMEOUT_MS = 5_000;

export type ClaudeControlFailure =
  | "error"
  | "timeout"
  | "cancelled"
  | "stopped"
  | "write-failed"
  | "unavailable";

export class ClaudeControlError extends Error {
  constructor(
    readonly reason: ClaudeControlFailure,
    message: string,
  ) {
    super(message);
    this.name = "ClaudeControlError";
  }
}

theirs:
/**
 * How long a finished background task may take to wake Claude before the turn
 * is let go anyway. The follow-up turn normally starts within a second or two.
 */
const RESUME_GRACE_MS = 15_000;

### @602
ours:
    requestsById: new Map(),
    priorTurnsUsage: undefined,
    turnUsage: undefined,

theirs:
    pendingAssistantBoundary: false,

## src/integrations/harness/providers/claude/claudeLive.test.ts
### @39
ours:
  inspectClaudeContext,

theirs:
  cancelClaudeTurn,

## src/integrations/harness/providers/codex/codex.ts
### @44
ours:
import {
  codexMcpApprovalKindKeys,
  codexMcpConfirmation,
  codexMcpForm,
  isCodexComputerUseAccessConfirmation,
  type CodexInProgressMcpTool,
  type McpFormUnsupportedReason,
} from "./codexElicitation";
import { joinStreamText, snapshotRemainder } from "../../core/streamText";
import { NativeForkError } from "../../core/types";
import { buildThreadForkParams } from "./codexProtocol";

theirs:
import { codexMcpConfirmation } from "./codexElicitation";
import { snapshotRemainder } from "../../core/streamText";

### @130
ours:
  emittedAssistant: string;
  emittedReasoning: string;
  /** Cumulative thread usage baseline established before the active turn started. */
  threadBaseline?: CodexRawUsageRecord;
  /** Cumulative thread usage snapshot last seen from Codex. */
  lastThreadTotal?: CodexRawUsageRecord;
  /** Processed usage for the active turn. */
  turnUsage?: ProcessedUsage;

theirs:
  /** Completed snapshots describe one item, not all text in the turn. */
  emittedAssistantByItem: Map<string, string>;
  emittedReasoningByItem: Map<string, string>;

### @712
ours:
  live.emittedAssistant = "";
  live.emittedReasoning = "";
  live.inProgressMcpTools.clear();
  live.threadBaseline = live.lastThreadTotal;
  live.turnUsage = undefined;

theirs:
  live.emittedAssistantByItem.clear();
  live.emittedReasoningByItem.clear();

### @1088
ours:
  live.emittedAssistant = "";
  live.emittedReasoning = "";
  live.inProgressMcpTools.clear();

theirs:
  live.emittedAssistantByItem.clear();
  live.emittedReasoningByItem.clear();

### @1188
ours:
    const confirmation = codexMcpConfirmation(
      params,
      threadId === live.threadId ? [...live.inProgressMcpTools.values()] : [],
    );
    if (confirmation) {
      logCodexElicitation(params);
      if (
        !live.planning &&
        live.runtimeMode === "full-access" &&
        isCodexComputerUseAccessConfirmation(params)
      ) {
        await live.rpc.respond(id, {
          action: "accept",
          content: confirmation.content,
          _meta: null,
        });
        return;
      }
      const grantKey = confirmation.mcpToolGrant?.key;
      if (
        !live.planning &&
        grantKey &&
        mcpGrantsByThread.get(live.sessionId)?.has(grantKey)
      ) {
        await live.rpc.respond(id, {
          action: "accept",
          content: confirmation.content,
          _meta: { persist: "session" },
        });
        return;
      }
      const uiId = live.nextApprovalUiId++;
      const pending = waitApproval(
        live,
        uiId,
        id,
        "permissions",
        threadId,
        grantKey,
      );
      // Other MCP consent must carry the user's decision, including in Full Access.
      live.onEvent({
        type: "approval.requested",
        requestId: uiId,
        kind: "other",
        title: confirmation.title,
        ...(confirmation.mcpToolGrant
          ? {
              sessionScope: {
                hint: "Stop asking for this tool until the chat closes.",
              },
            }
          : {}),
      });
      const outcome = await pending;
      const decision = outcome === "cancelled" ? "cancelled" : outcome.decision;
      const scope = outcome === "cancelled" ? undefined : outcome.scope;
      live.onEvent({
        type: "approval.resolved",
        requestId: uiId,
        decision,
        ...(scope ? { scope } : {}),
      });
      if (outcome === "cancelled") return;
      const sessionGrant =
        decision === "allow" && scope === "session" && grantKey !== undefined;

theirs:
    if (!live.planning && live.runtimeMode === "full-access") {

### @1290
ours:
    const event: Extract<HarnessEvent, { type: "form.requested" }> = {
      type: "form.requested",

theirs:
    const pending = waitApproval(live, uiId, id, "permissions", threadId);
    // MCP consent requires an explicit decision outside non-plan Full Access turns.
    live.onEvent({
      type: "approval.requested",

## src/integrations/harness/providers/codex/codexElicitation.test.ts
### @1
ours:
import { afterEach, describe, expect, it } from "vitest";
import {
  codexMcpConfirmation,
  codexMcpForm,
  isCodexComputerUseAccessConfirmation,
  isSecretField,
  setCodexMcpApprovalKindKeysForTest,
} from "./codexElicitation";
import type { CodexInProgressMcpTool } from "./codexElicitation";
import type { McpFormField } from "../../../../features/sessions/model/mcpForm";

theirs:
import { describe, expect, it } from "vitest";
import { codexMcpConfirmation } from "./codexElicitation";
