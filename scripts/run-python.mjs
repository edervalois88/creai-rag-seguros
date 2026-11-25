import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const local =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const binary =
  process.env.DEMO_PYTHON ?? (existsSync(local) ? local : "python");
const result = spawnSync(binary, ["-X", "utf8", ...process.argv.slice(2)], {
  stdio: "inherit",
});
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exitCode = result.status ?? 1;
