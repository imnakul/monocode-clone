// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpForm } from "./McpForm";
import type { McpFormPrompt, McpFormReply } from "../model/mcpForm";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const basePrompt: McpFormPrompt = {
  requestId: 7,
  serverName: "Docs",
  message: "Fill in these details",
  fields: [
    {
      key: "name",
      label: "Name",
      required: true,
      kind: "text",
      minLength: 2,
    },
    {
      key: "count",
      label: "Count",
      required: false,
      kind: "number",
      integer: true,
      default: 3,
    },
    {
      key: "color",
      label: "Color",
      required: true,
      kind: "choice",
      options: [
        { value: "red", label: "Red" },
        { value: "green", label: "Green" },
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
      ],
    },
    {
      key: "notify",
      label: "Notify",
      required: false,
      kind: "boolean",
      default: true,
    },
  ],
};

function renderForm(
  prompt = basePrompt,
  onReply: (requestId: number, reply: McpFormReply) => void = vi.fn(),
) {
  act(() => root.render(createElement(McpForm, { prompt, onReply })));
  return onReply;
}

function input(id: string): HTMLInputElement {
  const element = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!element) throw new Error(`Missing input ${id}`);
  return element;
}

function setInputValue(control: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

function click(selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing button ${selector}`);
  act(() => button.click());
}

describe("McpForm controls and replies", () => {
  it("renders the provider message and one labelled control for each field kind", () => {
    renderForm();

    expect(container.textContent).toContain("Docs");
    expect(container.textContent).toContain("Fill in these details");
    expect(input("mcp-form-7-0").type).toBe("text");
    expect(input("mcp-form-7-1").type).toBe("text");
    expect(input("mcp-form-7-1").inputMode).toBe("numeric");
    expect(input("mcp-form-7-2-option-0").type).toBe("radio");
    expect(input("mcp-form-7-3-option-0").type).toBe("checkbox");
    expect(input("mcp-form-7-4").type).toBe("checkbox");
    expect(container.querySelectorAll("label[for]")).toHaveLength(7);
    expect(container.querySelector("[data-question-form]")).not.toBeNull();
    expect(container.querySelector("form")?.className).toContain("max-h-[50vh]");
  });

  it("renders formatted text inputs and a select for choices with more than six options", () => {
    const prompt: McpFormPrompt = {
      ...basePrompt,
      fields: [
        {
          key: "email",
          label: "Email",
          required: true,
          kind: "text",
          format: "email",
        },
        {
          key: "website",
          label: "Website",
          required: false,
          kind: "text",
          format: "uri",
        },
        {
          key: "date",
          label: "Date",
          required: false,
          kind: "text",
          format: "date",
        },
        {
          key: "time",
          label: "Time",
          required: false,
          kind: "text",
          format: "date-time",
        },
        {
          key: "category",
          label: "Category",
          required: false,
          kind: "choice",
          options: Array.from({ length: 7 }, (_, index) => ({
            value: `v${index}`,
            label: `Value ${index}`,
          })),
        },
        {
          key: "amount",
          label: "Amount",
          required: false,
          kind: "number",
          integer: false,
        },
      ],
    };
    renderForm(prompt);

    expect(input("mcp-form-7-0").type).toBe("email");
    expect(input("mcp-form-7-1").type).toBe("url");
    expect(input("mcp-form-7-2").type).toBe("date");
    expect(input("mcp-form-7-3").type).toBe("datetime-local");
    expect(container.querySelector("select#mcp-form-7-4")).not.toBeNull();
    expect(input("mcp-form-7-5").inputMode).toBe("decimal");
  });

  it("shows and focuses the first invalid field without replying", () => {
    const onReply = vi.fn();
    renderForm(basePrompt, onReply);
    click('button[type="submit"]');

    const name = input("mcp-form-7-0");
    const error = container.querySelector<HTMLParagraphElement>(
      "#mcp-form-7-0-error",
    );
    expect(error?.textContent).toBe("Required.");
    expect(name.getAttribute("aria-describedby")).toContain(error?.id);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(name);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(onReply).not.toHaveBeenCalled();
  });

  it("submits valid values once even if Submit is clicked twice", () => {
    const onReply = vi.fn();
    renderForm(basePrompt, onReply);
    act(() => {
      setInputValue(input("mcp-form-7-0"), "Al");
      input("mcp-form-7-2-option-1").click();
      input("mcp-form-7-3-option-0").click();
      input("mcp-form-7-4").click();
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    });

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReply).toHaveBeenCalledWith(7, {
      kind: "submit",
      content: {
        name: "Al",
        count: 3,
        color: "green",
        tags: ["a"],
        notify: false,
      },
    });
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it("sends a decline without including draft values", () => {
    const onReply = vi.fn();
    renderForm(basePrompt, onReply);
    act(() => {
      setInputValue(input("mcp-form-7-0"), "private value");
      container.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
    });

    expect(onReply).toHaveBeenCalledWith(7, { kind: "decline" });
  });

  it("resets drafts and errors when the request id changes", () => {
    renderForm();
    act(() => setInputValue(input("mcp-form-7-0"), "Old value"));
    click('button[type="submit"]');
    expect(container.textContent).toContain("Required.");

    const nextPrompt = { ...basePrompt, requestId: 8 };
    act(() => root.render(createElement(McpForm, { prompt: nextPrompt, onReply: vi.fn() })));

    expect(input("mcp-form-8-0").value).toBe("");
    expect(container.textContent).not.toContain("Required.");
  });

  it("keeps a rejected response retryable after two seconds", () => {
    vi.useFakeTimers();
    const onReply = vi.fn();
    renderForm(basePrompt, onReply);
    act(() => {
      setInputValue(input("mcp-form-7-0"), "Al");
      input("mcp-form-7-2-option-0").click();
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    });
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    act(() => vi.advanceTimersByTime(2_000));
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });
});
