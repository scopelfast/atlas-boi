/**
 * Sobe backend + frontend (produção) + túnel em um único terminal.
 *
 * Uso:
 *   npm run demo:full           — túnel auto
 *   npm run demo:full:ngrok     — ngrok (para tudo, rebuild, sobe limpo)
 *   npm run demo:full:cf        — cloudflared (para tudo, rebuild, sobe limpo)
 *   npm run demo:stop           — só libera portas 3000/3004
 *
 * --fresh (padrão nos scripts :ngrok e :cf): mata 3000/3004, rebuild, sobe de novo.
 * Ctrl+C encerra túnel e processos que este script iniciou.
 */
import { spawn, execSync } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const backendDir = join(root, "backend");
const frontendDir = join(root, "frontend");
const buildId = join(frontendDir, ".next", "BUILD_ID");
const ensurePortFree = join(__dirname, "ensure-port-free.mjs");

const BACKEND_PORT = 3004;
const FRONTEND_PORT = Number(process.env.TUNNEL_PORT || 3000);
const FRESH = process.argv.includes("--fresh") || process.env.DEMO_FRESH === "1";

/** @type {{ child: import("node:child_process").ChildProcess; owned: boolean }[]} */
const processes = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function waitForPort(port, label, maxMs = 90000) {
  const start = Date.now();
  process.stdout.write(`[aguarde] ${label} (porta ${port})`);
  while (Date.now() - start < maxMs) {
    if (await portOpen(port)) {
      process.stdout.write(" — ok\n");
      return true;
    }
    process.stdout.write(".");
    await sleep(800);
  }
  process.stdout.write(" — timeout\n");
  return false;
}

function freePort(port) {
  try {
    execSync(`node "${ensurePortFree}" ${port}`, { stdio: "inherit" });
  } catch {
    /* ignore */
  }
}

function killTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    /* processo já encerrado */
  }
}

function cleanup() {
  for (const { child, owned } of processes) {
    if (owned) killTree(child);
  }
}

function spawnOwned(command, cwd) {
  const child = spawn(command, {
    cwd,
    stdio: "inherit",
    shell: true,
  });
  processes.push({ child, owned: true });
  child.on("error", (err) => {
    console.error(`[erro] Falha ao iniciar:`, err.message);
  });
  return child;
}

function runSync(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exit ${code}`));
    });
  });
}

function tunnelArgsFromArgv() {
  const args = [];
  if (process.argv.includes("--ngrok")) args.push("--ngrok");
  if (process.argv.includes("--cloudflared")) args.push("--cloudflared");
  return args;
}

function cleanFrontendBuild() {
  const nextDir = join(frontendDir, ".next");
  if (!existsSync(nextDir)) return;
  rmSync(nextDir, { recursive: true, force: true });
  console.log("[fresh] Pasta frontend/.next removida (evita erro nft.json no Windows).");
}

async function prepareFreshStart() {
  if (!FRESH) return;

  console.log("[fresh] Encerrando processos antigos nas portas 3000 e 3004…");
  freePort(FRONTEND_PORT);
  freePort(BACKEND_PORT);
  await sleep(1500);

  cleanFrontendBuild();

  console.log("\n[build] Recompilando frontend (modo produção)…\n");
  await runSync("npm run build", frontendDir);
}

async function ensureBackend() {
  if (!FRESH && (await portOpen(BACKEND_PORT))) {
    console.log(`[ok] Backend já na porta ${BACKEND_PORT} — reutilizando`);
    return;
  }

  if (!existsSync(join(backendDir, "package.json"))) {
    console.error("[erro] Pasta backend não encontrada.");
    process.exit(1);
  }

  console.log(`\n[1/3] Subindo backend (porta ${BACKEND_PORT})…`);
  spawnOwned("npm run dev", backendDir);

  if (!(await waitForPort(BACKEND_PORT, "Backend"))) {
    console.error(`\n[erro] Backend não respondeu na porta ${BACKEND_PORT}.`);
    console.error("Verifique PostgreSQL, .env e logs acima.\n");
    cleanup();
    process.exit(1);
  }
}

async function ensureFrontend() {
  if (!FRESH && (await portOpen(FRONTEND_PORT))) {
    console.log(`[ok] Frontend já na porta ${FRONTEND_PORT} — reutilizando`);
    console.warn("[aviso] Pode ser build antigo — use npm run demo:full:cf (já inclui --fresh).");
    return;
  }

  if (!FRESH && !existsSync(buildId)) {
    console.log("\n[build] Compilando frontend (primeira vez)…\n");
    await runSync("npm run build", frontendDir);
  } else if (!FRESH) {
    console.log("\n[info] Build existente — npm run demo:build para recompilar.\n");
  }

  console.log(`[2/3] Subindo frontend em produção (porta ${FRONTEND_PORT})…`);
  spawnOwned("npm run start", frontendDir);

  if (!(await waitForPort(FRONTEND_PORT, "Frontend"))) {
    console.error(`\n[erro] Frontend não respondeu na porta ${FRONTEND_PORT}.\n`);
    cleanup();
    process.exit(1);
  }

  try {
    const res = await fetch(`http://127.0.0.1:${FRONTEND_PORT}/ping.html`);
    if (!res.ok) {
      console.warn("[aviso] /ping.html não respondeu — verifique o frontend.");
    } else {
      console.log("[ok] Frontend servindo /ping.html (teste no celular: URL/ping.html)");
    }
  } catch {
    console.warn("[aviso] Não foi possível testar /ping.html localmente.");
  }
}

async function runTunnel() {
  console.log("[3/3] Abrindo túnel público…\n");
  const args = ["scripts/tunnel-public.mjs", ...tunnelArgsFromArgv()];
  const tunnel = spawn("node", args, { cwd: root, stdio: "inherit", shell: false });
  processes.push({ child: tunnel, owned: true });

  await new Promise((resolve) => {
    tunnel.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  console.log("\n========================================");
  console.log("  Atlas Boi — demo pública (all-in-one)");
  if (FRESH) console.log("  Modo: FRESH (para tudo + rebuild)");
  console.log("========================================\n");

  process.on("SIGINT", () => {
    console.log("\n[info] Encerrando processos iniciados por demo:full…");
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  await prepareFreshStart();
  await ensureBackend();
  await ensureFrontend();
  await runTunnel();

  cleanup();
}

main().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
