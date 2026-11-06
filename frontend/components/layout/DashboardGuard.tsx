"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingShell } from "@/components/ui/loading-shell";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, token, ready } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!ready || !mounted) return;
    if (token && user) return;

    router.replace("/login");

    const fallback = window.setTimeout(() => {
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }, 1200);

    return () => window.clearTimeout(fallback);
  }, [ready, mounted, token, user, router]);

  if (!mounted || !ready) {
    return <LoadingShell message="Carregando…" />;
  }

  if (!token || !user) {
    return (
      <LoadingShell
        message="Redirecionando para login…"
        hint="Se ficar parado aqui, abra /login manualmente."
      />
    );
  }

  return <>{children}</>;
}
