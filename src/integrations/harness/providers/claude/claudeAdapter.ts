import {
  bindClaudeSession,
  inspectClaudeContext,
  cancelClaudeTurn,
  compactClaudeContext,
  forgetClaudeSession,
  respondClaudeApproval,
  respondClaudeQuestion,
  restoreClaudeTaskLists,
  sendClaudeTurn,
  steerClaudeTurn,
  stopClaudeSession,
} from "./claude";
import { refreshClaudeCatalog } from "./claudeCatalog";
import {
  generateClaudeBranchName,
  generateClaudeCommitMessage,
  generateClaudePrContent,
} from "./claudeGit";
import { generateClaudeSessionTitle } from "./claudeTitle";
import {
  runClaudeTextPrompt,
  stopClaudeTextPrompt,
  warmupClaudeText,
} from "./claudeText";
import { registerHarness, type HarnessAdapter } from "../../core/registry";

export const claudeAdapter: HarnessAdapter = {
  id: "claude",
  live: true,
  sendTurn: sendClaudeTurn,
  compactContext: compactClaudeContext,
  inspectContext: inspectClaudeContext,
  steerTurn: steerClaudeTurn,
  cancelTurn: cancelClaudeTurn,
  respondApproval: respondClaudeApproval,
  respondQuestion: respondClaudeQuestion,
  stopSession: stopClaudeSession,
  forgetSession: forgetClaudeSession,
  bindSession: bindClaudeSession,
  restoreTaskLists: restoreClaudeTaskLists,
  refreshCatalog: refreshClaudeCatalog,
  generateTitle: generateClaudeSessionTitle,
  generateCommitMessage: generateClaudeCommitMessage,
  generatePrContent: generateClaudePrContent,
  generateBranchName: generateClaudeBranchName,
  warmupText: warmupClaudeText,
  runHelperPrompt: ({ cwd, prompt, timeoutMs, providerAccountId, model }) =>
    runClaudeTextPrompt({
      cwd,
      prompt,
      timeoutMs,
      providerAccountId,
      model,
      helperOnly: true,
    }),
  runTextPrompt: runClaudeTextPrompt,
  stopTextPrompt: stopClaudeTextPrompt,
};

let registered = false;

export function ensureClaudeRegistered(): void {
  if (registered) return;
  registerHarness(claudeAdapter);
  registered = true;
}
