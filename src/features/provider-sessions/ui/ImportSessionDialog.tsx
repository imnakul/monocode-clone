import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from "react";
import { Modal } from "../../../shared/ui/Modal";
import { SearchableSelect } from "../../../shared/ui/SearchableSelect";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { LAYER } from "../../../shared/lib/layers";
import {
  providerAccounts,
  subscribeProviderAccounts,
} from "../../providers/model/providerAccounts";
import {
  parseNativeSessionInput,
  resolveNativeSession,
} from "../model/nativeSessionInput";
import {
  listProviderConversations,
  setProviderConversationArchived,
  type NativeProvider,
  type ProviderConversation,
} from "../model/providerSessions";
import { PROVIDER_LABEL, folderName } from "../model/conversationSummary";
import { ProviderConversationStore } from "../model/conversationStore";
import { ProviderConversationList } from "./ProviderConversationList";
import { loadRecents } from "../../projects/model/recents";

type Props = {
  providers: readonly NativeProvider[];
  onResume: (row: ProviderConversation) => Promise<void>;
  onClose: () => void;
};

/** Existing dialog/selector/button primitives; no migration or prompt seeding. */
export function AddNativeSessionDialog({
  providers,
  onResume,
  onClose,
}: Props): ReactElement {
  const [provider, setProvider] = useState<NativeProvider>(
    providers[0] ?? "claude",
  );
  const [accountId, setAccountId] = useState("default");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const [query, setQuery] = useState("");
  const [projectCwd, setProjectCwd] = useState("");
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    provider: NativeProvider;
    accountId: string;
    query: string;
    projectCwd: string;
  } | null>(null);
  const store = useMemo(
    () =>
      new ProviderConversationStore({
        accounts: () => [request?.accountId ?? "default"],
        list: (selected, options) =>
          listProviderConversations(selected, {
            ...options,
            query: request?.query,
            projectCwd: request?.projectCwd,
          }),
      }),
    [request],
  );
  const lists = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const activeRequest =
    request?.provider === provider && request.accountId === accountId;
  useEffect(() => {
    store.setProviders(request ? [request.provider] : []);
    return () => store.setProviders([]);
  }, [store, request]);
  const projects = useMemo(() => loadRecents(), []);
  const accountSnapshot = useSyncExternalStore(
    subscribeProviderAccounts,
    () => JSON.stringify(providerAccounts(provider)),
    () => JSON.stringify(providerAccounts(provider)),
  );
  const accounts = useMemo(
    () => providerAccounts(provider),
    [provider, accountSnapshot],
  );
  const close = (): void => {
    if (!submitting.current) onClose();
  };
  const find = (): void => {
    if (submitting.current) return;
    if (
      !providers.includes(provider) ||
      !accounts.some((account) => account.id === accountId)
    ) {
      setError("Choose an enabled provider and available account first.");
      return;
    }
    setError(null);
    setRequest({ provider, accountId, query: query.trim(), projectCwd });
  };
  const resumeRow = async (row: ProviderConversation): Promise<void> => {
    if (submitting.current) return;
    if (
      row.provider !== provider ||
      row.providerAccountId !== accountId ||
      !providers.includes(provider) ||
      !accounts.some((account) => account.id === accountId)
    ) {
      setError(
        "This conversation belongs to a different or removed provider account. Find again.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setOpeningKey(row.key);
    setError(null);
    try {
      await onResume(row);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
      setOpeningKey(null);
    }
  };
  const archive = async (
    row: ProviderConversation,
    archived: boolean,
  ): Promise<void> => {
    if (submitting.current) return;
    try {
      await setProviderConversationArchived(row.key, archived);
      await store.refresh(provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };
  const submit = async (): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const reference = parseNativeSessionInput(input, provider);
      if (reference.provider !== provider)
        throw new Error(
          `This command is for ${PROVIDER_LABEL[reference.provider]}. Choose that provider first.`,
        );
      if (!providers.includes(provider))
        throw new Error("Enable this provider in Settings first.");
      if (!accounts.some((account) => account.id === accountId))
        throw new Error(
          "This account was removed. Choose an available account.",
        );
      const row = await resolveNativeSession(reference, accountId);
      await onResume(row);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Add session"
      description="Choose a provider, find its local conversations, and resume one"
      onClose={close}
      size="md"
      fitViewport
    >
      <form
        className="flex flex-col gap-3 px-4 pb-4 pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        aria-busy={busy}
      >
        <div className="grid grid-cols-2 gap-3">
          <SearchableSelect
            label="Provider"
            value={provider}
            options={providers.map((value) => ({
              value,
              label: value === "claude" ? "Claude Code" : "Codex",
            }))}
            disabled={busy}
            searchable={false}
            onChange={(value) => {
              if (value !== "claude" && value !== "codex") return;
              setProvider(value);
              setAccountId("default");
              setRequest(null);
              setError(null);
            }}
          />
          <SearchableSelect
            label="Provider account"
            value={accountId}
            options={accounts.map((account) => ({
              value: account.id,
              label: account.label,
            }))}
            disabled={busy}
            searchable={false}
            onChange={(value) => {
              setAccountId(value);
              setRequest(null);
              setError(null);
            }}
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[12px] text-content/70">
            Search conversations
            <input
              aria-label="Search conversations"
              value={query}
              disabled={busy}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  find();
                }
              }}
              placeholder="Session name, first message, folder or ID"
              className="w-full rounded-md border border-content/15 bg-content/5 px-3 py-2 text-[13px] text-content outline-none focus:border-accent"
            />
          </label>
          <SearchableSelect
            label="Project"
            value={projectCwd}
            disabled={busy}
            options={[
              { value: "", label: "All projects" },
              ...projects.map((project) => ({
                value: project.path,
                label: folderName(project.path),
                description: project.path,
              })),
            ]}
            onChange={setProjectCwd}
          />
          <SecondaryButton
            onClick={find}
            disabled={busy || providers.length === 0}
          >
            Find
          </SecondaryButton>
        </div>
        {activeRequest ? (
          <div
            className="h-72 min-h-0 overflow-hidden rounded-md border border-content/10"
            inert={busy || undefined}
          >
            <ProviderConversationList
              provider={provider}
              menuLayer={LAYER.dialogPopover}
              state={lists[provider]}
              showArchived={store.getIncludeArchived()}
              openingKey={openingKey}
              actionError={null}
              onDismissActionError={() => setError(null)}
              onShowArchivedChange={(value) => store.setIncludeArchived(value)}
              onRefresh={() => {
                if (!submitting.current) void store.refresh(provider);
              }}
              onLoadMore={() => {
                if (!submitting.current) void store.loadMore(provider);
              }}
              onOpen={(row) => {
                void resumeRow(row);
              }}
              onArchive={(row, archived) => {
                void archive(row, archived);
              }}
            />
          </div>
        ) : null}
        <details className="text-[12px] text-content/55">
          <summary className="cursor-pointer">
            Or paste a session ID or resume command
          </summary>
          <label className="mt-2 flex flex-col gap-1.5 text-[12px] text-content/70">
            Session ID or resume command
            <input
              aria-label="Session ID or resume command"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError(null);
              }}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              maxLength={1024}
              placeholder={
                provider === "claude"
                  ? "claude --resume <session-id>"
                  : "codex resume <session-id>"
              }
              className="w-full rounded-md border border-content/15 bg-content/5 px-3 py-2 text-[13px] text-content outline-none focus:border-accent disabled:opacity-50"
            />
          </label>
        </details>
        <p className="text-[12px] leading-relaxed text-content/55">
          Uses the original session and context, without a summary transfer. The
          session must exist on this computer in the selected account. Finish or
          stop its agent in the other app before sending here. Cloud and public
          share links cannot be added.
        </p>
        {error ? (
          <p
            role="alert"
            className="whitespace-pre-wrap break-words text-[12px] text-red-400"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={close} disabled={busy}>
            Cancel
          </SecondaryButton>
          <SecondaryButton
            type="submit"
            disabled={busy || !input.trim() || providers.length === 0}
          >
            {busy ? "Opening…" : "Resume session"}
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  );
}
