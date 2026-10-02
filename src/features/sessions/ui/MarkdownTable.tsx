import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Check, Copy, FilePlusCorner } from "../../../shared/ui/icons";
import { copyFormattedText } from "../../../platform/tauri/clipboard";
import { tableContent } from "../model/tableContent";

export const MarkdownTableContext = createContext<{
  onSaveNote?: (text: string) => void | Promise<void>;
  streaming?: boolean;
}>({});

export function MarkdownTable({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"table"> & { node?: unknown }) {
  const { onSaveNote, streaming } = useContext(MarkdownTableContext);
  const table = useRef<HTMLTableElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, setPending] = useState<"copy" | "note" | null>(null);
  const [complete, setComplete] = useState<"copy" | "note" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = async (action: "copy" | "note") => {
    if (pending || streaming || !table.current) return;
    setPending(action);
    setComplete(null);
    setError(null);
    try {
      const content = tableContent(table.current);
      if (action === "copy")
        await copyFormattedText(content.markdown, content.html);
      else await onSaveNote?.(content.markdown);
      setComplete(action);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setComplete(null), 2000);
    } catch (error) {
      setError(
        `Could not ${action === "copy" ? "copy table" : "save table to Notes"}. ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setPending(null);
    }
  };

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-content/60 hover:bg-content/8 hover:text-content focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40";
  return (
    <div
      data-streamdown="table-wrapper"
      className="my-4 min-w-0 rounded-lg border border-content/10"
    >
      <div
        role="group"
        aria-label="Table actions"
        className="flex flex-wrap items-center justify-end gap-1 px-2 py-1.5 select-none"
      >
        <button
          type="button"
          className={buttonClass}
          aria-label="Copy table"
          title={
            streaming
              ? "Wait for the response to finish"
              : "Copy table as Markdown and formatted text"
          }
          disabled={!!pending || streaming}
          onClick={() => void run("copy")}
        >
          {complete === "copy" ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {complete === "copy" ? "Copied" : "Copy"}
        </button>
        {onSaveNote ? (
          <button
            type="button"
            className={buttonClass}
            aria-label="Add table to Note"
            title={
              streaming
                ? "Wait for the response to finish"
                : "Save this table as a note"
            }
            disabled={!!pending || streaming}
            onClick={() => void run("note")}
          >
            {complete === "note" ? (
              <Check className="size-3.5" />
            ) : (
              <FilePlusCorner className="size-3.5" />
            )}
            {complete === "note" ? "Saved to Notes" : "Add to Note"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="px-3 pb-2 text-xs text-content/70">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table
          {...props}
          ref={table}
          data-streamdown="table"
          className={`w-full border-collapse ${className ?? ""}`}
        >
          {children}
        </table>
      </div>
    </div>
  );
}
