import { asRecord, stringField } from "./codexProtocol";
import type {
  McpFormField,
  McpFormOption,
} from "../../../../features/sessions/model/mcpForm";

/** Codex CLI 0.159.0's installed binary uses this approval-kind metadata key. */
export const CODEX_MCP_APPROVAL_KIND_KEYS: readonly string[] = [
  "codex_approval_kind",
];

let approvalKindKeysOverride: readonly string[] | undefined;

/** Test seam for exercising unknown, empty, and ambiguous metadata-key sets. */
export function setCodexMcpApprovalKindKeysForTest(
  keys?: readonly string[],
): void {
  approvalKindKeysOverride = keys;
}

export function codexMcpApprovalKindKeys(): readonly string[] {
  return approvalKindKeysOverride ?? CODEX_MCP_APPROVAL_KIND_KEYS;
}

export type CodexMcpToolGrant = { key: string };
export type CodexInProgressMcpTool = { server: string; tool: string };

export type McpFormUnsupportedReason =
  | "url"
  | "secret"
  | "field-type"
  | "too-many"
  | "shape";

export type CodexMcpFormResult =
  | {
      ok: true;
      serverName: string;
      message: string;
      fields: McpFormField[];
    }
  | {
      ok: false;
      reason: McpFormUnsupportedReason;
      serverName: string;
    };

type FieldParseResult =
  | { ok: true; field: McpFormField }
  | { ok: false; reason: "shape" | "field-type" };

const TOP_LEVEL_SCHEMA_KEYS = [
  "type",
  "properties",
  "required",
  "title",
  "description",
  "$schema",
  "additionalProperties",
];

const COMMON_FIELD_KEYS = ["type", "default", "title", "description"];

const STRONG_SECRET_PHRASES = [
  "password",
  "passwd",
  "passphrase",
  "passcode",
  "secret",
  "credential",
  "credentials",
  "api key",
  "apikey",
  "private key",
  "access token",
  "refresh token",
  "auth token",
  "bearer token",
  "session token",
  "otp",
  "one time password",
  "one time code",
  "verification code",
  "2fa code",
  "mfa code",
];

const WEAK_SECRET_WORDS = new Set(["token", "pin", "pin code", "code"]);

/** Parses Codex's structured form requests without interpreting approval metadata. */
export function codexMcpForm(params: unknown): CodexMcpFormResult {
  const rec = asRecord(params);
  const serverName = stringField(rec, "serverName") ?? "MCP server";
  const unsupported = (reason: McpFormUnsupportedReason): CodexMcpFormResult =>
    ({ ok: false, reason, serverName });

  if (rec?.mode === "url") return unsupported("url");
  if (!["form", "openai/form", "openaiForm"].includes(String(rec?.mode)))
    return unsupported("shape");

  const schema = asRecord(rec?.requestedSchema);
  const properties = asRecord(schema?.properties);
  if (
    !schema ||
    schema.type !== "object" ||
    !properties ||
    !hasOnlyKeys(schema, TOP_LEVEL_SCHEMA_KEYS)
  )
    return unsupported("shape");

  const keys = Object.keys(properties);
  const requiredValue = schema.required;
  const requiredKeys: string[] = [];
  if (requiredValue !== undefined) {
    if (!isStringArray(requiredValue)) return unsupported("shape");
    for (const key of requiredValue) {
      if (!Object.prototype.hasOwnProperty.call(properties, key))
        return unsupported("shape");
      requiredKeys.push(key);
    }
  }
  if (keys.length > 20) return unsupported("too-many");
  if (keys.length === 0) return unsupported("shape");

  const fields: McpFormField[] = [];
  for (const key of keys) {
    const parsed = parseMcpFormField(
      key,
      properties[key],
      requiredKeys.includes(key),
    );
    if (!parsed.ok) return unsupported(parsed.reason);
    fields.push(parsed.field);
  }
  if (fields.some(isSecretField)) return unsupported("secret");

  return {
    ok: true,
    serverName,
    message: stringField(rec, "message") ?? "Fill in this form",
    fields,
  };
}

/** Detects credential fields while allowing ordinary words like "token budget". */
export function isSecretField(field: McpFormField): boolean {
  const key = normalizeSecretText(field.key);
  const title = normalizeSecretText(field.label);
  const description = normalizeSecretText(field.description ?? "");
  const texts = [key, title, description];
  if (
    texts.some((text) => STRONG_SECRET_PHRASES.some((phrase) => hasPhrase(text, phrase)))
  )
    return true;
  return WEAK_SECRET_WORDS.has(key) || WEAK_SECRET_WORDS.has(title);
}

