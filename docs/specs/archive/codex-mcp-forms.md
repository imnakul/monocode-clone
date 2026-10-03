# Done — Codex MCP forms — spec

- Workflow status: Done — set 2026-10-01 18:20 IST by Claude at close-out. Nakul reported build 0.1.55-local5-provider-fixes fine; per-check results weren't itemized, so the Manual checks section and its caveats stay as written. Pushed to the fork at `c2c8bf6`. Earlier status: Review — updated 2026-09-30 21:35 IST by Claude; see SPECS.md.
- Tier: standard, with ordering contracts for the request lifecycle · Snapshot: `9397898` on `nakul/windows-support` plus the retained uncommitted changes listed in the umbrella plan, 2026-09-30.
- Umbrella: [provider-daily-work-improvements-plan.md](provider-daily-work-improvements-plan.md), slice 6.
- Provider version verified: codex-cli 0.159.0, using the generated app-server schema `McpServerElicitationRequestParams.json`.

## Baseline, dependencies and worktree
- Revised 2026-09-30 after the handoff review ([provider-spec-handoff-review-30sept.md](../../notes/provider-spec-handoff-review-30sept.md)). Approved by Nakul 2026-09-30 (Todo); implemented through the combined batch prompt.
- Position in the batch: sixth of six (umbrella slice 6). Order: slice 1 approvals → slice 2 Claude live controls → slice 4 context → slice 3 native branch → slice 5 AI helpers → slice 6 forms. Implement and integrate one slice at a time: each slice is merged into `nakul/windows-support` and verified before the next worktree is cut.
- Prerequisite baseline: the `nakul/windows-support` commit that contains the umbrella baseline checkpoint and slices 1, 2, 4, 3 and 5 integrated and verified. Nakul gives its SHA in the handoff prompt as `<BASELINE_SHA>`, and the checkpoint SHA recorded in the umbrella plan as `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.
- Dependencies: Hard dependency on slice 1: the confirmation path, `mcpToolGrant`, the `sessionScope` hint and its fail-closed one-time approval must run first and stay unchanged (AC-15).
- Verify before starting: `git -C E:\Developing\OpenSource\mono-clone cat-file -e <BASELINE_SHA>^{commit}` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor a65bd4e4b0c2742cd0fc54a4087358471efc3888 <BASELINE_SHA>` succeeds; `git -C E:\Developing\OpenSource\mono-clone merge-base --is-ancestor <BASELINE_SHA> nakul/windows-support` succeeds; the SPECS.md rows for slices 1 to 5 read Done; `mcpToolGrant` appears in `src/integrations/harness/providers/codex/codexElicitation.ts` at `<BASELINE_SHA>` (`git -C E:\Developing\OpenSource\mono-clone grep -n "mcpToolGrant" <BASELINE_SHA> -- src/integrations/harness/providers/codex/codexElicitation.ts`). If it is missing, stop and report Blocked.. If any check fails, or either SHA is missing from the handoff, stop and report Blocked. Don't pick a baseline yourself.
- Worktree: once this spec is Todo, you are authorized to create this slice's worktree yourself, from the verified baseline only: `git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-codex-mcp-forms -b feature/codex-mcp-forms <BASELINE_SHA>`. Run the storage check first; the worktree needs its own `npm install` (about 400 MB). Don't create any other branch or worktree. If the path or branch already exists, stop and ask.
- Local docs and profile: `docs/` is ignored by the committed `.gitignore`, and `.agents/` by `.git/info/exclude`, which every worktree shares. The new worktree therefore has neither. Read them by absolute path from the main checkout: `E:\Developing\OpenSource\mono-clone\docs\...` and `E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md`. Write status, retro and changelog updates to those main-checkout files only. Don't copy them into the worktree; never `git add -f` them.
- Shared resources: don't edit source, run installs or write build output (`node_modules`, `dist`, Cargo `target`) in the main checkout or any other worktree. Leave `mono-clone-hari`, `mono-clone-remote` and the stashes untouched.

## In plain words
Today, when an MCP server in a Codex chat asks you to fill in a form, such as a name, a choice from a list, or a few settings, MonoCode cancels it and shows a one-line note. Only simple yes/no confirmations work. After this change, MonoCode shows the form above the composer, with text boxes, number boxes, checkboxes, single choices and multi-choices. It checks your input before sending it (required fields, email and URL formats, number ranges, how many items to pick). You can **Submit** or **Decline**. What you type is sent to the server but never saved in the chat history; the transcript only notes that a form was submitted. Forms MonoCode still can't show, such as browser sign-ins, password requests or unusual field types, get a clear explanation of why they were cancelled.

## Storage-full hard blocker (mandatory)
Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.

## Goal and user story
As a MonoCode user running Codex with MCP servers, when a server asks me for structured input, I want to fill in the form inside MonoCode with immediate validation, so that the tool call can continue without leaving the app. When MonoCode can't show a form, I want to know why.

## Scope
1. A pure parser that turns a Codex MCP form elicitation into a typed field list, or into an "unsupported" reason.
2. A pure validator that turns raw form input into MCP `content`, or into per-field errors.
3. New harness events `form.requested` and `form.resolved`, an in-memory `Session.pendingForm`, an adapter method `respondForm`, and the registry wrapper `respondHarnessForm`.
4. Codex adapter: a form request lifecycle (queue, show, respond, cancel), placed after the existing confirmation path.
5. A `McpForm` component above the composer, modeled on `QuestionForm`.
6. Specific explanations for unsupported forms.

## Out of scope
- URL-mode elicitations (browser sign-in). They stay cancelled, with a better explanation.
- Forms from providers other than Codex. The event and UI are provider-neutral, but only Codex emits them in this slice.
- Remembering form answers, auto-filling, or accepting forms automatically in any runtime mode.
- Collecting passwords, tokens or other secrets.
- Changes to confirmation elicitations (zero fields or one boolean), to slice 1's session grants, or to the computer-use auto-accept.
- The remote/automation `answerQuestion` API (`App.tsx:8187-8191`); it gets no form equivalent.
- Desktop UI verification by the implementing agent (see Manual checks).

