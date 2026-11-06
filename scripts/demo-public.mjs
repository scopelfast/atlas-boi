/**
 * Sobe o frontend em modo produção (estável para túnel ngrok / celular).
 * O modo `npm run dev` + túnel causa Fast Refresh e erros de DOM no React.
 *
 * Uso:
 *   Terminal 1: cd backend && npm run dev
 *   Terminal 2: npm run demo        (na raiz)
 *   Terminal 3: npm run tunnel:ngrok
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const frontend = join(root, "frontend");
const buildId = join(frontend, ".next", "BUILD_ID");

function portOpen(port) {
  return new Promise((resolve) => {
    const s = createConnection({ port, host: "127.0.0.1" }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(1500, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}`));
    });
  });
}

async function main() {
  const backendUp = await portOpen(3004);
  if (!backendUp) {
    console.error("\n[erro] Backend não está na porta 3004.");
    console.error("Suba antes: cd backend && npm run dev\n");
    process.exit(1);
  }

  if (!existsSync(buildId)) {
    console.log("\n[build] Compilando frontend (primeira vez ou após mudanças)…\n");
    await run("npm", ["run", "build"], frontend);
  } else {
    console.log("\n[info] Build existente — use npm run demo:build para recompilar após mudanças no código.\n");
  }

  console.log("[ok] Iniciando frontend em modo produção (porta 3000)…");
  console.log("[ok] Depois rode: npm run tunnel:ngrok\n");

  const child = spawn("npm", ["run", "start"], {
    cwd: frontend,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
