/**
 * Expõe o frontend (porta 3000) na internet.
 * A API passa pelo proxy /api do Next — não precisa túnel no backend.
 *
 * Pré-requisitos:
 *   Terminal 1: cd backend && npm run dev
 *   Terminal 2: cd frontend && npm run dev
 *   Terminal 3: npm run tunnel
 *
 * Ferramentas (TUNNEL_TOOL):
 *   auto         — localtunnel (padrão, sem conta)
 *   localtunnel  — idem
 *   ngrok        — exige: ngrok config add-authtoken SEU_TOKEN
 *   cloudflared  — exige: winget install Cloudflare.cloudflared
 */
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.TUNNEL_PORT || 3000);

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

function hasNgrokAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN?.trim()) return true;
  const paths = [
    join(process.env.LOCALAPPDATA || "", "ngrok", "ngrok.yml"),
    join(process.env.APPDATA || "", "ngrok", "ngrok.yml"),
    join(homedir(), ".ngrok2", "ngrok.yml"),
    join(homedir(), ".config", "ngrok", "ngrok.yml"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const text = readFileSync(p, "utf8");
      if (/authtoken\s*:/i.test(text)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function resolveTool() {
  if (process.argv.includes("--ngrok")) return "ngrok";
  if (process.argv.includes("--cloudflared")) return "cloudflared";
  const explicit = (process.env.TUNNEL_TOOL || "auto").toLowerCase();
  if (explicit !== "auto") return explicit;
  if (hasNgrokAuthtoken()) return "ngrok";
  return "localtunnel";
}

async function waitNgrokUrl(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (res.ok) {
        const data = await res.json();
        const tunnel = data.tunnels?.find((t) => t.public_url?.startsWith("https://"));
        if (tunnel?.public_url) return tunnel.public_url;
      }
    } catch {
      /* ngrok ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function printPublicUrl(url) {
  console.log("\n========================================");
  console.log("  URL pública (envie ao testador):");
  console.log(`  ${url}/login`);
  console.log("  Login demo: admin@atlas.local / admin123");
  console.log("  Celular: abra no Chrome/Safari (não no preview do WhatsApp).");
  console.log("  ngrok free: na 1ª visita toque em «Visit Site».");
  console.log("  Envie /login — não /dashboard (evita tela branca sem sessão).");
  console.log("  Tela branca? Recarregue 1x ou use: npm run demo:full:cf");
  console.log("========================================\n");
}

async function runLocaltunnel() {
  let lt;
  try {
    lt = await import("localtunnel");
  } catch {
    console.error("\n[erro] Pacote localtunnel não instalado.");
    console.error("Na raiz do projeto: npm install");
    process.exit(1);
  }

  const tunnel = await lt.default({ port: PORT });
  printPublicUrl(tunnel.url);

  tunnel.on("error", (err) => {
    console.error("[erro] localtunnel:", err.message);
  });

  await new Promise((resolve) => {
    process.on("SIGINT", () => {
      tunnel.close();
      resolve();
    });
    process.on("SIGTERM", () => {
      tunnel.close();
      resolve();
    });
    tunnel.on("close", resolve);
  });
}

async function runNgrok() {
  if (!hasNgrokAuthtoken()) {
    console.error("\n[erro] ngrok exige conta e authtoken (ERR_NGROK_4018).");
    console.error("  1) Crie conta: https://dashboard.ngrok.com/signup");
    console.error("  2) ngrok config add-authtoken SEU_TOKEN");
    console.error("  3) npm run tunnel");
    console.error("\nOu use sem ngrok (padrão): npm run tunnel\n");
    process.exit(1);
  }

  const ngrok = spawn(
    "ngrok",
    ["http", String(PORT), "--log=stdout", "--host-header=rewrite"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  ngrok.stdout?.on("data", (d) => process.stdout.write(d));
  ngrok.stderr?.on("data", (d) => process.stderr.write(d));
  ngrok.on("error", (e) => {
    console.error("\n[erro] ngrok não encontrado. Instale: winget install Ngrok.Ngrok");
    console.error(e.message);
    process.exit(1);
  });

  const url = await waitNgrokUrl();
  if (url) printPublicUrl(url);
  else console.log("[info] Abra http://127.0.0.1:4040 para ver a URL\n");

  await new Promise((resolve) => ngrok.on("exit", resolve));
}

async function runCloudflared() {
  return new Promise((resolve, reject) => {
    const child = spawn("cloudflared", ["tunnel", "--url", `http://127.0.0.1:${PORT}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let printed = false;
    const onLine = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m && !printed) {
        printed = true;
        printPublicUrl(m[0]);
      }
    };

    child.stdout?.on("data", onLine);
    child.stderr?.on("data", onLine);
    child.on("error", (e) => {
      console.error("\n[erro] cloudflared não encontrado.");
      console.error("Instale: winget install Cloudflare.cloudflared");
      console.error("Ou use: npm run tunnel  (localtunnel, sem instalar nada extra)\n");
      reject(e);
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  const up = await portOpen(PORT);
  if (!up) {
    console.error(`\n[erro] Nada escutando em http://localhost:${PORT}`);
    console.error("Suba antes:");
    console.error("  Terminal 1: cd backend && npm run dev");
    console.error(`  Terminal 2: cd frontend && npm run dev`);
    process.exit(1);
  }

  const tool = resolveTool();
  console.log(`\n[ok] Frontend em localhost:${PORT}`);
  console.log(`[info] Túnel: ${tool}`);
  console.log(
    "[dica] Para celular/ngrok use modo produção: npm run demo (evita erro removeChild do Fast Refresh)\n"
  );

  if (tool === "ngrok") await runNgrok();
  else if (tool === "cloudflared") await runCloudflared();
  else await runLocaltunnel();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
