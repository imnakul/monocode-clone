import { estimateTokens } from "./tokenCosting";

export type SystemBreakdownTool = {
  name: string;
  tokens: number;
  description?: string;
};

export type SystemBreakdownMcpServer = {
  name: string;
  command?: string;
  url?: string;
  tokens: number;
  weight?: number;
};

export type SystemBreakdownPlugin = {
  name: string;
  tokens: number;
};

export type SystemBreakdownRule = {
  name: string;
  path?: string;
  tokens: number;
};

export type SystemAndToolsBreakdown = {
  totalTokens: number;
  baseInstructions: number;
  environment: number;
  globalRules: SystemBreakdownRule[];
  globalRulesTotal: number;
  builtinTools: SystemBreakdownTool[];
  builtinToolsTotal: number;
  mcpServers: SystemBreakdownMcpServer[];
  mcpServersTotal: number;
  plugins: SystemBreakdownPlugin[];
  pluginsTotal: number;
  overhead: number;
};

export const CLAUDE_BUILTIN_TOOLS: SystemBreakdownTool[] = [
  { name: "Bash", tokens: 820, description: "Shell execution and terminal tools" },
  { name: "FileEdit", tokens: 1250, description: "Exact file replacement & diff tools" },
  { name: "FileRead", tokens: 640, description: "File reading & line range inspection" },
  { name: "FileWrite", tokens: 510, description: "File creation and overwrites" },
  { name: "GlobTool", tokens: 420, description: "Pattern file discovery" },
  { name: "GrepTool", tokens: 530, description: "Regex content searching" },
  { name: "LS", tokens: 380, description: "Directory listing" },
  { name: "NotebookRead", tokens: 460, description: "Jupyter notebook inspection" },
  { name: "NotebookEdit", tokens: 520, description: "Jupyter cell editing" },
  { name: "Agent / Task", tokens: 1450, description: "Subagent spawning & delegation" },
  { name: "TodoWrite", tokens: 680, description: "Task and progress tracking" },
  { name: "WebSearch / WebFetch", tokens: 850, description: "Web search and documentation" },
];

export const CODEX_BUILTIN_TOOLS: SystemBreakdownTool[] = [
  { name: "shell", tokens: 900, description: "Command line execution" },
  { name: "file_edit", tokens: 1200, description: "Patch & file replacement" },
  { name: "read_file", tokens: 600, description: "File reading" },
  { name: "list_directory", tokens: 400, description: "Directory listing" },
  { name: "web_search", tokens: 700, description: "Web browsing" },
];

/** Relative token weighting for known high-density MCP servers with multiple tool schemas */
export function getMcpWeight(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("playwright") || n.includes("browser")) return 3.5;
  if (n.includes("notion") || n.includes("clickup") || n.includes("figma")) return 3.0;
  if (n.includes("screenpipe")) return 2.2;
  if (n.includes("supabase") || n.includes("tabularis") || n.includes("sql")) return 1.8;
  if (n.includes("drive") || n.includes("calendar") || n.includes("gmail")) return 1.6;
  if (n.includes("second-brain") || n.includes("agentation") || n.includes("pencil")) return 1.2;
  return 1.0;
}

export function parseClaudeJsonMcpServers(jsonContent: string): {
  name: string;
  command?: string;
  url?: string;
}[] {
  try {
    const parsed = JSON.parse(jsonContent);
    const mcpServers: { name: string; command?: string; url?: string }[] = [];
    if (parsed && typeof parsed.mcpServers === "object" && parsed.mcpServers !== null) {
      for (const [name, cfg] of Object.entries(parsed.mcpServers)) {
        const val = cfg as { command?: string; url?: string; args?: string[] };
        const cmd = val.command
          ? `${val.command}${val.args ? " " + val.args.join(" ") : ""}`
          : undefined;
        mcpServers.push({
          name,
          command: cmd,
          url: val.url,
        });
      }
    }
    return mcpServers;
  } catch {
    return [];
  }
}

