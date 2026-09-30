import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Orchestrator,
  type ControlOutcome,
  type HandoffFileState,
  type HandoffReadSide,
  type HandoffPort,
  type OrchestrationHost,
  type OrchestrationRun,
} from "./orchestration";
import { newSession } from "../../sessions/model/session";
import type { OrchestrationProposal } from "./orchestrationPlan";
import { normalizeOrchestrationRun } from "./orchestrationState";

const SPEC = "docs/specs/feature.md";

const stateOf = (text?: string): HandoffFileState => ({
  exists: text !== undefined,
  size: text?.length ?? 0,
  ...(text === undefined ? {} : { hash: `h:${text}` }),
});

/** In-memory stand-in for the Rust handoff module, with the same contract. */
function fakeHandoff() {
  const files = new Map<string, Map<string, string>>();
  const baselines = new Map<string, string>();
  const dir = (cwd: string) => {
    if (!files.has(cwd)) files.set(cwd, new Map());
    return files.get(cwd)!;
  };
  const read = (cwd: string, path: string) => dir(cwd).get(path);
  const refuse = (path: string) => {
    if (/(^|\/)\.env|\.\.|[*?]|\/$/.test(path))
      throw new Error(`"${path}" cannot be handed off`);
  };
  const port = {
    snapshot: vi.fn(async (cwd: string, paths: string[]) =>
      paths.map((path) => {
        refuse(path);
        const contents = read(cwd, path);
        const state = stateOf(contents);
        if (state.hash && contents !== undefined)
          baselines.set(state.hash, contents);
        return { path, state };
      }),
    ),
    inspect: vi.fn(
      async (
        leadCwd: string,
        workerCwd: string,
        entries: { path: string; baseline: HandoffFileState }[],
      ) =>
        entries.map(({ path, baseline }) => {
          const after = stateOf(read(workerCwd, path));
          const lead = stateOf(read(leadCwd, path));
          const changed = after.hash !== baseline.hash;
          return {
            path,
            before: baseline,
            after,
            lead,
            changed,
            conflict:
              changed && lead.hash !== baseline.hash && lead.hash !== after.hash,
          };
        }),
    ),
    integrate: vi.fn(
      async (
        leadCwd: string,
        workerCwd: string,
        entries: {
          path: string;
          baseline: HandoffFileState;
          after: HandoffFileState;
        }[],
      ) => {
        const planned = entries.map((entry) => {
          const lead = stateOf(read(leadCwd, entry.path));
          const already = lead.hash === entry.after.hash;
          if (stateOf(read(workerCwd, entry.path)).hash !== entry.after.hash)
            throw new Error(`"${entry.path}" changed after it was reviewed`);
          if (!already && lead.hash !== entry.baseline.hash)
            throw new Error(`"${entry.path}" was edited in the lead checkout`);
          return { entry, already };
        });
        return planned.map(({ entry, already }) => {
          if (!already && entry.after.exists)
            dir(leadCwd).set(entry.path, read(workerCwd, entry.path)!);
          return { path: entry.path, applied: !already, alreadyApplied: already };
        });
      },
    ),
    cleanupSafe: vi.fn(
      async (
        workerCwd: string,
        entries: { path: string; allowed: HandoffFileState[] }[],
      ) =>
        entries.every((entry) =>
          entry.allowed.some(
            (allowed) =>
              allowed.hash === stateOf(read(workerCwd, entry.path)).hash,
          ),
        ),
    ),
    preview: vi.fn(
      async (
        leadCwd: string,
        workerCwd: string,
        path: string,
        baseline: HandoffFileState,
      ) => {
        const before =
          baselines.get(baseline.hash ?? "") ??
          (stateOf(read(leadCwd, path)).hash === baseline.hash
            ? read(leadCwd, path)
            : undefined);
        const lead = read(leadCwd, path);
        const after = read(workerCwd, path);
        const leadState = stateOf(lead);
        const afterState = stateOf(after);
        const changed = afterState.hash !== baseline.hash;
        const conflict =
          changed && leadState.hash !== baseline.hash && leadState.hash !== afterState.hash;
        const truncated = (value: string | undefined) => (value?.length ?? 0) > 32 * 1024;
        return {
          path,
          changed,
          conflict,
          before: before ?? null,
          lead: lead ?? null,
          after: after ?? null,
          beforeHash: baseline.hash,
          leadHash: leadState.hash,
          afterHash: afterState.hash,
          baselineAvailable: !baseline.exists || before !== undefined,
          binary: false,
          truncated: [before, lead, after].some(truncated),
          beforeTruncated: truncated(before),
          leadTruncated: truncated(lead),
          afterTruncated: truncated(after),
        };
      },
    ),
    read: vi.fn(
      async (
        leadCwd: string,
        workerCwd: string,
        path: string,
        baseline: HandoffFileState,
        side: HandoffReadSide,
        offset: number,
        expectedHash?: string,
      ) => {
        const contents =
          side === "baseline"
            ? baselines.get(baseline.hash ?? "")
            : read(side === "lead" ? leadCwd : workerCwd, path);
        const state = side === "baseline" ? baseline : stateOf(contents);
        if (state.hash !== expectedHash)
          throw new Error("The handoff file changed after review. Run get again.");
        if (side === "baseline" && baseline.exists && contents === undefined)
          throw new Error("The original handoff baseline is unavailable");
        const value = contents ?? "";
        const end = Math.min(value.length, offset + 32 * 1024);
        return {
          path,
          side,
          offset,
          nextOffset: end < value.length ? end : null,
          size: value.length,
          hash: state.hash,
          text: value.slice(offset, end),
          binary: false,
        };
      },
    ),
    unexpectedIgnored: vi.fn(async (): Promise<string[]> => []),
  } satisfies HandoffPort;
  return { port, files, dir, read };
}