## Current behavior (confirmed in source)
- `codex.ts:1039-1084` handles `mcpServer/elicitation/request` in three steps:
  1. It calls `codexMcpConfirmation(params)` (`codexElicitation.ts:15-81`). That accepts only `mode` in `form | openai/form | openaiForm`, a top-level schema with keys limited to `type, properties, required, title, description, $schema, additionalProperties`, and at most one property, which must be a boolean with keys limited to `type, title, description, default`.
  2. If the result is null, or the live session is cancelled or muted, it cancels. If the session is not cancelled or muted, it also emits the status "This MCP server requested a form or browser sign-in that MonoCode does not support yet. Complete it in the server's own interface." Then it responds `{action:"cancel", content:null, _meta:null}`.
  3. Otherwise it goes through the approval UI. In full access it auto-accepts only the computer-use app access confirmation (`isCodexComputerUseAccessConfirmation`).
- Codex 0.159.0 elicitation schema (generated `McpServerElicitationRequestParams.json`):
  - Common params: `serverName`, `threadId`, `turnId?` and `_meta?`.
  - `mode: "form"`: `requestedSchema` is `{type:"object", properties: Record<string, PrimitiveSchema>, required?: string[], $schema?}`.
  - `mode: "openai/form" | "openaiForm"`: `requestedSchema` is `true`, meaning any JSON.
  - `mode: "url"`: `{elicitationId, message, url}`.
  - `PrimitiveSchema` is one of these. Each has `additionalProperties:false`, and every field also allows `title?` and `description?`:
    - string: `{type:"string", default?, format?: "email"|"uri"|"date"|"date-time", minLength?, maxLength?}`
    - number: `{type:"number"|"integer", default?, minimum?, maximum?}`
    - boolean: `{type:"boolean", default?}`
    - single-select: `{type:"string", enum: string[], default?}`, or `{type:"string", oneOf: {const, title}[], default?}`, or legacy `{type:"string", enum, enumNames?}`
    - multi-select: `{type:"array", items: {type:"string", enum} | {anyOf: {const, title}[]}, minItems?, maxItems?, default?: string[]}`
  - Response: `{action: "accept"|"decline"|"cancel", content?, _meta?}`.
- The question lifecycle to mirror:
  - `Live.questions: Map<number, PendingQuestion>` and `visibleQuestionId` (`codex.ts:83-85`).
  - `showNextQuestion` (`codex.ts:311-331`).
  - `clearServerRequests` (`codex.ts:300-309`) resolves every pending request as `"cancelled"`.
  - `serverRequest/resolved` (`codex.ts:674-692`) cancels the pending entry with the matching `rpcId`/`threadId`.
  - `respondCodexQuestion` (`codex.ts:280-286`) is wired in `codexAdapter.ts:33`.
  - On `"cancelled"`, the question handler does not respond (`codex.ts:1034-1035`).
- Events and state:
  - `question.asked`, `question.updated` and `question.resolved` are at `types.ts:85-102`.
  - `apply.ts:75-100` sets and clears `session.pendingQuestion`, declared in-memory at `session.ts:412-416`.
  - `persistableMeta` (`sessionStore.ts:121-162`) is an explicit whitelist that does not include `pendingQuestion`. `sanitizeSessionForPersist` starts at `sessionStore.ts:191`.
  - `persistFingerprint` (`sessionStore.ts:279-283`) is `${JSON.stringify(persistableMeta(session))}|${orchestrationLeadId ?? ""}|${blocks.map(blockToken).join(",")}`, where `blockToken` is per block object identity. `App.tsx` compares it with `lastPersisted` to decide whether to save (`App.tsx:1735` and `1818`; it records it at 1093, 1175, 3748, 4204 and 4679). So a session field outside `persistableMeta` and outside `blocks` never triggers a save. `sessionStore.test.ts:599` already asserts this for `busy`.
  - The stop path clears `pendingQuestion` (`App.tsx:4292`).
- UI:
  - `Composer.tsx:1704-1710` renders `QuestionForm` when `question && onQuestionReply`.
  - `SessionPane.tsx:510` passes `question={session.pendingQuestion}` and `onQuestionReply={replyQuestion}`.
  - `App.tsx:7813-7819` `onQuestionReply` calls `respondHarnessQuestion` (`registry.ts:299-306`).
  - `QuestionForm.tsx` (383 lines) has the `data-question-form` attribute used by the composer focus logic (`Composer.tsx:1050`), and a test in `QuestionForm.test.ts`.
- The existing test `codexLive.test.ts:1096-1140` ("reports unsupported MCP forms instead of returning an empty success") uses a single required string field as its unsupported example. That form becomes supported by this spec (see Implementation plan step 8).

## Proposed behavior and invariants

### Types (new `src/features/sessions/model/mcpForm.ts`)
```ts
export type McpFormOption = { value: string; label: string };
type Base = { key: string; label: string; description?: string; required: boolean };
export type McpFormField =
  | (Base & { kind: "text"; default?: string; format?: "email" | "uri" | "date" | "date-time"; minLength?: number; maxLength?: number })
  | (Base & { kind: "number"; integer: boolean; default?: number; minimum?: number; maximum?: number })
  | (Base & { kind: "boolean"; default?: boolean })
  | (Base & { kind: "choice"; options: McpFormOption[]; default?: string })
  | (Base & { kind: "multi"; options: McpFormOption[]; default?: string[]; minItems?: number; maxItems?: number });
export type McpFormPrompt = { requestId: number; serverName: string; message: string; fields: McpFormField[] };
export type McpFormValue = string | number | boolean | string[];
export type McpFormReply = { kind: "submit"; content: Record<string, McpFormValue> } | { kind: "decline" };
export type McpFormDraft = Record<string, string | boolean | string[]>; // raw UI state
export function initialMcpFormDraft(fields: McpFormField[]): McpFormDraft;
export function validateMcpForm(fields: McpFormField[], draft: McpFormDraft):
  | { ok: true; content: Record<string, McpFormValue> }
  | { ok: false; errors: Record<string, string> };
```
`label` is the field's `title`, falling back to `key`. `description` is kept only when it is a non-empty string.

