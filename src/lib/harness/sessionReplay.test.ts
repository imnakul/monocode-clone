import { describe, expect, it } from "vitest";
import {
  buildReplayBlocks,
  clineMessagesPath,
  createReplaySession,
  loadReplayImport,
  MAX_REPLAY_TURNS,
  parseClaudeTranscript,
  parseClineMessages,
  parseCodexRollout,
  parseOpencodeTranscript,
  parseT3Summary,
  summaryOnlyImport,
} from "./sessionReplay";
import type { ExternalSessionInfo } from "./sessionImport";

const claudeSource: ExternalSessionInfo = {
  id: "aaaaaaaa-1111-4111-8111-111111111111",
  title: "Fix the login redirect loop",
  messageCount: 4,
  source: "claude",
  cwd: "/repo",
  file: "/fake/sess.jsonl",
};

const CLAUDE_GOLDEN = [
  '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Fix the login redirect loop"}]},"uuid":"u1","timestamp":"2026-08-01T10:00:00.000Z","sessionId":"s1","cwd":"/repo"}',
  '{"type":"assistant","message":{"model":"claude-sonnet-5","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"hmm"},{"type":"text","text":"Looking at auth middleware."},{"type":"tool_use","id":"toolu_1","name":"Read","input":{"path":"a.ts"}}]},"uuid":"a1","timestamp":"2026-08-01T10:01:00.000Z","sessionId":"s1"}',
  '{"type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_1","type":"tool_result","content":"found it"}]},"uuid":"u2","timestamp":"2026-08-01T10:02:00.000Z","sessionId":"s1"}',
  '{"type":"user","message":{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"AAA"}}]},"uuid":"u3","timestamp":"2026-08-01T10:03:00.000Z","sessionId":"s1"}',
  '{"type":"queue-operation","operation":"enqueue","timestamp":"2026-08-01T10:04:00.000Z","sessionId":"s1"}',
  '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"subagent noise"}]},"uuid":"u4","isSidechain":true,"timestamp":"2026-08-01T10:05:00.000Z","sessionId":"s1"}',
  '{"type":"mystery-future-envelope","payload":{"x":1}}',
  "not json at all",
].join("\n");

const CODEX_GOLDEN = [
  '{"timestamp":"2026-08-20T12:00:00.000Z","type":"session_meta","payload":{"id":"thread-1","cwd":"/repo"}}',
  '{"timestamp":"2026-08-20T12:01:00.000Z","type":"response_item","payload":{"type":"message","role":"developer","content":[{"type":"input_text","text":"Be helpful"}]}}',
  '{"timestamp":"2026-08-20T12:02:00.000Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Refactor the settings panel"}]}}',
  '{"timestamp":"2026-08-20T12:03:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Done."}]}}',
  '{"timestamp":"2026-08-20T12:04:00.000Z","type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{}"}}',
  "garbage line",
].join("\n");