function setup() {
  const saved = new Map<string, OrchestrationRun>();
  const store = {
    save: vi.fn(async (run: OrchestrationRun) => {
      saved.set(run.leadId, structuredClone(run));
    }),
    load: vi.fn(async (id: string) => saved.get(id) ?? null),
    enable: vi.fn(async () => "/bin/monocode"),
    disable: vi.fn(async () => {}),
    scopes: vi.fn(async (cwd: string, files: string[]) =>
      files.map((file) => (file === "." ? cwd : `${cwd}/${file}`)),
    ),
    resolvePath: vi.fn(async (path: string) => path),
  };
  const handoff = fakeHandoff();
  const manager = new Orchestrator(store, handoff.port);
  const lead = { ...newSession("claude", "/repo"), id: "lead", busy: false };
  const sessions = [lead];
  const completions = new Map<string, (outcome: ControlOutcome) => void>();
  const stopGate: { pending?: Promise<void> } = {};
  const host: OrchestrationHost = {
    session: (id) => sessions.find((session) => session.id === id),
    sessions: () => sessions,
    choices: () => [
      { harness: "codex", models: [{ id: "codex:test", name: "Test" }] },
    ],
    createWorker: vi.fn(async (run, task) => {
      sessions.push({
        ...newSession(task.harness, run.cwd),
        id: task.sessionId,
        busy: false,
      });
      const checkoutCwd = `/worktrees/${task.id}`;
      // Mirrors the app: a fresh checkout is seeded with declared files only.
      for (const path of task.handoffFiles ?? []) {
        const text = handoff.read("/repo", path);
        if (text !== undefined) handoff.dir(checkoutCwd).set(path, text);
      }
      return {
        scratchDir: `/tmp/worker-${task.sessionId}`,
        workspace: {
          id: `checkout:${checkoutCwd}`,
          projectCwd: run.cwd,
          checkoutCwd,
          kind: "worktree" as const,
          branch: `mc/orch-${task.id}`,
        },
      };
    }),
    integrateWorker: vi.fn(async () => ({ files: [], alreadyApplied: 0 })),
    cleanupWorker: vi.fn(async () => true),
    submit: vi.fn((id, _text, done) => {
      const session = sessions.find((session) => session.id === id)!;
      session.busy = true;
      completions.set(id, (outcome) => {
        session.busy = false;
        done(outcome);
      });
    }),
    stop: vi.fn(async (id) => {
      await stopGate.pending;
      const session = sessions.find((entry) => entry.id === id);
      if (session) session.busy = false;
    }),
    steer: vi.fn(async () => {}),
    respondApproval: vi.fn(),
    answerQuestion: vi.fn(),
  };
  manager.bind(host);
  let request = 0;
  const call = (action: string, input: Record<string, unknown> = {}) =>
    manager.handle("lead", `request-${++request}`, action, input);
  const card = (
    overrides: Partial<OrchestrationProposal> = {},
  ): OrchestrationProposal => ({
    version: 1,
    leadId: "lead",
    cwd: "/repo",
    request: "Build it",
    author: { harness: "claude", model: "claude:test", name: "Lead" },
    settings: {
      choices: [{ harness: "codex", model: "codex:test", name: "Test" }],
      maxWorkers: 2,
    },
    status: "ready",
    title: "Feature",
    summary: "Spec first",
    tasks: [
      {
        id: "spec",
        title: "Spec",
        prompt: "Write the spec",
        harness: "codex",
        model: "codex:test",
        files: ["docs/specs"],
        handoffFiles: [SPEC],
        dependsOn: [],
      },
      {
        id: "impl",
        title: "Implement",
        prompt: "Implement the spec",
        harness: "codex",
        model: "codex:test",
        files: ["src"],
        handoffFiles: [SPEC],
        dependsOn: ["spec"],
      },
    ],
    ...overrides,
  });
  const approve = (overrides: Partial<OrchestrationProposal> = {}) =>
    manager.startApproved("lead", "card", card(overrides));
  const tasks = () => manager.run("lead")!.tasks;
  const byTitle = (title: string) =>
    tasks().find((task) => task.title === title)!;
  const workerDir = (title: string) =>
    handoff.dir(`/worktrees/${byTitle(title).id}`);
  const finishLead = (outcome: Partial<ControlOutcome> = {}) =>
    completions.get("lead")!({ status: "completed", text: "", ...outcome });
  const complete = async (title: string, text = "done") => {
    // The worker's turn is submitted a moment after its task turns "running".
    await vi.waitFor(() =>
      expect(completions.has(byTitle(title).sessionId)).toBe(true),
    );
    completions.get(byTitle(title).sessionId)!({ status: "completed", text });
  };
  /** Running, checkout prepared and its turn submitted. */
  const started = (title: string) =>
    vi.waitFor(() =>
      expect(completions.has(byTitle(title).sessionId)).toBe(true),
    );
  const idle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const leadSubmits = () =>
    vi.mocked(host.submit).mock.calls.filter(([id]) => id === "lead");
  return {
    manager,
    store,
    host,
    handoff,
    lead,
    saved,
    sessions,
    completions,
    stopGate,
    call,
    card,
    approve,
    tasks,
    byTitle,
    workerDir,
    finishLead,
    complete,
    started,
    idle,
    leadSubmits,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("local handoff files", () => {
  it("hands a shell-written ignored spec through review to a dependent worker", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    // Baseline recorded before dispatch, in the lead checkout: file missing.
    expect(f.byTitle("Spec").handoff).toEqual([
      { path: SPEC, baseline: stateOf(undefined) },
    ]);
    expect(f.byTitle("Implement").status).toBe("queued");

    // The worker's shell wrote it: no structured edit event exists.
    f.workerDir("Spec").set(SPEC, "# Spec\nexact bytes");
    await f.complete("Spec");
    await vi.waitFor(() => expect(f.byTitle("Spec").status).toBe("completed"));

    const shown = (await f.call("get", { taskId: f.byTitle("Spec").id })) as {
      handoffPreview: { path: string; after: string; changed: boolean }[];
    };
    expect(shown.handoffPreview[0]).toMatchObject({
      path: SPEC,
      changed: true,
      after: "# Spec\nexact bytes",
    });
    // Dependent work does not start before acceptance.
    expect(f.host.createWorker).toHaveBeenCalledTimes(1);

    await f.call("review", { taskId: f.byTitle("Spec").id });
    expect(f.byTitle("Spec").accepted).toBe(true);
    expect(f.handoff.read("/repo", SPEC)).toBe("# Spec\nexact bytes");
    expect(f.byTitle("Spec").handoff?.[0].applied).toBe(true);

    await f.started("Implement");
    // The dependent worker was seeded with the accepted bytes.
    expect(f.workerDir("Implement").get(SPEC)).toBe("# Spec\nexact bytes");
    expect(f.byTitle("Implement").handoff?.[0].baseline).toEqual(
      stateOf("# Spec\nexact bytes"),
    );
  });

  it("uses an existing spec as the baseline and blocks a conflicting lead edit", async () => {
    const f = setup();
    f.handoff.dir("/repo").set(SPEC, "original");
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    expect(f.workerDir("Spec").get(SPEC)).toBe("original");
    expect(f.byTitle("Spec").handoff?.[0].baseline).toEqual(stateOf("original"));
    f.workerDir("Spec").set(SPEC, "worker version");
    f.handoff.dir("/repo").set(SPEC, "lead edit");
    await f.complete("Spec");
    await vi.waitFor(() => expect(f.byTitle("Spec").status).toBe("completed"));

    const taskId = f.byTitle("Spec").id;
    const review = (await f.call("get", { taskId })) as {
      handoffPreview: {
        before: string;
        lead: string;
        after: string;
        beforeHash: string;
      }[];
    };
    expect(review.handoffPreview[0]).toMatchObject({
      before: "original",
      lead: "lead edit",
      after: "worker version",
      conflict: true,
      baselineAvailable: true,
    });
    const approvedBaseline = (await f.call("handoff_read", {
      taskId,
      path: SPEC,
      side: "baseline",
      offset: 0,
      expectedHash: review.handoffPreview[0].beforeHash,
    })) as { text: string };
    expect(approvedBaseline.text).toBe("original");

    await expect(
      f.call("review", { taskId }),
    ).rejects.toThrow(/conflict/i);
    expect(f.host.integrateWorker).not.toHaveBeenCalled();
    expect(f.byTitle("Spec").accepted).toBe(false);
    expect(f.handoff.read("/repo", SPEC)).toBe("lead edit");
    expect(f.workerDir("Spec").get(SPEC)).toBe("worker version");
    expect(f.byTitle("Implement").status).toBe("queued");
  });

  it("retries an integration that failed after the code applied without duplicating", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    f.workerDir("Spec").set(SPEC, "spec v1");
    await f.complete("Spec");
    await vi.waitFor(() => expect(f.byTitle("Spec").status).toBe("completed"));
    f.handoff.port.integrate.mockRejectedValueOnce(new Error("disk full"));
    const id = f.byTitle("Spec").id;
    await expect(f.call("review", { taskId: id })).rejects.toThrow("disk full");
    expect(f.byTitle("Spec").accepted).toBe(false);
    expect(f.byTitle("Implement").status).toBe("queued");
    await f.call("review", { taskId: id });
    expect(f.byTitle("Spec").accepted).toBe(true);
    expect(f.handoff.read("/repo", SPEC)).toBe("spec v1");
    // Recorded result, not a second copy: the retry saw the same hash.
    expect(f.byTitle("Spec").handoff?.[0].after).toEqual(stateOf("spec v1"));
  });

  it("refuses unexpected ignored changes, keeping the checkout and copying nothing", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    f.workerDir("Spec").set(SPEC, "spec");
    f.handoff.port.unexpectedIgnored.mockResolvedValue([".env"]);
    await f.complete("Spec");
    await vi.waitFor(() => expect(f.byTitle("Spec").status).toBe("completed"));
    const error = await f
      .call("review", { taskId: f.byTitle("Spec").id })
      .catch((reason: Error) => reason.message);
    expect(error).toContain(".env");
    expect(error).toContain("outside its approved handoff");
    expect(error).not.toContain("spec");
    expect(f.handoff.port.integrate).not.toHaveBeenCalled();
    expect(f.handoff.read("/repo", SPEC)).toBeUndefined();
    expect(f.host.cleanupWorker).not.toHaveBeenCalled();
    expect(f.workerDir("Spec").get(SPEC)).toBe("spec");
  });

  it("never removes a worktree holding the only changed copy when its task is cancelled", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    f.workerDir("Spec").set(SPEC, "only copy");
    await f.manager.cancelTask("lead", f.byTitle("Spec").id);
    expect(f.byTitle("Spec").status).toBe("cancelled");
    expect(f.host.cleanupWorker).not.toHaveBeenCalled();
    expect(f.byTitle("Spec").workspace).toBeDefined();
    expect(f.workerDir("Spec").get(SPEC)).toBe("only copy");
    // A cancelled spec cannot supply the dependent worker.
    await f.idle();
    expect(f.byTitle("Implement").status).toBe("queued");
  });

  it("still cleans an unchanged handoff worktree", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    await f.manager.cancelTask("lead", f.byTitle("Spec").id);
    expect(f.host.cleanupWorker).toHaveBeenCalledOnce();
  });

  it("rejects unsafe handoff paths before dispatch", async () => {
    const f = setup();
    f.lead.busy = false;
    const bad = f.card();
    bad.tasks[0].handoffFiles = [".env"];
    await expect(
      f.manager.startApproved("lead", "card", bad),
    ).rejects.toThrow(/handoff file|handed off/);
    expect(f.host.createWorker).not.toHaveBeenCalled();
    expect(f.manager.run("lead")).toBeUndefined();

    await f.approve({});
    await expect(
      f.call("delegate", {
        title: "Extra",
        prompt: "x",
        harness: "codex",
        files: ["docs"],
        handoffFiles: ["docs/*.md"],
      }),
    ).rejects.toThrow(/handoff file|handed off/);
    expect(tasksCount(f)).toBe(2);
  });

  it("accepts handoffFiles from the control CLI delegate action", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.call("delegate", {
      title: "Docs",
      prompt: "x",
      harness: "codex",
      files: ["docs/other"],
      handoffFiles: ["docs/other/notes.md"],
    });
    expect(f.byTitle("Docs").handoffFiles).toEqual(["docs/other/notes.md"]);
  });
});

