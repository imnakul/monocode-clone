import { extractJsonObject, limitSection } from "./jsonText";

const MESSAGE_LIMIT = 8_000;
const TITLE_LIMIT = 50;

const THREAD_TITLE_PROMPT = `Generate a title that will help the user recognize this coding session weeks later.
Return JSON with exactly one key: title.
Do not call tools. Reply with JSON only.

Before answering, silently reduce the request to:
- Subject: What system, feature, or problem is this really about?
- Outcome: What does the user ultimately want to understand or change?
- Incidental instructions: What only describes how the agent should do the work?

Title the subject and outcome. Discard incidental instructions.

Editorial rules:
- 3-8 words, fewer than 40 characters.
- Use a compact noun phrase or clear action phrase.
- Capture the umbrella goal when the request lists several symptoms or steps.
- Name the product change, not the mock, plan, report, branch, or PR used to produce it.
- Models, subagents, tools, and output formats do not belong in the title unless they are themselves the topic.
- Do not claim the work is complete.
- Do not copy and truncate the user's message.
- Avoid quotes, labels, filler, and trailing punctuation.`;

export function buildThreadTitlePrompt(message: string): string {
  return `${THREAD_TITLE_PROMPT}\n\nUser message:\n${limitSection(message, MESSAGE_LIMIT)}`;
}

export function sanitizeThreadTitle(raw: string): string {
  const normalized = raw
    .trim()
    .split(/\r?\n/g)[0]
    ?.trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) return "";
  if (normalized.length <= TITLE_LIMIT) return normalized;
  return `${normalized.slice(0, TITLE_LIMIT - 3).trimEnd()}...`;
}

export function parseGeneratedThreadTitle(raw: string): string | null {
  const json = extractJsonObject(raw);
  if (json) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === "object" && "title" in parsed) {
        const title = sanitizeThreadTitle(String((parsed as { title: unknown }).title));
        if (title) return title;
      }
    } catch {
      // Fall through to a bare-title parse when the model skipped JSON.
    }
  }

  const fallback = sanitizeThreadTitle(raw);
  if (!fallback || /[{}]/.test(fallback)) return null;
  const words = fallback.split(" ").filter(Boolean).length;
  if (words < 2 || words > 10) return null;
  return fallback;
}

const LOCAL_TITLE_LIMIT = 72;

/**
 * Derives a deterministic local title for a chat session from the first user message.
 *
 * Rules:
 * - Selects the first non-empty line from multiline prompts.
 * - Collapses consecutive and internal whitespace characters to a single space.
 * - Safely handles Unicode code points and emojis without slicing surrogate pairs.
 * - Falls back to attachment names (up to 3) when no usable text is provided.
 * - Returns a neutral fallback when no usable text or attachments exist.
 * - Formats with `${harnessLabel} · ${short}` when a title is derived, or `${harnessLabel}` for fallback.
 */
export function deriveLocalSessionTitle(
  prompt: string,
  harnessLabel: string,
  attachments: Array<{ name?: string }> = [],
): string {
  const lines = prompt.split(/\r?\n/);
  let firstLine = "";
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed) {
      firstLine = trimmed;
      break;
    }
  }

  const cleanedLine = firstLine.replace(/\s+/g, " ");

  const fromFiles =
    !cleanedLine && attachments.length > 0
      ? attachments
          .map((file) => file.name?.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(", ")
      : "";

  const seed = (cleanedLine || fromFiles).replace(/\s+/g, " ").trim();
  if (!seed) {
    return harnessLabel;
  }

  // Unicode-safe truncation using Array.from to segment code points without splitting surrogate pairs
  const codePoints = Array.from(seed);
  const short =
    codePoints.length > LOCAL_TITLE_LIMIT
      ? `${codePoints.slice(0, LOCAL_TITLE_LIMIT - 1).join("").trimEnd()}…`
      : seed;

  return `${harnessLabel} · ${short}`;
}
