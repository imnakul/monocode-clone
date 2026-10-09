import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  harnessHttp: vi.fn(),
  openHarnessSse: vi.fn(),
  watchSse: vi.fn(),
}));

vi.mock("../../core/child", () => ({
  closeHarnessSse: vi.fn(),
  harnessHttp: mocks.harnessHttp,
  openHarnessSse: mocks.openHarnessSse,
  watchSse: mocks.watchSse,
}));

import { OpenCodeClient } from "./opencodeClient";

describe("OpenCodeClient.summarizeSession", () => {
  it("sends the exclusive fork message id and an empty body for whole-session forks", async () => {
    mocks.harnessHttp.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ id: "forked" }),
    });
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo");
    await client.forkSession("source", "/worktree", "msg_9");
    expect(mocks.harnessHttp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "http://127.0.0.1:4096/session/source/fork?directory=%2Fworktree",
        method: "POST",
        body: '{"messageID":"msg_9"}',
      }),
    );
    await client.forkSession("source", "/worktree");
    expect(mocks.harnessHttp).toHaveBeenLastCalledWith(
      expect.objectContaining({ body: "{}" }),
    );
  });

  it("sends the verified v2 before boundary and moves the fork", async () => {
    mocks.harnessHttp.mockImplementation(async (input) => {
      const url = new URL(input.url);
      if (input.method === "POST" && url.pathname.endsWith("/fork")) {
        return {
          status: 200,
          body: JSON.stringify({
            data: { id: "forked", location: { directory: "/repo" } },
          }),
        };
      }
      if (input.method === "GET" && url.pathname === "/api/session/forked") {
        return {
          status: 200,
          body: JSON.stringify({
            data: { id: "forked", location: { directory: "/worktree" } },
          }),
        };
      }
      return { status: 204, body: "" };
    });
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");

    await client.forkSession("source", "/worktree", "msg_9");

    const fork = mocks.harnessHttp.mock.calls.find(
      ([input]) => input.method === "POST" && new URL(input.url).pathname.endsWith("/fork"),
    )?.[0];
    expect(JSON.parse(fork?.body ?? "{}")).toEqual({ before: "msg_9" });
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "http://127.0.0.1:4096/api/session/forked/move?directory=%2Frepo",
        body: JSON.stringify({ directory: "/worktree", delivery: "queue" }),
      }),
    );
  });
  beforeEach(() => {
    mocks.harnessHttp.mockReset();
    mocks.harnessHttp.mockResolvedValue({ status: 200, body: "true" });
    mocks.openHarnessSse.mockReset();
    mocks.openHarnessSse.mockResolvedValue(undefined);
    mocks.watchSse.mockReset();
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

describe("OpenCodeClient MCP status", () => {
  beforeEach(() => {
    mocks.harnessHttp.mockReset();
  });

  it("keeps the v1 MCP status route and map", async () => {
    const statuses = { socraticode: { status: "connected" } };
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify(statuses),
    });
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo");

    await expect(client.getMcpStatus()).resolves.toEqual(statuses);
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "http://127.0.0.1:4096/mcp?directory=%2Frepo",
        timeoutMs: 5000,
      }),
    );
  });

  it("normalizes the v2 MCP array and uses its location route", async () => {
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({
        data: [
          {
            name: "socraticode",
            status: { status: "connected" },
            integrationID: "integration_1",
          },
          { name: "offline", status: { status: "disabled" } },
        ],
      }),
    });
    const client = new OpenCodeClient(
      "http://127.0.0.1:4096",
      "/repo",
      "v2",
    );

    await expect(client.getMcpStatus()).resolves.toEqual({
      socraticode: { status: "connected" },
      offline: { status: "disabled" },
    });
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "http://127.0.0.1:4096/api/mcp?directory=%2Frepo",
        timeoutMs: 5000,
      }),
    );
  });

  it.each([
    [[{ name: "s", status: { status: "connected" } }, { name: "s", status: { status: "connected" } }]],
    [[{ name: "s", status: { status: "unknown" } }]],
    [[{ name: "s", status: { status: " connected " } }]],
    [[{ name: "s", status: { status: "failed" } }]],
    [[{ name: "  ", status: { status: "connected" } }]],
    [{ s: { status: "connected" } }],
  ])("fails closed for malformed v2 MCP status %j", async (payload) => {
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ data: payload }),
    });
    const client = new OpenCodeClient(
      "http://127.0.0.1:4096",
      "/repo",
      "v2",
    );

    await expect(client.getMcpStatus()).rejects.toThrow(
      "invalid MCP server status list",
    );
  });
});

