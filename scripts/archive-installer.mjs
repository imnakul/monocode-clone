#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Primary archive destination is E:\Developing\Installable versions
// Fallback to releases/ in repo root if external drive is unavailable
const defaultTargetDir = process.platform === "win32" && existsSync("E:\\Developing")
  ? "E:\\Developing\\Installable versions"
  : join(root, "releases");

const targetDir = process.env.INSTALLER_ARCHIVE_DIR || defaultTargetDir;

const bundleCandidates = [
  join(root, "target", "release", "bundle", "nsis"),
  join(root, "src-tauri", "target", "release", "bundle", "nsis"),
  join(root, "target", "release", "bundle", "msi"),
  join(root, "src-tauri", "target", "release", "bundle", "msi"),
];

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

let foundAny = false;

for (const bundleDir of bundleCandidates) {
  if (!existsSync(bundleDir)) continue;

  const files = readdirSync(bundleDir);
  for (const file of files) {
    if (!file.endsWith(".exe") && !file.endsWith(".msi")) continue;

    const sourcePath = join(bundleDir, file);
    const destPath = join(targetDir, file);
    const sourceStats = statSync(sourcePath);

    let needsCopy = true;
    if (existsSync(destPath)) {
      const destStats = statSync(destPath);
      if (destStats.size === sourceStats.size && Math.abs(destStats.mtimeMs - sourceStats.mtimeMs) < 2000) {
        needsCopy = false;
        console.log(`[archive] Already up to date: ${file}`);
      }
    }

    if (needsCopy) {
      copyFileSync(sourcePath, destPath);
      console.log(`[archive] Copied ${file} -> ${destPath} (${(sourceStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
    foundAny = true;
  }
}

if (!foundAny) {
  console.warn(`[archive] No installer executables found in target release bundle directories.`);
}
