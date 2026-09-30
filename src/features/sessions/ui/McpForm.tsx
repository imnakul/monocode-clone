import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare } from "../../../shared/ui/icons";
import {
  initialMcpFormDraft,
  validateMcpForm,
  type McpFormDraft,
  type McpFormField,
  type McpFormPrompt,
  type McpFormReply,
} from "../model/mcpForm";

type Props = {
  prompt: McpFormPrompt;
  onReply: (requestId: number, reply: McpFormReply) => void;
};

export function McpForm({ prompt, onReply }: Props) {
  const [draft, setDraft] = useState<McpFormDraft>(() =>
    initialMcpFormDraft(prompt.fields),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const controls = useRef(new Map<string, HTMLElement>());
  const submittingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(prompt.requestId);
  requestIdRef.current = prompt.requestId;

  useEffect(() => {
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = null;
    submittingRef.current = false;
    setSubmitting(false);
    setErrors({});
    setDraft(initialMcpFormDraft(prompt.fields));
  }, [prompt.requestId, prompt.fields]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    },
    [],
  );

  const updateDraft = (key: string, value: string | boolean | string[]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const result = validateMcpForm(prompt.fields, draft);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = prompt.fields.find((field) => result.errors[field.key]);
      if (firstInvalid) controls.current.get(firstInvalid.key)?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    onReply(prompt.requestId, { kind: "submit", content: result.content });
    const submittedRequestId = prompt.requestId;
    resetTimer.current = setTimeout(() => {
      if (requestIdRef.current !== submittedRequestId) return;
      submittingRef.current = false;
      setSubmitting(false);
      resetTimer.current = null;
    }, 2_000);
  };

  return (
    <div
      className="px-1.5 pb-1.5"
      data-question-form
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <form
        className="max-h-[50vh] overflow-y-auto rounded-lg border border-content/10 bg-content/3 px-3 py-2.5"
        onSubmit={submit}
      >
        <div className="flex items-center gap-1.5">
          <MessageSquare
            className="size-3.5 shrink-0 text-content/45"
            strokeWidth={1.75}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] text-content/50">
            {prompt.serverName}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-content/75">
          {prompt.message}
        </p>

        <div className="mt-2.5 flex flex-col gap-2.5">
          {prompt.fields.map((field, fieldIndex) => (
            <FormField
              key={`${prompt.requestId}-${field.key}`}
              field={field}
              fieldIndex={fieldIndex}
              requestId={prompt.requestId}
              value={draft[field.key]}
              error={errors[field.key]}
              onValueChange={updateDraft}
              registerControl={(key, node) => {
                if (node) controls.current.set(key, node);
                else controls.current.delete(key);
              }}
            />
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            className="h-6 rounded-md border border-content/15 px-2.5 text-[11px] text-content/70 hover:bg-content/5 disabled:opacity-40"
            onClick={() => {
              if (submittingRef.current) return;
              submittingRef.current = true;
              setSubmitting(true);
              onReply(prompt.requestId, { kind: "decline" });
              const declinedRequestId = prompt.requestId;
              resetTimer.current = setTimeout(() => {
                if (requestIdRef.current !== declinedRequestId) return;
                submittingRef.current = false;
                setSubmitting(false);
                resetTimer.current = null;
              }, 2_000);
            }}
          >
            Decline
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-6 rounded-md bg-content px-2.5 text-[11px] font-medium text-background-base hover:bg-content/80 disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  field,
  fieldIndex,
  requestId,
  value,
  error,
  onValueChange,
  registerControl,
}: {
  field: McpFormField;
  fieldIndex: number;
  requestId: number;
  value: McpFormDraft[string] | undefined;
  error?: string;
  onValueChange: (key: string, value: string | boolean | string[]) => void;
  registerControl: (key: string, node: HTMLElement | null) => void;
}) {
  const controlId = `mcp-form-${requestId}-${fieldIndex}`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const describedBy = [
    field.description ? descriptionId : undefined,
    error ? errorId : undefined,
  ]
    .filter((id): id is string => id !== undefined)
    .join(" ");
  const optional = !field.required;
  const label = (
    <>
      {field.label}
      {optional ? (
        <span className="ml-1 text-[11px] font-normal text-content/40">
          (optional)
        </span>
      ) : null}
    </>
  );
  const fieldLabelClass = "text-[12px] font-medium leading-snug text-content";
  const description = field.description ? (
    <p id={descriptionId} className="mt-0.5 text-[11px] leading-snug text-content/50">
      {field.description}
    </p>
  ) : null;
  const errorText = error ? (
    <p id={errorId} className="mt-1 text-[11px] text-red-400">
      {error}
    </p>
  ) : null;
  const inputClass = `mt-1.5 w-full rounded-md border bg-transparent px-2 py-1 text-[12px] text-content outline-none placeholder:text-content/35 focus:border-content/30 ${
    error ? "border-red-400/60" : "border-content/15"
  }`;

  if (field.kind === "boolean") {
    return (
      <fieldset className="min-w-0">
        <label
          htmlFor={controlId}
          className={`${fieldLabelClass} flex min-h-6 items-center gap-2`}
        >
          <input
            ref={(node) => registerControl(field.key, node)}
            id={controlId}
            type="checkbox"
            checked={typeof value === "boolean" ? value : field.default ?? false}
            aria-required={field.required}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onValueChange(field.key, event.target.checked)}
          />
          <span>{label}</span>
        </label>
        {description}
        {errorText}
      </fieldset>
    );
  }

  if (field.kind === "choice" && field.options.length <= 6) {
    const selected = typeof value === "string" ? value : "";
    return (
      <fieldset
        className="min-w-0"
        aria-required={field.required}
        aria-describedby={describedBy || undefined}
      >
        <legend className={fieldLabelClass}>{label}</legend>
        {description}
        <div className="mt-1.5 flex flex-col gap-1">
          {field.options.map((option, optionIndex) => {
            const optionId = `${controlId}-option-${optionIndex}`;
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className="flex min-h-6 items-center gap-2 text-[12px] text-content/80"
              >
                <input
                  ref={(node) => registerControl(field.key, node)}
                  id={optionId}
                  type="radio"
                  name={controlId}
                  value={option.value}
                  checked={selected === option.value}
                  aria-required={field.required}
                  aria-describedby={describedBy || undefined}
                  aria-invalid={error ? true : undefined}
                  onChange={() => onValueChange(field.key, option.value)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {errorText}
      </fieldset>
    );
  }

  if (field.kind === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset
        className="min-w-0"
        aria-required={field.required || (field.minItems ?? 0) > 0}
        aria-describedby={describedBy || undefined}
      >
        <legend className={fieldLabelClass}>{label}</legend>
        {description}
        <div className="mt-1.5 flex flex-col gap-1">
          {field.options.map((option, optionIndex) => {
            const optionId = `${controlId}-option-${optionIndex}`;
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className="flex min-h-6 items-center gap-2 text-[12px] text-content/80"
              >
                <input
                  ref={(node) => registerControl(field.key, node)}
                  id={optionId}
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  aria-describedby={describedBy || undefined}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((entry) => entry !== option.value);
                    onValueChange(field.key, next);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {errorText}
      </fieldset>
    );
  }

  if (field.kind === "choice") {
    return (
      <div className="min-w-0">
        <label htmlFor={controlId} className={fieldLabelClass}>
          {label}
        </label>
        {description}
        <select
          ref={(node) => registerControl(field.key, node)}
          id={controlId}
          value={typeof value === "string" ? value : ""}
          aria-required={field.required}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onValueChange(field.key, event.target.value)}
          className={`${inputClass} h-8`}
        >
          <option value="">Choose an option</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errorText}
      </div>
    );
  }

  const inputType =
    field.kind === "text"
      ? field.format === "date-time"
        ? "datetime-local"
        : field.format === "uri"
          ? "url"
          : field.format ?? "text"
      : "text";
  return (
    <div className="min-w-0">
      <label htmlFor={controlId} className={fieldLabelClass}>
        {label}
      </label>
      {description}
      <input
        ref={(node) => registerControl(field.key, node)}
        id={controlId}
        type={field.kind === "number" ? "text" : inputType}
        inputMode={
          field.kind === "number"
            ? field.integer
              ? "numeric"
              : "decimal"
            : undefined
        }
        value={typeof value === "string" ? value : ""}
        aria-required={field.required}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onValueChange(field.key, event.target.value)}
        className={inputClass}
      />
      {errorText}
    </div>
  );
}