export function parseCodexConfigToml(tomlContent: string): {
  mcpServers: { name: string; command?: string; url?: string }[];
  plugins: { name: string }[];
} {
  const mcpServers: { name: string; command?: string; url?: string }[] = [];
  const plugins: { name: string }[] = [];

  // Match [mcp_servers."name"] or [mcp_servers.name]
  const mcpRegex = /\[mcp_servers\.["']?([^"'\s\]]+)["']?\]/g;
  let match: RegExpExecArray | null;
  const seenMcp = new Set<string>();
  while ((match = mcpRegex.exec(tomlContent)) !== null) {
    const name = match[1];
    if (name && !seenMcp.has(name) && !name.includes(".")) {
      seenMcp.add(name);
      mcpServers.push({ name });
    }
  }

  // Match [plugins."name"] or [plugins.name]
  const pluginRegex = /\[plugins\.["']?([^"'\s\]]+)["']?\]/g;
  const seenPlugins = new Set<string>();
  while ((match = pluginRegex.exec(tomlContent)) !== null) {
    const name = match[1];
    if (name && !seenPlugins.has(name)) {
      seenPlugins.add(name);
      plugins.push({ name });
    }
  }

  return { mcpServers, plugins };
}

export function computeSystemAndToolsBreakdown(params: {
  totalTokens: number;
  harness?: string;
  globalRules?: SystemBreakdownRule[];
  mcpServers?: { name: string; command?: string; url?: string }[];
  plugins?: { name: string }[];
  environmentTokens?: number;
}): SystemAndToolsBreakdown {
  const totalTokens = Math.max(0, Math.round(params.totalTokens));
  const isCodex = params.harness === "codex";

  const baseInstructions = isCodex ? 3000 : 3500;
  const environment = params.environmentTokens ?? 1000;

  const globalRules = params.globalRules ?? [];
  const globalRulesTotal = globalRules.reduce((acc, r) => acc + r.tokens, 0);

  const builtinTools = isCodex ? CODEX_BUILTIN_TOOLS : CLAUDE_BUILTIN_TOOLS;
  const builtinToolsTotal = builtinTools.reduce((acc, t) => acc + t.tokens, 0);

  const rawMcpList = params.mcpServers ?? [];
  const rawPluginsList = params.plugins ?? [];

  const baseStatic = baseInstructions + environment + globalRulesTotal + builtinToolsTotal;

  let mcpServers: SystemBreakdownMcpServer[] = [];
  let plugins: SystemBreakdownPlugin[] = [];
  let mcpServersTotal = 0;
  let pluginsTotal = 0;
  let overhead = 0;

  if (totalTokens <= baseStatic) {
    mcpServers = rawMcpList.map((s) => {
      const weight = getMcpWeight(s.name);
      const tokens = Math.round(1500 * weight);
      return { ...s, tokens, weight };
    });
    mcpServersTotal = mcpServers.reduce((acc, s) => acc + s.tokens, 0);

    plugins = rawPluginsList.map((p) => ({
      name: p.name,
      tokens: 800,
    }));
    pluginsTotal = plugins.reduce((acc, p) => acc + p.tokens, 0);
    overhead = 0;
  } else {
    const availableForExtensions = Math.max(0, totalTokens - baseStatic);
    const hasMcp = rawMcpList.length > 0;
    const hasPlugins = rawPluginsList.length > 0;

    if (hasMcp || hasPlugins) {
      const totalMcpWeight = rawMcpList.reduce((acc, s) => acc + getMcpWeight(s.name), 0);
      const totalPluginWeight = rawPluginsList.length * 0.8;
      const combinedWeight = totalMcpWeight + totalPluginWeight;

      if (combinedWeight > 0) {
        const reservedOverhead = Math.min(2500, Math.round(availableForExtensions * 0.04));
        const allocatable = availableForExtensions - reservedOverhead;

        mcpServers = rawMcpList.map((s) => {
          const w = getMcpWeight(s.name);
          const tokens = Math.max(200, Math.round((w / combinedWeight) * allocatable));
          return { ...s, tokens, weight: w };
        });

        plugins = rawPluginsList.map((p) => {
          const w = 0.8;
          const tokens = Math.max(150, Math.round((w / combinedWeight) * allocatable));
          return { name: p.name, tokens };
        });

        mcpServersTotal = mcpServers.reduce((acc, s) => acc + s.tokens, 0);
        pluginsTotal = plugins.reduce((acc, p) => acc + p.tokens, 0);

        overhead = Math.max(
          0,
          totalTokens - (baseStatic + mcpServersTotal + pluginsTotal),
        );
      }
    } else {
      overhead = availableForExtensions;
    }
  }

  return {
    totalTokens,
    baseInstructions,
    environment,
    globalRules,
    globalRulesTotal,
    builtinTools,
    builtinToolsTotal,
    mcpServers,
    mcpServersTotal,
    plugins,
    pluginsTotal,
    overhead,
  };
}

