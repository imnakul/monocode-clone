import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from "react";
import { Modal } from "../../../shared/ui/Modal";
import { SearchableSelect } from "../../../shared/ui/SearchableSelect";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import {
  providerAccounts,
  subscribeProviderAccounts,
} from "../../providers/model/providerAccounts";
import {
  parseNativeSessionInput,
  resolveNativeSession,
} from "../model/nativeSessionInput";
import type {
  NativeProvider,
  ProviderConversation,
} from "../model/providerSessions";
import { PROVIDER_LABEL } from "../model/conversationSummary";

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
      description="Resume a local Claude Code or Codex conversation"
      onClose={close}
      size="md"
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
              setError(null);
            }}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-[12px] text-content/70">
          Session ID or resume command
          <input
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
