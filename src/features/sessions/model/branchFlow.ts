import { NativeForkError, type NativeForkRequest } from "../../../integrations/harness/core/types";
import { sameProviderAccountId } from "../../providers/model/providerAccounts";
import { branchReasonText, convertToPrefixSummary, markBranchUncertain, pendingBranchOrigin } from "./branchPlan";
import { buildForkBundle, wrapBranchSummaryPrompt } from "./fork";
import { HARNESS_TITLE, sessionWorkCwd, type BranchSummaryReason, type Session } from "./session";
import { applyHarnessEvent } from "../../../integrations/harness/core/apply";

/** Runs one user send; only a proven pre-delivery fork failure permits a retry.
 * State reads must flush provider events so a binding wins over recovery. */
export async function sendBranchTurn(input: {
  session: Session;
  text: string;
  canPrefix: boolean;
  isCurrent: () => boolean;
  readSession: () => Session;
  readSource: (id: string) => Promise<Session | undefined>;
  updateSession: (update: (session: Session) => Session) => void;
  send: (text: string, fork?: NativeForkRequest, onSummaryBinding?: (id: string) => void) => Promise<void>;
}): Promise<void> {
  let origin = pendingBranchOrigin(input.session);
  const title = HARNESS_TITLE[origin?.harness ?? input.session.harness];
  const convert = (reason: BranchSummaryReason): void => {
    input.updateSession(session => {
      const converted = convertToPrefixSummary(session, reason);
      return { ...converted, blocks: [...converted.blocks, {
        id: crypto.randomUUID(), role: "system", text: reason === "fork-failed"
          ? `Couldn't reopen ${title}'s original conversation. Continued from a copied summary.`
          : `Continued from a copied summary because ${branchReasonText(reason, title)}.`,
      }] };
    });
    origin = pendingBranchOrigin(input.readSession());
  };
  if (origin?.mode === "native") {
    const fork = origin.fork;
    if (!fork || input.session.harness !== origin.harness
      || !sameProviderAccountId(input.session.providerAccountId, fork.providerAccountId)
      || sessionWorkCwd(input.session) !== fork.workCwd) convert("branch-changed");
    else if (!fork.forkPoint) {
      const source = await input.readSource(origin.sourceSessionId);
      if (!input.isCurrent()) return;
      const lastUser = source?.blocks.slice().reverse().find(block => block.role === "user" && !block.draft);
      if (!source || source.busy || lastUser?.id !== fork.sourceLastUserBlockId) convert("source-continued");
    }
  }
  const prefixText = (): string => {
    const session = input.readSession();
    const divider = session.blocks.findIndex(block => block.branchOrigin?.sessionId === session.id);
    return wrapBranchSummaryPrompt(buildForkBundle(session.blocks.slice(0, divider)).text, input.text);
  };
  const sendSummary = async (): Promise<void> => {
    // Keep an undelivered prefix pending even when another wrapper opens the
    // provider conversation. A failed summary turn can safely be retried by
    // the user, without turning its provider binding into a native retry.
    await input.send(input.canPrefix ? prefixText() : input.text, undefined, id => {
      input.updateSession(session => ({ ...session, providerSessionId: id }));
    });
    if (input.isCurrent() && input.canPrefix) {
      const id = input.readSession().providerSessionId;
      if (id) input.updateSession(session => applyHarnessEvent(session, { type: "session.providerBound", providerSessionId: id }));
    }
  };
  if (origin?.mode !== "native") {
    if (origin?.summaryDelivery === "prefix") await sendSummary();
    else await input.send(input.text);
    return;
  }
  const fork = origin.fork;
  try {
    await input.send(input.text, fork ? { sourceProviderSessionId: fork.sourceProviderSessionId, forkPoint: fork.forkPoint } : undefined);
  } catch (error) {
    if (!input.isCurrent()) return;
    if (error instanceof NativeForkError) {
      convert("fork-failed");
      await sendSummary();
      return;
    }
    throw error;
  } finally {
    if (input.isCurrent()) {
      const pending = pendingBranchOrigin(input.readSession());
      if (pending?.mode === "native") {
        input.updateSession(session => {
          const uncertain = markBranchUncertain(session);
          const text = `Couldn't confirm that ${title} received your first message in this branch. MonoCode didn't resend it. If no reply appears, send your message again.`;
          return uncertain.blocks.some(block => block.role === "system" && block.text === text)
            ? uncertain : { ...uncertain, blocks: [...uncertain.blocks, { id: crypto.randomUUID(), role: "system", text }] };
        });
      }
    }
  }
}
