import { describe, expect, it } from "vitest";
import {
  deriveLocalSessionTitle,
} from "./sessionTitle";
import {
  canReplaceSessionTitle,
  formatSessionTitle,
  HARNESS_LABEL,
  sessionDisplayTitle,
  titleFromPrompt,
} from "./session";

describe("deriveLocalSessionTitle", () => {
  it("derives a clean title from a single line prompt", () => {
    const title = titleFromPrompt("Fix login authentication flow", "codex");
    expect(title).toBe("codex · Fix login authentication flow");
    expect(sessionDisplayTitle(title, "codex")).toBe("Fix login authentication flow");
  });

  it("handles multiline prompts by using the first non-empty line", () => {
    const prompt = `\n\n   \nRefactor navigation bar\n\nAnd also add dark mode toggle`;
    const title = titleFromPrompt(prompt, "claude");
    expect(title).toBe("claude · Refactor navigation bar");
    expect(sessionDisplayTitle(title, "claude")).toBe("Refactor navigation bar");
  });

  it("collapses consecutive and internal whitespace characters", () => {
    const prompt = "Fix    the   \t broken \n search    input";
    const title = titleFromPrompt(prompt, "codex");
    expect(title).toBe("codex · Fix the broken");
  });

  it("safely handles Unicode emojis and surrogate pairs without splitting them", () => {
    const emojiPrompt = "🚀 Fix the rocket launch sequencer 🌟✨🔥";
    const title = titleFromPrompt(emojiPrompt, "codex");
    expect(title).toBe(`codex · ${emojiPrompt}`);

    // Create a very long string containing multi-byte emojis to test boundary truncation
    const longEmojiPrompt = "🎉".repeat(80);
    const truncatedTitle = titleFromPrompt(longEmojiPrompt, "claude");
    expect(truncatedTitle.endsWith("…")).toBe(true);
    // Ensure no malformed surrogate pairs were introduced
    const rawDisplay = sessionDisplayTitle(truncatedTitle, "claude");
    expect(() => encodeURIComponent(rawDisplay)).not.toThrow();
  });

  it("falls back to attachment filenames when prompt is empty or whitespace-only", () => {
    const attachments = [
      { id: "1", name: "schema.prisma", mimeType: "text/plain", kind: "file" as const, size: 100 },
      { id: "2", name: "migration.sql", mimeType: "text/plain", kind: "file" as const, size: 100 },
      { id: "3", name: "seed.ts", mimeType: "text/plain", kind: "file" as const, size: 100 },
      { id: "4", name: "extra.json", mimeType: "text/plain", kind: "file" as const, size: 100 },
    ];
    const title = titleFromPrompt("   \n\t  ", "codex", attachments);
    // Only takes the first 3
    expect(title).toBe("codex · schema.prisma, migration.sql, seed.ts");
  });

  it("uses neutral fallback when no usable text or attachments exist", () => {
    const emptyTitle = titleFromPrompt("", "claude");
    expect(emptyTitle).toBe("claude");
    expect(sessionDisplayTitle(emptyTitle, "claude")).toBe("New session");

    const whitespaceTitle = titleFromPrompt("   \n\t  ", "codex");
    expect(whitespaceTitle).toBe("codex");
    expect(sessionDisplayTitle(whitespaceTitle, "codex")).toBe("New session");
  });

  it("enforces maximum title length with ellipsis", () => {
    const longText = "A".repeat(100);
    const title = titleFromPrompt(longText, "codex");
    const display = sessionDisplayTitle(title, "codex");
    expect(display.length).toBe(72);
    expect(display.endsWith("…")).toBe(true);
  });

  it("respects manual renaming and does not allow replacement once customized", () => {
    const initial = titleFromPrompt("Initial request", "codex");
    expect(canReplaceSessionTitle(initial, "codex", initial)).toBe(true);

    const userRenamed = formatSessionTitle("codex", "My Custom User Title");
    // Once user renames it, canReplaceSessionTitle is false
    expect(canReplaceSessionTitle(userRenamed, "codex", initial)).toBe(false);
  });
});
