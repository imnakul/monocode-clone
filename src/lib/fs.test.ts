import { describe, expect, it } from "vitest";
import { basename, isCheckoutBlockedByChanges } from "./fs";

describe("isCheckoutBlockedByChanges", () => {
  it("detects git's tracked-file checkout error", () => {
    expect(
      isCheckoutBlockedByChanges(
        "error: Your local changes to the following files would be overwritten by checkout:\n\ta.txt\nPlease commit your changes or stash them before you switch branches.",
      ),
    ).toBe(true);
  });

  it("detects git's untracked-file checkout error", () => {
    expect(
      isCheckoutBlockedByChanges(
        "error: The following untracked working tree files would be overwritten by checkout:\n\tnew.txt\nPlease move or remove them before you switch branches.",
      ),
    ).toBe(true);
  });

  it("detects the mapped app error", () => {
    expect(
      isCheckoutBlockedByChanges(
        "Your local changes would be overwritten. Commit or stash them first.",
      ),
    ).toBe(true);
  });

  it("ignores unrelated git errors", () => {
    expect(isCheckoutBlockedByChanges("Branch missing not found")).toBe(false);
    expect(isCheckoutBlockedByChanges("Not a git repository")).toBe(false);
  });
});

describe("basename", () => {
  it("returns the last segment for posix paths", () => {
    expect(basename("/Users/me/code/agent-terminal")).toBe("agent-terminal");
    expect(basename("/Users/me/code/agent-terminal/")).toBe("agent-terminal");
    expect(basename("/")).toBe("/");
  });

  it("returns the folder name for Windows paths", () => {
    expect(basename("E:\\Developing\\Knoarc\\rigorup-active\\Teacher")).toBe(
      "Teacher",
    );
    expect(basename("E:\\Developing\\Teacher\\")).toBe("Teacher");
    expect(basename("C:/mixed/separators\\proj")).toBe("proj");
    expect(basename("E:\\")).toBe("E:");
  });
});
