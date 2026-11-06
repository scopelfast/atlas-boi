"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Outfit, Bebas_Neue } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";
import { AtlasBoiMark } from "@/components/brand/atlas-boi-mark";
import { motoristaApi } from "@/services/api";
import { cn } from "@/utils/cn";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-motorista-ui",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-motorista-display",
});

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function MotoristaLoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    if (typeof window !== "undefined" && window.location.search.includes("expired=1")) {
      setErro("Sessão expirada. Faça login novamente.");
    }
    return () => cancelAnimationFrame(t);
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await motoristaApi.login(cpf, password);
      localStorage.setItem("motorista_token", res.access_token);
      localStorage.setItem("motorista_nome", res.motorista.nome);
      router.replace("/motorista/viagens");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={cn(
        outfit.variable,
        bebas.variable,
        "relative flex min-h-dvh flex-col overflow-hidden bg-[#070907]",
        "font-[family-name:var(--font-motorista-ui)]"
      )}
    >
      {/* Fundo full-bleed */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#1a5c2e_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(184,134,11,0.12)_0%,transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
          }}
        />
        <div
          className={cn(
            "absolute -left-20 top-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl transition-opacity duration-1000",
            ready ? "opacity-100" : "opacity-0"
          )}
        />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#070907] via-[#070907]/95 to-transparent" />
      </div>

      {/* Hero — marca + frase */}
      <header
        className={cn(
          "relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-10 text-center transition-all duration-700 ease-out",
          ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <AtlasBoiMark size={72} className="mb-5 rounded-2xl" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-400/90">
          Atlas Boi
        </p>
        <h1
          className={cn(
            "mt-2 text-[clamp(2.75rem,12vw,3.75rem)] leading-none tracking-wide text-white",
            "font-[family-name:var(--font-motorista-display)]"
          )}
        >
          Motorista
        </h1>
        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-white/50">
          Viagens, despesas e saldo — na estrada.
        </p>
      </header>

      {/* Formulário ancorado na base */}
      <section
        className={cn(
          "relative z-10 w-full transition-all delay-150 duration-700 ease-out",
          ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
      >
        <form
          onSubmit={entrar}
          className="mx-auto w-full max-w-lg space-y-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2"
        >
          <div>
            <label htmlFor="cpf" className="mb-1.5 block text-xs font-medium tracking-wide text-white/55">
              CPF
            </label>
            <input
              id="cpf"
              inputMode="numeric"
              autoComplete="username"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              required
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base text-white outline-none placeholder:text-white/25 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1.5 block text-xs font-medium tracking-wide text-white/55">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 pr-12 text-base text-white outline-none placeholder:text-white/25 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/40 hover:text-white/80"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "h-14 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white",
              "shadow-[0_12px_40px_-12px_rgba(16,185,129,0.55)] transition",
              "hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-60"
            )}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="pb-2 text-center text-xs text-white/35">
            Operador da transportadora?{" "}
            <Link href="/login" className="font-medium text-emerald-400/90 hover:text-emerald-300">
              Login do sistema
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
