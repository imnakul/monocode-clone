import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SelectMenu } from "../chrome/SelectMenu";
import { Check } from "../chrome/icons";
import { TerminalSpinner } from "../chrome/TerminalSpinner";
import { getCustomBinary } from "../lib/harness/customBinary";
import { probeHarnessBinary } from "../lib/harness/child";
import {
  SOURCE_LABEL,
  canReplay,
  createNativeResumeSession,
  nativeHarnessFor,
  scanExternalSessions,
  type ExternalSessionInfo,
  type ExternalWorkspace,
} from "../lib/harness/sessionImport";
import {
  createReplaySession,
  loadReplayImport,
} from "../lib/harness/sessionReplay";
import { prettyCwd } from "../lib/paths";
import {
  HARNESSES,
  HARNESS_TITLE,
  type HarnessId,
  type Session,
} from "../lib/session";
import { Row, SecondaryButton, Segmented } from "./SettingsView";

type Props = {
  onImportSessions: (sessions: Session[]) => void;
};

type Step = "scan" | "workspaces" | "sessions" | "import";
type ImportMode = "native" | "replay";

/** Header toggle: one mode for every session, or per-session choice. */
type BulkMode = "native" | "replay" | "custom";

const BULK_OPTIONS: { value: BulkMode; label: string }[] = [
  { value: "native", label: "Resume" },
  { value: "replay", label: "Replay" },
  { value: "custom", label: "Custom" },
];

type ItemResult = {
  id: string;
  title: string;
  ok: boolean;
  error?: string;
};

const PARAMS_KEY = "monocode.migration.params";
const SELECTION_KEY = "monocode.migration.selection";

const SINCE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "0", label: "All time" },
];

const LIMIT_OPTIONS = [
  { value: "50", label: "50 sessions" },
  { value: "200", label: "200 sessions" },
  { value: "500", label: "500 sessions" },
];

type PersistedSelection = {
  ids: string[];
  modes: Record<string, ImportMode>;
  replayHarness: HarnessId;
  bulkMode: BulkMode;
};

function loadParams(): { sinceDays: string; limit: string } {
  try {
    const raw = localStorage.getItem(PARAMS_KEY);
    if (!raw) return { sinceDays: "0", limit: "200" };
    const parsed = JSON.parse(raw) as Partial<{
      sinceDays: string;
      limit: string;
    }>;
    return {
      sinceDays:
        parsed.sinceDays &&
        SINCE_OPTIONS.some((o) => o.value === parsed.sinceDays)
          ? parsed.sinceDays
          : "30",
      limit:
        parsed.limit && LIMIT_OPTIONS.some((o) => o.value === parsed.limit)
          ? parsed.limit
          : "200",
    };
  } catch {
    return { sinceDays: "0", limit: "200" };
  }
}

function loadSelection(): PersistedSelection {
  const fallback: PersistedSelection = {
    ids: [],
    modes: {},
    replayHarness: "claude",
    bulkMode: "custom",
  };
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedSelection>;
    const ids = Array.isArray(parsed.ids)
      ? parsed.ids.filter((id): id is string => typeof id === "string")
      : [];
    const modes: Record<string, ImportMode> = {};
    if (parsed.modes && typeof parsed.modes === "object") {
      for (const [id, mode] of Object.entries(parsed.modes)) {
        if (mode === "native" || mode === "replay") modes[id] = mode;
      }
    }
    const replayHarness = HARNESSES.includes(
      parsed.replayHarness as HarnessId,
    )
      ? (parsed.replayHarness as HarnessId)
      : "claude";
    const bulkMode: BulkMode =
      parsed.bulkMode === "native" || parsed.bulkMode === "replay"
        ? parsed.bulkMode
        : "custom";
    return { ids, modes, replayHarness, bulkMode };
  } catch {
    return fallback;
  }
}

function saveSelection(selection: PersistedSelection): void {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // private mode / quota
  }
}

function formatDate(updatedAt?: string): string {
  if (!updatedAt) return "date unknown";
  const day = updatedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "date unknown";
}

