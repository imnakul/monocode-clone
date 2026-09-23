import type { Block } from "./session";

/** Display title for a sidechat following `sourceTitle`. */
export function sidechatTitle(sourceTitle: string): string {
  const base = sourceTitle.trim() || "Untitled";
  return `Sidechat — ${base}`;
}

/**
 * Context block attached to a sidechat send, built from the source thread's
 * CURRENT blocks — so questions always use the latest state, never a stale
 * open-time copy. Null when there is nothing to attach.
 */
export function sidechatContextBlock(
  sourceTitle: string,
  blocks: Block[],
): string | null {
  const bundle = buildForkBundle(blocks);
  if (bundle.turnCount === 0) return null;
  return (
    `Context from "${sourceTitle.trim() || "this thread"}" ` +
    `(do not act on it, only answer from it):\n\n${bundle.text}`
  );
}

/**
 * Fork caps: the visible copy is always exact — only the composer-seed
 * bundle is capped, so a huge thread can't nuke the new context window.
 */
export const MAX_FORK_TURNS = 200;
const MAX_FORK_TURN_CHARS = 4000;
const MAX_FORK_BUNDLE_CHARS = 100_000;

export type ForkBundle = {
  text: string;
  turnCount: number;
  truncated: boolean;
};

/**
 * Copy a thread prefix into a fork: exact visible history, volatile live
 * state scrubbed. Fresh block ids so the fork never aliases the original;
 * undecided approval prompts and preparing handoffs are dropped (their live
 * state is dead); streaming flags cleared. Everything else — text, tool
 * history, attachments, cards, review reports — carries over read-only.
 * The fork starts a fresh native session, so history is copied, never shared.
 */
export function forkThreadBlocks(
  blocks: Block[],
  throughBlockId?: string,
): Block[] {
  const end = throughBlockId
    ? blocks.findIndex((block) => block.id === throughBlockId)
    : -1;
  const prefix = end >= 0 ? blocks.slice(0, end + 1) : [...blocks];
  const out: Block[] = [];
  for (const block of prefix) {
    if (block.role === "approval" && !block.approval?.decided) continue;
    if (block.role === "handoff" && block.handoff?.status === "preparing") {
      continue;
    }
    const next = { ...block, id: crypto.randomUUID() };
    delete next.streaming;
    out.push(next);
  }
  return out;
}

function capForkText(text: string, max: number): string {
  const normalized = text.trim().replace(/\r\n?/g, "\n");
  if ([...normalized].length <= max) return normalized;
  return `${[...normalized].slice(0, max).join("")}… [truncated]`;
}

/**
 * The "conversation so far" bundle for the fork's first prompt: every
 * user/assistant turn as plain text, newest-bounded. The copied blocks are
 * what the user reads; this is what the fresh native session reasons with.
 */
export function buildForkBundle(blocks: Block[]): ForkBundle {
  const turns = blocks.filter(
    (block) =>
      (block.role === "user" || block.role === "assistant") &&
      block.text.trim(),
  );
  const kept =
    turns.length > MAX_FORK_TURNS ? turns.slice(-MAX_FORK_TURNS) : turns;
  let truncated = turns.length > kept.length;
  const parts: string[] = [];
  let chars = 0;
  for (const turn of kept) {
    const label = turn.role === "user" ? "User" : "Assistant";
    let text = capForkText(turn.text, MAX_FORK_TURN_CHARS);
    if (text.endsWith("[truncated]")) truncated = true;
    const chunk = `${label}:\n${text}`;
    if (chars + chunk.length > MAX_FORK_BUNDLE_CHARS) {
      truncated = true;
      break;
    }
    chars += chunk.length;
    parts.push(chunk);
  }
  const head =
    `Conversation so far (${turns.length} ` +
    `${turns.length === 1 ? "turn" : "turns"}` +
    `${truncated ? ", capped" : ""}) — continue from here.\n\n`;
  return { text: head + parts.join("\n\n"), turnCount: turns.length, truncated };
}
