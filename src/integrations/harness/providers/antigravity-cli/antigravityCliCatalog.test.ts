import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  probe: vi.fn(),
  exec: vi.fn(),
  models: vi.fn(),
}));
vi.mock("../../core/child", () => ({
  probeHarnessBinary: mocks.probe,
  execChild: mocks.exec,
}));
vi.mock("../../../../platform/tauri/fs", () => ({
  homeDir: async (): Promise<string> => "/home/user",
}));
vi.mock("../../../../features/sessions/model/models", () => ({
  setHarnessModels: mocks.models,
}));
import {
  refreshAntigravityCliCatalog,
  getCliCatalogSnapshot,
} from "./antigravityCliCatalog";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.probe.mockResolvedValue({ path: "/bin/agy" });
  mocks.exec.mockResolvedValue("claude-opus-4.6  Claude Opus 4.6\n");
});

it("discovers CLI models with the validated executable without replacing ACP's catalog", async () => {
  await refreshAntigravityCliCatalog();
  expect(mocks.probe).toHaveBeenCalledWith("antigravity-cli");
  expect(mocks.exec).toHaveBeenCalledWith(
    "/bin/agy",
    ["models"],
    "/home/user",
    "antigravity-cli",
  );
  expect(mocks.models).toHaveBeenCalledOnce();
  expect(getCliCatalogSnapshot()).toEqual({ phase: "ready" });
  expect(mocks.models).toHaveBeenCalledWith("antigravity-cli", [
    expect.objectContaining({
      id: "antigravity-cli:claude-opus-4.6",
      harness: "antigravity-cli",
      nativeId: "claude-opus-4.6",
    }),
  ]);
});

it("rejects unsupported executables before invoking model discovery", async () => {
  mocks.probe.mockRejectedValue(new Error("missing stream-json protocol"));
  await expect(refreshAntigravityCliCatalog()).rejects.toThrow("stream-json");
  expect(mocks.exec).not.toHaveBeenCalled();
  expect(mocks.models).not.toHaveBeenCalled();
});

it("keeps the current catalog when discovery returns an authentication error or no models", async () => {
  mocks.exec.mockResolvedValue("Please sign in to Antigravity CLI");
  await expect(refreshAntigravityCliCatalog()).rejects.toThrow(
    "no recognizable model list",
  );
  mocks.exec.mockRejectedValue(new Error("authentication required"));
  await expect(refreshAntigravityCliCatalog()).rejects.toThrow(
    "authentication required",
  );
  expect(getCliCatalogSnapshot()).toEqual({
    phase: "error",
    error: "authentication required",
  });
  expect(mocks.models).not.toHaveBeenCalled();
});
