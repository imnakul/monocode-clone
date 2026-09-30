import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader } from "../../../shared/ui/icons";
import { Modal } from "../../../shared/ui/Modal";
import {
  generateHelperPrContent,
  helperFailureMessage,
  type HelperPrDraft,
} from "../../../integrations/harness";
import type { HarnessId } from "../../sessions/model/session";

type Props = {
  cwd: string;
  textHarness?: HarnessId;
  draft: HelperPrDraft;
  initialError: string;
  pushed: boolean;
  onCreate: (draft: HelperPrDraft) => Promise<void>;
  onCancel: () => void;
};

export function PrDetailsDialog({
  cwd,
  textHarness,
  draft,
  initialError,
  pushed,
  onCreate,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.body);
  const [error, setError] = useState(initialError);
  const [retrying, setRetrying] = useState(false);
  const [creating, setCreating] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const retryController = useRef<AbortController | null>(null);
  const creatingRef = useRef(false);
  const trimmedTitle = title.trim();
  const canCreate =
    trimmedTitle.length > 0 && trimmedTitle.length <= 256 && !creating && !retrying;

  useEffect(() => {
    const frame = requestAnimationFrame(() => titleInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      retryController.current?.abort();
      retryController.current = null;
    },
    [],
  );

  const close = () => {
    if (!creatingRef.current) onCancel();
  };

  const retry = async () => {
    if (retryController.current || creatingRef.current) return;
    const startTitle = titleInput.current?.value ?? title;
    const startDescription = descriptionInput.current?.value ?? description;
    const controller = new AbortController();
    retryController.current = controller;
    setRetrying(true);
    try {
      const outcome = await generateHelperPrContent(
        cwd,
        textHarness,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (outcome.status === "ready") {
        if (
          titleInput.current?.value === startTitle &&
          descriptionInput.current?.value === startDescription
        ) {
          setTitle(outcome.content.title);
          setDescription(outcome.content.body);
          setError("");
        } else {
          setError(
            "A new description was generated, but you edited the fields, so it wasn't applied.",
          );
        }
      } else if (outcome.status === "needs-review") {
        setError(helperFailureMessage("pr", outcome.failure));
      }
    } catch (retryError) {
      if (!controller.signal.aborted) {
        setError(
          retryError instanceof Error ? retryError.message : String(retryError),
        );
      }
    } finally {
      if (retryController.current === controller) {
        retryController.current = null;
      }
      if (!controller.signal.aborted) setRetrying(false);
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setError("");
    try {
      await onCreate({
        title: trimmedTitle,
        body: description,
        base: draft.base,
        head: draft.head,
      });
      onCancel();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : String(createError),
      );
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  return (
    <Modal
      title="Pull request details"
      size="sm"
      onClose={close}
      className="overflow-visible"
    >
      <form className="flex flex-col gap-3 p-4" onSubmit={(event) => void create(event)}>
        <div role="alert" className="flex flex-col gap-1 text-[11px] leading-4 text-red-400/90">
          {error ? <p className="whitespace-pre-wrap">{error}</p> : null}
          {pushed ? (
            <p className="text-content/55">
              Your branch was pushed to origin/{draft.head}. No pull request was
              created.
            </p>
          ) : null}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-content/70">Title</span>
          <input
            ref={titleInput}
            type="text"
            value={title}
            maxLength={256}
            aria-label="Title"
            disabled={creating}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 rounded-md border border-content/10 bg-content/5 px-2.5 font-sans text-[13px] text-content outline-none placeholder:text-content/30 focus:border-content/25 disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-content/70">
            Description
          </span>
          <textarea
            ref={descriptionInput}
            value={description}
            rows={8}
            aria-label="Description"
            disabled={creating}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-32 resize-y rounded-md border border-content/10 bg-content/5 px-2.5 py-2 font-sans text-[12px] leading-relaxed text-content outline-none placeholder:text-content/30 focus:border-content/25 disabled:opacity-50"
          />
          <span className="text-[11px] text-content/45">
            Draft from your commit messages. Edit it before creating the pull
            request.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={creating || retrying}
            onClick={() => void retry()}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-content/70 hover:bg-content/8 hover:text-content disabled:opacity-40"
          >
            {retrying ? (
              <Loader className="size-3.5 animate-spin" strokeWidth={1.75} />
            ) : null}
            {retrying ? "Trying again…" : "Try again"}
          </button>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-[12px] text-content/70 hover:bg-content/8 hover:text-content disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canCreate}
              className="inline-flex items-center gap-1.5 rounded-md bg-content px-3 py-1.5 text-[12px] font-medium text-background-base hover:bg-content/80 disabled:opacity-40"
            >
              {creating ? (
                <Loader className="size-3.5 animate-spin" strokeWidth={1.75} />
              ) : null}
              Create pull request
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
