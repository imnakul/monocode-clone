import { describe, it, expect } from "vitest";
import {
  computeSystemAndToolsBreakdown,
  parseClaudeJsonMcpServers,
  parseCodexConfigToml,
  getMcpWeight,
  loadSystemAndToolsConfig,
  CLAUDE_BUILTIN_TOOLS,
  CODEX_BUILTIN_TOOLS,
} from "./systemBreakdown";

describe("systemBreakdown", () => {
  it("parses mcpServers from claude.json correctly", () => {
    const json = JSON.stringify({
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp@latest"] },
        penpot: { url: "https://design.penpot.app/mcp" },
        tabularis: { command: "tabularis.exe", args: ["--mcp"] },
      },
    });

    const parsed = parseClaudeJsonMcpServers(json);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].name).toBe("playwright");
    expect(parsed[0].command).toBe("npx -y @playwright/mcp@latest");
    expect(parsed[1].name).toBe("penpot");
    expect(parsed[1].url).toBe("https://design.penpot.app/mcp");
    expect(parsed[2].name).toBe("tabularis");
  });

  it("parses plugins and mcpServers from codex config.toml", () => {
    const toml = `
model = "gpt-5"
[plugins."figma@openai-curated"]
enabled = true

[plugins."browser@openai-bundled"]
enabled = true

[mcp_servers.second-brain]
url = "https://second-brain.imnakul44.workers.dev/mcp"

[mcp_servers."clickup"]
command = "npx"
`;

    const { mcpServers, plugins } = parseCodexConfigToml(toml);
    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.name)).toContain("figma@openai-curated");
    expect(plugins.map((p) => p.name)).toContain("browser@openai-bundled");

    expect(mcpServers).toHaveLength(2);
    expect(mcpServers.map((s) => s.name)).toContain("second-brain");
    expect(mcpServers.map((s) => s.name)).toContain("clickup");
  });

  it("applies higher weights to dense MCP servers like playwright and lower to simple ones", () => {
    expect(getMcpWeight("playwright")).toBeGreaterThan(getMcpWeight("tabularis"));
    expect(getMcpWeight("notion")).toBeGreaterThan(getMcpWeight("random-mcp"));
  });

  it("accurately distributes measured 79,000 tokens among Claude base, tools, rules, and MCP servers", () => {
    const result = computeSystemAndToolsBreakdown({
      totalTokens: 79000,
      harness: "claude",
      globalRules: [
        { name: "~/.claude/CLAUDE.md", tokens: 2550, path: "C:/Users/test/.claude/CLAUDE.md" },
      ],
      mcpServers: [
        { name: "playwright" },
        { name: "screenpipe" },
        { name: "tabularis" },
        { name: "second-brain" },
      ],
      environmentTokens: 1000,
    });

    expect(result.totalTokens).toBe(79000);
    expect(result.baseInstructions).toBe(3500);
    expect(result.environment).toBe(1000);
    expect(result.globalRulesTotal).toBe(2550);
    expect(result.builtinTools).toEqual(CLAUDE_BUILTIN_TOOLS);
    expect(result.builtinToolsTotal).toBeGreaterThan(7000);

    // Playwright with weight 3.5 should have more tokens than tabularis
    const playwright = result.mcpServers.find((s) => s.name === "playwright");
    const tabularis = result.mcpServers.find((s) => s.name === "tabularis");
    expect(playwright).toBeDefined();
    expect(tabularis).toBeDefined();
    expect(playwright!.tokens).toBeGreaterThan(tabularis!.tokens);

    // Verify sum of all parts equals totalTokens
    const totalAccounted =
      result.baseInstructions +
      result.environment +
      result.globalRulesTotal +
      result.builtinToolsTotal +
      result.mcpServersTotal +
      result.pluginsTotal +
      result.overhead;

    expect(totalAccounted).toBe(79000);
  });

  it("handles empty MCP servers gracefully", () => {
    const result = computeSystemAndToolsBreakdown({
      totalTokens: 20000,
      harness: "claude",
    });

    expect(result.mcpServers).toHaveLength(0);
    expect(result.mcpServersTotal).toBe(0);
    expect(result.overhead).toBeGreaterThan(0);
  });

  it("loads Claude config including global rules and MCP servers from disk mock", async () => {
    const mockFiles: Record<string, string> = {
      "C:/Users/test/.claude/CLAUDE.md": "# Global Rules\nAlways write tests.",
      "C:/Users/test/.claude.json": JSON.stringify({
        mcpServers: {
          playwright: { command: "npx" },
          notion: { url: "https://mcp.notion.com" },
        },
      }),
    };

    const config = await loadSystemAndToolsConfig(
      { harness: "claude", cwd: "C:/Users/test/workspace" },
      async (path) => {
        if (mockFiles[path]) return mockFiles[path];
        throw new Error("File not found");
      },
      async () => "C:/Users/test",
    );

    expect(config.globalRules).toHaveLength(1);
    expect(config.globalRules[0].name).toBe("~/.claude/CLAUDE.md");
    expect(config.globalRules[0].tokens).toBeGreaterThan(0);

    expect(config.mcpServers).toHaveLength(2);
    expect(config.mcpServers.map((s) => s.name)).toContain("playwright");
    expect(config.mcpServers.map((s) => s.name)).toContain("notion");
  });

  it("loads Codex config including AGENTS.md and config.toml from disk mock", async () => {
    const mockFiles: Record<string, string> = {
      "C:/Users/test/.codex/AGENTS.md": "# Codex Agents\nAct as expert.",
      "C:/Users/test/.codex/config.toml": `
[plugins."browser@openai-bundled"]
enabled = true

[mcp_servers."tabularis"]
command = "tabularis.exe"
`,
    };

    const config = await loadSystemAndToolsConfig(
      { harness: "codex", cwd: "C:/Users/test/workspace" },
      async (path) => {
        if (mockFiles[path]) return mockFiles[path];
        throw new Error("File not found");
      },
      async () => "C:/Users/test",
    );

    expect(config.globalRules).toHaveLength(1);
    expect(config.globalRules[0].name).toBe("~/.codex/AGENTS.md");
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe("browser@openai-bundled");
    expect(config.mcpServers).toHaveLength(1);
    expect(config.mcpServers[0].name).toBe("tabularis");
  });
});

