import { homeDir } from "../fs";
import { setHarnessModels, type AgentModel } from "../models";
import { AcpClient } from "./acp";
import {
  killChild,
  resolveClineBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "./child";
import { modelsFromSessionNew } from "./clineProtocol";

const PROBE_ID = "monocode-cline-probe";
const DISCOVERY_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 12_000;

const CLINE_CLIENT_CAPABILITIES = {
  fs: { readTextFile: false, writeTextFile: false },
  terminal: false,
};

let inflight: Promise<void> | null = null;

export function refreshClineCatalog(): Promise<void> {
  if (inflight) return inflight;
  inflight = discoverClineModels()
    .then((models) => {
      if (models.length > 0) setHarnessModels("cline", models);
    })
    .catch((error: unknown) => {
      console.debug("[monocode] cline catalog", error);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function discoverClineModels(): Promise<AgentModel[]> {
  return discoverViaAcp().catch((error: unknown) => {
    console.debug("[monocode] cline ACP catalog failed", error);
    return [];
  });
}

async function discoverViaAcp(): Promise<AgentModel[]> {
  const { path } = await resolveClineBinary();
  const cwd = await homeDir();
  const acp = new AcpClient(PROBE_ID, {
    onRequest: (id) => {
      void acp.respond(id, {}).catch(() => undefined);
    },
  });

  const stop = async () => {
    acp.close();
    unwatchChild(PROBE_ID);
    await killChild(PROBE_ID).catch(() => undefined);
  };

  watchChild(
    PROBE_ID,
    (line) => acp.pushLine(line),
    () => acp.close(new Error("Cline probe exited")),
  );

  try {
    await spawnChild(PROBE_ID, path, ["--acp"], cwd);
    return await withTimeout(DISCOVERY_TIMEOUT_MS, async () => {
      await acp.request(
        "initialize",
        {
          protocolVersion: 1,
          clientCapabilities: CLINE_CLIENT_CAPABILITIES,
          clientInfo: { name: "monocode", version: "0.1.0" },
        },
        REQUEST_TIMEOUT_MS,
      );
      const created = await acp.request<unknown>(
        "session/new",
        { cwd, mcpServers: [] },
        REQUEST_TIMEOUT_MS,
      );
      return modelsFromSessionNew(created).models;
    }, () => {
      void stop();
    });
  } finally {
    await stop();
  }
}

async function withTimeout<T>(
  ms: number,
  work: () => Promise<T>,
  onTimeout: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = work();
  try {
    return await Promise.race([
      pending,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          onTimeout();
          reject(new Error("Cline model discovery timed out"));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    void pending.catch(() => undefined);
  }
}
