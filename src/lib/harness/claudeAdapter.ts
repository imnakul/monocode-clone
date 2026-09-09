import {
  bindClaudeSession,
  cancelClaudeTurn,
  forgetClaudeSession,
  respondClaudeApproval,
  respondClaudeQuestion,
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
import { warmupClaudeText } from "./claudeText";
import { registerHarness, type HarnessAdapter } from "./registry";

export const claudeAdapter: HarnessAdapter = {
  id: "claude",
  live: true,
  sendTurn: sendClaudeTurn,
  steerTurn: steerClaudeTurn,
  cancelTurn: cancelClaudeTurn,
  respondApproval: respondClaudeApproval,
  respondQuestion: respondClaudeQuestion,
  stopSession: stopClaudeSession,
  forgetSession: forgetClaudeSession,
  bindSession: bindClaudeSession,
  refreshCatalog: refreshClaudeCatalog,
  generateCommitMessage: generateClaudeCommitMessage,
  generatePrContent: generateClaudePrContent,
  generateBranchName: generateClaudeBranchName,
  warmupText: warmupClaudeText,
};

let registered = false;

export function ensureClaudeRegistered(): void {
  if (registered) return;
  registerHarness(claudeAdapter);
  registered = true;
}
