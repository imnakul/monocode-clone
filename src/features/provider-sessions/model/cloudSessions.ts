import { invoke } from "@tauri-apps/api/core";
import {
  acquireHarnessBridge,
  killChild,
  resolveClaudeBinary,
  resolveCodexBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "../../../integrations/harness/core/child";
import type { NativeProvider } from "./providerSessions";

export type CloudSession = {
  provider: NativeProvider;
  id: string;
  url: string;
  cwd: string;
  providerAccountId: string;
  environmentId: string | null;
  branch: string | null;
  createdAt: number;
};
export type CloudAction =
  "launch" | "message" | "list" | "status" | "diff" | "apply" | "teleport";
export type CloudCapability = { available: boolean; reason?: string };
export type CloudCapabilities = Record<CloudAction, CloudCapability>;
export type CliRequest = {
  provider: NativeProvider;
  args: string[];
  cwd: string;
  accountId: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};
export type CliRunner = (input: CliRequest) => Promise<string>;

/** Temporary supervised child; shares the existing native binary/profile resolution. */
export async function runProviderCloudCli(input: CliRequest): Promise<string> {
  if (input.signal?.aborted) throw new Error("Cloud request cancelled.");
  const release = await acquireHarnessBridge();
  const childId = `cloud-${crypto.randomUUID()}`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  let spawning: Promise<void> | undefined;
  try {
    const resolved =
      input.provider === "claude"
        ? await resolveClaudeBinary()
        : await resolveCodexBinary();
    return await new Promise<string>((resolve, reject) => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      let size = 0;
      let settled = false;
      const fail = (error: Error): void => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      const collect = (target: string[], line: string): void => {
        size += line.length;
        if (size > 1024 * 1024) {
          fail(new Error("Cloud command output exceeded its limit."));
          return;
        }
        target.push(line);
      };
      watchChild(
        childId,
        (line) => collect(stdout, line),
        (code) => {
          if (settled) return;
          settled = true;
          if (code !== 0)
            reject(
              new Error(
                stderr.join("\n").trim() ||
                  `Cloud command exited with code ${String(code)}.`,
              ),
            );
          else resolve(stdout.join("\n"));
        },
        (line) => collect(stderr, line),
      );
      abort = (): void => fail(new Error("Cloud request cancelled."));
      input.signal?.addEventListener("abort", abort, { once: true });
      if (input.signal?.aborted) {
        abort();
        return;
      }
      timer = setTimeout(
        () => fail(new Error("Cloud command timed out.")),
        input.timeoutMs ?? 60_000,
      );
      spawning = spawnChild(
        childId,
        resolved.path,
        input.args,
        input.cwd,
        { provider: input.provider, id: input.accountId },
        input.provider,
      );
      void spawning.catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error(String(error)));
      });
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (abort) input.signal?.removeEventListener("abort", abort);
    // A timed-out spawn may complete after cancellation; kill only after it settles.
    await spawning?.catch(() => undefined);
    await killChild(childId).catch(() => undefined);
    unwatchChild(childId);
    release();
  }
}

