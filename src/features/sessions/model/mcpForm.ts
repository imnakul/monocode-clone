export type McpFormOption = { value: string; label: string };

type McpFormFieldBase = {
  key: string;
  label: string;
  description?: string;
  required: boolean;
};

export type McpFormField =
  | (McpFormFieldBase & {
      kind: "text";
      default?: string;
      format?: "email" | "uri" | "date" | "date-time";
      minLength?: number;
      maxLength?: number;
    })
  | (McpFormFieldBase & {
      kind: "number";
      integer: boolean;
      default?: number;
      minimum?: number;
      maximum?: number;
    })
  | (McpFormFieldBase & { kind: "boolean"; default?: boolean })
  | (McpFormFieldBase & {
      kind: "choice";
      options: McpFormOption[];
      default?: string;
    })
  | (McpFormFieldBase & {
      kind: "multi";
      options: McpFormOption[];
      default?: string[];
      minItems?: number;
      maxItems?: number;
    });

export type McpFormPrompt = {
  requestId: number;
  serverName: string;
  message: string;
  fields: McpFormField[];
};

export type McpFormValue = string | number | boolean | string[];
export type McpFormReply =
  | { kind: "submit"; content: Record<string, McpFormValue> }
  | { kind: "decline" };
export type McpFormDraft = Record<string, string | boolean | string[]>;

export function initialMcpFormDraft(fields: McpFormField[]): McpFormDraft {
  return Object.fromEntries(
    fields.map((field) => {
      switch (field.kind) {
        case "text":
          return [field.key, field.default ?? ""];
        case "number":
          return [field.key, field.default != null ? String(field.default) : ""];
        case "boolean":
          return [field.key, field.default ?? false];
        case "choice":
          return [field.key, field.default ?? ""];
        case "multi":
          return [field.key, field.default ?? []];
      }
    }),
  );
}

export type McpFormValidation =
  | { ok: true; content: Record<string, McpFormValue> }
  | { ok: false; errors: Record<string, string> };

export function validateMcpForm(
  fields: McpFormField[],
  draft: McpFormDraft,
): McpFormValidation {
  const content: Array<[string, McpFormValue]> = [];
  const errors: Array<[string, string]> = [];

  for (const field of fields) {
    const value = Object.prototype.hasOwnProperty.call(draft, field.key)
      ? draft[field.key]
      : undefined;

    switch (field.kind) {
      case "text": {
        if (value === undefined) {
          if (field.required) errors.push([field.key, "Required."]);
          break;
        }
        if (typeof value !== "string") {
          errors.push([field.key, "Required."]);
          break;
        }
        const error = validateText(field, value);
        if (error) {
          errors.push([field.key, error]);
        } else if (value.trim() !== "") {
          content.push([field.key, value]);
        }
        break;
      }
      case "number": {
        if (value === undefined) {
          if (field.required) errors.push([field.key, "Required."]);
          break;
        }
        if (typeof value !== "string") {
          errors.push([field.key, "Enter a number."]);
          break;
        }
        const trimmed = value.trim();
        if (trimmed === "") {
          if (field.required) errors.push([field.key, "Required."]);
          break;
        }
        if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(trimmed)) {
          errors.push([field.key, "Enter a number."]);
          break;
        }
        const number = Number(trimmed);
        if (!Number.isFinite(number)) {
          errors.push([field.key, "Enter a number."]);
        } else if (field.integer && !Number.isInteger(number)) {
          errors.push([field.key, "Enter a whole number."]);
        } else if (field.minimum != null && number < field.minimum) {
          errors.push([field.key, `Must be at least ${field.minimum}.`]);
        } else if (field.maximum != null && number > field.maximum) {
          errors.push([field.key, `Must be at most ${field.maximum}.`]);
        } else {
          content.push([field.key, number]);
        }
        break;
      }
      case "boolean":
        content.push([
          field.key,
          typeof value === "boolean" ? value : field.default ?? false,
        ]);
        break;
      case "choice": {
        const choice = typeof value === "string" ? value : "";
        if (choice === "") {
          if (field.required) errors.push([field.key, "Required."]);
        } else if (!field.options.some((option) => option.value === choice)) {
          errors.push([field.key, "Choose a valid option."]);
        } else {
          content.push([field.key, choice]);
        }
        break;
      }
      case "multi": {
        const selected = Array.isArray(value)
          ? new Set(value.filter((entry): entry is string => typeof entry === "string"))
          : new Set<string>();
        const values = field.options
          .filter((option) => selected.has(option.value))
          .map((option) => option.value);
        if (values.length === 0 && field.required) {
          errors.push([field.key, "Required."]);
        } else if (
          field.minItems != null &&
          values.length < field.minItems
        ) {
          errors.push([field.key, `Choose at least ${field.minItems}.`]);
        } else if (
          field.maxItems != null &&
          values.length > field.maxItems
        ) {
          errors.push([field.key, `Choose at most ${field.maxItems}.`]);
        } else if (values.length > 0) {
          content.push([field.key, values]);
        }
        break;
      }
    }
  }

  return errors.length > 0
    ? { ok: false, errors: Object.fromEntries(errors) }
    : { ok: true, content: Object.fromEntries(content) };
}

function validateText(
  field: Extract<McpFormField, { kind: "text" }>,
  value: string,
): string | null {
  if (value.trim() === "") return field.required ? "Required." : null;
  const length = [...value].length;
  if (field.minLength != null && length < field.minLength)
    return `Use at least ${field.minLength} characters.`;
  if (field.maxLength != null && length > field.maxLength)
    return `Use at most ${field.maxLength} characters.`;

  switch (field.format) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : "Enter a valid email address.";
    case "uri": {
      try {
        return new URL(value).protocol
          ? null
          : "Enter a full URL, like https://example.com.";
      } catch {
        return "Enter a full URL, like https://example.com.";
      }
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return "Use the format YYYY-MM-DD.";
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
        ? null
        : "Use the format YYYY-MM-DD.";
    }
    case "date-time":
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
        !Number.isNaN(Date.parse(value))
        ? null
        : "Enter a date and time.";
    default:
      return null;
  }
}
