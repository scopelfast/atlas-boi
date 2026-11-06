"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MotoristaShell } from "@/components/motorista/motorista-shell";
import { registerMotoristaServiceWorker } from "@/lib/motorista-push";

export default function MotoristaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/motorista/login";
  const [nome, setNome] = useState<string | undefined>();

  useEffect(() => {
    // ConfirmProvider usa tokens `.dark` — alinhado ao visual do app motorista.
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    if (isLogin) return;
    registerMotoristaServiceWorker().catch(() => undefined);
  }, [isLogin]);

  useEffect(() => {
    if (!localStorage.getItem("motorista_token") && !pathname.startsWith("/motorista/login")) {
      router.replace("/motorista/login");
      return;
    }
    setNome(localStorage.getItem("motorista_nome") ?? undefined);
  }, [router, pathname]);

  function logout() {
    localStorage.removeItem("motorista_token");
    localStorage.removeItem("motorista_nome");
    router.replace("/motorista/login");
  }

  if (isLogin) {
    return <div className="min-h-dvh bg-[#0a0a0a]">{children}</div>;
  }

  return (
    <MotoristaShell nome={nome} onLogout={logout}>
      {children}
    </MotoristaShell>
  );
}