### Parser (in `codexElicitation.ts`)
`codexMcpForm(params: unknown): { ok: true; serverName: string; message: string; fields: McpFormField[] } | { ok: false; reason: McpFormUnsupportedReason; serverName: string }`, where `McpFormUnsupportedReason = "url" | "secret" | "field-type" | "too-many" | "shape"`.

Rules, applied in this order:
1. `serverName` is `stringField(rec,"serverName")`, falling back to `"MCP server"`. `message` is `stringField(rec,"message")`, falling back to `"Fill in this form"`.
2. `mode === "url"` gives `url`. A mode not in `form | openai/form | openaiForm` gives `shape`.
3. Top-level shape. Any of these gives `shape`:
   - the schema is not a record, or `type !== "object"`;
   - `properties` is not a record;
   - there is a key outside `type, properties, required, title, description, $schema, additionalProperties`;
   - `required` is present and is not an array of strings that are all keys of `properties`.
4. More than 20 properties gives `too-many`. Zero properties gives `shape`. Zero-field confirmations never reach this parser; see the handler order.
5. Each property, in `Object.keys` order:
   - If it isn't a record, the result is `field-type`.
   - Allowed keys for each kind:
     - `type` and `default` for every field;
     - `title` and `description` (always allowed);
     - `format`, `minLength` and `maxLength` for text;
     - `minimum` and `maximum` for numbers;
     - `enum`, `enumNames` and `oneOf` for choice;
     - `items`, `minItems` and `maxItems` for multi.

     Any other key gives `field-type`.
   - `type: "string"` with neither `enum` nor `oneOf` becomes text.
     - `format`, if present, must be one of the four values; otherwise `field-type`.
     - `minLength` and `maxLength` must be non-negative integers, with min ≤ max; otherwise `shape`.
   - `type: "string"` with `enum` becomes choice.
     - `enum` must be a non-empty array of unique non-empty strings.
     - The labels come from `enumNames[i]` when `enumNames` is an array of strings with the same length; otherwise they are the values.
   - `type: "string"` with `oneOf` becomes choice. `oneOf` must be a non-empty array of `{const: string, title: string}` with unique `const` values.
   - `type: "number"` or `"integer"` becomes number, with `integer = type === "integer"`. `minimum` and `maximum` must be finite numbers, with min ≤ max.
   - `type: "boolean"` becomes boolean.
   - `type: "array"` becomes multi.
     - `items` must be either `{type:"string", enum: string[]}` or `{anyOf: {const, title}[]}` (non-empty, unique values).
     - `minItems` and `maxItems` must be non-negative integers, with min ≤ max ≤ options.length.
   - Any other `type`, including `"object"`, is `field-type`.
   - Malformed or out-of-range constraints, or a `default` that isn't of the field's type or isn't among its options, give `shape`.
6. Secret check, after all fields parse, with `isSecretField(field)` (exported for tests):
   1. Normalize each of `key`, `title` and `description` into lowercase words: split camelCase (`apiKey` → `api key`), then split on anything that isn't a letter or digit.
   2. Strong phrases match as whole-word sequences in any of the three texts: `password`, `passwd`, `passphrase`, `passcode`, `secret`, `credential`, `credentials`, `api key`, `apikey`, `private key`, `access token`, `refresh token`, `auth token`, `bearer token`, `session token`, `otp`, `one time password`, `one time code`, `verification code`, `2fa code`, `mfa code`.
   3. Weak words count only when they are the whole normalized `key` or the whole normalized `title`: `token`, `pin`, `pin code`, `code`. They never match inside a longer key or title, and never in a description.
   4. Any match gives `secret` for the whole form.
   So "token budget", "max_tokens", "Pin this item" and "tokenizer" are not secret, while `token`, `PIN`, `github_access_token`, `apiKey`, `client_secret` and a description "Enter your password" are.
7. `required` is true when the key is in `required`.

