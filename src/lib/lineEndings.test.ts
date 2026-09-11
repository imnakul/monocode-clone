import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  decodeLineEndings,
  detectLineEnding,
  encodeLineEndings,
  hasSameLogicalText,
} from "./lineEndings";

describe("text line-ending boundary", () => {
  it.each([
    ["empty", "", "", "\n"],
    ["no terminator", "hello", "hello", "\n"],
    ["LF", "a\n\nb\n", "a\n\nb\n", "\n"],
    ["CRLF", "a\r\n\r\nb\r\n", "a\n\nb\n", "\r\n"],
    ["CR-only", "a\r\rb\r", "a\n\nb\n", "\r"],
    ["final CRLF", "a\r\nb", "a\nb", "\r\n"],
    ["final CR", "a\rb", "a\nb", "\r"],
  ] as const)(
    "round-trips %s text without losing blank or final-line state",
    (_name, external, canonical, lineEnding) => {
      const decoded = decodeLineEndings(external);
      expect(decoded).toEqual({ text: canonical, lineEnding });
      expect(encodeLineEndings(decoded.text, decoded.lineEnding)).toBe(external);
    },
  );

  it("detects predominant line endings and returns null when absent", () => {
    expect(detectLineEnding("")).toBeNull();
    expect(detectLineEnding("single line without newline")).toBeNull();
    expect(detectLineEnding("a\nb\n")).toBe("\n");
    expect(detectLineEnding("a\r\nb\r\n")).toBe("\r\n");
    expect(detectLineEnding("a\rb\r")).toBe("\r");
    expect(detectLineEnding("a\r\r\nb")).toBe("\r\n");
    expect(detectLineEnding("a\rb\nc")).toBe("\r");
    expect(detectLineEnding("a\nb\rc")).toBe("\n");
  });

  it("prevents CRCRLF across repeated encode boundaries", () => {
    const canonical = "alpha\nbeta\n";
    const once = encodeLineEndings(canonical, "\r\n");
    expect(once).toBe("alpha\r\nbeta\r\n");
    const twice = encodeLineEndings(once, "\r\n");
    expect(twice).toBe("alpha\r\nbeta\r\n");
    const thrice = encodeLineEndings(twice, "\r\n");
    expect(thrice).toBe("alpha\r\nbeta\r\n");
    expect(thrice).not.toContain("\r\r\n");

    // Pre-encoded CRLF converted to LF
    expect(encodeLineEndings("alpha\r\nbeta\r\n", "\n")).toBe("alpha\nbeta\n");
    // Malformed CRCRLF normalized when encoded
    expect(encodeLineEndings("alpha\r\r\nbeta", "\r\n")).toBe("alpha\r\nbeta");
  });

  it("opens malformed CR runs before LF as one logical break", () => {
    for (const external of ["a\r\r\nb", "a\r\r\r\nb"]) {
      const decoded = decodeLineEndings(external);
      const editor = EditorState.create({ doc: decoded.text });
      expect(editor.doc.toJSON()).toEqual(["a", "b"]);
      expect(decoded.lineEnding).toBe("\r\n");
    }
  });

  it("does not collapse real blank lines in any convention", () => {
    for (const external of ["a\n\nb", "a\r\n\r\nb", "a\r\rb"]) {
      const editor = EditorState.create({
        doc: decodeLineEndings(external).text,
      });
      expect(editor.doc.toJSON()).toEqual(["a", "", "b"]);
    }
  });

  it("uses the predominant convention and breaks ties by first encounter", () => {
    expect(decodeLineEndings("a\r\nb\nc\r\nd").lineEnding).toBe("\r\n");
    expect(decodeLineEndings("a\rb\nc").lineEnding).toBe("\r");
    expect(decodeLineEndings("a\nb\rc").lineEnding).toBe("\n");
  });

  it("keeps Unicode content unchanged", () => {
    const external = "नमस्ते\r\n🙂 café\r\n";
    const decoded = decodeLineEndings(external);
    expect(decoded.text).toBe("नमस्ते\n🙂 café\n");
    expect(encodeLineEndings(decoded.text, decoded.lineEnding)).toBe(external);
  });

  it("treats LF and CRLF files as the same logical text", () => {
    expect(hasSameLogicalText("alpha\nbeta\n", "alpha\r\nbeta\r\n")).toBe(
      true,
    );
    expect(hasSameLogicalText("alpha\nbeta\n", "alpha\r\nBETA\r\n")).toBe(
      false,
    );
  });
});
