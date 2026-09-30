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
  tokens: undefined;
};

export type SystemBreakdownPlugin = {
  name: string;
  tokens: undefined;
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
  plugins: SystemBreakdownPlugin[];
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
  const mcpEnabled = new Map<string, boolean>();
  const pluginEnabled = new Map<string, boolean>();
  let currentSection: { kind: "mcp_servers" | "plugins"; name: string } | null = null;
  const sectionPattern =
    /^\s*\[(mcp_servers|plugins)\.(?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_-]+))\]\s*(?:#.*)?$/;
  const enabledPattern = /^\s*enabled\s*=\s*(true|false)\s*(?:#.*)?$/;

  for (const line of tomlContent.split(/\r?\n/)) {
    if (line.trimStart().startsWith("[")) {
      currentSection = null;
      const section = sectionPattern.exec(line);
      if (!section) continue;
      const kind = section[1];
      const name = section[2] ?? section[3] ?? section[4];
      if ((kind !== "mcp_servers" && kind !== "plugins") || !name) continue;
      currentSection = { kind, name };
      const entries = kind === "mcp_servers" ? mcpEnabled : pluginEnabled;
      if (!entries.has(name)) entries.set(name, true);
      continue;
    }

    if (!currentSection) continue;
    const enabled = enabledPattern.exec(line);
    if (!enabled) continue;
    const entries = currentSection.kind === "mcp_servers" ? mcpEnabled : pluginEnabled;
    entries.set(currentSection.name, enabled[1] === "true");
  }

  return {
    mcpServers: [...mcpEnabled]
      .filter(([, enabled]) => enabled)
      .map(([name]) => ({ name })),
    plugins: [...pluginEnabled]
      .filter(([, enabled]) => enabled)
      .map(([name]) => ({ name })),
  };
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

  const mcpServers = (params.mcpServers ?? []).map((server) => ({ ...server, tokens: undefined }));
  const plugins = (params.plugins ?? []).map((plugin) => ({ ...plugin, tokens: undefined }));

  return {
    totalTokens,
    baseInstructions,
    environment,
    globalRules,
    globalRulesTotal,
    builtinTools,
    builtinToolsTotal,
    mcpServers,
    plugins,
  };
}

/** Fixed prompt and built-in tool estimate; never attributes history to extensions. */
export function estimateSystemBase(
  harness?: string,
  globalRules: SystemBreakdownRule[] = [],
): number {
  const breakdown = computeSystemAndToolsBreakdown({
    totalTokens: 0,
    harness,
    globalRules,
  });
  return (
    breakdown.baseInstructions +
    breakdown.environment +
    breakdown.builtinToolsTotal +
    breakdown.globalRulesTotal
  );
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
      const { homeDir } = await import("../../../platform/tauri/fs");
      home = await homeDir();
    }
  } catch {
    home = "";
  }

  const read = readFileFn ?? (async (path: string) => {
    const { readTextFile } = await import("../../../platform/tauri/fs");
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