export type LoadedSystemConfig = {
  globalRules: SystemBreakdownRule[];
  mcpServers: { name: string; command?: string; url?: string }[];
  plugins: { name: string }[];
};

export async function loadSystemAndToolsConfig(
  params: { harness?: string; cwd?: string },
  readFileFn?: (path: string) => Promise<string>,
  homeDirFn?: () => Promise<string>,
): Promise<LoadedSystemConfig> {
  const globalRules: SystemBreakdownRule[] = [];
  const mcpServers: { name: string; command?: string; url?: string }[] = [];
  const plugins: { name: string }[] = [];

  let home = "";
  try {
    if (homeDirFn) {
      home = await homeDirFn();
    } else {
      const { homeDir } = await import("./fs");
      home = await homeDir();
    }
  } catch {
    home = "";
  }

  const read = readFileFn ?? (async (path: string) => {
    const { readTextFile } = await import("./fs");
    return readTextFile(path);
  });

  const isCodex = params.harness === "codex";

  if (!isCodex) {
    // 1. Check Claude global CLAUDE.md
    if (home) {
      const globalClaudeMdPath = `${home.replace(/\\/g, "/")}/.claude/CLAUDE.md`;
      try {
        const content = await read(globalClaudeMdPath);
        if (content) {
          globalRules.push({
            name: "~/.claude/CLAUDE.md",
            path: globalClaudeMdPath,
            tokens: estimateTokens(content),
          });
        }
      } catch {
        // Ignore if file doesn't exist
      }

      // 2. Check ~/.claude.json
      const claudeJsonPath = `${home.replace(/\\/g, "/")}/.claude.json`;
      try {
        const jsonContent = await read(claudeJsonPath);
        if (jsonContent) {
          const parsedMcp = parseClaudeJsonMcpServers(jsonContent);
          for (const s of parsedMcp) {
            mcpServers.push(s);
          }
        }
      } catch {
        // Ignore
      }
    }

    // 3. Check workspace .mcp.json
    if (params.cwd) {
      const cwdNorm = params.cwd.replace(/\\/g, "/");
      const projectMcpPath = `${cwdNorm}/.mcp.json`;
      try {
        const jsonContent = await read(projectMcpPath);
        if (jsonContent) {
          const parsedMcp = parseClaudeJsonMcpServers(jsonContent);
          for (const s of parsedMcp) {
            if (!mcpServers.some((existing) => existing.name === s.name)) {
              mcpServers.push(s);
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  } else {
    // Codex
    if (home) {
      const globalAgentsMdPath = `${home.replace(/\\/g, "/")}/.codex/AGENTS.md`;
      try {
        const content = await read(globalAgentsMdPath);
        if (content) {
          globalRules.push({
            name: "~/.codex/AGENTS.md",
            path: globalAgentsMdPath,
            tokens: estimateTokens(content),
          });
        }
      } catch {
        // Ignore
      }

      const codexConfigPath = `${home.replace(/\\/g, "/")}/.codex/config.toml`;
      try {
        const tomlContent = await read(codexConfigPath);
        if (tomlContent) {
          const parsed = parseCodexConfigToml(tomlContent);
          for (const s of parsed.mcpServers) {
            mcpServers.push(s);
          }
          for (const p of parsed.plugins) {
            plugins.push(p);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return { globalRules, mcpServers, plugins };
}

