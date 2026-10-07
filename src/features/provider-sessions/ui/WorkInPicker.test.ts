// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkInPicker } from "./WorkInPicker";
import type { RemoteControlControls } from "./RemoteControlButton";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function remote(desired = false): RemoteControlControls {
  return { desired, onChange: vi.fn() };
}

function render(props: Parameters<typeof WorkInPicker>[0]): void {
  act(() => root.render(createElement(WorkInPicker, props)));
}

function option(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(
    "[data-work-in-picker] button",
  )].find((button) => button.textContent?.startsWith(label));
  if (!found) throw new Error(`No option ${label}`);
  return found;
}

describe("WorkInPicker", () => {
  it("defaults to This computer and lists only the choices this chat supports", () => {
    const cloud = { active: false, setActive: vi.fn() };
    render({ started: false, enabled: true, cloud, remote: remote() });
    const trigger = container.querySelector<HTMLButtonElement>("[data-work-in]")!;
    expect(trigger.textContent).toContain("This computer");
    act(() => trigger.click());
    const labels = [...document.querySelectorAll("[data-work-in-picker] button")].map(
      (button) => button.textContent,
    );
    expect(labels.map((label) => label?.split(/Runs/)[0])).toEqual([
      "This computer",
      "Cloud",
      "Remote",
    ]);
    for (const button of document.querySelectorAll("[data-work-in-picker] button"))
      expect(button.hasAttribute("data-shared-hover-item")).toBe(true);
  });

  it("turns Cloud or Remote on, switching the other off", () => {
    const cloud = { active: false, setActive: vi.fn() };
    const controls = remote(true);
    render({ started: false, enabled: true, cloud, remote: controls });
    act(() => container.querySelector<HTMLButtonElement>("[data-work-in]")!.click());
    act(() => option("Cloud").click());
    expect(controls.onChange).toHaveBeenCalledWith(false);
    expect(cloud.setActive).toHaveBeenCalledWith(true);

    const fresh = remote(false);
    render({ started: false, enabled: true, cloud: { active: true, setActive: cloud.setActive }, remote: fresh });
    act(() => container.querySelector<HTMLButtonElement>("[data-work-in]")!.click());
    act(() => option("Remote").click());
    expect(cloud.setActive).toHaveBeenLastCalledWith(false);
    expect(fresh.onChange).toHaveBeenCalledWith(true);
  });

  it("hides itself when This computer is the only choice", () => {
    render({ started: false, enabled: true });
    expect(container.innerHTML).toBe("");
  });

  it("lets a started local chat turn Remote Control on from This computer", () => {
    const controls = remote(false);
    render({ started: true, enabled: true, remote: controls });
    const chip = container.querySelector<HTMLButtonElement>(
      "[data-remote-control-button]",
    )!;
    expect(chip.textContent).toBe("This computer");
    expect(chip.getAttribute("aria-haspopup")).toBe("menu");
    act(() => chip.click());
    const turnOn = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")]
      .find((item) => item.textContent?.includes("Turn on Remote Control"));
    expect(turnOn).toBeDefined();
    act(() => turnOn!.click());
    expect(controls.onChange).toHaveBeenCalledWith(true);
  });

  it("shows a started Remote chat as Remote with a turn-off menu", () => {
    const controls = remote(true);
    render({ started: true, enabled: true, remote: controls });
    const chip = container.querySelector<HTMLButtonElement>(
      "[data-remote-control-button]",
    )!;
    expect(chip.textContent).toBe("Remote");
    act(() => chip.click());
    const turnOff = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")]
      .find((item) => item.textContent?.includes("Turn off Remote Control"));
    expect(turnOff).toBeDefined();
    act(() => turnOff!.click());
    expect(controls.onChange).toHaveBeenCalledWith(false);
  });

  it("shows nothing for a started chat without Remote Control (Codex, remote host)", () => {
    render({ started: true, enabled: true });
    expect(container.innerHTML).toBe("");
  });
});
