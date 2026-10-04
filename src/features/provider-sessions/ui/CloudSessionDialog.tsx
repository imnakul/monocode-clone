import { useEffect, useRef, useState, type ReactElement } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Modal } from "../../../shared/ui/Modal";
import { Cloud, Copy, ExternalLink } from "../../../shared/ui/icons";
import { copyText } from "../../../platform/tauri/clipboard";
import {
  probeCloudCapabilities,
  runCloudSessionAction,
  type CloudSession,
} from "../model/cloudSessions";
import {
  cloudActionEntries,
  retryCloudRetention,
  type CloudActionEntry,
  type CloudRecordAction,
} from "../model/cloudView";
import { PROVIDER_LABEL } from "../model/conversationSummary";

export type CloudCapabilityView =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: CloudActionEntry[] };

export type CloudActionResult = {
  action: CloudRecordAction;
  ok: boolean;
  /** Real CLI output, or the real error text. */
  text: string;
};

type BodyProps = {
  record: CloudSession;
  /** Set when the task started but its record could not be saved. */
  unsaved?: {
    message: string;
    retrying: boolean;
    error: string | null;
    onRetry: () => void;
  };
  capabilities: CloudCapabilityView;
  running: CloudRecordAction | null;
  result: CloudActionResult | null;
  confirmingApply: boolean;
  message: string;
  copied: string | null;
  onMessageChange: (value: string) => void;
  onRun: (entry: CloudActionEntry) => void;
  onConfirmApply: () => void;
  onCancelApply: () => void;
  onCopy: (what: "id" | "link") => void;
  onOpenLink: () => void;
  onReprobe: () => void;
};

