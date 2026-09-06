import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  connections: [] as Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    rpc: { request: ReturnType<typeof vi.fn> };
  }>,
  setModels: vi.fn(),
  /** Scripted results for the next discovery run. */
  startError: undefined as Error | undefined,
  setupResult: undefined as unknown,
  /** When set, session/new responses are captured for manual release. */
  capturedReleases: null as Array<(value: unknown) => void> | null,
}));
vi.mock("../fs", () => ({ homeDir: async (): Promise<string> => "/home/test" }));
vi.mock("../models", () => ({ setHarnessModels: boundary.setModels }));
vi.mock("./antigravityAcpTransport", () => ({
  createAntigravityConnection: (sessionId: string, _cwd: string): unknown => {
    expect(sessionId).toBe("monocode-antigravity-catalog");
    const connection = {
      start: vi.fn((): Promise<Record<string, unknown>> =>
        boundary.startError ? Promise.reject(boundary.startError) : Promise.resolve({ protocolVersion: 1 }),
      ),
      stop: vi.fn(async (): Promise<void> => {}),
      rpc: {
        request: vi.fn((): Promise<unknown> =>
          boundary.capturedReleases
            ? new Promise((resolve) => {
                boundary.capturedReleases?.push(resolve);
              })
            : Promise.resolve(boundary.setupResult),
        ),
      },
    };
    boundary.connections.push(connection);
    return connection;
  },
}));

const catalog = await import("./antigravityCatalog");

const modelSetup = {
  sessionId: "S1",
  configOptions: [
    {
      id: "model",
      type: "select",
      currentValue: "gemini-3-pro",
      options: [{ value: "gemini-3-pro", name: "Gemini 3 Pro" }],
    },
  ],
};

beforeEach((): void => {
  boundary.connections.length = 0;
  boundary.setModels.mockClear();
  boundary.startError = undefined;
  boundary.setupResult = undefined;
  boundary.capturedReleases = null;
});

afterEach(async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

describe("Antigravity ACP catalog discovery", (): void => {
  it("loads models from session config options and reports ready", async (): Promise<void> => {
    boundary.setupResult = modelSetup;
    await catalog.refreshAntigravityCatalog(true);
    const connection = boundary.connections[0];
    expect(connection.start).toHaveBeenCalledOnce();
    expect(connection.rpc.request).toHaveBeenCalledWith(
      "session/new",
      { cwd: "/home/test", mcpServers: [] },
      45_000,
    );
    expect(boundary.setModels).toHaveBeenCalledWith(
      "antigravity",
      expect.arrayContaining([expect.objectContaining({ nativeId: "gemini-3-pro" })]),
    );
    expect(catalog.getAntigravityCatalogSnapshot().phase).toBe("ready");
    expect(connection.stop).toHaveBeenCalledOnce();
  });

  it("reports sign-in-required errors instead of pretending models failed", async (): Promise<void> => {
    boundary.startError = new Error("Antigravity requires Google sign-in. Sign in with Google, then retry.");
    await catalog.refreshAntigravityCatalog(true);
    const snapshot = catalog.getAntigravityCatalogSnapshot();
    expect(snapshot.phase).toBe("error");
    expect(snapshot.signInRequired).toBe(true);
    expect(boundary.setModels).not.toHaveBeenCalled();
    expect(boundary.connections[0].stop).toHaveBeenCalledOnce();
  });

  it("never keeps a stale model list when discovery fails", async (): Promise<void> => {
    boundary.startError = new Error("Antigravity exited before startup finished.");
    await catalog.refreshAntigravityCatalog(true);
    const snapshot = catalog.getAntigravityCatalogSnapshot();
    expect(snapshot.phase).toBe("error");
    expect(snapshot.signInRequired).toBe(false);
    expect(boundary.setModels).not.toHaveBeenCalled();
  });

  it("surfaces an empty catalog as an error, not success", async (): Promise<void> => {
    boundary.setupResult = { sessionId: "S1", configOptions: [] };
    await catalog.refreshAntigravityCatalog(true);
    const snapshot = catalog.getAntigravityCatalogSnapshot();
    expect(snapshot.phase).toBe("error");
    expect(snapshot.error).toMatch(/no models/i);
    expect(boundary.setModels).not.toHaveBeenCalled();
  });

  it("dedupes concurrent discovery into one runtime connection", async (): Promise<void> => {
    boundary.capturedReleases = [];
    const first = catalog.refreshAntigravityCatalog(true);
    const second = catalog.refreshAntigravityCatalog(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(boundary.connections).toHaveLength(1);
    boundary.setupResult = modelSetup;
    for (const release of boundary.capturedReleases) release(boundary.setupResult);
    await Promise.all([first, second]);
    expect(boundary.connections).toHaveLength(1);
    expect(catalog.getAntigravityCatalogSnapshot().phase).toBe("ready");
  });
});
