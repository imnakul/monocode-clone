import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { sendBranchTurn } from "../../features/sessions/model/branchFlow";
import { planBranch } from "../../features/sessions/model/branchPlan";
import {
  HARNESSES,
  newSession,
  type Session,
} from "../../features/sessions/model/session";
import { applyHarnessEvent } from "../../integrations/harness/core/apply";
import {
  NativeForkError,
  type NativeForkRequest,
} from "../../integrations/harness/core/types";

/** Exercise App's actual dispatch statements, rather than reconstructing its
 * flow in the test. A second send at the call site must fail these regressions
 * even when the branch helper itself correctly sends only once. */
function productionDispatch(): (
  bindings: Record<string, unknown>,
) => Promise<void> {
  const source = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  const parsed = ts.createSourceFile(
    "App.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let section: string | undefined;
  const called = (statement: ts.Statement, name: string): boolean => {
    if (!ts.isExpressionStatement(statement)) return false;
    const expression = ts.isAwaitExpression(statement.expression)
      ? statement.expression.expression
      : statement.expression;
    return (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === name
    );
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isBlock(node) &&
      node.statements.some((statement) => called(statement, "sendBranchTurn"))
    ) {
      const start = node.statements.findIndex(
        (statement) =>
          ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some(
            (declaration) =>
              ts.isIdentifier(declaration.name) &&
              ["wrappedPrompt", "sendText"].includes(declaration.name.text),
          ),
      );
      const end = node.statements.findIndex((statement) =>
        called(statement, "acceptEditedResend"),
      );
      if (start < 0 || end < start)
        throw new Error("Could not locate App's initial dispatch boundary");
      section = source.slice(
        node.statements[start].getStart(parsed),
        node.statements[end].end,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  if (!section) throw new Error("Could not find App's branch-aware submission");
  const body = ts.transpileModule(
    `
    const { current, sessionId, turnPrompt, wrap, rawCommand, earlier, operatorCommand,
      orchestrator, inboxAskPrompt, wrapHandoffPrompt, CONTINUE_PROMPT, invoke,
      shellPath, sendBranchTurn, turnGen, gen, flushHarnessEvents, sessionsRef,
      getSession, setSessions, sendTurn, prepared, acceptEditedResend } = bindings;
    return (async () => { ${section} })();
  `,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    },
  ).outputText;
  return new Function("bindings", body) as (
    bindings: Record<string, unknown>,
  ) => Promise<void>;
}

const dispatch = productionDispatch();

function setup(
  options: {
    harness?: Session["harness"];
    operator?: boolean;
    branch?: boolean;
    handoff?: boolean;
  } = {},
) {
  const source: Session = {
    ...newSession("claude", "/repo"),
    id: "source",
    providerSessionId: "native-source",
    blocks: [
      { id: "u1", role: "user", text: "Original task" },
      { id: "a1", role: "assistant", text: "Original response" },
    ],
  };
  const plan = options.branch
    ? planBranch({ source, turn: source.blocks, newSessionId: "destination" })
    : undefined;
  const current: Session = {
    ...newSession(options.harness ?? "claude", "/repo"),
    id: "destination",
    blocks: plan?.blocks ?? [],
  };
  const sessionsRef = { current: [current] };
  const prepared = [{ kind: "file", name: "task.md", path: "/repo/task.md" }];
  const turnGen = { current: new Map([[current.id, 1]]) };
  const acceptEditedResend = vi.fn();
  const invoke = vi.fn(async (): Promise<string> => "/bin/monocode");
  const sendTurn = vi.fn(
    async (
      _text: string,
      _attachments: unknown,
      _fork?: NativeForkRequest,
      onSummaryBinding?: (id: string) => void,
    ): Promise<void> => {
      onSummaryBinding?.("native-result");
      sessionsRef.current = sessionsRef.current.map((session) =>
        applyHarnessEvent(session, {
          type: "session.providerBound",
          providerSessionId: "native-result",
        }),
      );
    },
  );
  const bindings: Record<string, unknown> = {
    current,
    sessionId: current.id,
    turnPrompt: "Check the task",
    prepared,
    wrap: options.handoff
      ? { text: "Prior context", from: "codex" }
      : undefined,
    rawCommand: false,
    earlier: [],
    operatorCommand: { matched: options.operator ?? false },
    orchestrator: { prompt: (_id: string, text: string): string => text },
    inboxAskPrompt: (_context: unknown, text: string): string => text,
    wrapHandoffPrompt: (context: string, _from: string, text: string): string =>
      `${context}\n${text}`,
    CONTINUE_PROMPT: "Continue",
    invoke,
    shellPath: (path: string): string => path,
    sendBranchTurn,
    turnGen,
    gen: 1,
    flushHarnessEvents: (): void => {},
    sessionsRef,
    getSession: async (): Promise<Session> => source,
    setSessions: (next: Session[]): void => {
      sessionsRef.current = next;
    },
    sendTurn,
    acceptEditedResend,
  };
  return {
    run: (): Promise<void> => dispatch(bindings),
    sendTurn,
    prepared,
    invoke,
    turnGen,
    acceptEditedResend,
    session: (): Session => sessionsRef.current[0],
  };
}

describe("App's production local submission", () => {
  it.each(HARNESSES)(
    "submits one ordinary %s prompt with its attachments exactly once",
    async (harness) => {
      const flow = setup({ harness });
      await flow.run();
      expect(flow.sendTurn).toHaveBeenCalledOnce();
      expect(flow.sendTurn).toHaveBeenCalledWith(
        "Check the task",
        flow.prepared,
        undefined,
        undefined,
      );
      expect(flow.acceptEditedResend).toHaveBeenCalledOnce();
    },
  );

  it("includes Operator instructions in the only submitted prompt", async () => {
    const flow = setup({ operator: true });
    await flow.run();
    expect(flow.sendTurn).toHaveBeenCalledOnce();
    expect(flow.sendTurn.mock.calls[0][0]).toContain(
      "Check the task\n\n<monocode_app>",
    );
    expect(flow.sendTurn.mock.calls[0][0]).toContain(
      "Never insert or edit MonoCode internal SQLite",
    );
    expect(flow.invoke).toHaveBeenCalledWith("app_cli_path");
  });

  it("preserves a handoff wrapper without resubmitting the prompt", async () => {
    const flow = setup({ handoff: true });
    await flow.run();
    expect(flow.sendTurn).toHaveBeenCalledOnce();
    expect(flow.sendTurn.mock.calls[0][0]).toBe(
      "Prior context\nCheck the task",
    );
  });

  it("retains a native branch in the single submission", async () => {
    const flow = setup({ branch: true });
    await flow.run();
    expect(flow.sendTurn).toHaveBeenCalledOnce();
    expect(flow.sendTurn.mock.calls[0][2]).toEqual({
      sourceProviderSessionId: "native-source",
      forkPoint: undefined,
    });
  });

  it("keeps Operator instructions and branch context after a proven pre-delivery rejection", async () => {
    const flow = setup({ branch: true, operator: true });
    flow.sendTurn.mockRejectedValueOnce(new NativeForkError("not delivered"));
    await flow.run();
    expect(flow.sendTurn).toHaveBeenCalledTimes(2);
    expect(flow.sendTurn.mock.calls[1][0]).toContain("Original task");
    expect(flow.sendTurn.mock.calls[1][0]).toContain("<monocode_app>");
    expect(flow.sendTurn.mock.calls[1][2]).toBeUndefined();
  });

  it("never retries a failure whose delivery status is unknown", async () => {
    const flow = setup({ branch: true });
    flow.sendTurn.mockRejectedValueOnce(new Error("connection lost"));
    await expect(flow.run()).rejects.toThrow("connection lost");
    expect(flow.sendTurn).toHaveBeenCalledOnce();
    expect(flow.acceptEditedResend).not.toHaveBeenCalled();
  });

  it("does not send a second prompt after Stop changes the generation", async () => {
    const flow = setup();
    flow.sendTurn.mockImplementationOnce(async () => {
      flow.turnGen.current.set("destination", 2);
    });
    await flow.run();
    expect(flow.sendTurn).toHaveBeenCalledOnce();
    expect(flow.acceptEditedResend).not.toHaveBeenCalled();
  });

  it("does not start a turn if Stop arrives while preparing Operator instructions", async () => {
    const flow = setup({ operator: true });
    let finish!: (path: string) => void;
    flow.invoke.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const done = flow.run();
    expect(flow.invoke).toHaveBeenCalledOnce();
    flow.turnGen.current.set("destination", 2);
    finish("/bin/monocode");
    await done;
    expect(flow.sendTurn).not.toHaveBeenCalled();
    expect(flow.acceptEditedResend).not.toHaveBeenCalled();
  });

  it("never submits a partial prompt when Operator preparation fails", async () => {
    const flow = setup({ operator: true });
    flow.invoke.mockRejectedValueOnce(new Error("CLI unavailable"));
    await expect(flow.run()).rejects.toThrow("CLI unavailable");
    expect(flow.sendTurn).not.toHaveBeenCalled();
    expect(flow.acceptEditedResend).not.toHaveBeenCalled();
  });
});