const unsupported = (reason: string): CloudCapability => ({
  available: false,
  reason,
});
const available: CloudCapability = { available: true };
export function cloudCapabilitiesFromHelp(
  provider: NativeProvider,
  topHelp: string,
  cloudHelp = "",
): CloudCapabilities {
  const missing = unsupported(
    "This installed CLI does not expose this cloud action.",
  );
  if (provider === "claude") {
    const cloud = /(?:^|\s)--cloud(?:[\s=\[]|$)/m.test(topHelp);
    return {
      launch: cloud ? available : missing,
      message:
        cloud && /(?:^|\s)(?:-p|--print)(?:[\s,]|$)/m.test(topHelp)
          ? available
          : missing,
      list: unsupported(
        "Claude CLI does not expose a cloud-session listing command.",
      ),
      status: unsupported(
        "Live Claude cloud status/response fetching is not exposed by this integration.",
      ),
      diff: missing,
      apply: missing,
      teleport: unsupported(
        "Claude teleport is reserved for phase 2; it needs an interactive terminal continuation.",
      ),
    };
  }
  const has = (command: string): CloudCapability =>
    new RegExp(`^\\s*${command}\\s+`, "m").test(cloudHelp)
      ? available
      : missing;
  return {
    launch: has("exec"),
    list: has("list"),
    status: has("status"),
    diff: has("diff"),
    apply: has("apply"),
    message: unsupported(
      "Codex cloud CLI does not support sending a follow-up message. Continue in the provider app.",
    ),
    teleport: unsupported(
      "Codex has no Claude-style cloud conversation teleport; its apply action brings back code changes.",
    ),
  };
}

export async function probeCloudCapabilities(
  provider: NativeProvider,
  cwd: string,
  accountId = "default",
  runner: CliRunner = runProviderCloudCli,
): Promise<CloudCapabilities> {
  const top = await runner({
    provider,
    args: ["--help"],
    cwd,
    accountId,
    timeoutMs: 15_000,
  });
  const cloud =
    provider === "codex" && /^\s*cloud\s+/m.test(top)
      ? await runner({
          provider,
          args: ["cloud", "--help"],
          cwd,
          accountId,
          timeoutMs: 15_000,
        })
      : "";
  return cloudCapabilitiesFromHelp(provider, top, cloud);
}

function requireId(id: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(id))
    throw new Error("Invalid cloud session ID.");
}
function providerUrl(provider: NativeProvider, raw: string): string {
  const value = new URL(raw);
  if (
    value.protocol !== "https:" ||
    value.hostname !== (provider === "claude" ? "claude.ai" : "chatgpt.com") ||
    value.username ||
    value.password ||
    value.port
  )
    throw new Error("Cloud URL does not belong to the provider.");
  return value.href;
}

/** Accept only a complete provider-owned record before cross-window display. */
export function isCloudSessionRecord(value: unknown): value is CloudSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CloudSession>;
  if (
    (record.provider !== "claude" && record.provider !== "codex") ||
    typeof record.id !== "string" ||
    typeof record.url !== "string" ||
    typeof record.cwd !== "string" ||
    record.cwd.trim() === "" ||
    typeof record.providerAccountId !== "string" ||
    record.providerAccountId.trim() === "" ||
    (record.environmentId !== null && typeof record.environmentId !== "string") ||
    (record.branch !== null && typeof record.branch !== "string") ||
    typeof record.createdAt !== "number" ||
    !Number.isFinite(record.createdAt)
  )
    return false;
  try {
    requireId(record.id);
    providerUrl(record.provider, record.url);
    return true;
  } catch {
    return false;
  }
}