describe("parseClaudeTranscript", () => {
  it("extracts user/assistant turns with tool names", () => {
    const { turns } = parseClaudeTranscript(CLAUDE_GOLDEN);
    expect(turns.map((turn) => turn.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(turns[0].text).toBe("Fix the login redirect loop");
    expect(turns[1].text).toBe("Looking at auth middleware.");
    expect(turns[1].toolCalls).toEqual(["Read"]);
    // tool_result text replays as user context; image-only lines are skipped.
    expect(turns[2].text).toBe("found it");
    expect(turns[0].timestamp).toBe("2026-08-01T10:00:00.000Z");
  });

  it("skips sidechain, unknown envelopes, and garbage", () => {
    const { turns } = parseClaudeTranscript(CLAUDE_GOLDEN);
    expect(turns.some((turn) => turn.text.includes("subagent"))).toBe(false);
    expect(turns).toHaveLength(3);
  });

  it("returns no turns for empty input", () => {
    expect(parseClaudeTranscript("").turns).toEqual([]);
    expect(parseClaudeTranscript("   \n  ").turns).toEqual([]);
  });
});

describe("parseCodexRollout", () => {
  it("extracts user/assistant turns, skipping developer preamble", () => {
    const { turns } = parseCodexRollout(CODEX_GOLDEN);
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(turns[0].text).toBe("Refactor the settings panel");
    expect(turns[1].text).toBe("Done.");
  });

  it("returns no turns for empty input", () => {
    expect(parseCodexRollout("").turns).toEqual([]);
  });
});

describe("buildReplayBlocks", () => {
  it("badges history and summarizes honestly", () => {
    const { turns } = parseClaudeTranscript(CLAUDE_GOLDEN);
    const imported = buildReplayBlocks(claudeSource, turns);
    expect(imported.truncated).toBe(false);
    expect(imported.turnCount).toBe(3);
    expect(imported.blocks[0].role).toBe("system");
    expect(imported.blocks[0].text).toContain("not re-executable");
    expect(imported.blocks[0].text).toContain("Approvals");
    expect(imported.summary).toContain("3 turns");
    expect(imported.summary).toContain("Read");
  });

  it("caps huge transcripts with a truncation notice", () => {
    const turns = Array.from({ length: MAX_REPLAY_TURNS + 50 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `turn ${i}`,
      toolCalls: [] as string[],
    }));
    const imported = buildReplayBlocks(claudeSource, turns);
    expect(imported.truncated).toBe(true);
    expect(imported.turnCount).toBe(MAX_REPLAY_TURNS + 50);
    // Badge + 200 kept + notice.
    expect(imported.blocks).toHaveLength(MAX_REPLAY_TURNS + 2);
    expect(imported.blocks[1].text).toBe("turn 50");
    expect(imported.blocks[imported.blocks.length - 1].text).toContain(
      "Older history was not imported",
    );
  });
});

describe("createReplaySession", () => {
  it("prefills a fresh unbound session in the chosen harness", () => {
    const { turns } = parseCodexRollout(CODEX_GOLDEN);
    const imported = buildReplayBlocks(
      { ...claudeSource, source: "codex" },
      turns,
    );
    const session = createReplaySession(
      { ...claudeSource, source: "codex" },
      imported,
      { harness: "opencode", cwd: "/other" },
    );
    expect(session.harness).toBe("opencode");
    expect(session.cwd).toBe("/other");
    expect(session.blocks.length).toBeGreaterThan(2);
    expect(session.blocks[0].role).toBe("system");
    expect(session.providerSessionId).toBeUndefined();
  });

  it("prefills the composer with the summary for first-turn context", () => {
    const { turns } = parseCodexRollout(CODEX_GOLDEN);
    const imported = buildReplayBlocks(claudeSource, turns);
    const session = createReplaySession(claudeSource, imported, {
      harness: "claude",
    });
    expect(session.composerSeed).toBe(imported.summary);
    expect(session.composerSeed).toContain("Ask me to continue");
  });
});

describe("parseOpencodeTranscript", () => {
  const EXPORT = JSON.stringify({
    messages: [
      {
        role: "user",
        time: 1788500001000,
        parts: [{ type: "text", text: "Refactor the panel" }],
      },
      {
        role: "assistant",
        time: 1788500002000,
        parts: [
          { type: "reasoning", text: "Splitting into three." },
          { type: "tool", tool: "Read" },
          { type: "text", text: "Done." },
          { type: "step-finish", reason: "stop" },
        ],
      },
      { role: "system", time: 0, parts: [] },
    ],
  });

  it("extracts turns with reasoning text and tool names", () => {
    const { turns } = parseOpencodeTranscript(EXPORT);
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(turns[0].text).toBe("Refactor the panel");
    expect(turns[1].text).toContain("Splitting into three.");
    expect(turns[1].text).toContain("Done.");
    expect(turns[1].toolCalls).toEqual(["Read"]);
    expect(turns[0].timestamp).toBe(
      new Date(1788500001000).toISOString(),
    );
  });

  it("returns no turns for garbage", () => {
    expect(parseOpencodeTranscript("not json").turns).toEqual([]);
    expect(parseOpencodeTranscript('{"nope":[]}').turns).toEqual([]);
  });
});

describe("parseClineMessages", () => {
  const MESSAGES = JSON.stringify({
    version: 1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: '<user_input mode="act">Fix it</user_input>' },
        ],
        ts: 1788500001000,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Fixed." }],
        ts: 1788500002000,
      },
      { role: "assistant", content: [{ type: "image", url: "x" }] },
    ],
  });

  it("strips the user_input wrapper and skips non-text", () => {
    const { turns } = parseClineMessages(MESSAGES);
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(turns[0].text).toBe("Fix it");
    expect(turns[1].text).toBe("Fixed.");
  });

  it("returns no turns for garbage", () => {
    expect(parseClineMessages("{}").turns).toEqual([]);
  });

  it("derives the messages path from the manifest path", () => {
    expect(clineMessagesPath("C:\\x\\abc.json")).toBe(
      "C:\\x\\abc.messages.json",
    );
  });
});

