// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { probeHarnessAvailability } from "../../../integrations/harness/core/availability";
import { refreshHarnessCatalogs } from "../../../integrations/harness/core/registry";
import { resetProviderCheck, runProviderCheck } from "../model/providerCheck";
import {
  OPEN_PROVIDER_SETTINGS_EVENT,
  ProviderCheckIndicator,
} from "./ProviderCheckIndicator";

vi.mock("../../../integrations/harness/core/availability", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../integrations/harness/core/availability")
  >()),
  probeHarnessAvailability: vi.fn(),
}));
vi.mock("../../../integrations/harness/core/registry", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../integrations/harness/core/registry")
  >()),
  refreshHarnessCatalogs: vi.fn(),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  resetProviderCheck();
  vi.mocked(refreshHarnessCatalogs).mockResolvedValue();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(ProviderCheckIndicator)));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("ProviderCheckIndicator", () => {
  it("shows nothing before any check", () => {
    expect(container.textContent).toBe("");
  });

  it("says Checking providers… while running, then Providers ready for 2 s", async () => {
    let finish: (() => void) | undefined;
    vi.mocked(probeHarnessAvailability).mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    let run: Promise<void> | undefined;
    act(() => {
      run = runProviderCheck();
    });
    expect(container.textContent).toContain("Checking providers…");

    await act(async () => {
      finish?.();
      await run;
    });
    expect(container.textContent).toContain("Providers ready");

    act(() => vi.advanceTimersByTime(2000));
    expect(container.textContent).toContain("Providers ready");
    act(() => vi.advanceTimersByTime(300));
    expect(container.textContent).toBe("");
  });

  it("shows an amber dot that opens Providers settings when a check failed", async () => {
    vi.mocked(probeHarnessAvailability).mockRejectedValue(new Error("scan failed"));
    await act(async () => runProviderCheck());
    const dot = container.querySelector<HTMLButtonElement>("button");
    expect(dot?.getAttribute("aria-label")).toContain("could not be checked");
    const onOpen = vi.fn();
    window.addEventListener(OPEN_PROVIDER_SETTINGS_EVENT, onOpen);
    act(() => dot?.click());
    window.removeEventListener(OPEN_PROVIDER_SETTINGS_EVENT, onOpen);
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(container.querySelector("button")).not.toBeNull();
  });
});
