# MonoCode exits after power loss — diagnostic record

- Checked: 2026-10-02 15:46 IST.
- Status: unresolved; current launch stayed alive and responsive for more than five minutes. No recovery or app/source change performed.
- Report: installed MonoCode closes after roughly one minute, including when left untouched; previously worked before an unexpected power shutdown.
- Checkout: `nakul/windows-support-upstream-0.6.0`, HEAD `a87a5f7`. Existing modified `src-tauri/Cargo.toml` left untouched.
- Installed executable: `E:\Installed\MonoCode\monocode.exe`, product/file version `0.1.55-local5-provider-fixes`, 30,228,992 bytes, modified 1 Oct 18:04:46 IST.

## Findings

1. Windows Kernel-Power 41 and EventLog 6008 confirm the unexpected shutdown and subsequent reboot on 2 October. Those establish the incident, not the cause of later app exits.
2. Installed executable and `target/release/monocode.exe` are identical except for three bytes inside the Tauri bundle-type marker at offsets 24,305,856–24,305,858: `UNK` in the build becomes `NSS` in the installed binary. There is no evidence of arbitrary executable corruption in this comparison.
3. Changing the repository branch does not replace this separately installed executable. Source review of the installed baseline used `git show c2c8bf6`, rather than treating the newer checkout as the installed code.
4. Read-only SQLite checks on `%APPDATA%\com.monocode.desktop\monocode.db`: `integrity_check` returned `ok`; `foreign_key_check` returned no violations; 149 sessions, all `blocks_json` values valid JSON. Custom migration table contains versions 1–18, matching local5. No in-flight session rows. No database repair, checkpoint, migration or write query executed.
5. Existing `.bak` database/WAL files dated 13:40 IST were present before this investigation. Their provenance is unknown; they were not restored or changed.
6. Application log contains no MonoCode/WebView Application Error 1000, WER 1001 or Hang 1002 since the incident. EdgeWebView 256 entries contain routine INFO messages about extension garbage collection, not crash reports. Empty rendered messages were resolved by reading event XML.
7. Three WebView Crashpad dumps in this app's profile all date to 24 September. No fresh dump was found. Local Storage LevelDB logs show normal recovery/reuse and no reported corruption. These observations do not exclude a WebView failure; absent dumps are not proof of absence.
8. Required drives have available space: C: approximately 28 GiB, E: approximately 18 GiB. No relevant disk/NTFS, display-driver-reset or resource-exhaustion event was found in the inspected System log window. No matching Defender detection/block event was found in the queried IDs.
9. PID 20256, launched at 15:41:18 IST, stayed alive and responsive at 15:46:06. Nakul confirmed its window was still visible at approximately 15:45. The investigator did not restart, drive, hide, close or otherwise operate the app window.
10. At 15:48:27 the same installed PID was still responsive. A separate development instance, PID 11180, had started at 15:48:15 from `E:\Developing\OpenSource\mono-clone\target\debug\monocode.exe`. It was not launched by this investigation. Track the executable path as well as the process name; the preceding database checks were completed before this development instance started.

## What this establishes

Database structural corruption, schema incompatibility and disk exhaustion are unsupported by the current checks. The installed executable still corresponds to the local5 build. The earlier exits remain unexplained: no failure was reproduced during this investigation and there is no contemporary crash stack or exit code.

Transient Windows/WebView state after the power loss is a possibility, not a confirmed diagnosis. Do not reset the database, erase the profile or claim a fix based on the current evidence.

## Follow-up if it recurs

- Manual verification belongs to Nakul: leave the current launch idle for 10–15 minutes, then try one normal close/reopen and the usual chat flow. Record the exact disappearance time.
- Distinguish a vanished window from process termination. Check whether the same `monocode.exe` PID remains when the window disappears.
- Capture the existing process's exit code passively before it exits, using a separate PowerShell window. This does not launch, close or kill MonoCode:

```powershell
$observedMonoCode = Get-Process -Name monocode -ErrorAction Stop |
    Where-Object { $_.Path -eq 'E:\Installed\MonoCode\monocode.exe' }
if (@($observedMonoCode).Count -ne 1) { throw 'Expected one MonoCode process; select the intended PID first.' }
$observedMonoCode.WaitForExit()
Write-Output ('MonoCode exited at {0:o}; exit code {1}' -f (Get-Date), $observedMonoCode.ExitCode)
```

- Recheck Application Error/WER events and app-specific Crashpad dump timestamps immediately after the next failure. If it is an actual WebView failure, use its failure reason/dump to choose a targeted recovery; if it is a clean native exit, inspect the close/quit path.
- Any temporary GPU/profile isolation run is a separate manual diagnostic step. Preserve the existing WebView profile and all database files before considering recovery. Microsoft documents runtime process failure handling at <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-related-events>.

## Verification limits

Read-only runtime, database, binary and source investigation only. No typecheck, lint, tests, build, installer, commit or push; no runtime code changed. SocratiCode status was attempted once; Qdrant was unavailable, so discovery used exact source searches. No indexing/configuration changes.