### Validation (`validateMcpForm`)
Checks are applied per field, in field order. The error for a field is the first failing rule's copy (see UI details). An optional field left empty is omitted from `content`.
- Text:
  - Empty means `draft.trim() === ""`. Required and empty gives the error "Required.". Optional and empty is omitted.
  - Otherwise the value is sent untrimmed.
  - Length is counted in code points (`[...value].length`) and checked against `minLength` and `maxLength`.
  - Formats:
    - `email`: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
    - `uri`: `new URL(value)` succeeds and `protocol` is non-empty.
    - `date`: `/^\d{4}-\d{2}-\d{2}$/`, and the date is real (round-trip it through `new Date(value + "T00:00:00Z")` and compare with `toISOString().slice(0, 10)`).
    - `date-time`: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/` and `!Number.isNaN(Date.parse(value))`.
- Number:
  - The draft is a string. Empty after trimming follows the same required and optional rule as text.
  - `Number(trimmed)` must be finite and the whole trimmed string must match `/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/`.
  - If `integer`, the value must satisfy `Number.isInteger`.
  - The value must satisfy `minimum ≤ n ≤ maximum`.
  - The value is sent as a number.
- Boolean: the draft is a boolean, and it is always included. The initial value is `default ?? false`.
- Choice:
  - The draft is a string. `""` means nothing is selected.
  - Required with nothing selected gives the error "Required.". Optional with nothing selected is omitted.
  - The value must be one of the options.
- Multi:
  - The draft is a `string[]`. It keeps only the option values, in option order.
  - Required with an empty selection gives "Required.". Optional with an empty selection is omitted, unless `minItems > 0` (then the field is treated as required).
  - The selection count must satisfy `minItems ≤ count ≤ maxItems`.
- `initialMcpFormDraft`:
  - text: `default ?? ""`
  - number: `default != null ? String(default) : ""`
  - boolean: `default ?? false`
  - choice: `default ?? ""`
  - multi: `default ?? []`

### Events, state, adapter contract
- `types.ts`:
  - `{ type: "form.requested"; requestId: number; serverName: string; message: string; fields: McpFormField[] }`
  - `{ type: "form.resolved"; requestId: number; decision: "submitted" | "declined" | "cancelled" }`
- `session.ts`: `pendingForm?: McpFormPrompt`, with the doc comment "Live MCP form. In-memory; request ids and values never persist." Don't add it to `persistableMeta`. Draft values and answers live only in `McpForm` component state; they are never copied onto the `Session`, a block or an event.
- `apply.ts`:
  - `form.requested` sets `pendingForm = {requestId, serverName, message, fields}`.
  - `form.resolved` clears it only when `pendingForm?.requestId === event.requestId`.
- `registry.ts`: `respondForm?(sessionId: string, requestId: number, reply: McpFormReply): void` on the adapter, plus `respondHarnessForm(harness, sessionId, requestId, reply)`, next to `respondHarnessQuestion`.
- The stop path at `App.tsx:4292` also sets `pendingForm: undefined`.

### Codex handler order (`codex.ts` elicitation branch)
1. If `live.cancelled || live.muteUpdates`, respond `{action:"cancel", content:null, _meta:null}` with no status. This is today's behavior.
2. The confirmation path (`codexMcpConfirmation`, including slice 1's grants and the computer-use auto-accept) is unchanged, and still runs first, on the unmodified `params`. When it returns a confirmation, the request goes to the approval path exactly as slice 1 built it: the same `mcpToolGrant`, the same `sessionScope` hint, and the same one-time Allow/Deny when slice 1 found no grant. The form path never sees that request. The form path never reads or writes slice 1's `_meta` approval-kind or `persist` keys, never emits `sessionScope`, never creates a grant, and always answers with `_meta: null`.
3. Otherwise, `const parsed = codexMcpForm(params)`.
   - If `!parsed.ok`: emit `status` with the reason copy from UI details, respond `cancel`, and return.
   - If `parsed.ok`:
     1. Allocate `uiId = live.nextApprovalUiId++`.
     2. Build the event.
     3. Store `{rpcId: id, threadId, event, resolve}` in `live.forms: Map<number, PendingForm>`.
     4. Call `showNextForm(live)`.
     5. Await the outcome, of type `McpFormReply | "cancelled"`.
     6. Emit `form.resolved` with `submitted`, `declined` or `cancelled`.
     7. If submitted, emit `status` with the text `` `${serverName}: form submitted (${n} ${n === 1 ? "field" : "fields"}).` ``, where `n = Object.keys(content).length`. If declined, emit `` `${serverName}: form declined.` ``.
     8. Respond:
        - submit: `{action:"accept", content, _meta:null}`
        - decline: `{action:"decline", content:null, _meta:null}`
        - `"cancelled"`: no response, matching the question handler.
     9. Delete the entry and call `showNextForm(live)` from a `.finally`, as questions do.
- `showNextForm` mirrors `showNextQuestion` with `live.visibleFormId`. It has no auto-resolve timer.
- `clearServerRequests` resolves every form as `"cancelled"`, clears the map and resets `visibleFormId`.
- `serverRequest/resolved` cancels the matching form.
- `respondCodexForm(sessionId, requestId, reply)` resolves the pending entry. It ignores an unknown id, and it ignores a submit whose `content` fails `validateMcpForm` against the stored fields. This is defense in depth: it logs `console.debug("[monocode] codex form rejected invalid reply", {requestId})` with no values and leaves the form pending.

### Invariants
- Form values are never written to a block, a status event, `console.*`, localStorage or the session store. Only the field count appears.
- A form is never accepted without the user clicking Submit, in every runtime mode, plan mode included.
- Confirmation elicitations behave exactly as before, and so does slice 1's scope handling, including its fail-closed one-time approval for unknown shapes.
- A pending form, its draft values and its answers never reach the saved session record, and a form arriving or resolving never changes `persistFingerprint` by itself. Only the status lines added after submit or decline (new blocks without values) are saved.
- Only one form is visible per session at a time. Later forms queue in arrival order.
- If a question and a form are both pending, the composer shows the question first. The form appears after the question resolves.
- An unsupported form is always answered with `cancel` and exactly one status line that states the reason.

## States and transitions
| State | Event | Next | User sees |
|---|---|---|---|
| none | supported form arrives | visible | Form card above the composer: server name, message, fields, Submit and Decline |
| none | second form arrives while one is visible | queued | Nothing new |
| visible | Submit with invalid input | visible | Inline errors under the fields; focus moves to the first invalid field; nothing is sent |
| visible | Submit with valid input | resolved (submitted) | The card closes; the status "<server>: form submitted (N fields)." appears |
| visible | Decline | resolved (declined) | The card closes; the status "<server>: form declined." appears |
| visible | the user stops the turn, Codex restarts, or `serverRequest/resolved` arrives | resolved (cancelled) | The card closes; no status line |
| resolved | a form is queued | visible (next) | The next card appears |
| none | unsupported form arrives | none | The status line with the reason; the server gets `cancel` |

## Acceptance criteria
- **AC-1 (parser, supported).** Given `mode:"form"` and properties `name {type:"string", title:"Name", minLength:2}`, `size {type:"integer", minimum:1, maximum:10, default:3}`, `color {type:"string", oneOf:[{const:"r", title:"Red"}, {const:"g", title:"Green"}]}`, `tags {type:"array", items:{type:"string", enum:["a","b","c"]}, maxItems:2}` and `notify {type:"boolean", default:true}`, with `required:["name","color"]`, then `codexMcpForm` returns `ok` with five fields in that order, with the exact kinds, labels, options and constraints, and `required` set only on name and color.
- **AC-2 (parser, labels).** Given `{type:"string", enum:["x","y"], enumNames:["Ex","Why"]}`, then the options are `[{value:"x", label:"Ex"}, {value:"y", label:"Why"}]`. Given `enumNames` of the wrong length, then the labels equal the values.
- **AC-3 (parser, unsupported).**

  | Input | Reason |
  |---|---|
  | `mode:"url"` | `url` |
  | a property `{type:"object"}` | `field-type` |
  | a string with a `pattern` key | `field-type` |
  | `format:"phone"` | `field-type` |
  | 21 properties | `too-many` |
  | `required:["missing"]` | `shape` |
  | `minLength: 5, maxLength: 2` | `shape` |
  | `enum:[]` | `shape` |
  | a key `api_key` | `secret` |
  | a title "Your password" | `secret` |
  | a key `token` | `secret` |
  | a key `githubAccessToken` | `secret` |
  | a title "PIN" | `secret` |
  | a key `notes`, title "Notes", description "Enter your password" | `secret` |
  | an unknown mode `"foo"` | `shape` |
  | `requestedSchema: true` in `openai/form` mode | `shape` |
- **AC-3a (secret detection, negatives).** Each of these parses as supported (not `secret`): key `token_budget` with title "Token budget"; key `max_tokens`; key `pin_item` with title "Pin this item"; key `note` with description "Pin this item to the top"; key `tokenizer`; key `limit` with description "Token budget for the reply".
- **AC-4 (validation).** For each of these, `validateMcpForm` returns exactly the error or content shown:

  | Field | Draft | Result |
  |---|---|---|
  | required empty text | `"  "` | `Required.` |
  | text with `minLength` 2 | `"a"` | `Use at least 2 characters.` |
  | email | `"a@b"` | `Enter a valid email address.` |
  | uri | `"example.com"` | `Enter a full URL, like https://example.com.` |
  | date | `"2026-02-30"` | `Use the format YYYY-MM-DD.` |
  | integer | `"2.5"` | `Enter a whole number.` |
  | number | `"abc"` | `Enter a number.` |
  | number with `maximum` 10 | `"11"` | `Must be at most 10.` |
  | multi with `maxItems` 2 | `["a","b","c"]` | `Choose at most 2.` |
  | required choice | `""` | `Required.` |

  A valid draft for AC-1's fields, with name `"Al"`, size `"4"`, color `"g"`, tags `["a"]` and notify `false`, gives `content {name:"Al", size:4, color:"g", tags:["a"], notify:false}`. The same draft with tags `[]` omits `tags`.
