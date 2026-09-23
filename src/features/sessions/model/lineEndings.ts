export type LineEnding = "\n" | "\r\n" | "\r";

export type DecodedLineEndings = {
  text: string;
  lineEnding: LineEnding;
};

const LINE_ENDING_PATTERN = /\r+\n|\r|\n/g;

export function detectLineEnding(value: string): LineEnding | null {
  const counts = new Map<LineEnding, number>();
  const firstSeen: LineEnding[] = [];
  const matches = value.match(LINE_ENDING_PATTERN);
  if (!matches) return null;
  for (const separator of matches) {
    const lineEnding: LineEnding = separator.endsWith("\n")
      ? separator.startsWith("\r")
        ? "\r\n"
        : "\n"
      : "\r";
    if (!counts.has(lineEnding)) firstSeen.push(lineEnding);
    counts.set(lineEnding, (counts.get(lineEnding) ?? 0) + 1);
  }

  let lineEnding: LineEnding = "\n";
  let highestCount = 0;
  for (const candidate of firstSeen) {
    const count = counts.get(candidate) ?? 0;
    if (count > highestCount) {
      lineEnding = candidate;
      highestCount = count;
    }
  }
  return highestCount > 0 ? lineEnding : null;
}

/**
 * Convert external text to canonical LF while remembering how it should be
 * written back. The predominant separator wins; ties use the first separator
 * encountered. Files without a separator default to LF.
 *
 * A run of CR characters immediately followed by LF is treated as one
 * malformed CRLF separator. Standalone CR characters remain individual line
 * separators, so real CR-only blank lines are preserved.
 */
export function decodeLineEndings(value: string): DecodedLineEndings {
  const counts = new Map<LineEnding, number>();
  const firstSeen: LineEnding[] = [];
  const text = value.replace(LINE_ENDING_PATTERN, (separator) => {
    const lineEnding: LineEnding = separator.endsWith("\n")
      ? separator.startsWith("\r")
        ? "\r\n"
        : "\n"
      : "\r";
    if (!counts.has(lineEnding)) firstSeen.push(lineEnding);
    counts.set(lineEnding, (counts.get(lineEnding) ?? 0) + 1);
    return "\n";
  });

  let lineEnding: LineEnding = "\n";
  let highestCount = 0;
  for (const candidate of firstSeen) {
    const count = counts.get(candidate) ?? 0;
    if (count > highestCount) {
      lineEnding = candidate;
      highestCount = count;
    }
  }
  return { text, lineEnding };
}

/**
 * Restore canonical LF text to an external line-ending convention. Normalizes
 * input to canonical LF first so multiple encode boundaries never produce CRCRLF.
 */
export function encodeLineEndings(
  canonicalText: string,
  lineEnding: LineEnding,
): string {
  const canonical = decodeLineEndings(canonicalText).text;
  return lineEnding === "\n"
    ? canonical
    : canonical.replace(/\n/g, lineEnding);
}

/** Compare external text by logical content rather than separator bytes. */
export function hasSameLogicalText(left: string, right: string): boolean {
  return decodeLineEndings(left).text === decodeLineEndings(right).text;
}
