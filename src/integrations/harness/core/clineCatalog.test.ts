import { expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  spawn: vi.fn(async () => {}),
  kill: vi.fn(async () => {}),
  line: (_line: string): void => {},
}));
vi.mock("../../../platform/tauri/fs", () => ({
  homeDir: async () => "C:/Users/test",
}));
vi.mock("./child", () => ({
  resolveClineBinary: async () => ({ path: "C:/ACP/cline.exe" }),
  spawnChild: boundary.spawn,
  killChild: boundary.kill,
  unwatchChild: vi.fn(),
  watchChild: (_id: string, line: (line: string) => void) => {
    boundary.line = line;
  },
  writeChild: async (_id: string, raw: string) => {
    const message = JSON.parse(raw);
    const result =
      message.method === "session/new"
        ? {
            sessionId: "probe",
            models: {
              availableModels: [{ modelId: "model", name: "Model" }],
              currentModelId: "model",
            },
          }
        : { protocolVersion: 1 };
    boundary.line(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
  },
}));
import { discoverClineModels } from "./clineCatalog";

it("discovers through the guarded Windows Cline runtime and cleans up the probe", async () => {
  const models = await discoverClineModels();
  expect(boundary.spawn).toHaveBeenCalledWith(
    "monocode-cline-probe",
    "C:/ACP/cline.exe",
    ["--acp"],
    "C:/Users/test",
    undefined,
    "cline",
  );
  expect(models).toEqual([
    expect.objectContaining({ id: "cline:model", name: "Model" }),
  ]);
  expect(boundary.kill).toHaveBeenCalledWith("monocode-cline-probe");
});
