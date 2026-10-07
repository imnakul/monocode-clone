// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveCheckProvidersOnStartup } from "../../settings/model/settings";
import { useStartupProviderCheck } from "./useStartupProviderCheck";

const runProviderCheck = vi.hoisted(() => vi.fn());
vi.mock("./providerCheck", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./providerCheck")>()),
  runProviderCheck,
}));

function Harness(): null {
  useStartupProviderCheck();
  return null;
}

let container: HTMLDivElement;
let root: Root;
let mounted: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  runProviderCheck.mockResolvedValue(undefined);
  container = document.createElement("div");
  root = createRoot(container);
  mounted = true;
});

afterEach(() => {
  if (mounted) act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("startup provider check", () => {
  it("does nothing before 2000 ms, then runs exactly once", () => {
    act(() => root.render(createElement(Harness)));
    act(() => vi.advanceTimersByTime(1999));
    expect(runProviderCheck).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(runProviderCheck).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(20_000));
    expect(runProviderCheck).toHaveBeenCalledTimes(1);
  });

  it("never runs when the setting is off", () => {
    saveCheckProvidersOnStartup(false);
    act(() => root.render(createElement(Harness)));
    act(() => vi.advanceTimersByTime(10_000));
    expect(runProviderCheck).not.toHaveBeenCalled();
  });

  it("cancels the pending check when the app unmounts first", () => {
    act(() => root.render(createElement(Harness)));
    act(() => root.unmount());
    mounted = false;
    act(() => vi.advanceTimersByTime(5000));
    expect(runProviderCheck).not.toHaveBeenCalled();
  });
});
