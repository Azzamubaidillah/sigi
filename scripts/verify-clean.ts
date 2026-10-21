import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-clean-"));
const archivePath = path.join(temporaryRoot, "sigi.tar");
const checkoutPath = path.join(temporaryRoot, "checkout");
const localNodeRoot = path.dirname(path.dirname(process.execPath));
const commandEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  CI: "1",
  SIGI_DATA_DIR: path.join(temporaryRoot, "data"),
  SIGI_ENABLED_SOURCES: "",
  SIGI_PASSCODE_HASH: "",
  SIGI_SESSION_SECRET: "",
};
if (fs.existsSync(path.join(localNodeRoot, "include/node"))) {
  commandEnvironment.npm_config_nodedir = localNodeRoot;
}
fs.mkdirSync(checkoutPath, { mode: 0o700 });

function run(command: string, args: string[], cwd: string): void {
  execFileSync(command, args, {
    cwd,
    env: commandEnvironment,
    stdio: "inherit",
  });
}

try {
  run(
    "git",
    ["archive", "--format=tar", `--output=${archivePath}`, "HEAD"],
    process.cwd(),
  );
  run("tar", ["-xf", archivePath, "-C", checkoutPath], process.cwd());
  run(
    "corepack",
    ["pnpm", "install", "--frozen-lockfile", "--prefer-offline"],
    checkoutPath,
  );
  run("corepack", ["pnpm", "verify"], checkoutPath);
  console.log(
    "✓ committed repository passes install and verification in a clean tree",
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