function parseMcpFormField(
  key: string,
  value: unknown,
  required: boolean,
): FieldParseResult {
  const field = asRecord(value);
  if (!field) return { ok: false, reason: "field-type" };

  const base = {
    key,
    label: stringField(field, "title") ?? key,
    ...(stringField(field, "description")
      ? { description: stringField(field, "description") }
      : {}),
    required,
  };
  const type = field.type;
  if (type === "string") {
    const hasEnum = Object.prototype.hasOwnProperty.call(field, "enum");
    const hasOneOf = Object.prototype.hasOwnProperty.call(field, "oneOf");
    if (hasEnum && hasOneOf) return { ok: false, reason: "shape" };
    if (hasEnum || hasOneOf) {
      if (
        !hasOnlyKeys(field, [
          ...COMMON_FIELD_KEYS,
          "enum",
          "enumNames",
          "oneOf",
        ])
      )
        return { ok: false, reason: "field-type" };
      const options = hasEnum
        ? parseEnumOptions(field.enum, field.enumNames)
        : parseOneOfOptions(field.oneOf);
      if (!options) return { ok: false, reason: "shape" };
      if (hasDefault(field) && !isOptionValue(field.default, options))
        return { ok: false, reason: "shape" };
      return {
        ok: true,
        field: {
          ...base,
          kind: "choice",
          options,
          ...(typeof field.default === "string"
            ? { default: field.default }
            : {}),
        },
      };
    }
    if (
      !hasOnlyKeys(field, [
        ...COMMON_FIELD_KEYS,
        "format",
        "minLength",
        "maxLength",
      ])
    )
      return { ok: false, reason: "field-type" };
    const format = field.format;
    if (
      format !== undefined &&
      !["email", "uri", "date", "date-time"].includes(String(format))
    )
      return { ok: false, reason: "field-type" };
    if (
      (hasDefault(field) && typeof field.default !== "string") ||
      !validNonNegativeIntegerIfPresent(field, "minLength") ||
      !validNonNegativeIntegerIfPresent(field, "maxLength") ||
      (typeof field.minLength === "number" &&
        typeof field.maxLength === "number" &&
        field.minLength > field.maxLength)
    )
      return { ok: false, reason: "shape" };
    return {
      ok: true,
      field: {
        ...base,
        kind: "text",
        ...(isTextFormat(format)
          ? { format }
          : {}),
        ...(typeof field.minLength === "number"
          ? { minLength: field.minLength }
          : {}),
        ...(typeof field.maxLength === "number"
          ? { maxLength: field.maxLength }
          : {}),
        ...(typeof field.default === "string"
          ? { default: field.default }
          : {}),
      },
    };
  }

  if (type === "number" || type === "integer") {
    if (!hasOnlyKeys(field, [...COMMON_FIELD_KEYS, "minimum", "maximum"]))
      return { ok: false, reason: "field-type" };
    if (
      (hasDefault(field) && !isFiniteNumber(field.default)) ||
      !validFiniteNumberIfPresent(field, "minimum") ||
      !validFiniteNumberIfPresent(field, "maximum") ||
      (typeof field.minimum === "number" &&
        typeof field.maximum === "number" &&
        field.minimum > field.maximum) ||
      (typeof field.default === "number" &&
        ((type === "integer" && !Number.isInteger(field.default)) ||
          (typeof field.minimum === "number" && field.default < field.minimum) ||
          (typeof field.maximum === "number" && field.default > field.maximum)))
    )
      return { ok: false, reason: "shape" };
    return {
      ok: true,
      field: {
        ...base,
        kind: "number",
        integer: type === "integer",
        ...(typeof field.minimum === "number"
          ? { minimum: field.minimum }
          : {}),
        ...(typeof field.maximum === "number"
          ? { maximum: field.maximum }
          : {}),
        ...(typeof field.default === "number" ? { default: field.default } : {}),
      },
    };
  }

  if (type === "boolean") {
    if (!hasOnlyKeys(field, COMMON_FIELD_KEYS))
      return { ok: false, reason: "field-type" };
    if (hasDefault(field) && typeof field.default !== "boolean")
      return { ok: false, reason: "shape" };
    return {
      ok: true,
      field: {
        ...base,
        kind: "boolean",
        ...(typeof field.default === "boolean" ? { default: field.default } : {}),
      },
    };
  }

  if (type === "array") {
    if (
      !hasOnlyKeys(field, [
        ...COMMON_FIELD_KEYS,
        "items",
        "minItems",
        "maxItems",
      ])
    )
      return { ok: false, reason: "field-type" };
    const options = parseMultiOptions(field.items);
    if (!options) return { ok: false, reason: "shape" };
    if (
      !validNonNegativeIntegerIfPresent(field, "minItems") ||
      !validNonNegativeIntegerIfPresent(field, "maxItems")
    )
      return { ok: false, reason: "shape" };
    const minItems = typeof field.minItems === "number" ? field.minItems : 0;
    const maxItems =
      typeof field.maxItems === "number" ? field.maxItems : options.length;
    if (minItems > maxItems || maxItems > options.length)
      return { ok: false, reason: "shape" };
    if (
      hasDefault(field) &&
      (!isStringArray(field.default) ||
        new Set(field.default).size !== field.default.length ||
        field.default.some(
          (value) => !options.some((option) => option.value === value),
        ) ||
        field.default.length < minItems ||
        field.default.length > maxItems)
    )
      return { ok: false, reason: "shape" };
    return {
      ok: true,
      field: {
        ...base,
        kind: "multi",
        options,
        ...(typeof field.minItems === "number"
          ? { minItems: field.minItems }
          : {}),
        ...(typeof field.maxItems === "number"
          ? { maxItems: field.maxItems }
          : {}),
        ...(isStringArray(field.default) ? { default: field.default } : {}),
      },
    };
  }

  return { ok: false, reason: "field-type" };
}

