import { asRecord, stringField } from "./codexProtocol";

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
export function codexMcpConfirmation(params: unknown): {
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
  const mcpToolGrant = codexMcpToolGrant(rec);
  return {
    title: `${stringField(rec, "serverName") ?? "MCP"}: ${message}${detail ? ` — ${detail}` : ""}`,
    content,
    ...(mcpToolGrant ? { mcpToolGrant } : {}),
  };
}

function codexMcpToolGrant(
  params: Record<string, unknown>,
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
  const toolName = meta.tool_name;
  if (
    !hasSessionPersist ||
    typeof serverName !== "string" ||
    serverName.trim().length === 0 ||
    typeof toolName !== "string" ||
    toolName.trim().length === 0 ||
    toolName.length > 200
  ) {
    return undefined;
  }

  return { key: `${serverName}\u0000${toolName}` };
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  const prototype = Object.getPrototypeOf(record);
  return prototype === Object.prototype || prototype === null ? record : null;
}
