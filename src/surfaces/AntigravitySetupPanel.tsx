import type { ReactElement } from "react";

export type AntigravitySetupPanelProps = {
  available: boolean;
  signingIn: boolean;
  message?: string;
  error?: string;
  onSignIn: () => void;
  onCancel: () => void;
};

/** Explains the distinct ACP runtime and explicit account setup. */
export function AntigravitySetupPanel({ available, signingIn, message, error, onSignIn, onCancel }: AntigravitySetupPanelProps): ReactElement {
  return (
    <section aria-label="Antigravity ACP setup" className="mb-4 flex flex-col gap-3 rounded-lg border border-content/10 bg-content/[0.03] p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[12px] font-medium text-content/85">Google ACP runtime</p>
          <p className="max-w-2xl text-[12px] leading-relaxed text-content/55">
            This uses a separate Google sign-in from the Antigravity CLI or IDE.
            {available ? " Sign in here, then start a new Antigravity chat." : " Download the official ACP package for your platform, extract agy_acp_server and its matching localharness_external helper together, then choose the ACP binary above."}
          </p>
          {!available ? (
            <a href="https://github.com/agentclientprotocol/registry/tree/main/antigravity-acp" target="_blank" rel="noreferrer" aria-label="Open the official Antigravity ACP runtime downloads" className="inline-flex text-[12px] text-accent underline underline-offset-4 hover:text-content focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              Official runtime downloads
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" aria-label="Sign in to Antigravity with Google" disabled={!available || signingIn} onClick={onSignIn} className="inline-flex min-h-8 items-center justify-center rounded-md border border-content/15 px-3 text-[12px] font-medium text-content/85 transition-colors hover:bg-content/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40">
            {signingIn ? "Signing in…" : "Sign in with Google"}
          </button>
          {signingIn ? (
            <button type="button" aria-label="Cancel Antigravity sign-in" onClick={onCancel} className="min-h-8 rounded-md px-3 text-[12px] text-content/65 transition-colors hover:bg-content/10 hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Cancel</button>
          ) : null}
        </div>
      </div>
      {error ? <p role="alert" className="break-words text-[12px] leading-relaxed text-red-400">{error}</p> : (
        <p role="status" aria-live="polite" className="text-[12px] leading-relaxed text-content/50">
          {signingIn ? "Waiting for Google sign-in in your browser…" : message ?? "New ACP chats support attachments and permission prompts. Older CLI chats remain visible; start a new chat to use ACP."}
        </p>
      )}
    </section>
  );
}
