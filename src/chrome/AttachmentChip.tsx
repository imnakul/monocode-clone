import { useEffect, useState } from "react";
import { X } from "./icons";
import {
  attachmentPreviewSrc,
  loadAttachmentPreviewUrl,
} from "../lib/attachments";
import type { Attachment } from "../lib/session";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { FileTypeIcon } from "./FileTypeIcon";

type Props = {
  attachment: Attachment;
  onRemove?: () => void;
};

export function AttachmentChip({ attachment, onRemove }: Props) {
  const preview = attachmentPreviewSrc(attachment);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  // Reloaded sessions strip inline data, leaving image attachments with a
  // disk path only — fetch those bytes on demand for the thumbnail.
  const loadPath =
    attachment.kind === "image" && !preview ? (attachment.path ?? null) : null;

  useEffect(() => {
    if (!loadPath) {
      setLoadedUrl(null);
      return;
    }
    let cancelled = false;
    void loadAttachmentPreviewUrl(loadPath).then((url) => {
      if (!cancelled) setLoadedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPath]);

  const src = preview ?? loadedUrl ?? undefined;
  const image = attachment.kind === "image" && src;

  return (
    <div
      className={`group relative flex min-w-0 items-center gap-1.5 rounded-md ${
        image ? "" : "bg-content/10 py-0.5 pl-1 pr-1"
      }`}
      title={attachment.path ?? attachment.name}
    >
      {image && src ? (
        <button
          type="button"
          aria-label={`Open image ${attachment.name}`}
          title={`${attachment.name} — open full size`}
          onClick={() => setLightbox(true)}
          className="shrink-0 rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <img
            src={src}
            alt=""
            className="size-9 rounded-lg object-cover"
          />
        </button>
      ) : (
        <>
          <span className="grid size-5 shrink-0 place-items-center">
            <FileTypeIcon name={attachment.name} isDir={false} size={16} />
          </span>
          <span className="min-w-0 max-w-[140px] truncate text-[11px] leading-none text-content/80">
            {attachment.name}
          </span>
        </>
      )}
      {onRemove ? (
        <button
          type="button"
          title="Remove"
          aria-label={`Remove ${attachment.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`grid shrink-0 place-items-center rounded-full text-content/70 hover:bg-content/15 hover:text-content ${
            image
              ? "absolute -right-1 -top-1 size-5 bg-content/20 opacity-100 shadow-sm backdrop-blur-sm"
              : "size-4 text-content/40"
          }`}
        >
          <X className={image ? "size-3" : "size-3"} strokeWidth={2} />
        </button>
      ) : null}
      {lightbox && src ? (
        <AttachmentLightbox
          src={src}
          name={attachment.name}
          onClose={() => setLightbox(false)}
        />
      ) : null}
    </div>
  );
}
