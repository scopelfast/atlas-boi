/**
 * Sobe o frontend com cache limpo (.next) — use quando aparecer
 * "layout.js: Invalid or unexpected token" no navegador.
 */
import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, ".next");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("[dev:fresh] Pasta .next removida.");
}

execSync("node ../scripts/ensure-port-free.mjs 3000", { cwd: root, stdio: "inherit" });
execSync("npx next dev -p 3000", { cwd: root, stdio: "inherit" });