/** Accept a structured CLI result, or the official launch URL printed by its CLI. */
export function parseCloudLaunch(
  provider: NativeProvider,
  output: string,
): { id: string; url: string } {
  for (const line of output.split("\n")) {
    try {
      const value: unknown = JSON.parse(line);
      if (!value || typeof value !== "object") continue;
      const object = value as Record<string, unknown>;
      if (object.ok === false || object.error)
        throw new Error("Cloud launch returned an error.");
      const id = object.session_id ?? object.task_id ?? object.id;
      const url = object.url ?? object.session_url;
      if (typeof id === "string" && typeof url === "string") {
        requireId(id);
        return { id, url: providerUrl(provider, url) };
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  for (const raw of output.match(/https:\/\/[^\s<>"']+/g) ?? []) {
    let url: string;
    try {
      url = providerUrl(provider, raw.replace(/[),.;]+$/, ""));
    } catch {
      continue;
    }
    const path = new URL(url).pathname;
    const match =
      provider === "claude"
        ? path.match(/^\/code\/([^/]+)\/?$/)
        : path.match(/^\/codex\/tasks\/([^/]+)\/?$/);
    if (match) {
      requireId(match[1]);
      return { id: match[1], url };
    }
  }
  throw new Error(
    "Cloud launch returned no usable session ID and provider URL.",
  );
}

export type CloudLaunchInput = {
  provider: NativeProvider;
  prompt: string;
  cwd: string;
  accountId?: string;
  environmentId?: string;
  branch?: string;
  signal?: AbortSignal;
};
export function buildCloudLaunchArgs(input: CloudLaunchInput): string[] {
  if (!input.prompt.trim()) throw new Error("A cloud task needs a prompt.");
  if (input.provider === "claude") {
    if (input.environmentId || input.branch)
      throw new Error(
        "Claude CLI uses its configured cloud environment; explicit environment/branch selection is not supported here.",
      );
    return [`--cloud=${input.prompt}`];
  }
  if (!input.environmentId?.trim() || input.environmentId.startsWith("-"))
    throw new Error("Choose a configured Codex cloud environment.");
  if (input.branch?.startsWith("-")) throw new Error("Invalid cloud branch.");
  return [
    "cloud",
    "exec",
    "--env",
    input.environmentId,
    ...(input.branch ? ["--branch", input.branch] : []),
    "--",
    input.prompt,
  ];
}

export async function launchProviderCloudSession(
  input: CloudLaunchInput,
  runner: CliRunner = runProviderCloudCli,
): Promise<CloudSession> {
  const args = buildCloudLaunchArgs(input);
  const capabilities = await probeCloudCapabilities(
    input.provider,
    input.cwd,
    input.accountId,
    runner,
  );
  if (!capabilities.launch.available)
    throw new Error(capabilities.launch.reason);
  const output = await runner({
    provider: input.provider,
    args,
    cwd: input.cwd,
    accountId: input.accountId ?? "default",
    signal: input.signal,
  });
  const result = parseCloudLaunch(input.provider, output);
  const session: CloudSession = {
    ...result,
    provider: input.provider,
    cwd: input.cwd,
    providerAccountId: input.accountId ?? "default",
    environmentId: input.environmentId ?? null,
    branch: input.branch ?? null,
    createdAt: 0,
  };
  try {
    return await invoke("provider_cloud_save", { session });
  } catch (error) {
    // The cloud job already exists. Preserve the exact ID for recovery; never retry launch automatically.
    throw new CloudRetentionError(session, error);
  }
}

export class CloudRetentionError extends Error {
  constructor(
    readonly session: CloudSession,
    cause: unknown,
  ) {
    super(
      `Cloud session ${session.id} started, but MonoCode could not save it: ${String(cause)}`,
    );
    this.name = "CloudRetentionError";
  }
}

export function listRetainedCloudSessions(
  provider: NativeProvider,
  accountId = "default",
): Promise<CloudSession[]> {
  return invoke("provider_cloud_list", { provider, accountId });
}

export async function runCloudSessionAction(
  session: CloudSession,
  action: Exclude<CloudAction, "launch" | "list">,
  options: {
    message?: string;
    signal?: AbortSignal;
    confirmApply?: boolean;
  } = {},
  runner: CliRunner = runProviderCloudCli,
): Promise<string> {
  requireId(session.id);
  providerUrl(session.provider, session.url);
  const capabilities = await probeCloudCapabilities(
    session.provider,
    session.cwd,
    session.providerAccountId,
    runner,
  );
  if (!capabilities[action].available)
    throw new Error(capabilities[action].reason);
  if (action === "apply" && !options.confirmApply)
    throw new Error(
      "Applying cloud changes requires an explicit Apply action.",
    );
  if (action === "apply") {
    const tree = await invoke<{ head: string | null; files: unknown[] }>(
      "git_diff_index",
      { cwd: session.cwd },
    );
    if (!tree?.head || !Array.isArray(tree.files))
      throw new Error("Could not confirm that the local checkout is clean.");
    if (tree.files.length)
      throw new Error(
        "The local checkout has changes. Commit or move them before applying cloud changes.",
      );
  }
  if (action === "message" && !options.message?.trim())
    throw new Error("A follow-up message cannot be empty.");
  const args =
    session.provider === "claude"
      ? ["-p", "--cloud", session.id, "--", options.message ?? ""]
      : ["cloud", action, session.id];
  return runner({
    provider: session.provider,
    args,
    cwd: session.cwd,
    accountId: session.providerAccountId,
    signal: options.signal,
  });
}

export async function fetchCodexCloudTasks(
  cwd: string,
  accountId = "default",
  runner: CliRunner = runProviderCloudCli,
): Promise<unknown> {
  const capabilities = await probeCloudCapabilities(
    "codex",
    cwd,
    accountId,
    runner,
  );
  if (!capabilities.list.available) throw new Error(capabilities.list.reason);
  const output = await runner({
    provider: "codex",
    args: ["cloud", "list", "--json"],
    cwd,
    accountId,
  });
  return JSON.parse(output) as unknown;
}
