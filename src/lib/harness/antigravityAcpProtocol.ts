import { invoke } from "@tauri-apps/api/core";
import type { AgentModel } from "../models";
import type { Attachment, RuntimeMode } from "../session";
import { asRecord, eventsFromAcpUpdate } from "./clineProtocol";
import type { HarnessEvent } from "./types";

export type AntigravityConfig = { id: string; currentValue: string; options: { value: string; name: string }[] };
export function antigravityConfigs(result: unknown): AntigravityConfig[] {
  const options = asRecord(result)?.configOptions;
  if (!Array.isArray(options)) return [];
  return options.flatMap((item): AntigravityConfig[] => {
    const config = asRecord(item);
    if (typeof config?.id !== "string" || config.type !== "select" || typeof config.currentValue !== "string") return [];
    return [{ id: config.id, currentValue: config.currentValue, options: selectOptions(config.options) }];
  });
}
function selectOptions(value: unknown): { value: string; name: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): { value: string; name: string }[] => {
    const entry = asRecord(item);
    // Grouped entries are containers (optionally with a display-only value);
    // only leaves are selectable model IDs.
    if (Array.isArray(entry?.options) && entry.options.length > 0) return selectOptions(entry.options);
    if (typeof entry?.value === "string" && entry.value.trim()) return [{ value: entry.value, name: typeof entry.name === "string" ? entry.name : entry.value }];
    return [];
  });
}
export function antigravityModels(configs: AntigravityConfig[]): AgentModel[] {
  return (configs.find((c) => c.id === "model")?.options ?? []).map((o): AgentModel => ({ id: `antigravity:${o.value}`, nativeId: o.value, name: o.name, harness: "antigravity" }));
}
export function antigravityMode(mode: RuntimeMode): string { return mode === "full-access" ? "yolo" : mode === "auto-accept-edits" ? "auto_edit" : "default"; }

/** Normalize native command/output fields before using the shared pure ACP parser. */
export function antigravityEvents(params: unknown): HarnessEvent[] {
  const rec = asRecord(params); const update = asRecord(rec?.update);
  if (!update) return [];
  const rawInput = asRecord(update.rawInput); const rawOutput = asRecord(update.rawOutput);
  const command = rawInput?.CommandLine ?? rawInput?.command_line ?? rawInput?.commandLine ?? rawInput?.command;
  const output = rawOutput?.combinedOutput ?? rawOutput?.combined_output;
  return eventsFromAcpUpdate({ ...rec, update: { ...update,
    ...(typeof command === "string" ? { rawInput: { ...rawInput, command }, kind: update.kind ?? "execute" } : {}),
    ...(typeof output === "string" ? { rawOutput: output.slice(-8000) } : {}),
  } });
}

export type AntigravityPromptBlock =
  | { type: "text"; text: string }
  | { type: "image" | "audio"; data: string; mimeType: string }
  | { type: "resource_link"; uri: string; name: string; mimeType: string }
  | { type: "resource"; resource: { uri: string; mimeType: string; text: string } };
const MiB = 1024 * 1024;
const imageTypes = new Set(["image/bmp", "image/jpeg", "image/png", "image/webp"]);
const audioTypes = new Set(["audio/aac", "audio/flac", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"]);
const textTypes = new Set(["application/json", "application/ld+json", "application/javascript", "application/typescript", "application/xml", "application/yaml", "application/x-yaml", "application/x-sh"]);

/** Validate actual bytes and negotiated capabilities; never silently drop an upload. */
export async function antigravityPrompt(text: string, attachments: Attachment[] = [], capabilities: Record<string, unknown>): Promise<AntigravityPromptBlock[]> {
  const blocks: AntigravityPromptBlock[] = text.trim() ? [{ type: "text", text: text.trim() }] : [];
  let total = 0;
  for (const file of attachments) {
    const mimeType = file.mimeType.toLowerCase().split(";")[0] ?? "";
    const image = imageTypes.has(mimeType); const audio = audioTypes.has(mimeType); const pdf = mimeType === "application/pdf";
    const isText = mimeType.startsWith("text/") || textTypes.has(mimeType) || /\.(txt|mdx?|jsonl?|ya?ml|toml|xml|csv|tsv|[cm]?[jt]sx?|html|css|scss|less|py|rs|go|java|kt|swift|[ch]|cpp|hpp|cs|rb|php|sh|bash|zsh|sql|graphql|svelte|vue|log|diff|patch|ini|conf)$/i.test(file.name);
    if (!image && !audio && !pdf && !isText) throw new Error(`Antigravity does not support '${file.name}' (${mimeType}). Attach BMP, JPEG, PNG, WebP, PDF, audio, or UTF-8 text.`);
    if ((image && capabilities.image !== true) || (audio && capabilities.audio !== true) || (isText && !image && !audio && !pdf && capabilities.embeddedContext !== true)) throw new Error(`This Antigravity runtime does not support '${file.name}'. Update the ACP runtime or remove this attachment.`);
    const limit = image ? 10 * MiB : audio ? 20 * MiB : pdf ? 50 * MiB : MiB;
    let size = file.size;
    if (file.path) {
      const infos: unknown = await invoke("inspect_paths", { paths: [file.path] });
      const info = Array.isArray(infos) ? asRecord(infos[0]) : null;
      if (!info || info.isDir !== false || typeof info.size !== "number") throw new Error(`Could not read attachment '${file.name}'.`);
      size = info.size;
    }
    if (!Number.isFinite(size) || size < 0 || size > limit || total + size > 50 * MiB) throw new Error(`Attachment '${file.name}' is too large (text 1 MiB, image 10 MiB, audio 20 MiB, total 50 MiB).`);
    const uri = file.path ? attachmentUri(file.path) : `attachment:///${encodeURIComponent(file.id)}/${encodeURIComponent(file.name)}`;
    if (pdf) {
      if (!file.path) throw new Error(`PDF '${file.name}' needs a local file path. Attach it again.`);
      total += size; blocks.push({ type: "resource_link", uri, name: file.name, mimeType }); continue;
    }
    const data: unknown = file.path ? await invoke("read_file_base64", { path: file.path }) : file.data;
    if (typeof data !== "string" || data.length > Math.ceil(limit / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error(`Invalid or oversized attachment '${file.name}'. Attach it again.`);
    const binary = atob(data); total += binary.length;
    if (binary.length > limit || total > 50 * MiB) throw new Error(`Attachment '${file.name}' is too large.`);
    if (image || audio) blocks.push({ type: image ? "image" : "audio", data, mimeType });
    else {
      let decoded: string;
      try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))); }
      catch { throw new Error(`Attachment '${file.name}' is not UTF-8 text.`); }
      if (decoded.includes("\0")) throw new Error(`Attachment '${file.name}' contains binary data.`);
      blocks.push({ type: "resource", resource: { uri, mimeType, text: decoded } });
    }
  }
  if (!blocks.length) throw new Error("A turn requires text or supported attachments.");
  return blocks;
}
export function attachmentUri(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized.startsWith("/") && !/^[a-z]:\//i.test(normalized)) throw new Error("Attachment path must be absolute.");
  return `file://${normalized.startsWith("/") ? "" : "/"}${normalized.split("/").map((part, index) => index === 0 && /^[a-z]:$/i.test(part) ? part : encodeURIComponent(part)).join("/")}`;
}
