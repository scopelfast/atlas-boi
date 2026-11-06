"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isPlatformAdmin } from "@/lib/platform-admin";

export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    if (!isPlatformAdmin(user)) router.replace("/dashboard");
  }, [ready, user, router]);

  if (!ready) return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user || !isPlatformAdmin(user)) return null;

  return <>{children}</>;
}
