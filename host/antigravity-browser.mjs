// Python's webbrowser invokes this shim. The ACP client recognizes this marker
// and asks the user to sign in explicitly, without opening a browser on a host.
process.stdout.write(
  `__MONOCODE_ANTIGRAVITY_AUTH_URL__${JSON.stringify(process.argv[2] ?? "")}\n`,
);