function formatCreated(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "unknown";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

const button =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-content/10 bg-content/5 px-2.5 text-[12px] text-content transition-colors duration-100 hover:bg-content/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:hover:bg-content/5";

export function CloudSessionBody({
  record,
  unsaved,
  capabilities,
  running,
  result,
  confirmingApply,
  message,
  copied,
  onMessageChange,
  onRun,
  onConfirmApply,
  onCancelApply,
  onCopy,
  onOpenLink,
  onReprobe,
}: BodyProps): ReactElement {
  const label = PROVIDER_LABEL[record.provider];
  return (
    <div className="flex flex-col gap-3 px-5 pb-5 text-[13px] text-content/80">
      {unsaved ? (
        <div
          role="alert"
          className="flex flex-col gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-content/80"
        >
          <p>
            The cloud task was started, but MonoCode could not save its record.
            It will not be started again. Keep this ID, or retry saving.
          </p>
          <p className="break-words text-content/60">{unsaved.message}</p>
          {unsaved.error ? (
            <p className="break-words text-red-400/90">{unsaved.error}</p>
          ) : null}
          <div>
            <button
              type="button"
              disabled={unsaved.retrying}
              onClick={unsaved.onRetry}
              className={button}
            >
              {unsaved.retrying ? "Saving…" : "Retry saving"}
            </button>
          </div>
        </div>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-content/50">Provider</dt>
        <dd>{label} cloud task</dd>
        <dt className="text-content/50">Task ID</dt>
        <dd className="break-all font-mono">{record.id}</dd>
        <dt className="text-content/50">Project</dt>
        <dd className="break-all">{record.cwd}</dd>
        {record.environmentId ? (
          <>
            <dt className="text-content/50">Environment</dt>
            <dd className="break-all">{record.environmentId}</dd>
          </>
        ) : null}
        {record.branch ? (
          <>
            <dt className="text-content/50">Branch</dt>
            <dd className="break-all">{record.branch}</dd>
          </>
        ) : null}
        <dt className="text-content/50">Started</dt>
        <dd>{formatCreated(record.createdAt)}</dd>
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={onOpenLink} className={button}>
          <ExternalLink aria-hidden className="size-3.5" />
          Open in browser
        </button>
        <button type="button" onClick={() => onCopy("link")} className={button}>
          <Copy aria-hidden className="size-3.5" />
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
        <button type="button" onClick={() => onCopy("id")} className={button}>
          <Copy aria-hidden className="size-3.5" />
          {copied === "id" ? "ID copied" : "Copy ID"}
        </button>
      </div>
      <p className="text-[12px] text-content/55">
        MonoCode keeps this record and runs only the actions the installed{" "}
        {label} CLI supports. It does not show a live transcript of the cloud
        task; continue the conversation in {label}.
      </p>
      <section aria-label="Cloud actions" className="flex flex-col gap-1.5">
        <h3 className="text-[12px] font-medium text-content/60">Actions</h3>
        {capabilities.status === "loading" ? (
          <p role="status" className="text-[12px] text-content/55">
            Checking what this {label} CLI supports…
          </p>
        ) : capabilities.status === "error" ? (
          <div role="alert" className="flex flex-col gap-1.5 text-[12px] text-red-400/90">
            <p className="whitespace-pre-wrap break-words">
              Could not check {label} CLI support. {capabilities.message}
            </p>
            <div>
              <button type="button" onClick={onReprobe} className={button}>
                Check again
              </button>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {capabilities.entries.map((entry) => (
              <li key={entry.action} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !entry.available ||
                      running !== null ||
                      (entry.input && !message.trim())
                    }
                    aria-describedby={
                      entry.available ? undefined : `cloud-reason-${entry.action}`
                    }
                    onClick={() => onRun(entry)}
                    className={button}
                  >
                    {running === entry.action ? "Running…" : entry.label}
                  </button>
                  {!entry.available ? (
                    <span
                      id={`cloud-reason-${entry.action}`}
                      className="min-w-0 text-[11px] leading-snug text-content/50"
                    >
                      {entry.reason}
                    </span>
                  ) : null}
                </div>
                {entry.input && entry.available ? (
                  <textarea
                    value={message}
                    onChange={(event) => onMessageChange(event.target.value)}
                    aria-label={`Follow-up message for ${label}`}
                    rows={2}
                    placeholder="Message to send to this cloud task"
                    className="w-full resize-y rounded-md border border-content/10 bg-content/5 px-2 py-1.5 text-[12px] text-content outline-none placeholder:text-content/35 focus-visible:ring-1 focus-visible:ring-accent"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {confirmingApply ? (
          <div
            role="alertdialog"
            aria-label="Confirm apply"
            className="flex flex-col gap-1.5 rounded-lg border border-content/15 bg-content/5 px-3 py-2 text-[12px]"
          >
            <p>
              Apply this task&apos;s changes to <span className="break-all font-mono">{record.cwd}</span>?
              Your checkout must be clean; MonoCode will not stash, reset or
              commit anything for you.
            </p>
            <div className="flex gap-1.5">
              <button type="button" onClick={onConfirmApply} className={button}>
                Apply to checkout
              </button>
              <button type="button" onClick={onCancelApply} className={button}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {result ? (
          <div className="flex flex-col gap-1">
            <p
              role={result.ok ? "status" : "alert"}
              className={`text-[12px] ${result.ok ? "text-content/60" : "text-red-400/90"}`}
            >
              {result.ok ? "Output from the CLI" : "The CLI reported an error"}
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-content/10 bg-content/5 p-2 font-mono text-[11px] leading-snug text-content/80">
              {result.text.trim() || "(no output)"}
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Retained cloud record: metadata plus only the actions the installed CLI supports. */
export function CloudSessionDialog({
  record,
  unsavedMessage,
  onClose,
  onSaved,
}: {
  record: CloudSession;
  /** Present when the launch succeeded but the record was not saved. */
  unsavedMessage?: string;
  onClose: () => void;
  onSaved?: (record: CloudSession) => void;
}): ReactElement {
  const label = PROVIDER_LABEL[record.provider];
  const [capabilities, setCapabilities] = useState<CloudCapabilityView>({ status: "loading" });
  const [running, setRunning] = useState<CloudRecordAction | null>(null);
  const [result, setResult] = useState<CloudActionResult | null>(null);
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [retention, setRetention] = useState<{ retrying: boolean; error: string | null; pending: boolean }>({
    retrying: false,
    error: null,
    pending: unsavedMessage !== undefined,
  });
  const probeRun = useRef(0);

  const probe = (): void => {
    const run = ++probeRun.current;
    setCapabilities({ status: "loading" });
    probeCloudCapabilities(record.provider, record.cwd, record.providerAccountId)
      .then((caps) => {
        if (run === probeRun.current)
          setCapabilities({ status: "ready", entries: cloudActionEntries(record.provider, caps) });
      })
      .catch((error: unknown) => {
        if (run === probeRun.current)
          setCapabilities({ status: "error", message: error instanceof Error ? error.message : String(error) });
      });
  };
  // Probed once per opened record, not on every render.
  useEffect(() => {
    probe();
    return () => {
      probeRun.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.provider, record.cwd, record.providerAccountId, record.id]);

  const run = async (action: CloudRecordAction, confirmApply = false): Promise<void> => {
    setRunning(action);
    setResult(null);
    try {
      const text = await runCloudSessionAction(record, action, {
        message: action === "message" ? message : undefined,
        confirmApply,
      });
      setResult({ action, ok: true, text });
      if (action === "message") setMessage("");
    } catch (error) {
      setResult({ action, ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(null);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={`${label} cloud task`}
      description={record.id}
      size="md"
      fitViewport
    >
      <div className="flex items-center gap-1.5 px-5 pb-2 text-[12px] text-content/55">
        <Cloud aria-hidden className="size-3.5" />
        Runs on {label}&apos;s servers
      </div>
      <CloudSessionBody
        record={record}
        unsaved={
          retention.pending && unsavedMessage !== undefined
            ? {
                message: unsavedMessage,
                retrying: retention.retrying,
                error: retention.error,
                onRetry: () => {
                  setRetention({ retrying: true, error: null, pending: true });
                  retryCloudRetention(record)
                    .then((saved) => {
                      setRetention({ retrying: false, error: null, pending: false });
                      onSaved?.(saved);
                    })
                    .catch((error: unknown) =>
                      setRetention({
                        retrying: false,
                        error: error instanceof Error ? error.message : String(error),
                        pending: true,
                      }),
                    );
                },
              }
            : undefined
        }
        capabilities={capabilities}
        running={running}
        result={result}
        confirmingApply={confirmingApply}
        message={message}
        copied={copied}
        onMessageChange={setMessage}
        onRun={(entry) => {
          if (entry.confirm) setConfirmingApply(true);
          else void run(entry.action);
        }}
        onConfirmApply={() => {
          setConfirmingApply(false);
          void run("apply", true);
        }}
        onCancelApply={() => setConfirmingApply(false)}
        onCopy={(what) => {
          void copyText(what === "id" ? record.id : record.url).then(() => {
            setCopied(what);
            window.setTimeout(() => setCopied(null), 1500);
          });
        }}
        onOpenLink={() => void openUrl(record.url).catch(() => undefined)}
        onReprobe={probe}
      />
    </Modal>
  );
}
