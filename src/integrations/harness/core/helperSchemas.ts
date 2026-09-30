export const TITLE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "workItem"],
  properties: {
    title: { type: "string" },
    workItem: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "number"],
          properties: {
            kind: { type: "string", enum: ["issue", "pr"] },
            number: { type: "integer" },
          },
        },
      ],
    },
  },
} as const satisfies Record<string, unknown>;

export const COMMIT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
} as const satisfies Record<string, unknown>;

export const PR_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body"],
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
} as const satisfies Record<string, unknown>;