function parseEnumOptions(
  value: unknown,
  names: unknown,
): McpFormOption[] | null {
  if (!isNonEmptyUniqueStringArray(value, true)) return null;
  const labels =
    isStringArray(names) && names.length === value.length ? names : value;
  return value.map((entry, index) => ({ value: entry, label: labels[index] }));
}

function parseOneOfOptions(value: unknown): McpFormOption[] | null {
  if (!isUnknownArray(value) || value.length === 0) return null;
  const options: McpFormOption[] = [];
  const values = new Set<string>();
  for (const entry of value) {
    const option = asRecord(entry);
    if (
      !option ||
      !hasOnlyKeys(option, ["const", "title"]) ||
      typeof option.const !== "string" ||
      typeof option.title !== "string" ||
      values.has(option.const)
    )
      return null;
    values.add(option.const);
    options.push({ value: option.const, label: option.title });
  }
  return options;
}

function parseMultiOptions(value: unknown): McpFormOption[] | null {
  const items = asRecord(value);
  if (!items) return null;
  if (
    items.type === "string" &&
    hasOnlyKeys(items, ["type", "enum"]) &&
    isNonEmptyUniqueStringArray(items.enum, true)
  )
    return items.enum.map((entry) => ({ value: entry, label: entry }));
  if (hasOnlyKeys(items, ["anyOf"])) return parseOneOfOptions(items.anyOf);
  return null;
}

function isOptionValue(value: unknown, options: McpFormOption[]): value is string {
  return (
    typeof value === "string" &&
    options.some((option) => option.value === value)
  );
}

