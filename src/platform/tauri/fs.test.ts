import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  basename,
  gitCommit,
  gitHeadMessage,
  isCheckoutBlockedByChanges,
  listSkills,
  persistWallpaper,
  retainManagedWallpaper,
  clearManagedWallpaper,
  resolveProjectLocation,
} from "./fs";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

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

describe("listSkills", () => {
  it("invokes list_skills with cwd and disabledPaths", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([]);
    await listSkills("/repo", ["/repo/.agents/skills/review/SKILL.md"]);
    expect(invoke).toHaveBeenCalledWith("list_skills", {
      cwd: "/repo",
      disabledPaths: ["/repo/.agents/skills/review/SKILL.md"],
    });
  });

  it("passes null when disabledPaths is omitted", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([]);
    await listSkills("/repo");
    expect(invoke).toHaveBeenCalledWith("list_skills", {
      cwd: "/repo",
      disabledPaths: null,
    });
  });
});

describe("resolveProjectLocation", () => {
  it("passes the saved filesystem identity to the backend", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      path: "/repo-renamed",
      identity: "unix:1:2",
    });

    await expect(resolveProjectLocation("/repo", "unix:1:2")).resolves.toEqual({
      path: "/repo-renamed",
      identity: "unix:1:2",
    });
    expect(invoke).toHaveBeenCalledWith("resolve_project_location", {
      path: "/repo",
      identity: "unix:1:2",
    });
  });

  it("uses null until the project has a saved identity", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(null);
    await resolveProjectLocation("/repo");
    expect(invoke).toHaveBeenCalledWith("resolve_project_location", {
      path: "/repo",
      identity: null,
    });
  });
});

describe("managed wallpaper persistence", () => {
  it("runs persist and clear operations in the order the user requested", async () => {
    let finishFirstPersist: ((path: string) => void) | undefined;
    let finishLastPersist: ((path: string) => void) | undefined;
    vi.mocked(invoke).mockClear();
    vi.mocked(invoke)
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishFirstPersist = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishLastPersist = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);

    const firstPersist = persistWallpaper("C:/Pictures/first.png");
    const lastPersist = persistWallpaper("C:/Pictures/last.webp");
    const remove = clearManagedWallpaper();

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenNthCalledWith(1, "persist_wallpaper", {
      path: "C:/Pictures/first.png",
    });

    finishFirstPersist?.("C:/app-data/wallpaper/current.png");
    await expect(firstPersist).resolves.toBe(
      "C:/app-data/wallpaper/current.png",
    );
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke).toHaveBeenNthCalledWith(2, "persist_wallpaper", {
      path: "C:/Pictures/last.webp",
    });

    finishLastPersist?.("C:/app-data/wallpaper/current.webp");
    await expect(lastPersist).resolves.toBe(
      "C:/app-data/wallpaper/current.webp",
    );
    await expect(remove).resolves.toBeUndefined();
    expect(invoke).toHaveBeenNthCalledWith(3, "clear_managed_wallpaper");
  });

  it("retains the committed file after staged choices settle", async () => {
    let finishFirstPersist: ((path: string) => void) | undefined;
    let finishLastPersist: ((path: string) => void) | undefined;
    vi.mocked(invoke).mockClear();
    vi.mocked(invoke)
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishFirstPersist = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishLastPersist = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const firstPersist = persistWallpaper("C:/Pictures/first.png");
    const lastPersist = persistWallpaper("C:/Pictures/last.webp");
    const retain = retainManagedWallpaper("C:/app-data/wallpaper/last.webp");
    const remove = clearManagedWallpaper();

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    finishFirstPersist?.("C:/app-data/wallpaper/first.png");
    await expect(firstPersist).resolves.toBe("C:/app-data/wallpaper/first.png");
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    finishLastPersist?.("C:/app-data/wallpaper/last.webp");
    await expect(lastPersist).resolves.toBe("C:/app-data/wallpaper/last.webp");
    await expect(retain).resolves.toBeUndefined();
    await expect(remove).resolves.toBeUndefined();

    expect(invoke).toHaveBeenNthCalledWith(3, "retain_managed_wallpaper", {
      path: "C:/app-data/wallpaper/last.webp",
    });
    expect(invoke).toHaveBeenNthCalledWith(4, "clear_managed_wallpaper");
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

describe("gitCommit", () => {
  it("invokes git_commit without amend by default", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    await gitCommit("/repo", "Add feature");
    expect(invoke).toHaveBeenCalledWith("git_commit", {
      cwd: "/repo",
      message: "Add feature",
      amend: false,
    });
  });

  it("passes amend when requested", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    await gitCommit("/repo", "Fix feature", true);
    expect(invoke).toHaveBeenCalledWith("git_commit", {
      cwd: "/repo",
      message: "Fix feature",
      amend: true,
    });
  });
});

describe("gitHeadMessage", () => {
  it("invokes git_head_message with cwd", async () => {
    vi.mocked(invoke).mockResolvedValueOnce("Subject\n\nBody");
    await expect(gitHeadMessage("/repo")).resolves.toBe("Subject\n\nBody");
    expect(invoke).toHaveBeenCalledWith("git_head_message", { cwd: "/repo" });
  });
});
