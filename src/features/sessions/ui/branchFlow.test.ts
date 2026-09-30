import { describe, expect, it, vi } from "vitest";
import { sendBranchTurn } from "../model/branchFlow";
import { planBranch, pendingBranchOrigin } from "../model/branchPlan";
import { buildForkBundle, wrapBranchSummaryPrompt } from "../model/fork";
import { newSession, type Session } from "../model/session";
import { applyHarnessEvent, appendUser } from "../../../integrations/harness/core/apply";
import { NativeForkError, type NativeForkRequest } from "../../../integrations/harness/core/types";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const source: Session = { ...newSession("claude", "/repo"), id: "source", providerSessionId: "provider", title: "Original",
    blocks: [{ id: "u1", role: "user", text: "before" }, { id: "a1", role: "assistant", text: "reply" }] };
  const plan = planBranch({ source, turn: source.blocks, newSessionId: "branch" });
  if (!plan || plan.kind !== "native") throw new Error("expected native");
  let branch: Session = { ...newSession("claude", "/repo"), id: "branch", blocks: plan.blocks };
  let current = true;
  const send = vi.fn<(text: string, fork?: NativeForkRequest, onSummaryBinding?: (id: string) => void) => Promise<void>>();
  const run = (text = "hello", canPrefix = true) => {
    const session = branch;
    branch = appendUser(branch, text);
    return sendBranchTurn({ session, text, canPrefix, isCurrent: () => current,
      readSession: () => branch, readSource: async () => source,
      updateSession: update => { branch = update(branch); }, send });
  };
  return { source, send, run, branch: () => branch, change: (update: (session: Session) => Session) => { branch = update(branch); }, stop: () => { current = false; } };
}
describe("production branch first-send flow", () => {
  it("sends plain text once and finishes only when providerBound arrives", async () => {
    const flow = setup(); const pending = deferred();
    flow.send.mockImplementation(() => pending.promise);
    const done = flow.run(); await vi.waitFor(() => expect(flow.send).toHaveBeenCalledOnce());
    expect(flow.send).toHaveBeenCalledWith("hello", { sourceProviderSessionId: "provider", forkPoint: undefined });
    flow.change(session => applyHarnessEvent(session, { type: "session.providerBound", providerSessionId: "forked" }));
    pending.resolve(); await done;
    expect(flow.branch().providerSessionId).toBe("forked");
    expect(flow.branch().blocks.find(block => block.branchOrigin)?.branchOrigin).toMatchObject({ status: "done" });
  });
  it("retries a proven rejection exactly once with summary and one visible user block", async () => {
    const flow = setup(); const pending = deferred();
    flow.send.mockImplementationOnce(() => pending.promise).mockImplementationOnce(async () => {
      flow.change(session => applyHarnessEvent(session, { type: "session.providerBound", providerSessionId: "fresh" }));
    });
    const done = flow.run(); await vi.waitFor(() => expect(flow.send).toHaveBeenCalledOnce());
    pending.reject(new NativeForkError("rejected")); await done;
    expect(flow.send).toHaveBeenCalledTimes(2);
    expect(flow.send.mock.calls[1]).toEqual([wrapBranchSummaryPrompt(buildForkBundle(flow.source.blocks).text, "hello"), undefined, expect.any(Function)]);
    expect(flow.branch().blocks.filter(block => block.role === "user" && block.text === "hello")).toHaveLength(1);
    expect(flow.branch().blocks.find(block => block.branchOrigin)?.branchOrigin).toMatchObject({ mode: "summary", summaryDelivery: "prefix", reason: "fork-failed", status: "done" });
    expect(flow.branch().blocks.filter(block => block.text.startsWith("Couldn't reopen"))).toHaveLength(1);
  });
  it.each(["resolve", "reject"] as const)("marks an unbound %s uncertain without resending", async outcome => {
    const flow = setup(); const pending = deferred(); flow.send.mockImplementation(() => pending.promise);
    const done = flow.run(); const result = outcome === "reject" ? expect(done).rejects.toThrow("unknown") : done;
    await vi.waitFor(() => expect(flow.send).toHaveBeenCalledOnce());
    if (outcome === "resolve") pending.resolve(); else pending.reject(new Error("unknown"));
    await result;
    expect(flow.send).toHaveBeenCalledOnce();
    expect(pendingBranchOrigin(flow.branch())).toMatchObject({ mode: "native", status: "uncertain", fork: { sourceProviderSessionId: "provider" } });
    expect(flow.branch().blocks.filter(block => block.text.startsWith("Couldn't confirm"))).toHaveLength(1);
  });
  it("a new user send retries an uncertain fork, keeping both user turns and one recovery row", async () => {
    const flow = setup(); flow.send.mockResolvedValue(undefined);
    await flow.run(); await flow.run("again");
    expect(flow.send).toHaveBeenCalledTimes(2);
    expect(flow.send.mock.calls[1][1]).toMatchObject({ sourceProviderSessionId: "provider" });
    expect(flow.branch().blocks.filter(block => block.role === "user").map(block => block.text)).toEqual(["before", "hello", "again"]);
    expect(flow.branch().blocks.filter(block => block.text.startsWith("Couldn't confirm"))).toHaveLength(1);
  });
  it.each(["resolve", "fork-error", "generic-error"] as const)("Stop suppresses recovery after %s", async outcome => {
    const flow = setup(); const pending = deferred(); flow.send.mockImplementation(() => pending.promise);
    const done = flow.run(); await vi.waitFor(() => expect(flow.send).toHaveBeenCalledOnce()); flow.stop();
    if (outcome === "resolve") pending.resolve();
    else pending.reject(outcome === "fork-error" ? new NativeForkError("fork") : new Error("error"));
    await done;
    expect(flow.send).toHaveBeenCalledOnce(); expect(pendingBranchOrigin(flow.branch())?.status).toBe("pending");
    expect(flow.branch().blocks.some(block => block.text.startsWith("Couldn't"))).toBe(false);
  });
  it("does not recover after binding even when the provider's turn fails", async () => {
    const flow = setup(); flow.send.mockImplementation(async () => {
      flow.change(session => applyHarnessEvent(session, { type: "session.providerBound", providerSessionId: "forked" }));
      throw new Error("turn failed");
    });
    await expect(flow.run()).rejects.toThrow("turn failed"); expect(flow.send).toHaveBeenCalledOnce();
    expect(pendingBranchOrigin(flow.branch())).toBeUndefined();
  });
  it.each(["provider", "account", "folder", "source", "busy"] as const)("preflight catches changed %s", async changed => {
    const flow = setup(); flow.send.mockResolvedValue(undefined);
    if (changed === "source") flow.source.blocks.push({ id: "u2", role: "user", text: "later" });
    else if (changed === "busy") flow.source.busy = true;
    else flow.change(session => ({ ...session, ...(changed === "provider" ? { harness: "codex" } : changed === "account" ? { providerAccountId: "other" } : { worktreeCwd: "/other" }) }));
    await flow.run(); expect(flow.send).toHaveBeenCalledOnce(); expect(flow.send.mock.calls[0][1]).toBeUndefined();
    expect(flow.send.mock.calls[0][0]).toContain("The user's new message:\n\nhello");
    expect(pendingBranchOrigin(flow.branch())).toMatchObject({ mode: "summary", reason: changed === "source" || changed === "busy" ? "source-continued" : "branch-changed" });
  });
  it("keeps a failed summary pending, prefixes the next send, and skips prefix with another wrapper", async () => {
    const flow = setup(); flow.source.busy = true;
    flow.send.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    await expect(flow.run()).rejects.toThrow("offline");
    expect(pendingBranchOrigin(flow.branch())?.status).toBe("pending");
    await flow.run("again"); expect(flow.send.mock.calls[1][0]).toContain("The user's new message:\n\nagain");
    await flow.run("wrapped", false); expect(flow.send.mock.calls[2][0]).toBe("wrapped");
    expect(pendingBranchOrigin(flow.branch())?.status).toBe("pending");
  });
  it("keeps a skipped summary pending even when a competing wrapper binds a conversation", async () => {
    const flow = setup(); flow.source.busy = true;
    flow.send.mockImplementation(async (_text, _fork, onSummaryBinding) => { onSummaryBinding?.("fresh"); });
    await flow.run("wrapped", false);
    expect(flow.branch().providerSessionId).toBe("fresh");
    expect(pendingBranchOrigin(flow.branch())?.status).toBe("pending");
    flow.send.mockResolvedValue(undefined);
    await flow.run("again");
    expect(pendingBranchOrigin(flow.branch())).toBeUndefined();
  });
  it("keeps a rejected prefix pending after a provider binding", async () => {
    const flow = setup(); flow.source.busy = true;
    flow.send.mockImplementation(async (_text, _fork, onSummaryBinding) => {
      onSummaryBinding?.("fresh"); throw new Error("failed turn");
    });
    await expect(flow.run()).rejects.toThrow("failed turn");
    expect(flow.branch().providerSessionId).toBe("fresh");
    expect(pendingBranchOrigin(flow.branch())?.status).toBe("pending");
  });
});