function validNonNegativeIntegerIfPresent(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  return (
    !Object.prototype.hasOwnProperty.call(record, key) ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

function validFiniteNumberIfPresent(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  return (
    !Object.prototype.hasOwnProperty.call(record, key) || isFiniteNumber(value)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasDefault(record: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(record, "default");
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(record).every((key) => allowed.includes(key));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === "string");
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isTextFormat(
  value: unknown,
): value is "email" | "uri" | "date" | "date-time" {
  return (
    value === "email" ||
    value === "uri" ||
    value === "date" ||
    value === "date-time"
  );
}

function isNonEmptyUniqueStringArray(
  value: unknown,
  requireNonEmptyEntries: boolean,
): value is string[] {
  return (
    isStringArray(value) &&
    value.length > 0 &&
    value.every((entry) => !requireNonEmptyEntries || entry.length > 0) &&
    new Set(value).size === value.length
  );
}

function normalizeSecretText(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(" ");
}

function hasPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

/** App access is covered by the user's explicit Full Access selection. */
export function isCodexComputerUseAccessConfirmation(params: unknown): boolean {
  const rec = asRecord(params);
  const message = stringField(rec, "message");
  return (
    stringField(rec, "serverName") === "cua_repl" &&
    message != null &&
    /^Allow Computer Use to use ".+"\?$/.test(message)
  );
}

/** Only confirmations can be represented faithfully by the Allow/Deny UI. */
export function codexMcpConfirmation(
  params: unknown,
  inProgressTools: readonly CodexInProgressMcpTool[] = [],
): {
  title: string;
  content: Record<string, boolean>;
  mcpToolGrant?: CodexMcpToolGrant;
} | null {
  const rec = asRecord(params);
  if (!rec) return null;
  const schema = asRecord(rec?.requestedSchema);
  const properties = asRecord(schema?.properties);
  if (
    !["form", "openai/form", "openaiForm"].includes(String(rec?.mode)) ||
    schema?.type !== "object" ||
    !properties ||
    Object.keys(schema).some(
      (key) =>
        ![
          "type",
          "properties",
          "required",
          "title",
          "description",
          "$schema",
          "additionalProperties",
        ].includes(key),
    )
  )
    return null;

  const entries = Object.entries(properties);
  const required = schema.required ?? [];
  if (
    !Array.isArray(required) ||
    required.some(
      (key) =>
        typeof key !== "string" ||
        !Object.prototype.hasOwnProperty.call(properties, key),
    ) ||
    entries.length > 1
  )
    return null;

  let detail: string | undefined;
  let content: Record<string, boolean> = {};
  if (entries.length === 1) {
    const [key, value] = entries[0];
    const field = asRecord(value);
    if (
      field?.type !== "boolean" ||
      Object.keys(field).some(
        (name) => !["type", "title", "description", "default"].includes(name),
      )
    )
      return null;
    detail = [
      stringField(field, "title") ?? key,
      stringField(field, "description"),
    ]
      .filter(Boolean)
      .join(" — ");
    content = { [key]: true };
  }

  const message = stringField(rec, "message") ?? "Approve request";
  const mcpToolGrant = codexMcpToolGrant(rec, inProgressTools);
  return {
    title: `${stringField(rec, "serverName") ?? "MCP"}: ${message}${detail ? ` — ${detail}` : ""}`,
    content,
    ...(mcpToolGrant ? { mcpToolGrant } : {}),
  };
}

function codexMcpToolGrant(
  params: Record<string, unknown>,
  inProgressTools: readonly CodexInProgressMcpTool[],
): CodexMcpToolGrant | undefined {
  const schema = asRecord(params.requestedSchema);
  const properties = asRecord(schema?.properties);
  if (
    params.mode !== "form" ||
    !schema ||
    schema?.type !== "object" ||
    !properties ||
    Object.keys(properties).length !== 0 ||
    Object.keys(schema).some((key) => key !== "type" && key !== "properties")
  ) {
    return undefined;
  }

  const meta = asPlainObject(params._meta);
  if (!meta) return undefined;
  const configuredKeys = codexMcpApprovalKindKeys();
  const presentApprovalKeys = configuredKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(meta, key),
  );
  if (
    presentApprovalKeys.length !== 1 ||
    meta[presentApprovalKeys[0]] !== "mcp_tool_call"
  ) {
    return undefined;
  }

  const persist = meta.persist;
  const hasSessionPersist =
    persist === "session" ||
    (Array.isArray(persist) &&
      persist.every((entry): entry is string => typeof entry === "string") &&
      persist.includes("session"));
  const serverName = params.serverName;
  if (
    !hasSessionPersist ||
    typeof serverName !== "string" ||
    serverName.trim().length === 0
  ) {
    return undefined;
  }

  const metadataToolName = meta.tool_name;
  let toolName: string;
  if (metadataToolName !== undefined) {
    if (
      typeof metadataToolName !== "string" ||
      metadataToolName.trim().length === 0 ||
      metadataToolName.length > 200
    ) {
      return undefined;
    }
    toolName = metadataToolName;
  } else {
    const message = params.message;
    if (typeof message !== "string") return undefined;
    const matchingTools = new Set(
      inProgressTools
        .filter(
          (candidate) =>
            candidate.server === serverName &&
            candidate.tool.length <= 200 &&
            message.includes('"' + candidate.tool + '"'),
        )
        .map((candidate) => candidate.tool),
    );
    if (matchingTools.size !== 1) return undefined;
    const matchingTool = matchingTools.values().next().value;
    if (typeof matchingTool !== "string") return undefined;
    toolName = matchingTool;
  }

  return { key: `${serverName}\u0000${toolName}` };
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  const prototype = Object.getPrototypeOf(record);
  return prototype === Object.prototype || prototype === null ? record : null;
}
