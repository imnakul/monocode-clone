/**
 * Narrow repair for legacy persisted project paths whose drive colon was
 * stored percent-encoded (e.g. `e%3A/Developing/...` instead of
 * `E:/Developing/...`).
 *
 * Apply ONLY at the snapshot/import boundary (workspace snapshot parse), not
 * to live filesystem paths: literal `%` characters are legal in filenames,
 * so this repairs exactly one shape — a leading `<letter>%3A` drive prefix
 * (percent encoding is case-insensitive, so `%3a` matches too, with an
 * optional single leading `/` as produced from file URLs) — and leaves every
 * other `%` sequence (`%20`, `%25`, `50% off`, …) intact.
 */
export function repairLegacyEncodedDriveColon(path: string): string {
  const match = /^(\/?)([A-Za-z])%3A(\/|$)/i.exec(path);
  if (!match) return path;
  const lead = match[1] ?? "";
  const letter = match[2] ?? "";
  const rest = path.slice(match[0].length);
  if (!rest) return `${lead}${letter}:`;
  return `${lead}${letter}:/${rest}`;
}
