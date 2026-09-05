import { useEffect, useMemo, useState } from "react";
import { SelectMenu } from "../chrome/SelectMenu";
import { Check } from "../chrome/icons";
import { TerminalSpinner } from "../chrome/TerminalSpinner";
import { getCustomBinary } from "../lib/harness/customBinary";
import { probeHarnessBinary } from "../lib/harness/child";
import {
  SOURCE_LABEL,
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
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return { ids: [], modes: {}, replayHarness: "claude" };
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
    return { ids, modes, replayHarness };
  } catch {
    return { ids: [], modes: {}, replayHarness: "claude" };
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
  const [preflight, setPreflight] = useState<string[]>([]);
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

  const persistSelection = (
    ids: Set<string>,
    nextModes: Record<string, ImportMode>,
    harness: HarnessId,
  ): void => {
    saveSelection({ ids: [...ids], modes: nextModes, replayHarness: harness });
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
      persistSelection(next, modes, replayHarness);
      return next;
    });
  };

  const setMode = (id: string, mode: ImportMode): void => {
    setModes((prev) => {
      const next = { ...prev, [id]: mode };
      persistSelection(selectedIds, next, replayHarness);
      return next;
    });
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
      // Prefill visible history best-effort: the thread still resumes
      // natively on first send, but it no longer opens empty. A prefill
      // failure must never block the binding itself.
      try {
        session.blocks = (await loadReplayImport(info)).blocks;
      } catch (error) {
        console.debug("[monocode] native import without history", error);
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
          effectiveMode(info, modes),
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
        persistSelection(selectedIds, next, replayHarness);
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
        Bring past sessions in from Claude, Codex, OpenCode, ZCode, T3, and
        Cline. Native resume continues the original conversation in its own
        CLI; replay copies the transcript as labeled, read-only history into
        any provider. Nothing is re-executed and no CLIs are spawned until
        you import.
      </p>

      {step === "scan" || workspaces.length === 0 ? (
        <Row
          label="Scan for external sessions"
          description="Reads Claude, Codex, OpenCode, ZCode, T3, and Cline stores. Pure file reads — no terminals or consoles open."
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
          />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-content/50">
              Replay target harness:
            </span>
            <SelectMenu
              label="Replay target harness"
              value={replayHarness}
              onChange={(next) => {
                const harness = next as HarnessId;
                setReplayHarness(harness);
                persistSelection(selectedIds, modes, harness);
              }}
              options={HARNESSES.map((id) => ({
                value: id,
                label: HARNESS_TITLE[id],
              }))}
              className="w-44"
            />
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-content/10">
            {sessions.map(({ info }) => {
              const key = importKey(info);
              const on = selectedIds.has(key);
              const nativeHarness = nativeHarnessFor(info);
              const mode = effectiveMode(info, modes);
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
                    {nativeHarness ? (
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
                        Replay only
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
              {importing
                ? `Importing ${progress.done}/${progress.total}…`
                : `Import ${selectedSessions.length} ${
                    selectedSessions.length === 1 ? "session" : "sessions"
                  }`}
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
          <div className="flex justify-end">
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

/** Stored choice, falling back to replay when native resume is unavailable. */
function effectiveMode(
  info: ExternalSessionInfo,
  modes: Record<string, ImportMode>,
): ImportMode {
  const stored = modes[importKey(info)];
  if (stored === "replay") return "replay";
  if (stored === "native" && nativeHarnessFor(info)) return "native";
  return nativeHarnessFor(info) ? "native" : "replay";
}

function StepHeading({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint: string;
}) {
  return (
    <div className="mt-4 flex items-baseline gap-2">
      <span className="text-[12px] font-medium tabular-nums text-content/40">
        {index}.
      </span>
      <h3 className="text-[13px] font-medium text-content">{title}</h3>
      {hint ? (
        <span className="text-[12px] text-content/45">{hint}</span>
      ) : null}
    </div>
  );
}

