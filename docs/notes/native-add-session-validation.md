# Native Add session validation handoff

Follow the **Human Windows verification** checklist in
[native-add-session-plan.md](../specs/native-add-session-plan.md).

Report for each provider: CLI/Desktop version, Default/named account, input
kind (ID/command), whether old text loads, whether the phrase is recalled,
whether native ID stays identical, and whether the provider-app round trip
shows each message once. Do not share account tokens or private transcript
contents. Include any exact error and whether another process still had the
same conversation open.

Include one Windows drive-path restore/reopen check and, if used, a network
share project. Different slash/case spelling must keep the same session ID;
different project/account/provider must still be rejected.

This is native resume, not migration. A supported local store and a released
writer are prerequisites. Cloud links, public shared conversations,
Antigravity and OpenCode are outside this feature.

## Related question: OpenCode Fast mode (research only)

OpenCode documents [model variants](https://opencode.ai/docs/models/) and
the [`--variant` CLI option](https://opencode.ai/docs/cli/). Variants can
bundle provider/model options; low reasoning and priority processing are
different controls. Faster/priority processing still depends on the backend,
model and account, including any authentication plugin's option forwarding.

MonoCode already discovers OpenCode variant names and sends the chosen name
in its native `prompt_async` / message API request. Its existing effort picker
shows those variants. A configured `fast` variant advertised by OpenCode can
therefore be selected here; its name alone does not prove priority processing.
OpenCode's catalog integration does not currently publish a separate `fast`
or `serviceTier` setting for MonoCode's dedicated Speed pill. No OpenCode code
or user's provider configuration was changed for this research.

Source evidence: `opencodeCatalog.ts` (`openCodeModelSettings`),
`opencodeClient.ts` (`promptAsync` / `prompt`), `opencode.ts` (variant
forwarding), `models.ts` (`EFFORT_SETTING_IDS`) and `ModelPicker.tsx`
(`isSpeedSetting`). A CLI/backend trace on the user's machine is needed to
verify actual priority-tier acceptance for that installed model/account.
