import type { AgentModel } from "../models";
import type { RuntimeMode, ToolPreview } from "../session";
import type { ApprovalDecision, HarnessEvent } from "./types";
import {
  composeToolTitle,
  extractSearchQuery,
  extractShellCommand,
  extractSkillName,
  extractToolPreview,
} from "./preview";

export type ClinePermissionRequest = {
  title: string;
  kind?: string;
  callId?: string;
  preview?: ToolPreview;
  optionIds: string[];
};

export type SessionConfigOption = {
  id: string;
  category?: string;
  currentValue?: string | boolean;
};

export type ClineSessionModels = {
  models: AgentModel[];
  currentModelId?: string;
};

export const CLINE_AUTH_HELP =
  "Cline has no authenticated provider it can read from here. " +
  "Run `cline auth` in a terminal and sign in (Cline usage-billing, " +
  "ClinePass, or ChatGPT subscription), then retry.";

/**
 * Cline only offers `plan` and `act`. MonoCode's supervision levels are
 * expressed through `auto_approve` plus surfaced permission prompts instead:
 * `plan` would refuse all file writes, which is not what "supervised" means.
 */
export function clineModeId(_runtimeMode: RuntimeMode): "act" {
  return "act";
}

/** Full Access maps to Cline's auto-approve; every other mode asks. */
export function autoApproveForMode(runtimeMode: RuntimeMode): boolean {
  return runtimeMode === "full-access";
}

/**
 * Immediate answer for a permission request without parking on the UI.
 * Mirrors the shared policy: supervised always asks; auto-accept-edits still
 * asks for commands and anything unclassified; anything else auto-allows once.
 */
export function clineAutoOption(
  runtimeMode: RuntimeMode,
  kind: string | undefined,
  optionIds: string[],
): string | null {
  if (optionIds.length === 0) return null;
  const tool = (kind ?? "").toLowerCase();
  if (runtimeMode === "supervised") return null;
  if (
    runtimeMode === "auto-accept-edits" &&
    (tool === "execute" || tool === "other" || tool === "fetch")
  ) {
    return null;
  }
  if (runtimeMode === "full-access") {
    return pickOption(optionIds, [
      "allow-always",
      "allow_always",
      "allow-once",
      "allow_once",
      "allow",
    ]);
  }
  return pickOption(optionIds, [
    "allow-once",
    "allow_once",
    "allow-always",
    "allow_always",
    "allow",
  ]);
}

export function permissionOptionId(
  decision: ApprovalDecision,
  optionIds: string[],
): string {
  if (decision === "allow") {
    return (
      pickOption(optionIds, [
        "allow-once",
        "allow_once",
        "allow-always",
        "allow_always",
        "allow",
      ]) ?? "allow-once"
    );
  }
  return (
    pickOption(optionIds, [
      "reject-once",
      "reject_once",
      "reject-always",
      "reject_always",
      "reject",
      "deny",
    ]) ?? "reject-once"
  );
}

export function permissionRequestFromAcp(
  params: unknown,
): ClinePermissionRequest {
  const rec = asRecord(params);
  const subject = asRecord(rec?.subject);
  const tool =
    asRecord(rec?.toolCall) ??
    asRecord(rec?.tool_call) ??
    asRecord(subject?.toolCall) ??
    asRecord(subject) ??
    rec ??
    {};
  const command = stringField(subject ?? {}, "command");
  const kind = stringField(tool, "kind") ?? stringField(subject ?? {}, "kind");
  const preview = mergeToolPreview(
    extractToolPreview(tool, tool),
    subject ? extractToolPreview(subject, subject) : undefined,
  );
  const title =
    composeToolTitle({
      kind,
      title: toolLabel(tool, subject ?? tool) ?? command ?? stringField(rec ?? {}, "title"),
      command:
        command ??
        extractShellCommand(
          tool.rawInput,
          tool.raw_input,
          tool.input,
          subject,
        ),
      skill: extractSkillName(
        tool.rawInput,
        tool.raw_input,
        tool.input,
        subject,
      ),
      path: preview?.path,
      query:
        preview?.query ??
        extractSearchQuery(tool) ??
        extractSearchQuery(subject),
      previewKind: preview?.kind,
    }) || "Permission";
  const options = Array.isArray(rec?.options) ? rec.options : [];
  const optionIds = options
    .map((item) => asRecord(item)?.optionId ?? asRecord(item)?.option_id)
    .filter((value): value is string => typeof value === "string");

  return {
    title,
    kind,
    callId:
      stringField(tool, "toolCallId") ??
      stringField(tool, "tool_call_id") ??
      stringField(rec ?? {}, "toolCallId") ??
      stringField(subject ?? {}, "toolCallId"),
    preview,
    optionIds,
  };
}

