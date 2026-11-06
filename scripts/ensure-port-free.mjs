/**
 * Libera a porta antes de subir dev (evita EADDRINUSE ao rodar npm run dev de novo).
 * Uso: node scripts/ensure-port-free.mjs 3004
 */
import { execSync } from "node:child_process";

const port = process.argv[2];
if (!port || !/^\d+$/.test(port)) {
  console.error("Uso: node ensure-port-free.mjs <porta>");
  process.exit(1);
}

function freePortWindows(targetPort) {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: "utf8" });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`[dev] Porta ${targetPort}: processo ${pid} encerrado.`);
    } catch {
      /* processo já sumiu */
    }
  }
}

function freePortUnix(targetPort) {
  try {
    execSync(`lsof -ti tcp:${targetPort} | xargs -r kill -9`, {
      stdio: "ignore",
      shell: true,
    });
    console.log(`[dev] Porta ${targetPort} liberada.`);
  } catch {
    /* nada escutando */
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
