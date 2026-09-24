import { useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { LAYER } from "../../../shared/lib/layers";
import type { CliUpdateNotice } from "../../../integrations/harness/core/cliVersions";
import { HARNESS_TITLE, type HarnessId } from "../../sessions/model/session";
import { HarnessIcon } from "../../sessions/ui/HarnessIcon";
import { Check, X } from "../../../shared/ui/icons";

type Props = {
  notices: CliUpdateNotice[];
  onDismiss: (harness: HarnessId) => void;
};

/**
 * One card per outdated agent CLI: the exact update command and a Copy button.
 * Mirrors ApprovalToasts' placement (fixed top-right toast stack) so the two
 * never fight over the same corner of the screen.
 */
export function UpdateToasts({ notices, onDismiss }: Props): ReactElement | null {
  if (notices.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      style={{ zIndex: LAYER.toast, top: 12 }}
      className="pointer-events-none fixed right-3 flex w-[min(360px,calc(100vw-24px))] flex-col gap-2"
    >
      {notices.map((notice) => (
        <UpdateToastCard
          key={notice.harness}
          notice={notice}
          onDismiss={onDismiss}
        />
      ))}
    </div>,
    document.body,
  );
}

function UpdateToastCard({
  notice,
  onDismiss,
}: {
  notice: CliUpdateNotice;
  onDismiss: Props["onDismiss"];
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const title = HARNESS_TITLE[notice.harness];

  const copyCommand = (): void => {
    void navigator.clipboard.writeText(notice.updateCommand).then(
      () => setCopied(true),
      () => undefined,
    );
  };

  return (
    <article
      role="status"
      className="approval-toast pointer-events-auto overflow-hidden rounded-xl border border-content/20 border-dashed bg-content/10 shadow-xl backdrop-blur-xl"
    >
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <span className="flex items-center gap-2">
          <HarnessIcon harness={notice.harness} className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug text-content">
            {title} update available
          </span>
          <button
            type="button"
            aria-label={`Dismiss ${title} update notice`}
            onClick={() => onDismiss(notice.harness)}
            className="pointer-events-auto flex size-6 shrink-0 items-center justify-center rounded-md text-content/50 hover:bg-content/10 hover:text-content"
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
        </span>
        <span className="text-[12px] text-content/70">
          v{notice.currentVersion} → v{notice.latestVersion}
        </span>
        <span className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-content/5 px-2 py-1 font-mono text-[11px] text-content/80">
            {notice.updateCommand}
          </code>
          <button
            type="button"
            onClick={copyCommand}
            className="pointer-events-auto flex h-7 shrink-0 items-center gap-1 rounded-md border border-content/15 px-2 text-[12px] text-content/80 hover:bg-content/10 hover:text-content"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2} />
            ) : null}
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
    </article>
  );
}
