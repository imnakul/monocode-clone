//! Google's official ACP runtime and isolated personal-account launch contract.
//! Runtime archives: https://github.com/agentclientprotocol/registry/tree/main/antigravity-acp
//! Launch/profile contract: pingdotgg/t3code, antigravityAuthSupport.ts (2026-09-05).
use std::ffi::OsString;
use std::io::{BufRead, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

pub(crate) const AUTH_ARG: &str = "--antigravity-auth-url";
pub(crate) const AUTH_MARKER: &str = "__MONOCODE_ANTIGRAVITY_AUTH_URL__";
const AUTH_PREFIX: &str = "Open the following link to authenticate the ACP server: ";
pub(crate) const SIGN_IN_REQUIRED: &str = "Sign in to Antigravity in Settings before you continue.";
pub(crate) const INSTALL_HELP: &str = "Antigravity ACP runtime is missing or incomplete. Download the archive for your OS and architecture from https://github.com/agentclientprotocol/registry/blob/main/antigravity-acp/agent.json, extract the complete archive, and select agy_acp_server.exe (Windows) or agy_acp_server.par (macOS/Linux) in Settings. Keep localharness_external.exe (Windows) or localharness_external beside it from the same release. Alternatively add that directory to PATH. The agy CLI and Antigravity IDE are not ACP runtimes.";

pub(crate) fn executable_name() -> &'static str {
    if cfg!(windows) { "agy_acp_server.exe" } else { "agy_acp_server.par" }
}

fn helper_name() -> &'static str {
    if cfg!(windows) { "localharness_external.exe" } else { "localharness_external" }
}

/// Windows filenames are case insensitive; Unix executable names are not.
pub(crate) fn is_runtime_path(path: &Path) -> bool {
    let name = path.file_name().and_then(|name| name.to_str()).unwrap_or_default();
    if cfg!(windows) { name.eq_ignore_ascii_case(executable_name()) } else { name == executable_name() }
}

/// Follow symlinks for sibling lookup, so a PATH symlink still uses its own release's helper.
/// Manual installs retain responsibility for archive provenance and matching release integrity.
pub(crate) fn validate_runtime(path: &Path) -> Result<PathBuf, String> {
    if !is_runtime_path(path) {
        return Err(format!("Select the official {} ACP executable, not a legacy CLI or IDE. {INSTALL_HELP}", executable_name()));
    }
    if !crate::harness::is_executable_file(path) {
        return Err(format!("Antigravity ACP executable is not a launchable file: {}. {INSTALL_HELP}", path.display()));
    }
    let real = std::fs::canonicalize(path)
        .map_err(|_| "Could not resolve the Antigravity ACP executable.".to_string())?;
    let helper = real.parent().ok_or("Antigravity runtime has no parent directory.")?.join(helper_name());
    if !crate::harness::is_executable_file(&helper) {
        return Err(format!("Antigravity ACP helper is missing or not executable: {}. Extract both files from the same official release. {INSTALL_HELP}", helper.display()));
    }
    Ok(helper)
}

/// Python's webbrowser parses BROWSER using shlex, after splitting on the OS path separator.
pub(crate) fn browser_command(executable: &Path) -> Result<String, String> {
    let executable = executable.to_str().ok_or("MonoCode executable path is not UTF-8.")?;
    let executable = if cfg!(windows) { executable.replace('\\', "/") } else { executable.to_owned() };
    if executable.contains(if cfg!(windows) { ';' } else { ':' })
        || executable.contains(['\r', '\n', '\0'])
        || executable.contains("%s")
    {
        return Err("MonoCode executable path cannot safely suppress Antigravity browser launches. Move MonoCode to a path without path separators, newlines or %s.".into());
    }
    let quote = |value: &str| format!("'{}'", value.replace('\'', "'\"'\"'"));
    Ok([executable.as_str(), AUTH_ARG, "%s"].map(quote).join(" "))
}

