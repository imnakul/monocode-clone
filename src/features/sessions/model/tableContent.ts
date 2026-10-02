/** Export the rendered table only, without renderer controls or fade spans. */
export function tableContent(table: HTMLTableElement): {
  markdown: string;
  html: string;
} {
  const rows = Array.from(table.rows);
  if (!rows.length) throw new Error("This table has no rows to copy.");
  const width = Math.max(...rows.map((row) => row.cells.length));
  if (!width) throw new Error("This table has no cells to copy.");
  const values = rows.map((row) =>
    Array.from({ length: width }, (_, index) =>
      row.cells[index] ? inlineMarkdown(row.cells[index]).trim() : "",
    ),
  );
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const separator = Array.from({ length: width }, (_, index) => {
    const align = cellAlignment(rows[0].cells[index]);
    return align === "center"
      ? ":---:"
      : align === "right"
        ? "---:"
        : align === "left"
          ? ":---"
          : "---";
  });
  const caption = table.caption ? inlineMarkdown(table.caption).trim() : "";
  return {
    markdown: [
      ...(caption ? [caption, ""] : []),
      line(values[0]),
      line(separator),
      ...values.slice(1).map(line),
    ].join("\n"),
    html: cleanHtml(table),
  };
}

function cellAlignment(cell?: HTMLTableCellElement): string {
  const align = cell?.style.textAlign || cell?.getAttribute("align");
  return align === "left" || align === "center" || align === "right"
    ? align
    : "";
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([|`*_\[\]~])/g, "\\$1")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ");
}

function safeHref(element: Element): string | undefined {
  const href = element.getAttribute("href");
  if (!href) return;
  try {
    const url = new URL(href, "https://markdown.invalid");
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return href;
  } catch {
    /* Export the label when the link cannot be parsed. */
  }
}

function inlineMarkdown(node: Node): string {
  if (node.nodeType === 3) return escapeMarkdown(node.textContent ?? "");
  if (node.nodeType !== 1) return "";
  const element = node as Element;
  const tag = semanticTag(element);
  if (["script", "style", "button", "input"].includes(tag)) return "";
  if (tag === "br") return "<br>";
  if (tag === "code") {
    const text = (element.textContent ?? "")
      .replace(/\r?\n/g, " ")
      .replace(/\|/g, "\\|");
    const runs = text.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(0, ...runs.map((run) => run.length)) + 1);
    const padded = /^`|`$/.test(text) ? ` ${text} ` : text;
    return `${fence}${padded}${fence}`;
  }
  const content = Array.from(node.childNodes).map(inlineMarkdown).join("");
  if (tag === "strong" || tag === "b") return `**${content}**`;
  if (tag === "em" || tag === "i") return `*${content}*`;
  if (tag === "del" || tag === "s") return `~~${content}~~`;
  if (tag === "a") {
    const href = safeHref(element);
    if (href)
      return `[${content}](<${href.replace(/[<>|\\\r\n]/g, (char) => encodeURIComponent(char))}>)`;
  }
  if (tag === "img") return escapeMarkdown(element.getAttribute("alt") ?? "");
  return content;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

/** A small allowlist keeps clipboard HTML independent of renderer internals. */
function cleanHtml(node: Node): string {
  if (node.nodeType === 3) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== 1) return "";
  const element = node as Element;
  const tag = semanticTag(element);
  if (["script", "style", "button", "input"].includes(tag)) return "";
  if (tag === "br") return "<br>";
  const content = Array.from(node.childNodes).map(cleanHtml).join("");
  if (tag === "img") return escapeHtml(element.getAttribute("alt") ?? "");
  if (
    ![
      "table",
      "caption",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "strong",
      "b",
      "em",
      "i",
      "del",
      "s",
      "code",
      "a",
    ].includes(tag)
  )
    return content;
  let attributes = "";
  if (tag === "a") {
    const href = safeHref(element);
    if (!href) return content;
    attributes += ` href="${escapeHtml(href)}"`;
  }
  if (tag === "th" || tag === "td") {
    const align = cellAlignment(element as HTMLTableCellElement);
    if (align) attributes += ` style="text-align:${align}"`;
    for (const name of ["rowspan", "colspan"]) {
      const value = element.getAttribute(name);
      if (value && /^\d+$/.test(value)) attributes += ` ${name}="${value}"`;
    }
  }
  return `<${tag}${attributes}>${content}</${tag}>`;
}

function semanticTag(element: Element): string {
  // Streamdown renders strong emphasis as a styled span, not a <strong> tag.
  return element.getAttribute("data-streamdown") === "strong"
    ? "strong"
    : element.tagName.toLowerCase();
}
