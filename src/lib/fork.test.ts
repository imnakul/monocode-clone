import { describe, expect, it } from "vitest";
import {
  buildForkBundle,
  forkThreadBlocks,
  MAX_FORK_TURNS,
  sidechatContextBlock,
  sidechatTitle,
} from "./fork";
import type { Block } from "./session";

function block(partial: Partial<Block> & Pick<Block, "id" | "role">): Block {
  return { text: "", ...partial };
}

describe("forkThreadBlocks", () => {
  it("copies up to the cutoff with fresh ids", () => {
    const blocks = [
      block({ id: "u1", role: "user", text: "hi" }),
      block({ id: "a1", role: "assistant", text: "hello" }),
      block({ id: "u2", role: "user", text: "more" }),
    ];
    const forked = forkThreadBlocks(blocks, "a1");
    expect(forked.map((item) => item.text)).toEqual(["hi", "hello"]);
    expect(forked.map((item) => item.id)).not.toContain("u1");
    expect(forked).toHaveLength(2);
  });

  it("copies everything when the cutoff is missing", () => {
    const blocks = [block({ id: "u1", role: "user", text: "hi" })];
    expect(forkThreadBlocks(blocks, "nope")).toHaveLength(1);
    expect(forkThreadBlocks(blocks)).toHaveLength(1);
  });

  it("scrubs volatile live state but keeps decided history", () => {
    const blocks = [
      block({ id: "s1", role: "assistant", text: "half", streaming: true }),
      block({ id: "a1", role: "approval", text: "" }),
      block({
        id: "a2",
        role: "approval",
        text: "done",
        approval: { requestId: 1, decided: "allow" },
      }),
      block({
        id: "h1",
        role: "handoff",
        text: "",
        handoff: {
          from: "claude",
          to: "codex",
          status: "preparing",
          text: "",
          pending: false,
        },
      }),
    ];
    const forked = forkThreadBlocks(blocks);
    // Live approval prompt and preparing handoff dropped; ids are fresh.
    expect(forked.map((item) => [item.role, item.text])).toEqual([
      ["assistant", "half"],
      ["approval", "done"],
    ]);
    expect(forked[0]?.streaming).toBeUndefined();
  });
});

describe("buildForkBundle", () => {
  it("labels turns and skips empty ones", () => {
    const bundle = buildForkBundle([
      block({ id: "u1", role: "user", text: "do it" }),
      block({ id: "s1", role: "system", text: "noise" }),
      block({ id: "a1", role: "assistant", text: "done" }),
    ]);
    expect(bundle.turnCount).toBe(2);
    expect(bundle.truncated).toBe(false);
    expect(bundle.text).toContain("User:\ndo it");
    expect(bundle.text).toContain("Assistant:\ndone");
    expect(bundle.text).not.toContain("noise");
  });

  it("caps huge threads", () => {
    const blocks = Array.from({ length: MAX_FORK_TURNS + 10 }, (_, i) =>
      block({ id: `u${i}`, role: "user", text: `turn ${i}` }),
    );
    const bundle = buildForkBundle(blocks);
    expect(bundle.turnCount).toBe(MAX_FORK_TURNS + 10);
    expect(bundle.truncated).toBe(true);
    expect(bundle.text).toContain("capped");
    expect(bundle.text).toContain("turn 10");
  });
});

describe("sidechat", () => {
  it("names the sidechat after its source", () => {
    expect(sidechatTitle("Fix the login loop")).toBe(
      "Sidechat — Fix the login loop",
    );
    expect(sidechatTitle("  ")).toBe("Sidechat — Untitled");
  });

  it("attaches latest context at send time, or nothing when empty", () => {
    const context = sidechatContextBlock("Fix it", [
      block({ id: "u1", role: "user", text: "do it" }),
    ]);
    expect(context).toContain("Context from");
    expect(context).toContain("User:\ndo it");
    expect(sidechatContextBlock("Fix it", [])).toBeNull();
  });
});
