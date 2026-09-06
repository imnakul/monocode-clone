#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if monocode_lib::antigravity_acp::handle_auth_url_args(
        &std::env::args_os().skip(1).collect::<Vec<_>>(),
        &mut std::io::stderr().lock(),
    ) {
        return;
    }
    #[cfg(all(debug_assertions, target_os = "macos"))]
    monocode_lib::ensure_macos_dev_bundle();
    monocode_lib::run()
}
