import { afterEach, describe, expect, it } from "vitest";
import {
  codexMcpConfirmation,
  codexMcpForm,
  isCodexComputerUseAccessConfirmation,
  isSecretField,
  setCodexMcpApprovalKindKeysForTest,
} from "./codexElicitation";
import type { CodexInProgressMcpTool } from "./codexElicitation";
import type { McpFormField } from "../../../../features/sessions/model/mcpForm";

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

  it("resolves a missing tool name from one quoted in-progress item", () => {
    const confirmation = codexMcpConfirmation(
      {
        ...sessionConfirmation,
        message:
          'Allow the socraticode MCP server to run tool "codebase_status"?',
        _meta: { ...sessionConfirmation._meta, tool_name: undefined },
      },
      [
        { server: "socraticode", tool: "codebase_status" },
        { server: "socraticode", tool: "codebase_status" },
        { server: "socraticode", tool: "codebase_search" },
        { server: "other", tool: "codebase_status" },
      ],
    );

    expect(confirmation?.mcpToolGrant).toEqual({
      key: "socraticode\u0000codebase_status",
    });
  });

  const missingToolCases: Array<{
    title: string;
    message: string;
    tools: CodexInProgressMcpTool[];
  }> = [
    {
      title: "no in-progress item",
      message:
        'Allow the socraticode MCP server to run tool "codebase_status"?',
      tools: [],
    },
    {
      title: "an item from another server",
      message:
        'Allow the socraticode MCP server to run tool "codebase_status"?',
      tools: [{ server: "other", tool: "codebase_status" }],
    },
    {
      title: "a message that does not quote the tool name",
      message: "Allow the socraticode MCP server to run tool codebase_status?",
      tools: [{ server: "socraticode", tool: "codebase_status" }],
    },
    {
      title: "an in-progress tool name longer than 200 characters",
      message: `Allow "${"x".repeat(201)}" for socraticode?`,
      tools: [{ server: "socraticode", tool: "x".repeat(201) }],
    },
    {
      title: "multiple quoted tools",
      message:
        'Allow "codebase_status" or "codebase_search" for socraticode?',
      tools: [
        { server: "socraticode", tool: "codebase_status" },
        { server: "socraticode", tool: "codebase_search" },
      ],
    },
  ];

  it.each(missingToolCases)("fails closed for $title", (testCase) => {
    const confirmation = codexMcpConfirmation(
      {
        ...sessionConfirmation,
        message: testCase.message,
        _meta: { ...sessionConfirmation._meta, tool_name: undefined },
      },
      testCase.tools,
    );

    expect(confirmation?.mcpToolGrant).toBeUndefined();
  });

  it("uses metadata over in-progress candidates and refuses invalid metadata", () => {
    const candidates = [{ server: "socraticode", tool: "codebase_status" }];
    expect(
      codexMcpConfirmation(sessionConfirmation, candidates)?.mcpToolGrant,
    ).toEqual({ key: "socraticode\u0000codebase_search" });

    for (const toolName of ["", "x".repeat(201), null]) {
      expect(
        codexMcpConfirmation(
          {
            ...sessionConfirmation,
            message:
              'Allow the socraticode MCP server to run tool "codebase_status"?',
            _meta: { ...sessionConfirmation._meta, tool_name: toolName },
          },
          candidates,
        )?.mcpToolGrant,
      ).toBeUndefined();
    }
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

describe("Codex MCP forms", () => {
  const request = (
    properties: Record<string, unknown>,
    required?: unknown,
    mode = "form",
  ) => ({
    mode,
    serverName: "docs",
    message: "Fill these in",
    requestedSchema: {
      type: "object",
      properties,
      ...(required === undefined ? {} : { required }),
    },
  });

  it("parses primitive, choice and multi fields in property order", () => {
    expect(
      codexMcpForm(
        request(
          {
            name: { type: "string", title: "Name", minLength: 2 },
            size: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              default: 3,
            },
            color: {
              type: "string",
              oneOf: [
                { const: "r", title: "Red" },
                { const: "g", title: "Green" },
              ],
            },
            tags: {
              type: "array",
              items: { type: "string", enum: ["a", "b", "c"] },
              maxItems: 2,
            },
            notify: { type: "boolean", default: true },
          },
          ["name", "color"],
        ),
      ),
    ).toEqual({
      ok: true,
      serverName: "docs",
      message: "Fill these in",
      fields: [
        {
          key: "name",
          label: "Name",
          kind: "text",
          minLength: 2,
          required: true,
        },
        {
          key: "size",
          label: "size",
          kind: "number",
          integer: true,
          minimum: 1,
          maximum: 10,
          default: 3,
          required: false,
        },
        {
          key: "color",
          label: "color",
          kind: "choice",
          options: [
            { value: "r", label: "Red" },
            { value: "g", label: "Green" },
          ],
          required: true,
        },
        {
          key: "tags",
          label: "tags",
          kind: "multi",
          options: [
            { value: "a", label: "a" },
            { value: "b", label: "b" },
            { value: "c", label: "c" },
          ],
          maxItems: 2,
          required: false,
        },
        {
          key: "notify",
          label: "notify",
          kind: "boolean",
          default: true,
          required: false,
        },
      ],
    });
  });

  it("uses enumNames only when every label is present", () => {
    const valid = codexMcpForm(
      request({
        color: { type: "string", enum: ["x", "y"], enumNames: ["Ex", "Why"] },
      }),
    );
    const fallback = codexMcpForm(
      request({
        color: { type: "string", enum: ["x", "y"], enumNames: ["Ex"] },
      }),
    );
    expect(valid.ok && valid.fields[0]).toMatchObject({
      options: [
        { value: "x", label: "Ex" },
        { value: "y", label: "Why" },
      ],
    });
    expect(fallback.ok && fallback.fields[0]).toMatchObject({
      options: [
        { value: "x", label: "x" },
        { value: "y", label: "y" },
      ],
    });
  });

  it.each([
    ["url", { ...request({}, []), mode: "url" }, "url"],
    ["unknown mode", request({ name: { type: "string" } }, [], "other"), "shape"],
    ["object field", request({ nested: { type: "object" } }), "field-type"],
    ["unknown constraint", request({ name: { type: "string", pattern: ".*" } }), "field-type"],
    ["unknown format", request({ phone: { type: "string", format: "phone" } }), "field-type"],
    ["too many fields", request(Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`f${index}`, { type: "string" }]))), "too-many"],
    ["missing required key", request({ name: { type: "string" } }, ["missing"]), "shape"],
    ["invalid length bounds", request({ name: { type: "string", minLength: 5, maxLength: 2 } }), "shape"],
    ["empty enum", request({ value: { type: "string", enum: [] } }), "shape"],
    ["secret in key", request({ api_key: { type: "string" } }), "secret"],
    ["secret in title", request({ field: { type: "string", title: "Your password" } }), "secret"],
    ["weak secret key", request({ token: { type: "string" } }), "secret"],
    ["camel case secret key", request({ githubAccessToken: { type: "string" } }), "secret"],
    ["weak secret title", request({ field: { type: "string", title: "PIN" } }), "secret"],
    ["secret description", request({ notes: { type: "string", title: "Notes", description: "Enter your password" } }), "secret"],
    ["unconstrained openai form", request({}, undefined, "openai/form"), "shape"],
  ] as const)("rejects %s with %s", (_label, params, reason) => {
    const result = codexMcpForm(params);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it.each([
    ["token_budget", "Token budget", undefined],
    ["max_tokens", undefined, undefined],
    ["pin_item", "Pin this item", undefined],
    ["note", undefined, "Pin this item to the top"],
    ["tokenizer", undefined, undefined],
    ["limit", undefined, "Token budget for the reply"],
  ] as const)("allows benign secret-like text in %s", (key, title, description) => {
    const field: McpFormField = {
      key,
      label: title ?? key,
      ...(description ? { description } : {}),
      required: false,
      kind: "text",
    };
    expect(isSecretField(field)).toBe(false);
    expect(
      codexMcpForm(
        request({
          [key]: {
            type: "string",
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
          },
        }),
      ).ok,
    ).toBe(true);
  });

  it("defaults names and message and rejects a default outside its options", () => {
    expect(
      codexMcpForm({
        mode: "form",
        requestedSchema: {
          type: "object",
          properties: {
            color: { type: "string", enum: ["red"], default: "blue" },
          },
        },
      }),
    ).toEqual({ ok: false, reason: "shape", serverName: "MCP server" });
  });
});
