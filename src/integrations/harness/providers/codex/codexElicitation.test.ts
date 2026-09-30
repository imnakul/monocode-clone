import { afterEach, describe, expect, it } from "vitest";
import {
  codexMcpConfirmation,
  isCodexComputerUseAccessConfirmation,
  setCodexMcpApprovalKindKeysForTest,
} from "./codexElicitation";

const confirmation = {
  mode: "form",
  serverName: "example",
  message: "Confirm access",
  requestedSchema: {
    type: "object",
    properties: {
      approved: { type: "boolean", title: "Read this source?", default: false },
    },
    required: ["approved"],
    additionalProperties: false,
  },
};

const sessionConfirmation = {
  mode: "form",
  serverName: "socraticode",
  requestedSchema: { type: "object", properties: {} },
  _meta: {
    codex_approval_kind: "mcp_tool_call",
    persist: ["session", "always"],
    tool_name: "codebase_search",
  },
};

const invalidShapes: Array<{
  title: string;
  meta?: Record<string, unknown>;
  requestedSchema?: unknown;
  serverName?: string;
  omitApprovalKind?: boolean;
}> = [
  { title: "persist only allows always", meta: { persist: "always" } },
  { title: "approval kind is missing", omitApprovalKind: true },
  {
    title: "approval kind key is unrecognized",
    meta: { other_kind: "mcp_tool_call" },
    omitApprovalKind: true,
  },
  {
    title: "schema has properties",
    requestedSchema: { type: "object", properties: { x: {} } },
  },
  { title: "tool name is missing", meta: { tool_name: undefined } },
  { title: "tool name is empty", meta: { tool_name: "" } },
  { title: "tool name is too long", meta: { tool_name: "x".repeat(201) } },
  { title: "server name is empty", serverName: "" },
];

afterEach(() => setCodexMcpApprovalKindKeysForTest());

describe("Codex MCP confirmations", () => {
  it.each(["form", "openai/form", "openaiForm"])(
    "supports a Boolean confirmation in %s mode",
    (mode) => {
      expect(codexMcpConfirmation({ ...confirmation, mode })).toEqual({
        title: "example: Confirm access — Read this source?",
        content: { approved: true },
      });
    },
  );

  it("keeps empty confirmations compatible", () => {
    expect(
      codexMcpConfirmation({
        ...confirmation,
        requestedSchema: { type: "object", properties: {}, required: [] },
      })?.content,
    ).toEqual({});
  });

  it("recognizes the verified Codex MCP approval shape", () => {
    expect(codexMcpConfirmation(sessionConfirmation)).toMatchObject({
      content: {},
      mcpToolGrant: { key: "socraticode\u0000codebase_search" },
    });
  });

  it.each(invalidShapes)("fails closed when $title", (shape) => {
    const meta = { ...sessionConfirmation._meta, ...shape.meta };
    if (shape.omitApprovalKind) delete meta.codex_approval_kind;
    const invalid = {
      ...sessionConfirmation,
      ...(shape.requestedSchema !== undefined
        ? { requestedSchema: shape.requestedSchema }
        : {}),
      ...(shape.serverName !== undefined ? { serverName: shape.serverName } : {}),
      _meta: meta,
    };
    expect(codexMcpConfirmation(invalid)?.mcpToolGrant).toBeUndefined();
  });

  it("requires exactly one configured approval-kind key and session persistence", () => {
    setCodexMcpApprovalKindKeysForTest(["first", "second"]);
    expect(
      codexMcpConfirmation({
        ...sessionConfirmation,
        _meta: {
          first: "mcp_tool_call",
          second: "mcp_tool_call",
          persist: "session",
          tool_name: "search",
        },
      })?.mcpToolGrant,
    ).toBeUndefined();

    setCodexMcpApprovalKindKeysForTest([]);
    expect(codexMcpConfirmation(sessionConfirmation)?.mcpToolGrant).toBeUndefined();
  });

  it.each([
    { type: "object", properties: {}, required: ["missing"] },
    { type: "object", properties: {}, required: "approved" },
    { type: "object", properties: { approved: { type: "string" } } },
    {
      type: "object",
      properties: { approved: { type: "boolean", const: false } },
    },
    {
      type: "object",
      properties: { approved: { type: "boolean" }, name: { type: "string" } },
    },
    { ...confirmation.requestedSchema, allOf: [{ required: ["missing"] }] },
  ])(
    "does not invent answers for unsupported schemas: %j",
    (requestedSchema) => {
      expect(
        codexMcpConfirmation({ ...confirmation, requestedSchema }),
      ).toBeNull();
    },
  );

  it("does not treat browser authorization as a confirmation", () => {
    expect(codexMcpConfirmation({ ...confirmation, mode: "url" })).toBeNull();
  });

  it("identifies computer-use app access without matching other confirmations", () => {
    expect(
      isCodexComputerUseAccessConfirmation({
        ...confirmation,
        serverName: "cua_repl",
        message: 'Allow Computer Use to use "QuickTime Player"?',
      }),
    ).toBe(true);
    expect(isCodexComputerUseAccessConfirmation(confirmation)).toBe(false);
    expect(
      isCodexComputerUseAccessConfirmation({
        ...confirmation,
        serverName: "cua_repl",
        message: "Allow this form submission?",
      }),
    ).toBe(false);
  });
});