describe("Efficient wait budget", () => {
  it("returns a turn-ending instruction after two empty waits without stopping the run", async () => {
    const f = setup();
    await f.approve({ supervision: "efficient" });
    await f.started("Spec");
    vi.mocked(f.host.stop).mockClear();

    const first = await f.call("wait", { timeoutSeconds: 0 });
    const second = await f.call("wait", { timeoutSeconds: 0 });
    const third = (await f.call("wait", { timeoutSeconds: 0 })) as {
      waitGuidance?: string;
    };

    expect(first).not.toHaveProperty("waitGuidance");
    expect(second).not.toHaveProperty("waitGuidance");
    expect(third.waitGuidance).toBe(
      "end this lead turn; MonoCode will wake you on an actionable event",
    );
    expect(f.manager.run("lead")?.status).toBe("active");
    expect(f.host.stop).not.toHaveBeenCalledWith("lead");
  });

  it("resets after a result arrives and exposes the result immediately", async () => {
    const f = setup();
    await f.approve({ supervision: "efficient" });
    await f.started("Spec");
    await f.call("wait", { timeoutSeconds: 0 });
    await f.call("wait", { timeoutSeconds: 0 });
    await f.complete("Spec", "completed output");

    const result = (await f.call("wait", { timeoutSeconds: 0 })) as {
      waitGuidance?: string;
      tasks: { result: string }[];
    };

    expect(result).not.toHaveProperty("waitGuidance");
    expect(result.tasks.some((task) => task.result === "completed output")).toBe(
      true,
    );
  });

  it("returns a worker question immediately after a quiet period", async () => {
    const f = setup();
    await f.approve({ supervision: "efficient" });
    await f.started("Spec");
    await f.call("wait", { timeoutSeconds: 0 });
    await f.call("wait", { timeoutSeconds: 0 });
    const worker = f.sessions.find(
      (session) => session.id === f.byTitle("Spec").sessionId,
    )!;
    worker.pendingQuestion = {
      requestId: 41,
      questions: [
        {
          id: "choice",
          prompt: "Pick one",
          multiSelect: false,
          allowCustom: false,
          options: [{ id: "one", label: "One" }],
        },
      ],
    };
    f.manager.sync();

    const result = (await f.call("wait", { timeoutSeconds: 25 })) as {
      waitGuidance?: string;
      tasks: { needsInput?: { requestId: number } }[];
    };

    expect(result).not.toHaveProperty("waitGuidance");
    expect(
      result.tasks.some((task) => task.needsInput?.requestId === 41),
    ).toBe(true);
  });

  it("resets the saved budget when a restart resumes a new dispatch period", async () => {
    const f = setup();
    await f.approve({ supervision: "efficient" });
    await f.started("Spec");
    await f.call("wait", { timeoutSeconds: 0 });
    await f.call("wait", { timeoutSeconds: 0 });
    expect(f.saved.get("lead")?.quietWaitBudget?.emptyWaits).toBe(2);

    const restarted = new Orchestrator(f.store, f.handoff.port);
    restarted.bind(f.host);
    await restarted.hydrate("lead");
    expect(restarted.run("lead")?.status).toBe("paused");
    expect(restarted.run("lead")?.quietWaitBudget?.emptyWaits).toBe(2);
    await restarted.resumeRun("lead");
    await vi.waitFor(() =>
      expect(f.host.createWorker).toHaveBeenCalledTimes(2),
    );

    const result = (await restarted.handle(
      "lead",
      "restart-wait",
      "wait",
      { timeoutSeconds: 0 },
    )) as { waitGuidance?: string };
    expect(result).not.toHaveProperty("waitGuidance");
    expect(restarted.run("lead")?.quietWaitBudget?.emptyWaits).toBe(1);
  });

  it("keeps normal bounded waits in Live mode", async () => {
    const f = setup();
    await f.approve({ supervision: "live" });
    await f.started("Spec");

    await f.call("wait", { timeoutSeconds: 0 });
    await f.call("wait", { timeoutSeconds: 0 });
    const third = (await f.call("wait", { timeoutSeconds: 0 })) as {
      waitGuidance?: string;
    };

    expect(third).not.toHaveProperty("waitGuidance");
    expect(f.manager.run("lead")?.supervision).toBe("live");
  });
});

