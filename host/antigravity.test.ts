import { expect, it } from "vitest";
import { mkdtemp, writeFile, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { antigravityHelper, antigravityLaunch } from "./antigravity";

it("validates the official Windows ACP executable and matching helper without launching it", async () => {
  const root = await mkdtemp(join(tmpdir(), "monocode-acp-archive-"));
  try {
    const binary = join(root, "agy_acp_server.exe");
    await writeFile(binary, "fixture");
    await expect(antigravityHelper(binary, "win32")).rejects.toThrow();
    const helper = join(root, "localharness_external.exe");
    await writeFile(helper, "fixture");
    await expect(antigravityHelper(binary, "win32")).resolves.toBe(helper);
    await expect(
      antigravityHelper(join(root, "agy.exe"), "win32"),
    ).rejects.toThrow("official");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it.runIf(process.platform !== "win32")(
  "uses an isolated personal Google profile and scrubs inherited auth settings",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "monocode-acp-host-"));
    try {
      const binary = join(root, "agy_acp_server.par");
      const helper = join(root, "localharness_external");
      await writeFile(binary, "fixture", { mode: 0o700 });
      await writeFile(helper, "fixture", { mode: 0o700 });
      const profile = join(root, "profile");
      await mkdir(profile);
      const launch = await antigravityLaunch(
        binary,
        [],
        {
          PATH: "/example",
          Google_Api_Key: "discard",
          GEMINI_HOME: "/other",
          ELECTRON_RUN_AS_NODE: "1",
        },
        profile,
      );
      expect(launch.env).not.toHaveProperty("Google_Api_Key");
      expect(launch.env).not.toHaveProperty("ELECTRON_RUN_AS_NODE");
      expect(launch.env).toMatchObject({
        GEMINI_HOME: profile,
        ANTIGRAVITY_HARNESS_PATH: helper,
        AGY_ACP_FORCE_FILE_STORAGE: "1",
        PATH: "/example",
      });
      expect(launch.env.BROWSER).toContain("antigravity-browser.mjs");
      expect(
        JSON.parse(
          await readFile(
            join(profile, "antigravity-acp", "settings.json"),
            "utf8",
          ),
        ),
      ).toEqual({ auth: { type: "oauth-personal" } });
      if (process.platform === "linux") expect(launch.args).toEqual(["--uid="]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