- **AC-5 (supported flow).**
  1. Given a Codex turn and a supported elicitation with `id` 91, then `form.requested` is emitted with the parsed fields, and no response is sent yet.
  2. When `respondCodexForm(session, uiId, {kind:"submit", content:{name:"Al"}})` is called, then the rpc response to 91 is `{action:"accept", content:{name:"Al"}, _meta:null}`.
  3. `form.resolved {decision:"submitted"}` is emitted, followed by the status "docs: form submitted (1 field)." when `serverName` is "docs".
  4. No event or status contains `"Al"`.
- **AC-6 (decline).** Given a visible form, when the reply is `{kind:"decline"}`, then the response is `{action:"decline", content:null, _meta:null}`, followed by `form.resolved` with `declined` and the status "docs: form declined.".
- **AC-7 (cancel paths).**
  - Given a visible form, when `serverRequest/resolved` arrives for its rpc id, or the turn is stopped (`clearServerRequests`), then `form.resolved` is emitted with `cancelled`, no rpc response is sent for that id, and no status line appears.
  - A later `respondCodexForm` for that `uiId` is a no-op.
- **AC-8 (queue).** Given two supported forms 91 and 92, then only 91's `form.requested` is emitted. After 91 resolves, 92's `form.requested` is emitted.
- **AC-9 (unsupported copy).** Given a URL-mode elicitation from "github", then the response is `cancel`, and exactly one status is emitted: "github asked for a browser sign-in. MonoCode can't show that here, so the request was cancelled. Complete it in the server's own interface." The other reasons use the UI details table.
- **AC-10 (confirmation unchanged).** The existing `codexElicitation.test.ts` cases pass unchanged. A zero-field form and a single-boolean form still produce `approval.requested`, not `form.requested`.
- **AC-11 (invalid reply guard).** Given a visible form with a required `name`, when `respondCodexForm` receives `{kind:"submit", content:{}}`, then no rpc response is sent, the form stays pending, and one `console.debug` is logged with only `requestId`.
- **AC-12 (state).**
  - `applyHarnessEvent` sets `pendingForm` on `form.requested`, and clears it on `form.resolved` only when the ids match.
  - A session with `pendingForm`, passed through `sanitizeSessionForPersist` (`sessionStore.ts:191`), has no `pendingForm` key, and `JSON.stringify` of the sanitized record contains none of the form's field keys, message text or a draft value used in the test.
  - `persistFingerprint({ ...session, pendingForm })` equals `persistFingerprint(session)` for the same `blocks` array, and so does a session whose `pendingForm` changes from one form to another. This follows the existing `busy` test at `sessionStore.test.ts:599`.
  - After `form.requested` and then `form.resolved` are applied through `applyHarnessEvent` with no other event, the fingerprint equals the one before `form.requested`.
