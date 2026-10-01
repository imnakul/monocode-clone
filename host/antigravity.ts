import {
  access,
  chmod,
  mkdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { acquireAntigravityRuntime } from "../src/integrations/harness/core/antigravityRuntimeHost";
import {
  antigravityConfigs,
  antigravityModels,
} from "../src/integrations/harness/core/antigravityAcpProtocol";

/** The desktop and headless host use the same official ACP archive and profile. */
export async function antigravityHelper(
  command: string,
  platform = process.platform,
): Promise<string> {
  const windows = platform === "win32";
  const name = windows ? "agy_acp_server.exe" : "agy_acp_server.par";
  if (basename(command).toLowerCase() !== name)
    throw new Error(`Select the official ${name} ACP runtime.`);
  await access(command, windows ? constants.F_OK : constants.X_OK);
  if (!(await stat(command)).isFile())
    throw new Error("Antigravity runtime is not a file.");
  const helper = join(
    dirname(await realpath(command)),
    windows ? "localharness_external.exe" : "localharness_external",
  );
  await access(helper, windows ? constants.F_OK : constants.X_OK);
  if (!(await stat(helper)).isFile())
    throw new Error(
      "Antigravity ACP helper is missing. Extract both files from the same official release.",
    );
  return helper;
}

const REMOVED_ENV = new Set([
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_CLOUD_QUOTA_PROJECT",
  "GOOGLE_GENAI_USE_VERTEXAI",
  "GCLOUD_PROJECT",
  "CLOUDSDK_CORE_PROJECT",
  "AGY_ACP_CCPA_PROJECT",
  "AGY_ACP_ENABLE_OAUTH",
  "GEMINI_HOME",
  "AGY_ACP_FORCE_FILE_STORAGE",
  "ANTIGRAVITY_HARNESS_PATH",
  "BROWSER",
  "PYTHONUNBUFFERED",
  "ELECTRON_RUN_AS_NODE",
]);

export async function antigravityLaunch(
  command: string,
  args: string[],
  env = process.env,
  profile = join(homedir(), ".monocode", "providers", "antigravity"),
) {
  const helper = await antigravityHelper(command);
  const acp = join(profile, "antigravity-acp");
  const temp = join(profile, "tmp");
  for (const directory of [profile, acp, temp]) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (process.platform !== "win32") await chmod(directory, 0o700);
  }
  await writeFile(
    join(acp, "settings.json"),
    '{"auth":{"type":"oauth-personal"}}\n',
    { mode: 0o600 },
  );
  const nextEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => !REMOVED_ENV.has(key.toUpperCase())),
  );
  const browser = fileURLToPath(
    new URL("./antigravity-browser.mjs", import.meta.url),
  );
  const quote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;
  for (const path of [process.execPath, browser]) {
    if (
      path.includes(delimiter) ||
      /[\r\n\0]/.test(path) ||
      path.includes("%s")
    )
      throw new Error(
        "Host path cannot safely suppress Antigravity browser launches.",
      );
  }
  return {
    args:
      process.platform === "linux" && !args.includes("--uid=")
        ? [...args, "--uid="]
        : args,
    env: {
      ...nextEnv,
      GEMINI_HOME: profile,
      AGY_ACP_FORCE_FILE_STORAGE: "1",
      ANTIGRAVITY_HARNESS_PATH: helper,
      PYTHONUNBUFFERED: "1",
      TMP: temp,
      TEMP: temp,
      BROWSER: [process.execPath, browser, "%s"].map(quote).join(" "),
    },
  };
}

export async function discoverAntigravityModels() {
  const runtime = await acquireAntigravityRuntime();
  const result = await runtime.rpc.request(
    "session/new",
    { cwd: homedir(), mcpServers: [] },
    45_000,
  );
  const models = antigravityModels(antigravityConfigs(result));
  if (!models.length)
    throw new Error(
      "The Antigravity runtime returned no models. Sign in with Google on this host and retry.",
    );
  return models;
}
