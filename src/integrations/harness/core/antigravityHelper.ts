import { invoke } from "@tauri-apps/api/core";
import type { HelperPromptInput } from "./registry";
import {
  antigravityConfigs,
} from "./antigravityAcpProtocol";
import {
  acquireAntigravityRuntime,
  type AntigravitySharedRuntime,
  type AntigravitySessionHandlers,
} from "./antigravityRuntimeHost";
import type { JsonRpcId } from "./jsonRpc";
import {
  HelperToolAttemptError,
  HelperUnavailableError,
} from "./helperIsolation";

const CONTROL_TIMEOUT_MS = 30_000;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): RecordValue | null {
  return isRecord(value) ? value : null;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(textFromContent).join("");
  const record = asRecord(content);
  if (typeof record?.text === "string") return record.text;
  if (record?.content !== undefined) return textFromContent(record.content);
  return "";
}

function permissionRejectOption(params: unknown): string | null {
  const options = asRecord(params)?.options;
  if (!Array.isArray(options)) return null;
  for (const item of options) {
    const option = asRecord(item);
    const kind = option?.kind;
    const id = option?.optionId ?? option?.option_id;
    if (kind === "reject_once" && typeof id === "string" && id.trim()) {
      return id;
    }
  }
  return null;
}

function isSessionUpdateFor(params: unknown, sessionId: string): boolean {
  return asRecord(params)?.sessionId === sessionId;
}

/**
 * Runs a helper session on the shared ACP process. The helper session is
 * detached on every exit and is never bound to a user chat or usage meter.
 */
export async function runAntigravityHelperPrompt(
  input: HelperPromptInput,
): Promise<string> {
  let runtime: AntigravitySharedRuntime;
  try {
    runtime = await acquireAntigravityRuntime();
  } catch {
    throw new HelperUnavailableError("Antigravity helper runtime is unavailable.");
  }

  let helperCwd: string;
  try {
    helperCwd = await invoke<string>("antigravity_helper_directory");
  } catch {
    throw new HelperUnavailableError("Antigravity helper folder is unavailable.");
  }

  let nativeId = "";
  let output = "";
  let rejectFailure!: (error: Error) => void;
  let failureStarted = false;
  let failureError: Error | null = null;
  let failureRequest: Promise<void> | null = null;
  const failure = new Promise<never>((_resolve, reject) => {
    rejectFailure = reject;
  });
  void failure.catch(() => undefined);

  const cancelAndFail = (error: Error): Promise<void> => {
    if (failureStarted) return failureRequest ?? Promise.resolve();
    failureStarted = true;
    failureError = error;
    failureRequest = runtime.rpc
      .notify("session/cancel", { sessionId: nativeId })
      .catch(() => undefined)
      .then(() => rejectFailure(error));
    return failureRequest;
  };

  const throwIfFailed = async (): Promise<void> => {
    if (!failureStarted || !failureError) return;
    await failureRequest;
    throw failureError;
  };

  const handleUpdate = (params: unknown): void => {
    if (!isSessionUpdateFor(params, nativeId)) return;
    const update = asRecord(asRecord(params)?.update);
    if (!update) return;
    const kind = update?.sessionUpdate ?? update?.session_update;
    if (kind === "agent_message_chunk" || kind === "agent_message") {
      output += textFromContent(update.content ?? update.text);
      if (kind === "agent_message") output += "\n";
      return;
    }
    if (kind === "tool_call" || kind === "tool_call_update") {
      void cancelAndFail(new HelperToolAttemptError("antigravity", String(kind)));
      return;
    }
    if (kind === "config_option_update") {
      const options = update.configOptions ?? update.config_options;
      const mode = antigravityConfigs({ configOptions: options }).find(
        (config) => config.id === "mode",
      );
      if (mode && mode.currentValue !== "default") {
        void cancelAndFail(
          new HelperToolAttemptError("antigravity", "mode change"),
        );
      }
    }
  };

  const handlers: AntigravitySessionHandlers = {
    onNotification(method, params) {
      if (method === "session/update") handleUpdate(params);
    },
    onRequest(id: JsonRpcId, method: string, params: unknown) {
      if (method !== "session/request_permission") {
        void runtime.rpc
          .respondError(id, { code: -32601, message: `Method not found: ${method}` })
          .catch(() => undefined);
        return;
      }
      const optionId = permissionRejectOption(params);
      void runtime.rpc
        .respond(
          id,
          optionId
            ? { outcome: { outcome: "selected", optionId } }
            : { outcome: { outcome: "cancelled" } },
        )
        .catch(() => undefined)
        .then(() =>
          cancelAndFail(
            new HelperToolAttemptError("antigravity", "permission request"),
          ),
        );
    },
    onExit() {
      void cancelAndFail(
        new HelperUnavailableError("Antigravity helper runtime exited."),
      );
    },
  };

  const created = asRecord(
    await runtime.rpc.request(
      "session/new",
      { cwd: helperCwd, mcpServers: [] },
      CONTROL_TIMEOUT_MS,
    ),
  );
  nativeId = typeof created?.sessionId === "string" ? created.sessionId : "";
  if (!nativeId.trim()) {
    throw new HelperUnavailableError("Antigravity did not create a helper session.");
  }

  try {
    runtime.attach(nativeId, handlers);
    for (const params of runtime.takeBuffered(nativeId)) handleUpdate(params);

    const modeResult = await runtime.rpc.request(
      "session/set_config_option",
      { sessionId: nativeId, configId: "mode", value: "default" },
      CONTROL_TIMEOUT_MS,
    );
    const mode = antigravityConfigs(modeResult).find(
      (config) => config.id === "mode",
    );
    if (mode?.currentValue !== "default") {
      throw new HelperUnavailableError("Antigravity couldn't start in Ask mode.");
    }
    await throwIfFailed();

    if (input.model) {
      const initialModel = antigravityConfigs(created).find(
        (config) => config.id === "model",
      );
      if (
        initialModel &&
        initialModel.options.length > 0 &&
        !initialModel.options.some((option) => option.value === input.model)
      ) {
        throw new HelperUnavailableError(
          `Antigravity model '${input.model}' is unavailable for this account. Choose another model in Settings > Providers.`,
        );
      }
      const modelResult = await runtime.rpc.request(
        "session/set_config_option",
        { sessionId: nativeId, configId: "model", value: input.model },
        CONTROL_TIMEOUT_MS,
      );
      const model = antigravityConfigs(modelResult).find(
        (config) => config.id === "model",
      );
      if (model && model.currentValue !== input.model) {
        throw new HelperUnavailableError(
          `Antigravity model '${input.model}' is unavailable for this account. Choose another model in Settings > Providers.`,
        );
      }
      await throwIfFailed();
    }

    const promptRequest = runtime.rpc
      .request(
        "session/prompt",
        { sessionId: nativeId, prompt: [{ type: "text", text: input.prompt }] },
        input.timeoutMs,
      )
      .catch(async (error: unknown) => {
        if (/timed out|timeout/i.test(error instanceof Error ? error.message : String(error))) {
          await cancelAndFail(new Error("Antigravity text generation timed out"));
        }
        throw error;
      });
    await Promise.race([promptRequest, failure]);
    const text = output.trim();
    if (!text) throw new Error("Antigravity returned empty output.");
    return text;
  } finally {
    runtime.detach(nativeId);
  }
}