const tasksCount = (f: ReturnType<typeof setup>) => f.tasks().length;

describe("stopping only the lead response", () => {
  const runWithWorker = async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    return f;
  };

  it("interrupts the lead turn while the run, worker and control grant stay intact", async () => {
    const f = await runWithWorker();
    expect(f.lead.busy).toBe(true);
    const worker = f.byTitle("Spec");
    const taskIds = f.tasks().map((task) => task.id);
    vi.mocked(f.host.stop).mockClear();
    await f.manager.stopLeadResponse("lead");
    expect(f.host.stop).toHaveBeenCalledTimes(1);
    expect(f.host.stop).toHaveBeenCalledWith("lead");
    f.finishLead({ status: "cancelled" });
    await f.idle();
    expect(f.manager.run("lead")?.status).toBe("active");
    expect(f.byTitle("Spec").status).toBe("running");
    expect(f.byTitle("Spec").workspace).toEqual(worker.workspace);
    expect(f.tasks().map((task) => task.id)).toEqual(taskIds);
    expect(f.store.disable).not.toHaveBeenCalled();
    expect(f.host.stop).not.toHaveBeenCalledWith(worker.sessionId);
  });

  it("ignores a late failure from the stopped turn instead of pausing", async () => {
    const f = await runWithWorker();
    await f.manager.stopLeadResponse("lead");
    f.finishLead({ status: "failed", error: "provider went away" });
    await f.idle();
    expect(f.manager.run("lead")?.status).toBe("active");
    expect(f.byTitle("Spec").status).toBe("running");
    expect(f.manager.run("lead")?.error).toBeUndefined();
  });

  it("does not wake the lead for worker progress, but wakes it once for a result", async () => {
    const f = await runWithWorker();
    await f.manager.stopLeadResponse("lead");
    f.finishLead({ status: "cancelled" });
    const before = f.leadSubmits().length;
    f.manager.observe(f.byTitle("Spec").sessionId, {
      type: "tool.started",
      id: "t1",
      name: "Bash",
    } as never);
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(before);

    await f.complete("Spec", "the worker result");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(before + 1));
    expect(String(f.leadSubmits()[before][1])).toContain("the worker result");
    f.manager.sync();
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(before + 1);
  });

  it("keeps control after switching the lead model and continuing manually", async () => {
    const f = await runWithWorker();
    await f.manager.stopLeadResponse("lead");
    f.finishLead({ status: "cancelled" });
    f.lead.model = "luna";
    const prompt = f.manager.prompt("lead", "please continue");
    expect(prompt).toContain("please continue");
    expect(prompt).toContain("<monocode_orchestration>");
    const listed = (await f.call("list")) as {
      run: { tasks: { id: string }[] };
    };
    expect(listed.run.tasks.map((task) => task.id)).toEqual(
      f.tasks().map((task) => task.id),
    );
    expect(f.store.disable).not.toHaveBeenCalled();
    expect(f.manager.run("lead")?.status).toBe("active");
  });

  it("delivers a result that was part of the interrupted turn exactly once", async () => {
    const f = await runWithWorker();
    f.finishLead();
    await f.complete("Spec", "held result text");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    expect(String(f.leadSubmits()[1][1])).toContain("held result text");
    expect(f.byTitle("Spec").delivered).toBe(true);

    // The user stops that delivery turn.
    await f.manager.stopLeadResponse("lead");
    f.finishLead({ status: "cancelled" });
    await vi.waitFor(() => expect(f.byTitle("Spec").delivered).toBe(false));
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(2);

    // A manual continuation carries it, then completes it once.
    const prompt = f.manager.prompt("lead", "please continue");
    expect(prompt).toContain("held result text");
    f.host.submit("lead", prompt, (outcome) => {
      void f.manager.manualLeadTurnSettled("lead", outcome);
    });
    const twice = f.manager.prompt("lead", "again");
    expect(twice).toContain("held result text");
    f.finishLead();
    await vi.waitFor(() => expect(f.byTitle("Spec").delivered).toBe(true));
    expect(f.manager.prompt("lead", "later")).not.toContain("held result text");
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(3);
  });

  it("lets a new worker event carry a held result along", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve({
      tasks: [
        { ...f.card().tasks[0], handoffFiles: undefined, dependsOn: [] },
        {
          ...f.card().tasks[1],
          handoffFiles: undefined,
          dependsOn: [],
          files: ["src/other"],
        },
      ],
    });
    await vi.waitFor(() =>
      expect(f.tasks().every((task) => task.status === "running")).toBe(true),
    );
    f.finishLead();
    await f.complete("Spec", "first result");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    await f.manager.stopLeadResponse("lead");
    f.finishLead({ status: "cancelled" });
    await vi.waitFor(() => expect(f.byTitle("Spec").delivered).toBe(false));
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(2);
    await f.complete("Implement", "second result");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(3));
    const body = String(f.leadSubmits()[2][1]);
    expect(body).toContain("first result");
    expect(body).toContain("second result");
  });

  it("holds a result that arrives while the stop is still in flight, then delivers it once", async () => {
    const f = await runWithWorker();
    f.finishLead();
    vi.mocked(f.host.stop).mockClear();
    let release = () => {};
    f.stopGate.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stopping = f.manager.stopLeadResponse("lead");
    const again = f.manager.stopLeadResponse("lead");
    await f.complete("Spec", "arrived during stop");
    await f.idle();
    // No wake while the stop is unresolved, and repeated clicks share one stop.
    expect(f.leadSubmits()).toHaveLength(1);
    release();
    await Promise.all([stopping, again]);
    expect(f.host.stop).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    expect(String(f.leadSubmits()[1][1])).toContain("arrived during stop");
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(2);
  });

  it("returns results when a stop lands between recording delivery and submitting", async () => {
    const f = await runWithWorker();
    f.finishLead();
    let armed = true;
    f.store.save.mockImplementation(async (run: OrchestrationRun) => {
      f.saved.set(run.leadId, structuredClone(run));
      const spec = run.tasks.find((task) => task.title === "Spec");
      // The delivery was just recorded; the user stops before it is submitted.
      if (armed && spec?.status === "completed" && spec.delivered) {
        armed = false;
        void f.manager.stopLeadResponse("lead");
      }
    });
    await f.complete("Spec", "raced result");
    await vi.waitFor(() => expect(f.host.stop).toHaveBeenCalledWith("lead"));
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(1);
    expect(f.byTitle("Spec").delivered).toBe(false);
    // Once the lead is idle again the result is delivered exactly once.
    f.manager.sync();
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    expect(String(f.leadSubmits()[1][1])).toContain("raced result");
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(2);
  });

  it("settles a stop racing a confirmed cancellation as cancelled with no wake", async () => {
    const f = await runWithWorker();
    f.finishLead();
    await Promise.all([
      f.manager.stopLeadResponse("lead"),
      f.manager.stopRun("lead"),
    ]);
    f.finishLead({ status: "cancelled" });
    await f.idle();
    expect(f.manager.run("lead")?.status).toBe("stopped");
    expect(f.byTitle("Spec").status).toBe("cancelled");
    const submits = f.leadSubmits().length;
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(submits);
    expect(f.manager.run("lead")?.status).toBe("stopped");
  });

  it("cancels the whole orchestration only through stopRun", async () => {
    const f = await runWithWorker();
    await f.manager.stopLeadResponse("lead");
    expect(f.store.disable).not.toHaveBeenCalled();
    await f.manager.stopRun("lead");
    expect(f.manager.run("lead")?.status).toBe("stopped");
    expect(f.byTitle("Spec").status).toBe("cancelled");
    expect(f.byTitle("Implement").status).toBe("cancelled");
    expect(f.store.disable).toHaveBeenCalledWith("lead");
    expect(f.manager.isLeadRun("lead")).toBe(false);
  });
});

