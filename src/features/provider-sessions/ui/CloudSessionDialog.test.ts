import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CloudSessionBody, type CloudCapabilityView } from "./CloudSessionDialog";
import { CloudLaunchPanel, CloudExecutionSwitch } from "./CloudLaunchControls";
import { ProviderConversationList } from "./ProviderConversationList";
import { emptyProviderListState } from "../model/conversationStore";
import { cloudActionEntries } from "../model/cloudView";
import { cloudCapabilitiesFromHelp, type CloudSession } from "../model/cloudSessions";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 },
  configurable: true,
});

const record: CloudSession = {
  provider: "codex",
  id: "task_abc",
  url: "https://chatgpt.com/codex/tasks/task_abc",
  cwd: "/Users/dev/acme",
  providerAccountId: "default",
  environmentId: "env-1",
  branch: "main",
  createdAt: 1_700_000_000_000,
};
const ready: CloudCapabilityView = {
  status: "ready",
  entries: cloudActionEntries(
    "codex",
    cloudCapabilitiesFromHelp("codex", "  cloud  x", "  exec  a\n  status  b\n  diff  c\n  apply  d\n  list  e"),
  ),
};

function body(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(CloudSessionBody, {
      record,
      capabilities: ready,
      running: null,
      result: null,
      confirmingApply: false,
      message: "",
      copied: null,
      onMessageChange: vi.fn(),
      onRun: vi.fn(),
      onConfirmApply: vi.fn(),
      onCancelApply: vi.fn(),
      onCopy: vi.fn(),
      onOpenLink: vi.fn(),
      onReprobe: vi.fn(),
      ...extra,
    }),
  );
}

describe("CloudSessionBody", () => {
  it("shows retained metadata and no fake live transcript", () => {
    const html = body();
    expect(html).toContain("task_abc");
    expect(html).toContain("/Users/dev/acme");
    expect(html).toContain("env-1");
    expect(html).toContain("main");
    expect(html).toContain("does not show a live transcript");
    expect(html).toContain("Open in browser");
  });

  it("enables supported actions and explains the unsupported follow-up", () => {
    const html = body();
    expect(html).toContain("Check status");
    expect(html).toContain("Show diff");
    expect(html).toContain("Apply changes");
    expect(html).toContain("Send follow-up");
    expect(html).toContain("does not support sending a follow-up message");
    expect(html).toContain("aria-describedby=\"cloud-reason-message\"");
  });

  it("shows probing, probe failure and re-check", () => {
    expect(body({ capabilities: { status: "loading" } })).toContain("Checking what this Codex CLI supports");
    const failed = body({ capabilities: { status: "error", message: "codex not found" } });
    expect(failed).toContain("codex not found");
    expect(failed).toContain("Check again");
  });

  it("requires an explicit apply confirmation that states the no-stash rule", () => {
    const html = body({ confirmingApply: true });
    expect(html).toContain("Apply to checkout");
    expect(html).toContain("will not stash, reset or");
  });

  it("renders real CLI output and real errors differently", () => {
    expect(body({ result: { action: "diff", ok: true, text: "diff --git a b" } })).toContain("diff --git a b");
    const failed = body({ result: { action: "apply", ok: false, text: "The local checkout has changes." } });
    expect(failed).toContain("The CLI reported an error");
    expect(failed).toContain("The local checkout has changes.");
    expect(body({ result: { action: "status", ok: true, text: "  " } })).toContain("(no output)");
  });

  it("surfaces a retention failure with the real ID and a Retry saving action", () => {
    const html = body({ unsaved: { message: "disk full", retrying: false, error: null, onRetry: vi.fn() } });
    expect(html).toContain("It will not be started again");
    expect(html).toContain("disk full");
    expect(html).toContain("Retry saving");
    expect(body({ unsaved: { message: "x", retrying: true, error: "still failing", onRetry: vi.fn() } })).toContain("still failing");
  });
});

describe("Cloud launch controls", () => {
  const panel = (provider: "claude" | "codex", extra: Record<string, unknown> = {}): string =>
    renderToStaticMarkup(
      createElement(CloudLaunchPanel, {
        provider,
        environmentId: "",
        branch: "",
        pending: false,
        error: null,
        onEnvironmentChange: vi.fn(),
        onBranchChange: vi.fn(),
        ...extra,
      }),
    );

  it("asks Codex for an environment and branch, and never advertises local options as honored", () => {
    const html = panel("codex");
    expect(html).toContain("Environment ID");
    expect(html).toContain("Branch");
    expect(html).toContain("are not carried over");
  });

  it("does not offer environment or branch for Claude", () => {
    const html = panel("claude");
    expect(html).not.toContain("Environment ID");
    expect(html).toContain("environment configured in its CLI");
  });

  it("shows pending and error states accessibly", () => {
    expect(panel("codex", { pending: true })).toContain("Starting the cloud task");
    const failed = panel("codex", { error: "Enter your Codex cloud environment ID." });
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("Enter your Codex cloud environment ID.");
  });

  it("renders a labelled Local | Cloud switch", () => {
    const html = renderToStaticMarkup(createElement(CloudExecutionSwitch, { value: "cloud", disabled: false, onChange: vi.fn() }));
    expect(html).toContain("Where this session runs");
    expect(html).toContain("Local");
    expect(html).toContain("Cloud");
    expect(html).toContain('aria-selected="true"');
  });
});

describe("cloud tasks in the provider list", () => {
  it("lists retained tasks with a cloud mark and nothing when there are none", () => {
    const render = (records: CloudSession[]): string =>
      renderToStaticMarkup(
        createElement(ProviderConversationList, {
          provider: "codex",
          state: { ...emptyProviderListState, status: "ready" },
          showArchived: false,
          openingKey: null,
          actionError: null,
          onShowArchivedChange: vi.fn(),
          onRefresh: vi.fn(),
          onLoadMore: vi.fn(),
          onOpen: vi.fn(),
          onArchive: vi.fn(),
          onDismissActionError: vi.fn(),
          cloudRecords: records,
          onOpenCloud: vi.fn(),
        }),
      );
    const html = render([record]);
    expect(html).toContain("Cloud tasks");
    expect(html).toContain("Cloud task task_abc");
    expect(render([])).not.toContain("Cloud tasks");
  });
});