describe("t3 live messages", () => {
  it("parses the shared export shape", () => {
    const { turns } = parseOpencodeTranscript(
      JSON.stringify({
        messages: [
          {
            role: "user",
            time: 1788500001000,
            parts: [{ type: "text", text: "Docs question" }],
          },
          {
            role: "assistant",
            time: 1788500002000,
            parts: [{ type: "text", text: "Plan answer" }],
          },
        ],
      }),
    );
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(turns[0].text).toBe("Docs question");
  });
});

describe("t3 summary replay", () => {
  it("parses the summary export", () => {
    expect(parseT3Summary('{"summary":"  Did things.  "}')).toBe(
      "Did things.",
    );
    expect(parseT3Summary("{}")).toBe("");
    expect(parseT3Summary("garbage")).toBe("");
  });

  it("builds a badged single-block import", () => {
    const imported = summaryOnlyImport(claudeSource, "Did things.");
    expect(imported.truncated).toBe(false);
    expect(imported.blocks).toHaveLength(2);
    expect(imported.blocks[0].role).toBe("system");
    expect(imported.blocks[0].text).toContain("not re-executable");
    expect(imported.blocks[1]).toMatchObject({
      role: "assistant",
      text: "Did things.",
    });
    expect(imported.summary).toContain("claude");
  });
});

describe("loadReplayImport", () => {
  const readers = {
    readFile: async (path: string) => {
      if (path.endsWith(".messages.json")) {
        return JSON.stringify({
          messages: [
            { role: "user", content: [{ type: "text", text: "Hi" }] },
          ],
        });
      }
      return CLAUDE_GOLDEN;
    },
    readExport: async (source: string) => {
      if (source === "t3") return JSON.stringify({ summary: "T3 did it." });
      return JSON.stringify({
        messages: [
          {
            role: "user",
            time: 1,
            parts: [{ type: "text", text: "Exported hi" }],
          },
        ],
      });
    },
  };

  it("loads file sources through readers", async () => {
    const claude = await loadReplayImport(claudeSource, readers);
    expect(claude.turnCount).toBe(3);
    const cline = await loadReplayImport(
      { ...claudeSource, source: "cline", file: "C:\\x\\a.json" },
      readers,
    );
    expect(cline.turnCount).toBe(1);
  });

  it("loads sqlite sources through the export reader", async () => {
    const opencode = await loadReplayImport(
      { ...claudeSource, source: "opencode" },
      readers,
    );
    expect(opencode.turnCount).toBe(1);
    expect(opencode.blocks[1].text).toBe("Exported hi");
  });

  it("loads t3 live messages", async () => {
    const t3 = await loadReplayImport(
      { ...claudeSource, source: "t3" },
      {
        ...readers,
        readExport: async () =>
          JSON.stringify({
            messages: [{ role: "user", time: 1, parts: [{ type: "text", text: "T3 hi" }] }],
          }),
      },
    );
    expect(t3.turnCount).toBe(1);
    expect(t3.blocks[1].text).toBe("T3 hi");
  });

  it("throws when nothing replayable comes back", async () => {
    await expect(
      loadReplayImport(claudeSource, {
        readFile: async () => "garbage {{{",
        readExport: async () => "{}",
      }),
    ).rejects.toThrow(/no replayable turns/i);
  });
});
