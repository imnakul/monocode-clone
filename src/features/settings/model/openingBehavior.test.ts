import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FILE_OPENING_BEHAVIOR_DEFAULT,
  SESSION_OPENING_BEHAVIOR_DEFAULT,
  loadFileOpeningBehavior,
  loadSessionOpeningBehavior,
  resolveOpeningBehavior,
  saveFileOpeningBehavior,
  saveSessionOpeningBehavior,
} from "./openingBehavior";

let values: Map<string, string>;

function installStorage() {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
}

beforeEach(installStorage);
afterEach(() => vi.unstubAllGlobals());

describe("opening behavior preferences", () => {
  it("uses independent defaults and safely ignores malformed stored values", () => {
    expect(loadFileOpeningBehavior()).toBe(FILE_OPENING_BEHAVIOR_DEFAULT);
    expect(loadSessionOpeningBehavior()).toBe(SESSION_OPENING_BEHAVIOR_DEFAULT);

    values.set("monocode.fileOpeningBehavior", "sometimes");
    values.set("monocode.sessionOpeningBehavior", "current-tab");
    expect(loadFileOpeningBehavior()).toBe("both");
    expect(loadSessionOpeningBehavior()).toBe("new");
  });

  it("saves file and session choices independently", () => {
    saveFileOpeningBehavior("current");
    saveSessionOpeningBehavior("both");
    expect(loadFileOpeningBehavior()).toBe("current");
    expect(loadSessionOpeningBehavior()).toBe("both");
  });

  it("does not throw when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    });
    expect(loadFileOpeningBehavior()).toBe("both");
    expect(loadSessionOpeningBehavior()).toBe("new");
    expect(() => saveFileOpeningBehavior("current")).not.toThrow();
    expect(() => saveSessionOpeningBehavior("both")).not.toThrow();
  });

  it("maps normal clicks and Both Alt-click to the requested tab behavior", () => {
    expect(resolveOpeningBehavior("new")).toEqual({
      pin: true,
      reuseCurrent: false,
    });
    expect(resolveOpeningBehavior("current")).toEqual({
      pin: false,
      reuseCurrent: true,
    });
    expect(resolveOpeningBehavior("both")).toEqual({
      pin: false,
      reuseCurrent: true,
    });
    expect(resolveOpeningBehavior("both", { altKey: true })).toEqual({
      pin: true,
      reuseCurrent: false,
    });
    expect(resolveOpeningBehavior("current", { altKey: true })).toEqual({
      pin: false,
      reuseCurrent: true,
    });
  });

  it("keeps explicit pin and new-tab intent stronger than preferences", () => {
    for (const behavior of ["new", "current", "both"] as const) {
      expect(resolveOpeningBehavior(behavior, { pin: true })).toEqual({
        pin: true,
        reuseCurrent: false,
      });
      expect(resolveOpeningBehavior(behavior, { newTab: true })).toEqual({
        pin: true,
        reuseCurrent: false,
      });
    }
  });
});