- **AC-13 (UI).** With `McpForm` rendered with AC-1's fields:
  - Controls:
    - text renders an `<input type="text">`, or `type="email"`, `"url"`, `"date"` or `"datetime-local"` by format;
    - integer and number fields render `<input type="text" inputmode="decimal">` (`inputmode="numeric"` for integers);
    - boolean renders a checkbox;
    - choice renders a radio group when there are 6 options or fewer, otherwise a `<select>`;
    - multi renders a checkbox group.

    Every control has a `<label>`.
  - Clicking Submit with the name empty shows "Required." under Name, links it with `aria-describedby`, and focuses the Name input. `onReply` is not called.
  - Filling valid values and clicking Submit calls `onReply(requestId, {kind:"submit", content})` once. Double-clicking does not call it twice.
  - Decline calls `onReply(requestId, {kind:"decline"})`.
  - A new `requestId` resets the draft and the errors.
- **AC-14 (composer priority).** Given both `question` and `form` props, then `QuestionForm` renders and `McpForm` does not. When only `form` is set, `McpForm` renders.
- **AC-15 (slice 1 routing preserved).** Given slice 1's AC-9 fixture (empty schema, the verified approval-kind key, `persist` including `session`), then `approval.requested` carries the same `sessionScope` hint as in slice 1's tests and no `form.requested` is emitted. Given slice 1's AC-11 fail-closed fixtures, then the result is still a one-time `approval.requested` with no `sessionScope`. Given a two-field form that also carries the approval-kind `_meta`, then it takes the form path, no `sessionScope` is emitted, no grant is stored, and the accept response has `_meta: null`.

## Ordering contracts
- **Request.** The elicitation arrives, then:
  1. Parse it. This is synchronous.
  2. Unsupported: status, then `cancel` response.
  3. Supported:
     1. Register the pending entry.
     2. `showNextForm` emits `form.requested` only if no other form is visible.
     3. Await the user's reply.
     4. Emit `form.resolved`.
     5. Emit the status (submit or decline only).
     6. Send the rpc response (submit or decline only).
     7. Delete the entry.
     8. `showNextForm`.
- **Stale reply.** A reply for a `uiId` that is no longer in `live.forms` is ignored. A reply that arrives after `serverRequest/resolved` is therefore dropped.
- **Restart.** `clearServerRequests` runs before the live session is dropped, so every open form resolves as `cancelled` and the UI clears.
- **UI.**
  1. Submit runs `validateMcpForm`.
  2. If it fails, set the errors and focus the first invalid field.
  3. If it passes, set `submitting = true`, which disables both buttons, and call `onReply` once.
  4. The card unmounts when `pendingForm` clears.
  5. If the harness rejects the reply (AC-11), the card stays, and `submitting` resets when the `requestId` is unchanged after 2 s. Use a timer that is cleared on unmount.

## Implementation plan
0. Storage check (see blocker). Then the baseline checks and worktree creation in Baseline, dependencies and worktree, and `npm install` in the new worktree. Confirm `git rev-parse HEAD` in the worktree equals `<BASELINE_SHA>` and `git status --short` is empty.
1. `src/features/sessions/model/mcpForm.ts` (new): the types, `initialMcpFormDraft` and `validateMcpForm`. It is pure, with no React.
2. `src/integrations/harness/providers/codex/codexElicitation.ts`: add `codexMcpForm` and `McpFormUnsupportedReason`. Don't change `codexMcpConfirmation` or `isCodexComputerUseAccessConfirmation`.
3. `src/integrations/harness/core/types.ts`: the two events, next to the question events (85-102).
4. `src/features/sessions/model/session.ts:412-416`: `pendingForm`. `src/integrations/harness/core/apply.ts:75-100`: the two cases.
5. `src/integrations/harness/core/registry.ts`: `respondForm?` on the adapter (near `respondQuestion?` at 47) and `respondHarnessForm` (near 299). Export it through `src/integrations/harness/index.ts`.
6. `codex.ts`:
   - `Live` gains `forms: Map<number, PendingForm>` and `visibleFormId: number | null`. Initialize them where `questions: new Map()` is set (557).
   - Extend `clearServerRequests` (300-309) and `serverRequest/resolved` (674-692).
   - Add `showNextForm` next to `showNextQuestion`, and `respondCodexForm` next to `respondCodexQuestion` (280).
   - In the elicitation branch, route `!confirmation` to the form path per the handler order above. Keep the cancelled or muted early return first.
   - Wire `respondForm: respondCodexForm` in `codexAdapter.ts:33`.
7. UI:
   - `src/features/sessions/ui/McpForm.tsx` (new): props `{ prompt: McpFormPrompt; onReply: (requestId: number, reply: McpFormReply) => void }`, with `data-question-form` on the root so the composer focus logic (`Composer.tsx:1050`) treats it like a question.
   - `Composer.tsx`: `form?: McpFormPrompt` and `onFormReply?` props. Render `McpForm` after the `QuestionForm` check (`question ? QuestionForm : form ? McpForm : null`).
   - `SessionPane.tsx:510`: `form={session.pendingForm}` and `onFormReply`.
   - `App.tsx`: `onFormReply` next to `onQuestionReply` (7813). It has the same guard (`!session || session.worktreeRemoved`) and calls `respondHarnessForm`. Also `pendingForm: undefined` at 4292.
8. Tests (see the matrix). The existing test `codexLive.test.ts:1096` ("reports unsupported MCP forms instead of returning an empty success") uses a string field that is now supported. Change only its elicitation fixture to a URL-mode request: `{mode:"url", serverName:"github", elicitationId:"e1", message:"Sign in", url:"https://example.com"}`. Change the status assertion to `expect.stringContaining("browser sign-in")`. Keep every other assertion, including the cancel payload and the id-92 protocol error. Report this change explicitly as a deviation-by-design in your report.

