// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentMarkdown } from "../ui/AgentMarkdown";
import { tableContent } from "./tableContent";

function exportTable(source: string) {
  const container = document.createElement("div");
  container.innerHTML = source;
  return tableContent(container.querySelector("table")!);
}

describe("table exports", () => {
  it("keeps headers, alignment, empty cells and multiple rows", () => {
    const result = exportTable(
      '<table><thead><tr><th>Name</th><th style="text-align:right">Count</th></tr></thead><tbody><tr><td>A</td><td>2</td></tr><tr><td>B</td><td></td></tr></tbody></table>',
    );
    expect(result.markdown).toBe(
      "| Name | Count |\n| --- | ---: |\n| A | 2 |\n| B |  |",
    );
    expect(result.html).toContain('<th style="text-align:right">Count</th>');
  });

  it("preserves inline formatting, literal pipes, code, links and line breaks when rendered again", () => {
    const result = exportTable(
      '<table><tr><th>Details</th></tr><tr><td><strong>A | B</strong><br><em>Next</em> <code>x|`y`</code> <a href="https://example.com/a?q=1&amp;b=2">Link</a></td></tr></table>',
    );
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      createElement(AgentMarkdown, { text: result.markdown }),
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(
      container.querySelector('td [data-streamdown="strong"]')?.textContent,
    ).toBe("A | B");
    expect(container.querySelector("td em")?.textContent).toBe("Next");
    expect(container.querySelector("td code")?.textContent).toBe("x|`y`");
    expect(container.querySelector("td a")?.getAttribute("href")).toBe(
      "https://example.com/a?q=1&b=2",
    );
    expect(container.querySelector("td br")).not.toBeNull();
    expect(tableContent(container.querySelector("table")!).markdown).toBe(
      result.markdown,
    );
  });

  it("strips active markup and renderer controls from rich clipboard HTML", () => {
    const result = exportTable(
      '<table class="renderer" onclick="evil()"><tr><th>Title</th></tr><tr><td style="color:red" onmouseover="evil()"><span data-word="fade">Text</span><button>Copy</button><script>evil()</script><a href="javascript:evil()">Unsafe</a></td></tr></table>',
    );
    expect(result.html).toBe(
      "<table><tbody><tr><th>Title</th></tr><tr><td>TextUnsafe</td></tr></tbody></table>",
    );
    expect(result.markdown).not.toMatch(/evil|javascript|Copy/);
  });

  it("rejects an empty table rather than reporting a successful empty copy", () => {
    expect(() => exportTable("<table></table>")).toThrow("no rows");
  });
});
