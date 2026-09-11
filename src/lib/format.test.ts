import { describe, expect, it } from "vitest";
import { formatText } from "./format";
import { decodeLineEndings, encodeLineEndings } from "./lineEndings";

describe("format-save line-ending boundary", () => {
  it.each([
    ["CRLF", "const value={answer:42}\r\n", "\r\n"],
    ["LF", "const value={answer:42}\n", "\n"],
    ["CR-only", "const value={answer:42}\r", "\r"],
  ] as const)("restores %s after Prettier", async (_name, source, expectedEol) => {
    const decoded = decodeLineEndings(source);
    const result = await formatText("example.ts", decoded.text, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    const saved = encodeLineEndings(result.formatted, decoded.lineEnding);
    expect(saved).toBe(
      `const value = { answer: 42 };${expectedEol}`,
    );
  });
});
