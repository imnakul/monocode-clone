import { describe, it, expect } from "vitest";
import {
  computeSystemAndToolsBreakdown,
  parseClaudeJsonMcpServers,
  parseCodexConfigToml,
  estimateSystemBase,
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

  it("excludes disabled Codex MCP servers and plugins from the context estimate", () => {
    const toml = `
[mcp_servers.active]
command = "active-server"

[mcp_servers.disabled]
enabled = false
command = "disabled-server"

[mcp_servers."quoted.name"]
enabled = true

[mcp_servers.active.env]
enabled = false

[plugins."active@marketplace"]
enabled = true

[plugins."disabled@marketplace"]
enabled = false
`;

    const { mcpServers, plugins } = parseCodexConfigToml(toml);
    expect(mcpServers.map((server) => server.name)).toEqual([
      "active",
      "quoted.name",
    ]);
    expect(plugins.map((plugin) => plugin.name)).toEqual([
      "active@marketplace",
    ]);
  });

  it("keeps extension names without allocating the history residual", () => {
    const result = computeSystemAndToolsBreakdown({ totalTokens: 79_000, harness: "claude", mcpServers: [{ name: "playwright" }, { name: "screenpipe" }, { name: "tabularis" }], plugins: [{ name: "plugin" }] });
    expect(result.mcpServers.map((server) => server.name)).toEqual(["playwright", "screenpipe", "tabularis"]);
    expect(result.mcpServers.every((server) => server.tokens === undefined)).toBe(true);
    expect(result.plugins[0].tokens).toBeUndefined();
    expect(result).not.toHaveProperty("overhead");
    expect(result.builtinTools).toEqual(CLAUDE_BUILTIN_TOOLS);
  });
  it("uses the existing fixed bases for Claude and Codex", () => {
    expect(estimateSystemBase("claude")).toBe(13_010);
    expect(estimateSystemBase("codex")).toBe(7_800);
    expect(estimateSystemBase("codex", [{ name: "rules", tokens: 123 }])).toBe(7923);
    expect(computeSystemAndToolsBreakdown({ totalTokens: 1, harness: "codex" }).builtinTools).toEqual(CODEX_BUILTIN_TOOLS);
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