export function eventsFromAcpUpdate(params: unknown): HarnessEvent[] {
  const rec = asRecord(params);
  const update = asRecord(rec?.update) ?? rec;
  if (!update) return [];
  const kind = String(
    update.sessionUpdate ?? update.session_update ?? update.type ?? "",
  );

  if (kind === "agent_message_chunk" || kind === "agent_message") {
    const text = textFromContent(
      update.content ?? update.text,
      kind === "agent_message" ? "\n" : "",
    );
    return text ? [{ type: "message.delta", text }] : [];
  }

  if (kind === "agent_thought_chunk" || kind === "agent_thought") {
    const text = textFromContent(
      update.content ?? update.text,
      kind === "agent_thought" ? "\n" : "",
    );
    return text ? [{ type: "reasoning.delta", text }] : [];
  }

  if (
    kind === "tool_call" ||
    kind === "tool_call_update" ||
    kind === "tool_call_content_chunk"
  ) {
    const tool =
      asRecord(update.toolCall) ?? asRecord(update.tool_call) ?? update;
    const callId = String(
      tool.toolCallId ??
        tool.tool_call_id ??
        update.toolCallId ??
        update.tool_call_id ??
        "",
    );
    if (!callId) return [];
    const toolKind =
      stringField(update, "kind") ?? stringField(tool, "kind");
    const status =
      stringField(update, "status") ?? stringField(tool, "status");
    const preview = extractToolPreview(update, tool);
    const title =
      composeToolTitle({
        kind: toolKind,
        title: toolLabel(update, tool),
        command: extractShellCommand(
          update.rawInput,
          tool.rawInput,
          update.raw_input,
          tool.raw_input,
          update.input,
          tool.input,
        ),
        skill: extractSkillName(
          update.rawInput,
          tool.rawInput,
          update.raw_input,
          tool.raw_input,
          update.input,
          tool.input,
        ),
        path: preview?.path,
        query:
          preview?.query ??
          extractSearchQuery(
            update.rawInput ??
              tool.rawInput ??
              update.raw_input ??
              tool.raw_input ??
              update.input ??
              tool.input,
          ),
        previewKind: preview?.kind,
      }) || toolLabel(update, tool);
    return [
      {
        type: "tool.updated",
        callId,
        title,
        kind: toolKind,
        status,
        detail: toolDetail(update, tool),
        preview,
      },
    ];
  }

  if (kind === "plan" || kind === "current_plan") {
    const text = planText(update);
    return text ? [{ type: "plan", text }] : [];
  }

  const usage = usageFromUpdate(update);
  return usage ? [usage] : [];
}

/**
 * Harvest the model catalog from a `session/new` result. Cline returns the
 * full provider catalog as `models.availableModels` plus the same list as the
 * `model` config option; either shape is accepted.
 */
export function modelsFromSessionNew(result: unknown): ClineSessionModels {
  const rec = asRecord(result);
  const available = asRecord(rec?.models)?.availableModels;
  if (Array.isArray(available) && available.length > 0) {
    return {
      models: uniqueClineModels(
        available.flatMap((item) => {
          const model = asRecord(item);
          if (!model) return [];
          const nativeId = String(model.modelId ?? model.value ?? "").trim();
          const name = String(model.name ?? nativeId).trim();
          if (!nativeId || !name) return [];
          return [
            {
              id: `cline:${nativeId}`,
              harness: "cline" as const,
              name,
              nativeId,
            },
          ];
        }),
      ),
      currentModelId: stringField(asRecord(rec?.models) ?? {}, "currentModelId"),
    };
  }

  const options = Array.isArray(rec?.configOptions) ? rec.configOptions : [];
  for (const option of options) {
    const config = asRecord(option);
    const id = String(config?.id ?? "").toLowerCase();
    const category = String(config?.category ?? "").toLowerCase();
    if (id !== "model" && category !== "model") continue;
    return {
      models: uniqueClineModels(
        flattenSelectOptions(config?.options).map((entry) => ({
          id: `cline:${entry.value}`,
          harness: "cline" as const,
          name: entry.label || entry.value,
          nativeId: entry.value,
        })),
      ),
      currentModelId:
        typeof config?.currentValue === "string"
          ? config.currentValue
          : undefined,
    };
  }
  return { models: [] };
}

export function readConfigOptions(raw: unknown): SessionConfigOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const rec = asRecord(item);
    const id = String(rec?.id ?? rec?.configId ?? "").trim();
    if (!id) return [];
    return [
      {
        id,
        category: typeof rec?.category === "string" ? rec.category : undefined,
        currentValue:
          typeof rec?.currentValue === "string" ||
          typeof rec?.currentValue === "boolean"
            ? rec.currentValue
            : undefined,
      },
    ];
  });
}

export function extractModelConfigId(
  options: SessionConfigOption[],
): string {
  const exact = options.find((option) => option.id === "model");
  if (exact) return exact.id;
  const model = options.find(
    (option) => option.category === "model" && option.id !== "provider",
  );
  return model?.id ?? "model";
}

export function sessionIdFromResult(result: unknown): string | undefined {
  const rec = asRecord(result);
  const id = rec?.sessionId ?? rec?.session_id ?? rec?.id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

/** Cline answers `initialize` fast when healthy; anything else is auth. */
export function clineStartupError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  if (/not authenticated|needs access|auth|login|credential|api key/i.test(detail)) {
    return new Error(`${detail.trim()}\n\n${CLINE_AUTH_HELP}`);
  }
  if (/timed out/i.test(detail)) {
    return new Error(`Cline did not answer initialize within 12s. ${CLINE_AUTH_HELP}`);
  }
  return new Error(`Cline did not start. ${detail}`);
}

