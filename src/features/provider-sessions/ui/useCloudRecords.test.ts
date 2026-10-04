// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  accounts: {
    claude: [{ id: "account-a", label: "Account A" }],
    codex: [{ id: "codex-account", label: "Codex" }],
  },
  listeners: new Set<() => void>(),
  list: vi.fn(),
}));

vi.mock("../../providers/model/providerAccounts", () => ({
  providerAccounts: (provider: "claude" | "codex") => state.accounts[provider],
  subscribeProviderAccounts: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock("../model/cloudSessions", () => ({
  listRetainedCloudSessions: state.list,
}));

import { useCloudRecords } from "./useCloudRecords";
import type { CloudSession } from "../model/cloudSessions";
import type { NativeProvider } from "../model/providerSessions";

function record(
  id: string,
  providerAccountId = "account-a",
  provider: NativeProvider = "claude",
): CloudSession {
  return {
    provider,
    id,
    url:
      provider === "claude"
        ? `https://claude.ai/code/${id}`
        : `https://chatgpt.com/codex/tasks/${id}`,
    cwd: "/work/project",
    providerAccountId,
    environmentId: provider === "codex" ? "env-1" : null,
    branch: null,
    createdAt: 10,
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function Probe({ providers }: { providers: readonly NativeProvider[] }) {
  const cloud = useCloudRecords(providers);
  return createElement(
    "div",
    null,
    createElement(
      "pre",
      { "data-state": "cloud-records" },
      JSON.stringify({
        records: cloud.records,
        errors: cloud.errors,
        refreshing: cloud.refreshing,
      }),
    ),
    createElement("button", { onClick: cloud.refresh }, "Refresh"),
    createElement(
      "button",
      { onClick: () => cloud.add(record("just-launched")) },
      "Add",
    ),
  );
}

let root: Root;
let container: HTMLDivElement;

async function render(providers: readonly NativeProvider[] = ["claude"]): Promise<void> {
  await act(async () => {
    root.render(createElement(Probe, { providers }));
    await Promise.resolve();
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function snapshot(): { records: CloudSession[]; errors: Partial<Record<NativeProvider, string>> } {
  const text = container.querySelector("pre[data-state='cloud-records']")?.textContent;
  if (!text) throw new Error("Missing cloud records state");
  return JSON.parse(text) as {
    records: CloudSession[];
    errors: Partial<Record<NativeProvider, string>>;
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.accounts.claude = [{ id: "account-a", label: "Account A" }];
  state.accounts.codex = [{ id: "codex-account", label: "Codex" }];
  state.listeners.clear();
  state.list.mockReset().mockResolvedValue([record("task-a")]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("useCloudRecords", () => {
  it("retains prior records and reports account errors when a partial refresh fails", async () => {
    await render();
    expect(snapshot().records.map(({ id }) => id)).toEqual(["task-a"]);

    state.list.mockRejectedValueOnce(new Error("retained store unavailable"));
    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(snapshot().records.map(({ id }) => id)).toEqual(["task-a"]);
    expect(snapshot().errors.claude).toContain("Account A");
    expect(snapshot().errors.claude).toContain("retained store unavailable");
  });

  it("does not let a late old-account result overwrite the new account list", async () => {
    const oldAccount = deferred<CloudSession[]>();
    const newAccount = deferred<CloudSession[]>();
    state.list.mockImplementation((_provider: NativeProvider, accountId: string) =>
      accountId === "account-a" ? oldAccount.promise : newAccount.promise,
    );
    await render();

    state.accounts.claude = [{ id: "account-b", label: "Account B" }];
    await act(async () => {
      for (const listener of state.listeners) listener();
      await Promise.resolve();
    });
    await act(async () => {
      newAccount.resolve([record("task-b", "account-b")]);
      await newAccount.promise;
    });
    expect(snapshot().records.map(({ id }) => id)).toEqual(["task-b"]);

    await act(async () => {
      oldAccount.resolve([record("stale-task", "account-a")]);
      await oldAccount.promise;
    });
    expect(snapshot().records.map(({ id }) => id)).toEqual(["task-b"]);
    expect(snapshot().errors.claude).toBeUndefined();
  });

  it("keeps a just-launched record if an older in-flight listing completes later", async () => {
    const pendingList = deferred<CloudSession[]>();
    state.list.mockReturnValue(pendingList.promise);
    await render();

    await act(async () => {
      container
        .querySelectorAll("button")[1]
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      pendingList.resolve([]);
      await pendingList.promise;
    });
    expect(snapshot().records.map(({ id }) => id)).toContain("just-launched");
  });
});