const REMOVED_ENV: &[&str] = &[
    "GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "GOOGLE_CLOUD_QUOTA_PROJECT",
    "GOOGLE_GENAI_USE_VERTEXAI", "GCLOUD_PROJECT", "CLOUDSDK_CORE_PROJECT",
    "AGY_ACP_CCPA_PROJECT", "AGY_ACP_ENABLE_OAUTH", "GEMINI_HOME",
    "AGY_ACP_FORCE_FILE_STORAGE", "ANTIGRAVITY_HARNESS_PATH", "BROWSER",
    "PYTHONUNBUFFERED", "ELECTRON_RUN_AS_NODE",
];

pub(crate) fn profile_directory() -> Result<PathBuf, String> {
    let home = crate::dirs_home().ok_or("Cannot determine home directory for the Antigravity profile.")?;
    let profile = PathBuf::from(home).join(".monocode/providers/antigravity");
    if !profile.is_absolute() {
        return Err("Antigravity requires an absolute HOME or Windows user-profile directory.".into());
    }
    Ok(profile)
}

/// Prepare only MonoCode's personal profile; never read or copy IDE/CLI credentials.
pub(crate) fn configure(
    cmd: &mut Command,
    executable: &Path,
    profile: &Path,
    browser_executable: &Path,
) -> Result<(), String> {
    let helper = validate_runtime(executable)?;
    let browser = browser_command(browser_executable)?;
    if !profile.is_absolute() {
        return Err("Antigravity profile directory must be absolute.".into());
    }
    let acp = profile.join("antigravity-acp");
    for directory in [profile, acp.as_path()] {
        std::fs::create_dir_all(directory)
            .map_err(|_| "Could not create the private Antigravity profile directory.".to_string())?;
        #[cfg(unix)] {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(directory, std::fs::Permissions::from_mode(0o700))
                .map_err(|_| "Could not secure the Antigravity profile directory.".to_string())?;
        }
    }
    // Serialize in-process launches so readers never race another launch's settings write.
    static SETTINGS_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = SETTINGS_LOCK.lock().map_err(|_| "Antigravity profile settings lock failed.")?;
    let settings = acp.join("settings.json");
    let expected = "{\"auth\":{\"type\":\"oauth-personal\"}}\n";
    if std::fs::read_to_string(&settings).ok().as_deref() != Some(expected) {
        std::fs::write(&settings, expected)
            .map_err(|_| "Could not write Antigravity personal sign-in settings.".to_string())?;
    }
    // Scrub inherited names and explicitly configured aliases, including mixed-case Windows keys.
    let keys: Vec<OsString> = std::env::vars_os().map(|(key, _)| key)
        .chain(cmd.get_envs().map(|(key, _)| key.to_owned())).collect();
    for key in keys {
        if REMOVED_ENV.contains(&key.to_string_lossy().to_ascii_uppercase().as_str()) {
            cmd.env_remove(key);
        }
    }
    for key in REMOVED_ENV { cmd.env_remove(key); }
    cmd.env("GEMINI_HOME", profile)
        .env("AGY_ACP_FORCE_FILE_STORAGE", "1")
        .env("ANTIGRAVITY_HARNESS_PATH", helper)
        .env("PYTHONUNBUFFERED", "1")
        .env("BROWSER", browser);
    #[cfg(target_os = "linux")]
    cmd.arg("--uid=");
    Ok(())
}

/// Handle the browser helper before initializing Tauri. Broken pipes must exit successfully.
/// URL validation and explicit browser opening belong to the frontend sign-in flow.
pub fn handle_auth_url_args(args: &[OsString], writer: &mut impl Write) -> bool {
    if args.first().is_none_or(|arg| arg != AUTH_ARG) {
        return false;
    }
    if args.len() == 2 {
        if let Some(url) = args[1].to_str().filter(|url| url.len() <= 16_384) {
            if let Ok(json) = serde_json::to_string(url) {
                let _ = writeln!(writer, "{AUTH_MARKER}{json}");
                let _ = writer.flush();
            }
        }
    }
    true
}