It must not affect: question handling, approvals, slice 1's grants, other providers, or session persistence.

## UI details
Match `QuestionForm`'s card container, header, spacing, text sizes, button classes and focus rings exactly. Read `QuestionForm.tsx` and reuse its class strings; don't introduce new tokens or components.

- Header: `serverName` in the header style, then `message` as body text.
- Fields:
  - Each field has a label (with " (optional)" appended in muted text when not required), its description in muted text, the control, and the error text in the existing danger text style. Don't use `role="alert"`; focus and `aria-describedby` announce the error.
  - Errors are linked with `aria-describedby`, and the control gets `aria-invalid="true"` when it has an error.
- Buttons: "Submit" (primary) and "Decline" (secondary). Enter in a single-line input submits. Esc does nothing, so drafts aren't lost by accident.
- Height: the card scrolls internally past 50 vh.
- Motion: reuse `QuestionForm`'s entrance, if it has one. Otherwise add none. Respect reduced motion.

Error copy (exact):
- "Required."
- "Use at least {n} characters."
- "Use at most {n} characters."
- "Enter a valid email address."
- "Enter a full URL, like https://example.com."
- "Use the format YYYY-MM-DD."
- "Enter a date and time."
- "Enter a number."
- "Enter a whole number."
- "Must be at least {min}."
- "Must be at most {max}."
- "Choose at least {n}."
- "Choose at most {n}."

Unsupported status copy, where `<server>` is the `serverName`:

| Reason | Copy |
|---|---|
| url | "<server> asked for a browser sign-in. MonoCode can't show that here, so the request was cancelled. Complete it in the server's own interface." |
| secret | "<server> asked for a password or secret. MonoCode doesn't collect secrets in forms, so the request was cancelled. Enter it in the server's own interface." |
| field-type | "<server> sent a form with a field type MonoCode can't show yet, so the request was cancelled. Complete it in the server's own interface." |
| too-many | "<server> sent a form with more than 20 fields, so the request was cancelled. Complete it in the server's own interface." |
| shape | "<server> sent a form MonoCode couldn't read, so the request was cancelled. Complete it in the server's own interface." |

## Skills to load
frontend-ui, testing.

## Test matrix
| AC or risk | Level | File | Scenario |
|---|---|---|---|
| AC-1, AC-2, AC-3, AC-3a | unit | `src/integrations/harness/providers/codex/codexElicitation.test.ts` | Table-driven parser cases, including the secret positives and negatives |
| AC-15 | unit and adapter | `codexElicitation.test.ts`; `codexLive.test.ts` | Slice 1's grant and fail-closed fixtures unchanged; a multi-field form with approval-kind `_meta` takes the form path with `_meta: null` |
| AC-4 | unit | `src/features/sessions/model/mcpForm.test.ts` (new) | Table-driven validation; `initialMcpFormDraft` |
| AC-5 to AC-9, AC-11 | adapter | `src/integrations/harness/providers/codex/codexLive.test.ts` | Use the existing `startTurn` / `onLine` / `parse()` harness; assert rpc responses, the event order and that no value appears in any event (`JSON.stringify(events)` does not contain the value) |
| AC-10 | unit and adapter | existing `codexElicitation.test.ts`; `codexLive.test.ts` | Unchanged cases pass; a single-boolean form still yields `approval.requested` |
| AC-12 | unit | `src/integrations/harness/core/apply.test.ts`; `src/features/sessions/data/sessionStore.test.ts` | Set and clear; a mismatched id is kept; `sanitizeSessionForPersist` output has no `pendingForm` and no form text or values; `persistFingerprint` unchanged by `pendingForm` and by a requested-then-resolved pair |
| AC-13 | feature | `src/features/sessions/ui/McpForm.test.ts` (new, happy-dom, same style as `QuestionForm.test.ts`) | Render, the controls per kind, errors, focus, submit once, decline, reset on a new `requestId` |
| AC-14 | feature | `src/features/sessions/ui/Composer.test.ts` (existing) | Priority: both props, then only `form` |
| Existing unsupported test | adapter | `codexLive.test.ts:1096` | Fixture changed to URL mode per Implementation plan step 8 |

## Verification
- Implementer runs:
  - `npx tsc --noEmit`
  - `npx vitest run src/integrations/harness/providers/codex src/features/sessions/model/mcpForm.test.ts src/features/sessions/ui/McpForm.test.ts src/features/sessions/ui/QuestionForm.test.ts src/integrations/harness/core/apply.test.ts src/features/sessions/data/sessionStore.test.ts`
  - `npm test`
  - `git diff --check`

  There is no ESLint config in the repo; report lint as unavailable.
- Later full checks (not the implementer): `npm run check:web` and a packaged build.

## Manual checks (Nakul or a desktop-access Codex session; not the implementer)
1. With an MCP server that sends a multi-field form (for example, a test server using the MCP `elicitation/create` form mode), the card shows every field with the right control. Tab order follows the field order.
2. Submit with a missing required field: the error shows and focus moves to it. Fix it and submit: the tool call continues, and the transcript shows only "form submitted (N fields)".
3. Decline: the server receives a decline, and the transcript shows "form declined".
4. Stop the turn while the form is open: the card disappears, with no stray status line.
4a. With a form open, wait a few seconds, then quit MonoCode and reopen it: the chat shows no form and no typed values, and nothing about the form was saved.
5. A URL-mode sign-in request shows the browser sign-in explanation.
6. Light and dark themes, a narrow window (320 px wide pane), and keyboard-only use.
7. Reload MonoCode: no form or form values reappear.

## Facts, decisions, assumptions
**Facts (verified this session)**
- The Codex 0.159.0 elicitation params and response shapes are as listed in Current behavior (generated schema).
- `openai/form` and `openaiForm` modes declare `requestedSchema` as unconstrained JSON.
- `persistableMeta` is a whitelist that excludes in-memory fields such as `pendingQuestion`.
- `persistFingerprint` is built only from `persistableMeta`, `orchestrationLeadId` and block identities, and `App.tsx` saves only when it changes.
- The existing unsupported-form test uses a now-supported shape.

