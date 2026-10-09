import remend from "remend";
import { parseMarkdownIntoBlocks } from "streamdown";
import { collectMarkdownImageDefinitions } from "../../files/model/markdownFileLinks";

export function isFenceBlock(content: string): boolean {
  return /^ {0,3}(?:`{3,}|~{3,})/.test(content);
}

/**
 * Repair incomplete prose after splitting it into blocks. Remend scans back
 * through the source for each emphasis/link marker; running it over a large
 * Markdown fence can become quadratic, even though its contents are literal.
 * The Markdown parser already accepts open fences, so leave those untouched.
 */
export function parseStreamingMarkdown(
  text: string,
  definitions = collectMarkdownImageDefinitions(text),
): string[] {
  return parseMarkdownIntoBlocks(text).map((block) => {
    if (isFenceBlock(block)) return block;

    const references = new Set<string>();
    const lines = block.split("\n");
    let fence: { marker: string; length: number } | undefined;
    for (const line of lines) {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (marker) {
        const value = marker[1];
        if (!fence) fence = { marker: value[0], length: value.length };
        else if (
          value[0] === fence.marker &&
          value.length >= fence.length &&
          line.trim() === value
        )
          fence = undefined;
        continue;
      }
      if (fence) continue;

      for (const match of line.matchAll(/!\[((?:\\.|[^\]])*)\](?:\[([^\]]*)\])?/g)) {
        const end = (match.index ?? 0) + match[0].length;
        // Inline images already carry their URL; only references need a
        // definition copied across Streamdown's block boundary.
        if (line[end] === "(") continue;
        const identifier = (match[2] || match[1] || "")
          .replace(/\\(.)/g, "$1")
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase();
        if (identifier && definitions.has(identifier))
          references.add(identifier);
      }
    }

    // Reference definitions are block-level Markdown. Some renderers leave a
    // definition on the preceding paragraph when there is no blank line; put
    // it on its own block line before handing the block back to Streamdown.
    let currentFence: { marker: string; length: number } | undefined;
    const separated: string[] = [];
    for (const line of lines) {
      if (currentFence) {
        const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        if (
          close &&
          close[1][0] === currentFence.marker &&
          close[1].length >= currentFence.length
        )
          currentFence = undefined;
        separated.push(line);
        continue;
      }
      const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (open) {
        currentFence = { marker: open[1][0], length: open[1].length };
        separated.push(line);
        continue;
      }
      if (
        references.size &&
        /^ {0,3}\[[^\]]+\]:\s*(?:<|\S)/.test(line) &&
        separated.length > 0 &&
        separated[separated.length - 1] !== ""
      )
        separated.push("");
      separated.push(line);
    }
    const normalized = references.size ? separated.join("\n") : block;
    const inBlock = collectMarkdownImageDefinitions(normalized);
    const supplemental = [...references]
      .map((identifier) => {
        if (inBlock.has(identifier)) return undefined;
        const url = definitions.get(identifier);
        return url ? `[${identifier}]: <${url}>` : undefined;
      })
      .filter((definition): definition is string => Boolean(definition));
    const withDefinitions = supplemental.length
      ? `${normalized}\n\n${supplemental.join("\n")}`
      : normalized;
    return remend(withDefinitions);
  });
}
