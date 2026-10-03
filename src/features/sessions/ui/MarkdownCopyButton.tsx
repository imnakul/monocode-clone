import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "../../../shared/ui/icons";
import { copyText } from "../../../platform/tauri/clipboard";

/** Copies the current source, including unsaved edits and frontmatter. */
export function MarkdownCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Copy Markdown"
        title={copied ? "Copied Markdown" : "Copy full Markdown"}
        disabled={pending}
        className="grid size-7 shrink-0 place-items-center rounded-md text-content/50 hover:bg-content/10 hover:text-content focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        onClick={async () => {
          setPending(true);
          setError(null);
          setCopied(false);
          try {
            await copyText(text);
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2000);
          } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
          } finally {
            setPending(false);
          }
        }}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      {copied ? (
        <span role="status" className="text-[11px] text-content/50">
          Copied
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="max-w-48 text-[11px] text-red-400">
          Could not copy. {error}
        </span>
      ) : null}
    </span>
  );
}
