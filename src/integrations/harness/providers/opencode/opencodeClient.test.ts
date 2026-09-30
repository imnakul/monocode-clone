import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  harnessHttp: vi.fn(),
}));

vi.mock("../../core/child", () => ({
  closeHarnessSse: vi.fn(),
  harnessHttp: mocks.harnessHttp,
  openHarnessSse: vi.fn(),
  watchSse: vi.fn(),
}));

import { OpenCodeClient } from "./opencodeClient";

describe("OpenCodeClient.summarizeSession", () => {
  it("sends the exclusive fork message id and an empty body for whole-session forks", async () => {
    mocks.harnessHttp.mockResolvedValue({ status: 200, body: JSON.stringify({ id: "forked" }) });
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo");
    await client.forkSession("source", "/worktree", "msg_9");
    expect(mocks.harnessHttp).toHaveBeenLastCalledWith(expect.objectContaining({
      url: "http://127.0.0.1:4096/session/source/fork?directory=%2Fworktree", method: "POST", body: '{"messageID":"msg_9"}',
    }));
    await client.forkSession("source", "/worktree");
    expect(mocks.harnessHttp).toHaveBeenLastCalledWith(expect.objectContaining({ body: "{}" }));
  });
  beforeEach(() => {
    mocks.harnessHttp.mockReset();
    mocks.harnessHttp.mockResolvedValue({ status: 200, body: "true" });
  });

  it("calls the native session summarize endpoint with the selected model", async () => {
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo");

    await client.summarizeSession("session/a", {
      providerID: "openai",
      modelID: "gpt-5.4",
    });

    expect(mocks.harnessHttp).toHaveBeenCalledWith({
      url: "http://127.0.0.1:4096/session/session%2Fa/summarize?directory=%2Frepo",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-opencode-directory": "%2Frepo",
      },
      body: JSON.stringify({ providerID: "openai", modelID: "gpt-5.4" }),
      timeoutMs: 30 * 60_000,
    });
  });
});