function mergeToolPreview(
  primary?: ToolPreview,
  secondary?: ToolPreview,
): ToolPreview | undefined {
  if (!primary) return secondary;
  if (!secondary) return primary;
  return {
    ...secondary,
    ...primary,
    lines: primary.lines ?? secondary.lines,
  };
}

function flattenSelectOptions(
  raw: unknown,
): Array<{ value: string; label: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ value: string; label: string }> = [];
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;
    if (typeof rec.value === "string") {
      const value = rec.value.trim();
      if (!value) continue;
      out.push({
        value,
        label: String(rec.name ?? rec.label ?? value).trim() || value,
      });
      continue;
    }
    out.push(...flattenSelectOptions(rec.options));
  }
  return out;
}

function uniqueClineModels(models: AgentModel[]): AgentModel[] {
  const seen = new Set<string>();
  const out: AgentModel[] = [];
  for (const model of models) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    out.push(model);
  }
  return out;
}

function usageFromUpdate(update: Record<string, unknown>): HarnessEvent | null {
  const usage =
    asRecord(update.usage) ??
    asRecord(update.tokenUsage) ??
    asRecord(update.token_usage) ??
    (hasUsageFields(update) ? update : null);
  if (!usage) return null;
  const used =
    numberField(usage, "used") ??
    numberField(usage, "usedTokens") ??
    numberField(usage, "used_tokens") ??
    sumNumbers(usage, ["inputTokens", "outputTokens", "input_tokens", "output_tokens"]);
  const window =
    numberField(usage, "window") ??
    numberField(usage, "size") ??
    numberField(usage, "contextWindow") ??
    numberField(usage, "context_window") ??
    numberField(usage, "maxTokens") ??
    numberField(usage, "max_tokens");
  if (used == null && window == null) return null;
  return { type: "context", used: used ?? undefined, window: window ?? undefined };
}

function hasUsageFields(rec: Record<string, unknown>): boolean {
  return (
    numberField(rec, "used") != null ||
    numberField(rec, "usedTokens") != null ||
    numberField(rec, "inputTokens") != null
  );
}

function planText(update: Record<string, unknown>): string {
  if (typeof update.text === "string" && update.text.trim()) return update.text;
  const entries = update.entries ?? update.plan;
  if (!Array.isArray(entries)) return "";
  return entries
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return "";
      const status = String(rec.status ?? "pending");
      const content = String(rec.content ?? rec.text ?? rec.title ?? "").trim();
      if (!content) return "";
      const mark =
        status === "completed"
          ? "[x]"
          : status === "in_progress"
            ? "[…]"
            : status === "cancelled"
              ? "[-]"
              : "[ ]";
      return `${mark} ${content}`;
    })
    .filter(Boolean)
    .join("\n");
}

function toolLabel(
  ...recs: Array<Record<string, unknown> | null | undefined>
): string | undefined {
  for (const rec of recs) {
    if (!rec) continue;
    const value =
      humanField(rec, "title") ??
      humanField(rec, "name") ??
      humanField(rec, "toolName") ??
      humanField(rec, "tool_name");
    if (value) return value;
  }
  return undefined;
}

function toolDetail(
  update: Record<string, unknown>,
  tool: Record<string, unknown>,
): string | undefined {
  const content =
    textFromContent(update.content, "\n") ||
    textFromContent(tool.content, "\n");
  if (content.trim()) return cap(content);
  const output = update.rawOutput ?? tool.rawOutput;
  if (typeof output === "string" && output.trim()) return cap(output);
  const outputText = textFromContent(output);
  return outputText.trim() ? cap(outputText) : undefined;
}

function cap(value: string, max = 8_000): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…`;
}

function pickOption(optionIds: string[], preferred: string[]): string | null {
  for (const id of preferred) {
    if (optionIds.includes(id)) return id;
  }
  return null;
}

function humanField(
  rec: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = stringField(rec, key);
  if (!value || looksLikeCallId(value)) return undefined;
  return value;
}

function looksLikeCallId(value: string): boolean {
  const text = value.trim();
  return (
    /^(call[-_]?|tool[-_])[a-z0-9_-]+$/i.test(text) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      text,
    )
  );
}

function textFromContent(content: unknown, separator = ""): string {
  if (typeof content === "string") return content;
  const rec = asRecord(content);
  if (rec && typeof rec.text === "string") return rec.text;
  if (rec && rec.content != null) return textFromContent(rec.content, separator);
  if (Array.isArray(content)) {
    return content
      .map((item) => textFromContent(item, separator))
      .filter(Boolean)
      .join(separator);
  }
  return "";
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function stringField(
  rec: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = rec[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberField(
  rec: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = rec[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sumNumbers(
  rec: Record<string, unknown>,
  keys: string[],
): number | undefined {
  let total = 0;
  let found = false;
  for (const key of keys) {
    const value = numberField(rec, key);
    if (value == null) continue;
    total += value;
    found = true;
  }
  return found ? total : undefined;
}