**Decisions**
- A new event pair and a new `pendingForm` instead of mapping onto `UserQuestion`. The question model can't express required and optional fields, number ranges, formats or booleans, and it records answers in the transcript.
- Values are never stored. The transcript shows only a field count.
- Secret-looking fields cancel the whole form, which matches `codexQuestions`' refusal of `isSecret` questions. Detection uses strong phrases anywhere and weak words (`token`, `pin`, `code`) only as a whole key or title, so harmless fields such as "token budget" or "pin this item" still work.
- Unknown field keywords, such as `pattern`, make the form unsupported rather than silently skipping a constraint MonoCode can't enforce.
- A cap of 20 fields keeps the card usable. Reversible.
- No response is sent on `cancelled`, which mirrors the question handler.

**Assumptions (unverified)**
- Codex forwards server-side form requests with the MCP-standard schema for `mode:"form"`. The `openai/form` variants are assumed to use the same shape when they carry a field schema.
- No real MCP server in Nakul's setup sends forms today, so live coverage depends on manual check 1 with a test server.

## Open questions
1. Should URL-mode sign-ins offer an "Open in browser" button later? Out of scope here, and it needs a URL allowlist decision.

## Implementer report format
Per AC: done / partial / not done, with file:line or test name · deviations and why (including the planned change to `codexLive.test.ts:1096`) · open questions · checks run with exact results · files changed · the manual checklist above, unchanged, as a follow-up.

## Handoff prompt
Use only after Nakul approves this contract, moves it to Todo and fills in `<BASELINE_SHA>` and `a65bd4e4b0c2742cd0fc54a4087358471efc3888`.

```text
Implement umbrella slice 6 of the provider batch: Codex MCP forms.

Spec: E:\Developing\OpenSource\mono-clone\docs\specs\codex-mcp-forms.md

1. Read, by absolute path from the main checkout (they are git-ignored, so the new worktree won't have them; don't copy them and never git add -f them):
   E:\Developing\OpenSource\mono-clone\.agents\PROFILE.local.md, E:\Developing\OpenSource\mono-clone\AGENTS.md, E:\Developing\OpenSource\mono-clone\docs\WORKING-AGREEMENT.md,
   E:\Developing\OpenSource\mono-clone\docs\changelog\CHANGELOG.md (then its Current numbered file), E:\Developing\OpenSource\mono-clone\docs\specs\SPECS.md,
   E:\Developing\OpenSource\mono-clone\docs\WINDOWS-CHANGES.md, then the spec above.
2. Baseline: <BASELINE_SHA> on nakul/windows-support, containing the umbrella baseline checkpoint and slices 1, 2, 4, 3 and 5 integrated and verified.
   Checkpoint: a65bd4e4b0c2742cd0fc54a4087358471efc3888. Dependencies: see "Baseline, dependencies and worktree" in the spec.
   Run every check in that section. If one fails, stop and report Blocked.
3. Storage-full hard blocker (mandatory): Before installs, builds or large test runs, check free space on every required drive, including TEMP/TMP, caches and Cargo/build outputs. If storage is full, a write fails with ENOSPC, disk-full or insufficient space, or the verified space cannot support the operation, stop task work immediately. Do not retry, keep editing, relocate temp/cache/output directories or delete anything automatically. Safely cancel task-owned operations and preserve existing work. Report the affected drive/path, the measured space or error, the last completed step and the remaining work. Mark this spec and its index row Blocked only if that is safe to write; otherwise report Blocked without further writes. Resume only after space is restored and rechecked and partial outputs are assessed. Any cleanup needs Nakul's explicit authorization.
4. After the storage check, you are authorized to create exactly one worktree from the verified baseline:
   git -C E:\Developing\OpenSource\mono-clone worktree add E:\Developing\OpenSource\mono-clone-codex-mcp-forms -b feature/codex-mcp-forms <BASELINE_SHA>
   If the path or branch already exists, stop and ask. Run npm install inside that worktree only. Work only there.
5. Load the skills listed in the spec and the spec-implement skill.
6. Set this spec's status to Progress (its heading and its row in the main-checkout SPECS.md) when you start, Review when you finish,
   or Blocked with the reason if you stop.
7. Implement the spec exactly. Run its Verification commands in the worktree.
8. Add the changelog entry to the Current numbered changelog file in the main checkout (Commit: uncommitted).
9. Don't commit, push, merge, build a package, run native desktop or smoke tests, or drive the Tauri window.
   Don't touch the main checkout's source, mono-clone-hari, mono-clone-remote or the stashes.
10. Report in the spec's Implementer report format. Copy the spec's Manual checks unchanged as a separate follow-up for Nakul;
    they are not your task.
```

## Handoff retro
- Nakul's combined batch prompt superseded the baseline and worktree checks. The required `mcpToolGrant` dependency grep at `HEAD` passed before implementation.
- Implemented the form parser and validator, in-memory lifecycle, Codex request queue and response path, and form UI. The partial implementation is preserved in `docs/notes/codex-mcp-forms-partial.patch`; no source changes remain in the checkout.
- Focused verification passed: 12 files, 347 tests. `npx tsc --noEmit` passed before restoring the feature changes.
- Full `npm test` failed: 337 files, 3,807 tests; 3,806 passed and one unchanged test failed at `src/features/sessions/ui/Composer.test.ts` (`preserves attachment ownership when a resend is restored`, `.click` on null). Running that test alone passed (1 passed, 17 skipped), confirming the full-suite-only failure. Per Nakul's batch instructions, the feature is Blocked, not committed, and its changes were restored.
