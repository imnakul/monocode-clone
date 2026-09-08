import { useEffect, useRef } from "react";
import { X } from "./icons";
import { LAYER } from "../lib/layers";

type Props = {
  src: string;
  name: string;
  onClose: () => void;
};

/** Full-size image overlay for a chat attachment thumbnail. */
export function AttachmentLightbox({ src, name, onClose }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    frameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${name}`}
      tabIndex={-1}
      className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 outline-none"
      style={{ zIndex: LAYER.dialog }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close image preview"
        title="Close (Esc)"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
      >
        <X className="size-4" strokeWidth={2} />
      </button>
      <img
        src={src}
        alt={name}
        className="min-h-0 min-w-0 max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
      <span className="max-w-[60vw] shrink-0 truncate text-[12px] text-white/80">
        {name}
      </span>
    </div>
  );
}