describe("lead continuation failures and message-based resume", () => {
  const wokenByFailure = async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    await f.started("Spec");
    f.finishLead();
    await f.complete("Spec", "result");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    f.finishLead({ status: "failed", error: "model unavailable" });
    await vi.waitFor(() =>
      expect(f.manager.run("lead")?.status).toBe("paused"),
    );
    return f;
  };

  it("pauses safely on a model failure and never retries in a loop", async () => {
    const f = await wokenByFailure();
    expect(f.byTitle("Spec").workspace).toBeDefined();
    expect(f.byTitle("Spec").delivered).toBe(false);
    f.manager.sync();
    f.manager.sync();
    await f.idle();
    expect(f.leadSubmits()).toHaveLength(2);
    expect(f.manager.run("lead")?.status).toBe("paused");
  });

  it("resumes the same run and tasks from a message, sending it once", async () => {
    const f = await wokenByFailure();
    const ids = f.tasks().map((task) => task.id);
    const worktree = f.byTitle("Spec").workspace;
    f.lead.model = "luna";
    expect(f.manager.resumeSendBlocker("lead")).toBeNull();
    await Promise.all([
      f.manager.resumeRun("lead"),
      f.manager.resumeRun("lead").catch(() => undefined),
    ]);
    expect(f.manager.run("lead")?.status).toBe("active");
    expect(f.tasks().map((task) => task.id)).toEqual(ids);
    expect(f.byTitle("Spec").workspace).toEqual(worktree);
    expect(f.store.enable).toHaveBeenCalledTimes(2);
  });

  it("reports busy, foreign and wrong-checkout blockers instead of starting a second run", async () => {
    const f = await wokenByFailure();
    f.lead.busy = true;
    expect(f.manager.resumeSendBlocker("lead")).toMatch(/interrupted turn/);
    await expect(f.manager.resumeRun("lead")).rejects.toThrow(
      /interrupted turn/,
    );
    f.lead.busy = false;

    f.sessions.push({
      ...newSession("codex", "/repo"),
      id: "other",
      title: "Other chat",
      busy: true,
    });
    expect(f.manager.resumeSendBlocker("lead")).toContain("Other chat");
    await expect(f.manager.resumeRun("lead")).rejects.toThrow(/Other chat/);
    f.sessions.pop();

    f.lead.worktreeCwd = "/elsewhere";
    expect(f.manager.resumeSendBlocker("lead")).toMatch(/original checkout/);
    f.lead.worktreeCwd = undefined;
    expect(f.manager.run("lead")?.status).toBe("paused");
  });
});