describe("OpenCodeClient v2", () => {
  beforeEach(() => {
    mocks.harnessHttp.mockReset();
    mocks.harnessHttp.mockResolvedValue({ status: 204, body: "" });
    mocks.openHarnessSse.mockReset();
    mocks.openHarnessSse.mockResolvedValue(undefined);
    mocks.watchSse.mockReset();
  });

  it("deletes throwaway sessions in both server generations", async () => {
    const v2 = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    await v2.deleteSession("ses_1");
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "DELETE",
        url: "http://127.0.0.1:4096/api/session/ses_1?directory=%2Frepo",
      }),
    );

    mocks.harnessHttp.mockClear();
    const v1 = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v1");
    await v1.deleteSession("ses_1");
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "DELETE",
        url: "http://127.0.0.1:4096/session/ses_1?directory=%2Frepo",
      }),
    );
  });

  it("creates sessions with a location and v2 permission rules", async () => {
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ data: { id: "ses_1" } }),
    });
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");

    await expect(
      client.createSession({
        permission: [{ permission: "*", pattern: "*", action: "ask" }],
      }),
    ).resolves.toEqual({ id: "ses_1" });
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "http://127.0.0.1:4096/api/session?directory=%2Frepo",
        body: JSON.stringify({
          location: { directory: "/repo" },
          permissions: [{ action: "*", resource: "*", effect: "ask" }],
        }),
      }),
    );
  });

  it("authenticates background service requests", async () => {
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ data: [] }),
    });
    const client = new OpenCodeClient(
      "http://127.0.0.1:4096",
      "/repo",
      "v2",
      "secret",
    );

    await client.listModels();

    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${btoa("opencode:secret")}`,
        }),
      }),
    );
  });

  it("can request the global v2 catalog without a directory context", async () => {
    mocks.harnessHttp.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ data: [] }),
    });
    const client = new OpenCodeClient(
      "http://127.0.0.1:4096",
      "",
      "v2",
      "secret",
    );

    await client.listModels();

    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://127.0.0.1:4096/api/model",
        headers: {
          Authorization: `Basic ${btoa("opencode:secret")}`,
        },
      }),
    );
  });

  it("sets model and agent before queueing a prompt", async () => {
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");

    await client.promptAsync({
      sessionID: "ses_1",
      model: { providerID: "openai", modelID: "gpt-5.4" },
      agent: "build",
      variant: "high",
      parts: [
        { type: "text", text: "Fix it" },
        {
          type: "file",
          mime: "image/png",
          filename: "bug.png",
          url: "data:image/png;base64,YWJj",
        },
      ],
    });

    expect(
      mocks.harnessHttp.mock.calls.map(([request]) => ({
        path: new URL(request.url).pathname,
        body: request.body ? JSON.parse(request.body) : undefined,
      })),
    ).toEqual([
      {
        path: "/api/session/ses_1/model",
        body: {
          model: {
            providerID: "openai",
            id: "gpt-5.4",
            variant: "high",
          },
        },
      },
      {
        path: "/api/session/ses_1/agent",
        body: { agent: "build" },
      },
      {
        path: "/api/session/ses_1/prompt",
        body: {
          text: "Fix it",
          files: [{ uri: "data:image/png;base64,YWJj", name: "bug.png" }],
          delivery: "queue",
        },
      },
    ]);

    await client.promptAsync({
      sessionID: "ses_1",
      model: { providerID: "openai", modelID: "gpt-5.4" },
      agent: "build",
      variant: "high",
      parts: [{ type: "text", text: "Continue" }],
    });
    expect(mocks.harnessHttp).toHaveBeenCalledTimes(4);
    expect(new URL(mocks.harnessHttp.mock.calls[3]![0].url).pathname).toBe(
      "/api/session/ses_1/prompt",
    );
  });

  it("normalizes v2 permission events and routes replies through the session", async () => {
    let receive: ((data: string) => void) | undefined;
    mocks.watchSse.mockImplementation(
      (_id: string, callback: (data: string) => void) => {
        receive = callback;
      },
    );
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    const events: Record<string, unknown>[] = [];
    await client.subscribeEvents("thread", (event) => events.push(event));

    receive?.(
      JSON.stringify({
        id: "evt_1",
        type: "permission.asked",
        data: {
          id: "per_1",
          sessionID: "ses_1",
          action: "bash",
          resources: ["npm test"],
        },
      }),
    );
    expect(events[0]).toMatchObject({
      type: "permission.asked",
      properties: {
        id: "per_1",
        sessionID: "ses_1",
        permission: "bash",
        patterns: ["npm test"],
      },
    });

    await client.replyPermission("per_1", "once");
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "http://127.0.0.1:4096/api/session/ses_1/permission/per_1/reply?directory=%2Frepo",
        body: JSON.stringify({ decision: "once" }),
      }),
    );
  });

  it("maps v2 forms onto questions and sends keyed answers", async () => {
    let receive: ((data: string) => void) | undefined;
    mocks.watchSse.mockImplementation(
      (_id: string, callback: (data: string) => void) => {
        receive = callback;
      },
    );
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    const events: Record<string, unknown>[] = [];
    await client.subscribeEvents("thread", (event) => events.push(event));
    receive?.(
      JSON.stringify({
        type: "form.created",
        data: {
          form: {
            id: "frm_1",
            sessionID: "ses_1",
            fields: [
              {
                key: "strategy",
                type: "multiselect",
                prompt: "Choose strategies",
                options: [{ label: "Fast" }, { label: "Safe" }],
              },
            ],
          },
        },
      }),
    );

    expect(events[0]).toMatchObject({
      type: "question.asked",
      properties: {
        id: "frm_1",
        sessionID: "ses_1",
        questions: [
          {
            id: "strategy",
            question: "Choose strategies",
            multiple: true,
          },
        ],
      },
    });
    await client.replyQuestion("frm_1", [["Fast", "Safe"]]);
    expect(mocks.harnessHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "http://127.0.0.1:4096/api/session/ses_1/form/frm_1/reply?directory=%2Frepo",
        body: JSON.stringify({
          answer: { strategy: ["Fast", "Safe"] },
        }),
      }),
    );
  });

  it("always answers multiselect fields with a list, even for zero or one choice", async () => {
    let receive: ((data: string) => void) | undefined;
    mocks.watchSse.mockImplementation(
      (_id: string, callback: (data: string) => void) => {
        receive = callback;
      },
    );
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    await client.subscribeEvents("thread", () => undefined);
    const sendForm = (id: string) =>
      receive?.(
        JSON.stringify({
          type: "form.created",
          data: {
            form: {
              id,
              sessionID: "ses_1",
              fields: [
                {
                  key: "strategy",
                  type: "multiselect",
                  options: [
                    { label: "Fast", value: "fast" },
                    { label: "Safe", value: "safe" },
                  ],
                },
                {
                  key: "mode",
                  type: "select",
                  options: [{ label: "Quick" }, { label: "Deep" }],
                },
              ],
            },
          },
        }),
      );
    sendForm("frm_1");
    sendForm("frm_2");

    await client.replyQuestion("frm_1", [["Fast"], ["Quick"]]);
    await client.replyQuestion("frm_2", [[], ["Deep"]]);
    const bodies = mocks.harnessHttp.mock.calls.map(([input]) => input.body);
    expect(bodies.at(-2)).toBe(
      JSON.stringify({ answer: { strategy: ["fast"], mode: "Quick" } }),
    );
    expect(bodies.at(-1)).toBe(
      JSON.stringify({ answer: { strategy: [], mode: "Deep" } }),
    );
  });

  it("answers boolean form fields only on exact yes/true", async () => {
    let receive: ((data: string) => void) | undefined;
    mocks.watchSse.mockImplementation(
      (_id: string, callback: (data: string) => void) => {
        receive = callback;
      },
    );
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    await client.subscribeEvents("thread", () => undefined);
    const sendForm = (id: string) =>
      receive?.(
        JSON.stringify({
          type: "form.created",
          data: {
            form: {
              id,
              sessionID: "ses_1",
              fields: [{ key: "confirm", type: "boolean" }],
            },
          },
        }),
      );
    sendForm("frm_1");
    sendForm("frm_2");
    sendForm("frm_3");

    await client.replyQuestion("frm_1", [["yesterday"]]);
    await client.replyQuestion("frm_2", [["not true"]]);
    await client.replyQuestion("frm_3", [[" yes "]]);
    const bodies = mocks.harnessHttp.mock.calls.map(([input]) => input.body);
    expect(bodies.at(-3)).toBe(JSON.stringify({ answer: { confirm: false } }));
    expect(bodies.at(-2)).toBe(JSON.stringify({ answer: { confirm: false } }));
    expect(bodies.at(-1)).toBe(JSON.stringify({ answer: { confirm: true } }));
  });

  it("leaves blank number fields unanswered and passes non-numbers through", async () => {
    let receive: ((data: string) => void) | undefined;
    mocks.watchSse.mockImplementation(
      (_id: string, callback: (data: string) => void) => {
        receive = callback;
      },
    );
    const client = new OpenCodeClient("http://127.0.0.1:4096", "/repo", "v2");
    await client.subscribeEvents("thread", () => undefined);
    const sendForm = (id: string) =>
      receive?.(
        JSON.stringify({
          type: "form.created",
          data: {
            form: {
              id,
              sessionID: "ses_1",
              fields: [
                { key: "count", type: "integer" },
                { key: "ratio", type: "number" },
              ],
            },
          },
        }),
      );
    sendForm("frm_1");
    sendForm("frm_2");

    await client.replyQuestion("frm_1", [[" 3 "], []]);
    await client.replyQuestion("frm_2", [[""], ["~0.5"]]);
    const bodies = mocks.harnessHttp.mock.calls.map(([input]) => input.body);
    expect(bodies.at(-2)).toBe(JSON.stringify({ answer: { count: 3 } }));
    expect(bodies.at(-1)).toBe(JSON.stringify({ answer: { ratio: "~0.5" } }));
  });
});
