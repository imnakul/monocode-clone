import { describe, expect, it } from "vitest";
import {
  initialMcpFormDraft,
  validateMcpForm,
  type McpFormField,
} from "./mcpForm";

describe("MCP form draft and validation", () => {
  it("initializes defaults for every field kind", () => {
    const fields: McpFormField[] = [
      { key: "name", label: "Name", required: true, kind: "text" },
      {
        key: "count",
        label: "Count",
        required: false,
        kind: "number",
        integer: true,
        default: 3,
      },
      {
        key: "notify",
        label: "Notify",
        required: false,
        kind: "boolean",
        default: true,
      },
      {
        key: "color",
        label: "Color",
        required: false,
        kind: "choice",
        options: [{ value: "red", label: "Red" }],
        default: "red",
      },
      {
        key: "tags",
        label: "Tags",
        required: false,
        kind: "multi",
        options: [{ value: "one", label: "One" }],
        default: ["one"],
      },
    ];

    expect(initialMcpFormDraft(fields)).toEqual({
      name: "",
      count: "3",
      notify: true,
      color: "red",
      tags: ["one"],
    });
  });

  it.each([
    {
      field: { key: "name", label: "Name", required: true, kind: "text" },
      value: "  ",
      error: "Required.",
    },
    {
      field: {
        key: "name",
        label: "Name",
        required: true,
        kind: "text",
        minLength: 2,
      },
      value: "a",
      error: "Use at least 2 characters.",
    },
    {
      field: {
        key: "name",
        label: "Name",
        required: true,
        kind: "text",
        maxLength: 2,
      },
      value: "abc",
      error: "Use at most 2 characters.",
    },
    {
      field: {
        key: "email",
        label: "Email",
        required: true,
        kind: "text",
        format: "email",
      },
      value: "a@b",
      error: "Enter a valid email address.",
    },
    {
      field: {
        key: "url",
        label: "URL",
        required: true,
        kind: "text",
        format: "uri",
      },
      value: "example.com",
      error: "Enter a full URL, like https://example.com.",
    },
    {
      field: {
        key: "date",
        label: "Date",
        required: true,
        kind: "text",
        format: "date",
      },
      value: "2026-02-30",
      error: "Use the format YYYY-MM-DD.",
    },
    {
      field: {
        key: "dateTime",
        label: "Date and time",
        required: true,
        kind: "text",
        format: "date-time",
      },
      value: "not a date",
      error: "Enter a date and time.",
    },
    {
      field: {
        key: "count",
        label: "Count",
        required: true,
        kind: "number",
        integer: false,
      },
      value: "abc",
      error: "Enter a number.",
    },
    {
      field: {
        key: "count",
        label: "Count",
        required: true,
        kind: "number",
        integer: true,
      },
      value: "2.5",
      error: "Enter a whole number.",
    },
    {
      field: {
        key: "count",
        label: "Count",
        required: true,
        kind: "number",
        integer: false,
        minimum: 2,
      },
      value: "1",
      error: "Must be at least 2.",
    },
    {
      field: {
        key: "count",
        label: "Count",
        required: true,
        kind: "number",
        integer: false,
        maximum: 10,
      },
      value: "11",
      error: "Must be at most 10.",
    },
    {
      field: {
        key: "color",
        label: "Color",
        required: true,
        kind: "choice",
        options: [{ value: "red", label: "Red" }],
      },
      value: "",
      error: "Required.",
    },
    {
      field: {
        key: "tags",
        label: "Tags",
        required: true,
        kind: "multi",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "c", label: "C" },
        ],
        maxItems: 2,
      },
      value: ["a", "b", "c"],
      error: "Choose at most 2.",
    },
    {
      field: {
        key: "tags",
        label: "Tags",
        required: false,
        kind: "multi",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        minItems: 2,
      },
      value: [],
      error: "Choose at least 2.",
    },
  ] satisfies Array<{ field: McpFormField; value: string | string[]; error: string }>) (
    "validates $field.kind field $field.key",
    ({ field, value, error }) => {
      expect(validateMcpForm([field], { [field.key]: value })).toEqual({
        ok: false,
        errors: { [field.key]: error },
      });
    },
  );

  it("converts a valid draft and omits empty optional values", () => {
    const fields: McpFormField[] = [
      { key: "name", label: "Name", required: true, kind: "text" },
      {
        key: "size",
        label: "Size",
        required: false,
        kind: "number",
        integer: true,
        minimum: 1,
        maximum: 10,
      },
      {
        key: "color",
        label: "Color",
        required: true,
        kind: "choice",
        options: [
          { value: "r", label: "Red" },
          { value: "g", label: "Green" },
        ],
      },
      {
        key: "tags",
        label: "Tags",
        required: false,
        kind: "multi",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "c", label: "C" },
        ],
        maxItems: 2,
      },
      {
        key: "notify",
        label: "Notify",
        required: false,
        kind: "boolean",
        default: true,
      },
      { key: "optional", label: "Optional", required: false, kind: "text" },
    ];

    expect(
      validateMcpForm(fields, {
        name: "Al",
        size: "4",
        color: "g",
        tags: ["a"],
        notify: false,
        optional: "   ",
      }),
    ).toEqual({
      ok: true,
      content: {
        name: "Al",
        size: 4,
        color: "g",
        tags: ["a"],
        notify: false,
      },
    });
  });

  it("counts text length in Unicode code points and preserves entered whitespace", () => {
    expect(
      validateMcpForm(
        [
          {
            key: "name",
            label: "Name",
            required: true,
            kind: "text",
            minLength: 2,
          },
        ],
        { name: "😀A" },
      ),
    ).toEqual({ ok: true, content: { name: "😀A" } });
    expect(
      validateMcpForm(
        [{ key: "name", label: "Name", required: false, kind: "text" }],
        { name: "  value  " },
      ),
    ).toEqual({ ok: true, content: { name: "  value  " } });
  });

  it("keeps multi choices in declared option order and filters unknown values", () => {
    expect(
      validateMcpForm(
        [
          {
            key: "tags",
            label: "Tags",
            required: false,
            kind: "multi",
            options: [
              { value: "a", label: "A" },
              { value: "b", label: "B" },
              { value: "c", label: "C" },
            ],
          },
        ],
        { tags: ["c", "invalid", "a"] },
      ),
    ).toEqual({ ok: true, content: { tags: ["a", "c"] } });
  });
});
