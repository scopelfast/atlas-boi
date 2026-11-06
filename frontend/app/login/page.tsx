"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { BrandLogoBlock, BrandLogoCard } from "@/components/brand/brand-logo-block";
import { BRAND } from "@/components/brand/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("expired=1")) {
      setError("Sessão expirada. Faça login novamente.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || "Erro ao entrar");
      }
      const { access_token, user } = data as {
        access_token: string;
        user: { id: string; email: string; name: string; role: string; companyId?: string; permissions?: { module: string; function: string }[] };
      };
      setAuth(access_token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#0a0a0a] py-4 sm:py-6">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a5c2e]/30 via-black to-[#b8860b]/10" />

      <div className="relative z-10 my-auto w-full max-w-[400px] px-4">
        <BrandLogoCard>
          <div className="mb-4 text-center">
            <BrandLogoBlock priority sizes="360px" />
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{BRAND.name}</h1>
          </div>

          <h2 className="mb-0.5 text-center text-base font-semibold text-foreground">
            Faça login em sua conta
          </h2>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            Entre com suas credenciais.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/login/esqueci-senha"
                className="text-sm font-medium text-[#2563EB] hover:text-[#1E3A8A] hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-[#1a5c2e] text-sm font-semibold shadow-lg shadow-[#1a5c2e]/30 hover:bg-[#145024]"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="pt-1 text-center text-xs text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/login/cadastro" className="font-medium text-[#2563EB] hover:underline">
                Cadastre-se
              </Link>
            </p>
          </form>
        </BrandLogoCard>
      </div>
    </main>
  );
}