/// Consume only bounded stdout and a correlated ACP v1 initialize result. Never echo raw diagnostics.
pub(crate) fn read_initialize_response(mut reader: impl BufRead) -> Result<Option<String>, String> {
    const MAX_BYTES: usize = 1024 * 1024;
    let mut total = 0;
    loop {
        let mut line = Vec::new();
        let count = std::io::Read::take(&mut reader, (MAX_BYTES - total + 1) as u64)
            .read_until(b'\n', &mut line)
            .map_err(|_| "Could not read Antigravity ACP initialize response.")?;
        total += count;
        if total > MAX_BYTES { return Err("Antigravity ACP probe output exceeded its limit.".into()); }
        if count == 0 { return Err("Antigravity did not return an ACP initialize response.".into()); }
        let text = String::from_utf8_lossy(&line);
        if text.starts_with(AUTH_PREFIX) || text.starts_with(AUTH_MARKER) {
            return Err(SIGN_IN_REQUIRED.into());
        }
        let Ok(message) = serde_json::from_slice::<serde_json::Value>(&line) else { continue };
        if message.get("id") != Some(&serde_json::json!(1)) { continue; }
        let result = &message["result"];
        if message["jsonrpc"] != "2.0" || message.get("error").is_some()
            || result["protocolVersion"] != 1
            || result["agentInfo"]["name"] != "antigravity-acp"
            || !result["agentCapabilities"].is_object()
        {
            return Err("Runtime did not identify as the official Antigravity ACP v1 agent. Check the installed runtime release.".into());
        }
        return Ok(result["agentInfo"]["version"].as_str().map(|version| version.chars().take(200).collect()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsString;
    use std::io::Cursor;

    fn fixture() -> PathBuf {
        let path = std::env::temp_dir().join(format!("monocode-acp-profile-{}", std::process::id()));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    // Browser command parsing must preserve spaces, apostrophes and Windows drive letters.
    #[test]
    fn antigravity_acp_browser_command_quotes_native_helper() {
        let executable = if cfg!(windows) { r"C:\Program Files\Mono's Code\monocode.exe" } else { "/opt/Mono's Code/monocode" };
        let command = browser_command(Path::new(executable)).unwrap();
        let expected = if cfg!(windows) {
            "'C:/Program Files/Mono'\"'\"'s Code/monocode.exe' '--antigravity-auth-url' '%s'"
        } else {
            "'/opt/Mono'\"'\"'s Code/monocode' '--antigravity-auth-url' '%s'"
        };
        assert_eq!(command, expected);
    }

    #[test]
    fn antigravity_acp_browser_command_rejects_python_separator_and_substitution() {
        for path in ["/app/%s/monocode", "/app/\n/monocode", if cfg!(windows) { "C:/bad;path/app.exe" } else { "/bad:path/app" }] {
            assert!(browser_command(Path::new(path)).is_err(), "{path:?}");
        }
    }

    // The helper must consume the argument and emit JSON safely without running the GUI.
    #[test]
    fn antigravity_acp_browser_helper_emits_marker() {
        let mut output = Vec::new();
        let args = [OsString::from("--antigravity-auth-url"), OsString::from("https://example.invalid/?x=\"quoted\"")];
        assert!(handle_auth_url_args(&args, &mut output));
        assert_eq!(String::from_utf8(output).unwrap(), "__MONOCODE_ANTIGRAVITY_AUTH_URL__\"https://example.invalid/?x=\\\"quoted\\\"\"\n");
        assert!(!handle_auth_url_args(&[], &mut Vec::new()));
    }

    #[test]
    fn antigravity_acp_browser_helper_consumes_invalid_args_and_broken_pipe() {
        struct Broken;
        impl Write for Broken {
            fn write(&mut self, _: &[u8]) -> std::io::Result<usize> { Err(std::io::ErrorKind::BrokenPipe.into()) }
            fn flush(&mut self) -> std::io::Result<()> { Ok(()) }
        }
        assert!(handle_auth_url_args(&[OsString::from("--antigravity-auth-url")], &mut Broken));
        assert!(handle_auth_url_args(&[OsString::from("--antigravity-auth-url"), OsString::from("https://example.invalid")], &mut Broken));
    }

    // Ambient credentials or helper overrides must never select another account/runtime.
    #[test]
    fn antigravity_acp_configures_isolated_profile_and_matching_helper() {
        let root = fixture();
        let runtime = root.join(if cfg!(windows) { "AGY_ACP_SERVER.EXE" } else { "agy_acp_server.par" });
        let helper = root.join(if cfg!(windows) { "localharness_external.exe" } else { "localharness_external" });
        for path in [&runtime, &helper] {
            std::fs::write(path, b"fixture").unwrap();
            #[cfg(unix)] {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700)).unwrap();
            }
        }
        let profile = root.join("profile");
        let mut cmd = Command::new(&runtime);
        cmd.env("gEmInI_aPi_KeY", "do-not-inherit");
        cmd.env("GOOGLE_APPLICATION_CREDENTIALS", "do-not-inherit");
        cmd.env("ANTIGRAVITY_HARNESS_PATH", "wrong-helper");
        configure(&mut cmd, &runtime, &profile, &runtime).unwrap();
        let env: std::collections::HashMap<_, _> = cmd.get_envs().map(|(k,v)| (k.to_string_lossy().to_uppercase(), v.map(|s| s.to_os_string()))).collect();
        assert_eq!(env.get("GEMINI_API_KEY"), Some(&None));
        assert_eq!(env.get("GOOGLE_APPLICATION_CREDENTIALS"), Some(&None));
        assert_eq!(env.get("GEMINI_HOME"), Some(&Some(profile.as_os_str().to_owned())));
        assert_eq!(env.get("AGY_ACP_FORCE_FILE_STORAGE"), Some(&Some(OsString::from("1"))));
        let actual_helper = env.get("ANTIGRAVITY_HARNESS_PATH").unwrap().as_ref().unwrap();
        assert_eq!(std::fs::canonicalize(actual_helper).unwrap(), std::fs::canonicalize(&helper).unwrap());
        assert_eq!(serde_json::from_str::<serde_json::Value>(&std::fs::read_to_string(profile.join("antigravity-acp/settings.json")).unwrap()).unwrap(), serde_json::json!({"auth":{"type":"oauth-personal"}}));
        let args: Vec<_> = cmd.get_args().collect();
        assert_eq!(args, if cfg!(target_os = "linux") { vec![std::ffi::OsStr::new("--uid=")] } else { vec![] });
        std::fs::remove_dir_all(root).unwrap();
    }

    // Availability requires the real ACP initialize response, not help text.
    #[test]
    fn antigravity_acp_probe_accepts_initialize() {
        let wire = b"startup noise\n{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"protocolVersion\":1,\"agentInfo\":{\"name\":\"antigravity-acp\",\"version\":\"agy_acp_server_1.1.1\"},\"agentCapabilities\":{}}}\n";
        assert_eq!(read_initialize_response(Cursor::new(wire)).unwrap(), Some("agy_acp_server_1.1.1".into()));
    }

    #[test]
    fn antigravity_acp_probe_rejects_legacy_wrong_agent_errors_and_login_without_leaking_urls() {
        for wire in [
            "--input-format --output-format stream-json\n",
            "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"protocolVersion\":1,\"agentInfo\":{\"name\":\"other\"},\"agentCapabilities\":{}}}\n",
            "{\"jsonrpc\":\"2.0\",\"id\":1,\"error\":{\"message\":\"https://secret.invalid\"}}\n",
            "Open the following link to authenticate the ACP server: https://secret.invalid\n",
        ] {
            let error = read_initialize_response(Cursor::new(wire)).unwrap_err();
            assert!(!error.contains("secret.invalid"));
        }
    }
}
