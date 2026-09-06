/** Shared Antigravity authorization-line contract, used by the explicit
 * sign-in flow and by the shared runtime host (which must not import the
 * sign-in module — the sign-in flow retires the host on completion). */

export const ANTIGRAVITY_AUTH_PREFIX =
  "Open the following link to authenticate the ACP server: ";
export const ANTIGRAVITY_AUTH_BROWSER_MARKER = "__MONOCODE_ANTIGRAVITY_AUTH_URL__";
export const ANTIGRAVITY_SIGN_IN_REQUIRED =
  "Antigravity requires Google sign-in. Open Settings > Providers > Antigravity and choose Sign in with Google, then retry.";

/** Reads a validated authorization URL without exposing tokens to the transcript. */
export function parseAntigravityAuthLine(line: string): string | null {
  const message = line.trim();
  let candidate: unknown;
  if (message.startsWith(ANTIGRAVITY_AUTH_PREFIX)) candidate = message.slice(ANTIGRAVITY_AUTH_PREFIX.length);
  else if (message.startsWith(ANTIGRAVITY_AUTH_BROWSER_MARKER)) {
    try { candidate = JSON.parse(message.slice(ANTIGRAVITY_AUTH_BROWSER_MARKER.length)); }
    catch { throw new Error("Antigravity returned an invalid sign-in URL."); }
  } else return null;
  const invalid = (): Error => new Error("Antigravity returned an invalid Google sign-in URL.");
  if (typeof candidate !== "string" || candidate.length > 16_384 || /\s/.test(candidate)) throw invalid();
  let url: URL;
  try { url = new URL(candidate); } catch { throw invalid(); }
  const state = url.searchParams.get("state");
  const redirect = url.searchParams.get("redirect_uri");
  if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth" || url.username || url.password || url.hash ||
    url.searchParams.getAll("state").length !== 1 || !state || state.length > 512 || /\s/.test(state) ||
    url.searchParams.getAll("redirect_uri").length !== 1 || !redirect || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}\/$/.test(redirect) ||
    url.searchParams.getAll("response_type").length !== 1 || url.searchParams.get("response_type") !== "code") throw invalid();
  let callback: URL;
  try { callback = new URL(redirect); } catch { throw invalid(); }
  if (Number(callback.port) < 1024 || Number(callback.port) > 65535) throw invalid();
  return candidate;
}
