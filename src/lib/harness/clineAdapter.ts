import {
  bindClineSession,
  cancelClineTurn,
  forgetClineSession,
  respondClineApproval,
  respondClineQuestion,
  sendClineTurn,
  steerClineTurn,
  stopClineSession,
} from "./cline";
import { refreshClineCatalog } from "./clineCatalog";
import { registerHarness, type HarnessAdapter } from "./registry";

export const clineAdapter: HarnessAdapter = {
  id: "cline",
  live: true,
  canSteer: false,
  sendTurn: sendClineTurn,
  steerTurn: steerClineTurn,
  cancelTurn: cancelClineTurn,
  respondApproval: respondClineApproval,
  respondQuestion: respondClineQuestion,
  stopSession: stopClineSession,
  forgetSession: forgetClineSession,
  bindSession: bindClineSession,
  refreshCatalog: refreshClineCatalog,
};

let registered = false;

export function ensureClineRegistered(): void {
  if (registered) return;
  registerHarness(clineAdapter);
  registered = true;
}
