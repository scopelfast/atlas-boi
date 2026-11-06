"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Camera, LogOut, Truck, Wallet } from "lucide-react";
import { AtlasBoiMark } from "@/components/brand/atlas-boi-mark";
import { cn } from "@/utils/cn";

const NAV = [
  { href: "/motorista/viagens", label: "Viagens", icon: Truck },
  { href: "/motorista/despesas", label: "Despesas", icon: Camera },
  { href: "/motorista/saldo", label: "Saldo", icon: Wallet },
] as const;

/**
 * Chrome Android: ao recolher/expandir a barra de URL, o visualViewport muda
 * e a nav `fixed bottom-0` pode ficar sob os botões do sistema. Mantemos
 * --vv-bottom alinhado ao offset real.
 */
function useVisualViewportBottomInset() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) {
      root.style.setProperty("--vv-bottom", "0px");
      return;
    }

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--vv-bottom", `${Math.round(inset)}px`);
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
}

export function MotoristaShell({
  children,
  nome,
  onLogout,
}: {
  children: React.ReactNode;
  nome?: string;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  useVisualViewportBottomInset();

  return (
    <div
      className="min-h-dvh bg-[#0a0a0a]"
      style={{
        paddingBottom:
          "calc(5.5rem + env(safe-area-inset-bottom, 0px) + var(--vv-bottom, 0px))",
      }}
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#1a5c2e]/40 via-[#0a0a0a] to-[#0a0a0a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AtlasBoiMark size={44} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Atlas Boi</p>
              <h1 className="text-lg font-bold text-white">
                {nome ? `Olá, ${nome.split(" ")[0]}` : "App do Motorista"}
              </h1>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>

      <nav
        className="fixed left-0 right-0 z-50 border-t border-white/10 bg-[#121212]/98 backdrop-blur-md"
        style={{
          bottom: "var(--vv-bottom, 0px)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-[11px] font-medium transition",
                  active ? "bg-emerald-500/15 text-emerald-400" : "text-white/50 hover:text-white/80"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-emerald-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
