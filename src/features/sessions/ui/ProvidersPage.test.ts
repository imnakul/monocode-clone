// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HARNESSES } from "../model/session";
import { probeHarnessAvailability } from "../../../integrations/harness/core/availability";
import { refreshHarnessCatalogs } from "../../../integrations/harness/core/registry";
import { ProvidersPage } from "../../settings/ui/SettingsView";

vi.mock("../../../integrations/harness/core/availability", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../integrations/harness/core/availability")>();
  return { ...actual, probeHarnessAvailability: vi.fn() };
});

vi.mock("../../../integrations/harness/core/registry", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../integrations/harness/core/registry")>();
  return { ...actual, refreshHarnessCatalogs: vi.fn() };
});

let container: HTMLDivElement;
let root: Root;

function recheckButtons(): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  ).filter((button) => button.textContent === "Recheck");
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("Providers initial discovery", () => {
  it("keeps every Recheck disabled until both availability and catalogs settle", async () => {
    let finishProbe: (() => void) | undefined;
    let finishCatalogs: (() => void) | undefined;
    vi.mocked(probeHarnessAvailability).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishProbe = resolve;
        }),
    );
    vi.mocked(refreshHarnessCatalogs).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishCatalogs = resolve;
        }),
    );

    act(() => root.render(createElement(ProvidersPage)));

    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Checking providers",
    );
    expect(recheckButtons()).toHaveLength(HARNESSES.length);
    expect(recheckButtons().every((button) => button.disabled)).toBe(true);
    recheckButtons()[0]?.click();
    expect(probeHarnessAvailability).toHaveBeenCalledTimes(1);
    expect(probeHarnessAvailability).toHaveBeenCalledWith({
      exclude: ["antigravity"],
    });
    expect(refreshHarnessCatalogs).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishProbe?.();
    });
    expect(recheckButtons().every((button) => button.disabled)).toBe(true);

    await act(async () => {
      finishCatalogs?.();
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Provider checks complete.",
    );
    expect(recheckButtons().every((button) => !button.disabled)).toBe(true);
  });

  it("releases Recheck when an initial discovery request fails", async () => {
    vi.mocked(probeHarnessAvailability).mockRejectedValue(
      new Error("Provider scan failed"),
    );
    vi.mocked(refreshHarnessCatalogs).mockResolvedValue();

    await act(async () => root.render(createElement(ProvidersPage)));

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Provider checks failed. Use Recheck to retry.",
    );
    expect(recheckButtons().every((button) => !button.disabled)).toBe(true);
  });
});