describe("supervision policy", () => {
  it("defaults to Efficient and injects the bounded-wait policy", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve();
    expect(f.manager.run("lead")?.supervision).toBe("efficient");
    const prompt = f.manager.prompt("lead", "go");
    expect(prompt).toContain("Supervision mode: Efficient");
    expect(prompt).toContain("at most two empty wait calls");
    expect(prompt).toContain("never press the input-area Stop button");
    expect(prompt).not.toContain("use bounded wait calls while supervising");
  });

  it("lets Live supervision keep waiting and says it costs more lead turns", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve({ supervision: "live" });
    expect(f.manager.run("lead")?.supervision).toBe("live");
    const prompt = f.manager.prompt("lead", "go");
    expect(prompt).toContain("Supervision mode: Live");
    expect(prompt).toContain("more lead model turns");
    expect(prompt).not.toContain("at most two empty wait calls");
  });

  it("persists the choice across pause, resume and reload; old runs default to Efficient", async () => {
    const f = setup();
    f.lead.busy = false;
    await f.approve({ supervision: "live" });
    expect(f.saved.get("lead")?.supervision).toBe("live");
    await f.started("Spec");
    f.finishLead();
    await f.complete("Spec");
    await vi.waitFor(() => expect(f.leadSubmits()).toHaveLength(2));
    f.finishLead({ status: "failed", error: "quota" });
    await vi.waitFor(() =>
      expect(f.manager.run("lead")?.status).toBe("paused"),
    );
    expect(f.saved.get("lead")?.supervision).toBe("live");
    await f.manager.resumeRun("lead");
    expect(f.manager.run("lead")?.supervision).toBe("live");

    const legacy = structuredClone(f.saved.get("lead")!);
    delete legacy.supervision;
    expect(normalizeOrchestrationRun(legacy).supervision).toBe("efficient");
  });
});