export function MigrationView({ onImportSessions }: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [sinceDays, setSinceDays] = useState(() => loadParams().sinceDays);
  const [limit, setLimit] = useState(() => loadParams().limit);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<ExternalWorkspace[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Set<string>>(
    new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const saved = loadSelection();
    return new Set(saved.ids);
  });
  const [modes, setModes] = useState<Record<string, ImportMode>>(
    () => loadSelection().modes,
  );
  const [replayHarness, setReplayHarness] = useState<HarnessId>(
    () => loadSelection().replayHarness,
  );
  const [bulkMode, setBulkMode] = useState<BulkMode>(
    () => loadSelection().bulkMode,
  );
  const [preflight, setPreflight] = useState<string[]>([]);
  const [showModeHelp, setShowModeHelp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [results, setResults] = useState<ItemResult[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(
        PARAMS_KEY,
        JSON.stringify({ sinceDays, limit }),
      );
    } catch {
      // private mode / quota
    }
  }, [sinceDays, limit]);

  const sessions = useMemo(() => {
    const list: { info: ExternalSessionInfo; workspace: string }[] = [];
    for (const workspace of workspaces) {
      if (!selectedWorkspaces.has(workspace.workspacePath)) continue;
      for (const info of workspace.sessions) {
        list.push({ info, workspace: workspace.workspacePath });
      }
    }
    return list;
  }, [workspaces, selectedWorkspaces]);

  const selectedSessions = useMemo(
    () => sessions.filter(({ info }) => selectedIds.has(importKey(info))),
    [sessions, selectedIds],
  );

  /** Replay target matters only when something actually replays: always in
   * Replay mode, in Custom only when a selected session replays, never in
   * Resume mode. */
  const showReplayHarness = useMemo(() => {
    if (bulkMode === "replay") return true;
    if (bulkMode !== "custom") return false;
    return selectedSessions.some(
      ({ info }) => effectiveMode(info, modes, bulkMode) === "replay",
    );
  }, [bulkMode, modes, selectedSessions]);

  const persistSelection = (
    ids: Set<string>,
    nextModes: Record<string, ImportMode>,
    harness: HarnessId,
    bulk: BulkMode,
  ): void => {
    saveSelection({
      ids: [...ids],
      modes: nextModes,
      replayHarness: harness,
      bulkMode: bulk,
    });
  };

  const runScan = async (): Promise<void> => {
    if (scanning) return;
    setScanning(true);
    setScanError(null);
    try {
      const found = await scanExternalSessions(
        Number(sinceDays),
        Number(limit),
      );
      setWorkspaces(found);
      const allPaths = new Set(found.map((w) => w.workspacePath));
      setSelectedWorkspaces(allPaths);
      // Re-apply saved session selections by id; default to all found.
      const saved = loadSelection();
      const foundIds = new Set(
        found.flatMap((w) => w.sessions.map((s) => importKey(s))),
      );
      const restored = new Set(
        saved.ids.length > 0
          ? saved.ids.filter((id) => foundIds.has(id))
          : [...foundIds],
      );
      setSelectedIds(restored);
      setStep("workspaces");
    } catch (error) {
      setScanError(
        error instanceof Error ? error.message : "Scan failed unexpectedly",
      );
    } finally {
      setScanning(false);
    }
  };

  const toggleWorkspace = (path: string): void => {
    setSelectedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSession = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistSelection(next, modes, replayHarness, bulkMode);
      return next;
    });
  };

  const setMode = (id: string, mode: ImportMode): void => {
    setModes((prev) => {
      const next = { ...prev, [id]: mode };
      persistSelection(selectedIds, next, replayHarness, bulkMode);
      return next;
    });
  };

  const setBulk = (bulk: BulkMode): void => {
    setBulkMode(bulk);
    persistSelection(selectedIds, modes, replayHarness, bulk);
  };

  const runPreflight = async (
    items: { info: ExternalSessionInfo }[],
  ): Promise<string[]> => {
    const harnesses = new Set<HarnessId>();
    for (const { info } of items) {
      const native = nativeHarnessFor(info);
      if (native) harnesses.add(native);
    }
    harnesses.add(replayHarness);
    const warnings: string[] = [];
    for (const harness of harnesses) {
      if (!getCustomBinary(harness)) continue;
      try {
        await probeHarnessBinary(harness);
      } catch {
        warnings.push(
          `${HARNESS_TITLE[harness]} has a custom binary that failed validation — clear it in Providers (Reset) if the CLI is actually installed.`,
        );
      }
    }
    setPreflight(warnings);
    return warnings;
  };

  const importOne = async (
    info: ExternalSessionInfo,
    mode: ImportMode,
    harness: HarnessId,
  ): Promise<Session> => {
    if (mode === "native") {
      const session = createNativeResumeSession(info);
      if (!canReplay(info)) {
        // Resume-only sources (Antigravity) have no readable transcript —
        // their store can be resumed, not read — so a prefill attempt is
        // doomed. Say so plainly instead of failing into a vague notice.
        session.blocks = [
          {
            id: crypto.randomUUID(),
            role: "system",
            text: `History preview isn't available for ${SOURCE_LABEL[info.source]} — its store can only be resumed, not read. Send your first message and the original conversation continues where you left off.`,
          },
        ];
        return session;
      }
      // Prefill visible history best-effort: the thread still resumes
      // natively on first send, but it no longer opens empty. The summary
      // also seeds the composer as a safety net — a healthy resume ignores
      // it (the seed says to delete it), a state-losing resume (compaction,
      // expiry) recovers from it. A prefill failure must never block the
      // binding itself — it leaves an honest notice in the thread instead
      // of failing silently. (Tauri invoke rejections arrive as plain
      // strings, not Errors, so String() the fallback — otherwise every
      // reason renders as "unknown reason".)
      try {
        const imported = await loadReplayImport(info, undefined, "resume");
        session.blocks = imported.blocks;
        session.composerSeed = imported.summary;
      } catch (error) {
        session.blocks = [
          {
            id: crypto.randomUUID(),
            role: "system",
            text: `Could not load prior history (${
              error instanceof Error ? error.message : String(error)
            }). The native conversation still resumes when you send your first message.`,
          },
        ];
      }
      return session;
    }
    return createReplaySession(info, await loadReplayImport(info), {
      harness,
    });
  };

  const runImport = async (
    items: { info: ExternalSessionInfo }[],
  ): Promise<void> => {
    if (importing || items.length === 0) return;
    setImporting(true);
    setResults([]);
    setProgress({ done: 0, total: items.length, label: "" });
    await runPreflight(items);
    const created: Session[] = [];
    const nextResults: ItemResult[] = [];
    const nextImported = new Set(importedIds);
    let done = 0;
    for (const { info } of items) {
      const key = importKey(info);
      setProgress({ done, total: items.length, label: info.title });
      try {
        const session = await importOne(
          info,
          effectiveMode(info, modes, bulkMode),
          replayHarness,
        );
        created.push(session);
        nextImported.add(key);
        nextResults.push({ id: key, title: info.title, ok: true });
      } catch (error) {
        nextResults.push({
          id: key,
          title: info.title,
          ok: false,
          error:
            error instanceof Error ? error.message : "Import failed",
        });
      }
      done += 1;
      setProgress({ done, total: items.length, label: info.title });
    }
    setResults(nextResults);
    setImportedIds(nextImported);
    setImporting(false);
    setStep("import");
    if (created.length > 0) onImportSessions(created);
  };

  const retryAsReplay = async (info: ExternalSessionInfo): Promise<void> => {
    setImporting(true);
    try {
      const session = await importOne(info, "replay", replayHarness);
      setModes((prev) => {
        const next = { ...prev, [importKey(info)]: "replay" as ImportMode };
        persistSelection(selectedIds, next, replayHarness, bulkMode);
        return next;
      });
      setResults((prev) =>
        prev.map((result) =>
          result.id === importKey(info)
            ? { ...result, ok: true, error: undefined }
            : result,
        ),
      );
      setImportedIds((prev) => new Set(prev).add(importKey(info)));
      onImportSessions([session]);
    } catch (error) {
      setResults((prev) =>
        prev.map((result) =>
          result.id === importKey(info)
            ? {
                ...result,
                ok: false,
                error:
                  error instanceof Error ? error.message : "Import failed",
              }
            : result,
        ),
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-8">
      <p className="pb-2 text-[12px] leading-relaxed text-content/45">
        Bring past sessions in from Claude, Codex, OpenCode, ZCode, Cline,
        and Antigravity. Native resume continues the original conversation
        in its own CLI; replay copies the transcript as labeled, read-only
        history into any provider. Nothing is re-executed and no CLIs are
        spawned until you import.
      </p>

      {step === "scan" || workspaces.length === 0 ? (
        <Row
          label="Scan for external sessions"
          description="Reads Claude, Codex, OpenCode, ZCode, Cline, and Antigravity stores. Pure file reads — no terminals or consoles open."
        >
          <SelectMenu
            label="Scan range"
            value={sinceDays}
            onChange={setSinceDays}
            options={SINCE_OPTIONS}
            className="w-36"
          />
          <SelectMenu
            label="Session cap"
            value={limit}
            onChange={setLimit}
            options={LIMIT_OPTIONS}
            className="w-32"
          />
          <SecondaryButton
            onClick={() => void runScan()}
            disabled={scanning}
            title="Scan for importable sessions"
          >
            {scanning ? (
              <>
                <TerminalSpinner />
                Scanning…
              </>
            ) : (
              "Scan"
            )}
          </SecondaryButton>
        </Row>
      ) : null}
      {scanError ? (
        <p role="alert" className="text-[12px] text-red-400">
          {scanError}
        </p>
      ) : null}

      {workspaces.length > 0 && step !== "import" ? (
        <>
          <StepHeading
            index={1}
            title="Workspaces"
            hint={`${selectedWorkspaces.size} of ${workspaces.length} selected`}
          />
          <div className="flex flex-col overflow-hidden rounded-lg border border-content/10">
            {workspaces.map((workspace) => {
              const on = selectedWorkspaces.has(workspace.workspacePath);
              return (
                <button
                  key={workspace.workspacePath}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Include workspace ${workspace.workspacePath}`}
                  onClick={() => toggleWorkspace(workspace.workspacePath)}
                  className="flex items-center gap-3 border-b border-content/5 px-3 py-2 text-left last:border-b-0 hover:bg-content/5"
                >
                  <span
                    aria-hidden
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      on
                        ? "border-accent bg-accent text-white"
                        : "border-content/25 text-transparent"
                    }`}
                  >
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                  <span
                    className="min-w-0 flex-[3] truncate text-[13px] text-content"
                    title={workspace.workspacePath}
                  >
                    {prettyCwd(workspace.workspacePath)}
                  </span>
                  <span className="hidden min-w-0 flex-[2] items-center justify-center gap-1 min-[480px]:flex">
                    {workspace.sources.map((source) => (
                      <span
                        key={source}
                        title={`Sessions from ${sourceLabel(source)}`}
                        className="shrink-0 rounded-full border border-content/10 px-1.5 py-px text-[10px] leading-tight text-content/55"
                      >
                        {sourceLabel(source)}
                      </span>
                    ))}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-content/45">
                    {workspace.sessionCount}{" "}
                    {workspace.sessionCount === 1 ? "session" : "sessions"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <SecondaryButton
              onClick={() => setStep("scan")}
              title="Back to scan settings — change range or scan again"
            >
              Back to scan
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setSelectedWorkspaces(new Set());
                setSelectedIds(new Set());
              }}
              disabled={selectedWorkspaces.size === 0}
              title="Deselect all workspaces"
            >
              Clear
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setStep("sessions")}
              disabled={sessions.length === 0}
              title="Choose sessions and import modes"
            >
              Continue to sessions
            </SecondaryButton>
          </div>
        </>
      ) : null}

      {step === "sessions" || step === "import" ? (
        <>
          <StepHeading
            index={2}
            title="Sessions"
            hint={`${selectedSessions.length} selected`}
            action={
              <>
                {showReplayHarness ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] text-content/50">
                      Replay target harness:
                    </span>
                    <SelectMenu
                      label="Replay target harness"
                      value={replayHarness}
                      onChange={(next) => {
                        const harness = next as HarnessId;
                        setReplayHarness(harness);
                        persistSelection(selectedIds, modes, harness, bulkMode);
                      }}
                      options={HARNESSES.map((id) => ({
                        value: id,
                        label: HARNESS_TITLE[id],
                      }))}
                      className="w-44"
                    />
                  </span>
                ) : null}
                <Segmented<BulkMode>
                  label="Import mode for all sessions"
                  value={bulkMode}
                  onChange={setBulk}
                  options={BULK_OPTIONS}
                />
                <button
                  type="button"
                  aria-expanded={showModeHelp}
                  aria-controls="migration-mode-help"
                  aria-label="What is the difference between Resume and Replay?"
                  title="What is the difference between Resume and Replay?"
                  onClick={() => setShowModeHelp((visible) => !visible)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-content/20 text-content/60 transition-colors hover:border-content/40 hover:text-content"
                >
                  <span
                    aria-hidden
                    className="text-[12px] font-semibold italic leading-none"
                  >
                    i
                  </span>
                </button>
              </>
            }
          />
          {/* Always mounted so open/close animates both ways via the
              shared zen-phase-body collapse (320ms ease-out-expo rows +
              220ms opacity fade). Spacing lives inside the clipped child so
              the collapsed state takes zero height. */}
          <div
            id="migration-mode-help"
            data-open={showModeHelp}
            aria-hidden={!showModeHelp}
            className="zen-phase-body"
          >
            <div>
              <div className="mb-2 flex flex-col gap-1 rounded-lg border border-content/10 px-3 py-2 text-[12px] leading-relaxed text-content/60">
              <p>
                <span className="font-medium text-content/85">Resume</span>{" "}
                keeps talking where you left off, inside the original agent
                — a Claude chat continues in Claude, with a short summary
                prefilled in your composer as backup.
              </p>
                <p>
                  <span className="font-medium text-content/85">Replay</span>{" "}
                  copies the old chat as read-only history into any provider
                  you pick — an old Codex chat becomes background context for
                  a fresh OpenCode thread.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-content/10">
            {sessions.map(({ info }) => {
              const key = importKey(info);
              const on = selectedIds.has(key);
              const nativeHarness = nativeHarnessFor(info);
              const replayable = canReplay(info);
              const mode = effectiveMode(info, modes, bulkMode);
              const done = importedIds.has(key);
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 border-b border-content/5 px-3 py-2 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`Include session ${info.title}`}
                    onClick={() => toggleSession(key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      aria-hidden
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        on
                          ? "border-accent bg-accent text-white"
                          : "border-content/25 text-transparent"
                      }`}
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-content">
                        {info.title}
                        {done ? (
                          <span className="ml-2 text-[11px] text-emerald-400/80">
                            imported
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-content/45">
                        {nativeHarness
                          ? HARNESS_TITLE[nativeHarness]
                          : `${SOURCE_LABEL[info.source]} (replay only)`}{" "}
                        ·{" "}
                        {info.messageCount > 0 ? (
                          <>
                            {info.messageCount}{" "}
                            {info.messageCount === 1 ? "message" : "messages"}{" "}
                            ·{" "}
                          </>
                        ) : null}
                        {formatDate(info.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center pl-7 sm:pl-0">
                    {nativeHarness && replayable && bulkMode === "custom" ? (
                      <Segmented<ImportMode>
                        label={`Import mode for ${info.title}`}
                        value={mode}
                        onChange={(next) => setMode(key, next)}
                        options={[
                          { value: "native", label: "Resume" },
                          { value: "replay", label: "Replay" },
                        ]}
                      />
                    ) : (
                      <span className="text-[12px] text-content/50">
                        {nativeHarness && replayable
                          ? mode === "native"
                            ? "Resume"
                            : "Replay"
                          : nativeHarness
                            ? "Resume only"
                            : "Replay only"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {preflight.length > 0 ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2"
            >
              {preflight.map((warning) => (
                <p key={warning} className="text-[12px] text-amber-200/90">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <SecondaryButton
              onClick={() => setStep("workspaces")}
              title="Back to workspace selection"
            >
              Back
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedSessions.length === 0}
              title="Deselect all sessions"
            >
              Clear
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void runImport(selectedSessions)}
              disabled={importing || selectedSessions.length === 0}
              title="Import the selected sessions"
            >
              {importing ? (
                <>
                  <TerminalSpinner />
                  {`Importing ${progress.done}/${progress.total}…`}
                </>
              ) : (
                `Import ${selectedSessions.length} ${
                  selectedSessions.length === 1 ? "session" : "sessions"
                }`
              )}
            </SecondaryButton>
          </div>
        </>
      ) : null}

      {step === "import" ? (
        <>
          <StepHeading index={3} title="Import results" hint="" />
          <div
            role="status"
            aria-live="polite"
            className="text-[12px] text-content/55"
          >
            {importing
              ? `Working on “${progress.label}” (${progress.done}/${progress.total})…`
              : `${results.filter((r) => r.ok).length} of ${results.length} imported.`}
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-content/10">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex flex-col gap-1 border-b border-content/5 px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
              >
                <span
                  aria-hidden
                  className={`text-[12px] font-medium ${
                    result.ok ? "text-emerald-400/90" : "text-red-400"
                  }`}
                >
                  {result.ok ? "Imported" : "Failed"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-content">
                  {result.title}
                </span>
                {!result.ok ? (
                  <span className="min-w-0 flex-1 truncate text-[12px] text-content/50 sm:text-right">
                    {result.error}
                  </span>
                ) : null}
                {!result.ok && !importing ? (
                  <SecondaryButton
                    onClick={() => {
                      const item = selectedSessions.find(
                        ({ info }) => importKey(info) === result.id,
                      );
                      if (item) void retryAsReplay(item.info);
                    }}
                    title={`Retry “${result.title}” as replay instead`}
                  >
                    Retry as replay
                  </SecondaryButton>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <SecondaryButton
              onClick={() => setStep("scan")}
              title="Start over with a fresh scan"
            >
              New scan
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setStep("sessions")}
              title="Back to session selection"
            >
              Back to sessions
            </SecondaryButton>
          </div>
        </>
      ) : null}
    </div>
  );
}

function importKey(info: ExternalSessionInfo): string {
  return `${info.source}:${info.id}`;
}

/** Display label for a backend source string (unknown values pass through). */
function sourceLabel(source: string): string {
  return (
    (SOURCE_LABEL as Record<string, string | undefined>)[source] ?? source
  );
}

/** Stored choice, clamped to what the source supports (Antigravity is
 * resume-only, ZCode replay-only). A non-custom bulk choice acts as the
 * stored mode for every row, still clamped the same way. */
function effectiveMode(
  info: ExternalSessionInfo,
  modes: Record<string, ImportMode>,
  bulk: BulkMode,
): ImportMode {
  if (!canReplay(info)) return "native";
  const stored = bulk === "custom" ? modes[importKey(info)] : bulk;
  if (stored === "replay") return "replay";
  if (stored === "native" && nativeHarnessFor(info)) return "native";
  return nativeHarnessFor(info) ? "native" : "replay";
}

function StepHeading({
  index,
  title,
  hint,
  action,
}: {
  index: number;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-2">
      <span className="text-[12px] font-medium tabular-nums text-content/40">
        {index}.
      </span>
      <h3 className="text-[13px] font-medium text-content">{title}</h3>
      {hint ? (
        <span className="text-[12px] text-content/45">{hint}</span>
      ) : null}
      {action ? (
        <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {action}
        </span>
      ) : null}
    </div>
  );
}

