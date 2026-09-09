import {
  bindAntigravitySession,
  cancelAntigravityTurn,
  forgetAntigravitySession,
  respondAntigravityApproval,
  respondAntigravityQuestion,
  sendAntigravityTurn,
  steerAntigravityTurn,
  stopAntigravitySession,
} from "./antigravity";
import { refreshAntigravityCatalog } from "./antigravityCatalog";
import { registerHarness, type HarnessAdapter } from "./registry";

export const antigravityAdapter: HarnessAdapter = {
  id: "antigravity",
  live: true,
  canSteer: false,
  refreshCatalog: () => refreshAntigravityCatalog(),
  sendTurn: sendAntigravityTurn,
  steerTurn: steerAntigravityTurn,
  cancelTurn: cancelAntigravityTurn,
  respondApproval: respondAntigravityApproval,
  respondQuestion: respondAntigravityQuestion,
  stopSession: stopAntigravitySession,
  forgetSession: forgetAntigravitySession,
  bindSession: bindAntigravitySession,
};

let registered = false;

export function ensureAntigravityRegistered(): void {
  if (registered) return;
  registerHarness(antigravityAdapter);
  registered = true;
}
