/**
 * Encerra processos nas portas 3000 (frontend) e 3004 (backend).
 * Uso: npm run demo:stop
 */
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ensure = join(__dirname, "ensure-port-free.mjs");

function free(port) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [ensure, String(port)], { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  console.log("\n[stop] Liberando portas 3000 e 3004…\n");
  await free(3000);
  await free(3004);
  console.log("\n[ok] Portas liberadas. Agora rode: npm run demo:full:cf\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
