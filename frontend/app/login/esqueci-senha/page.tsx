"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogoBlock, BrandLogoCard } from "@/components/brand/brand-logo-block";
import { BRAND } from "@/components/brand/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function EsqueciSenhaPage() {
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

          <h2 className="mb-2 text-center text-base font-semibold text-foreground">Recuperar senha</h2>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            O Atlas Boi é multi-tenant: a senha é gerenciada pelo administrador da sua transportadora.
          </p>

          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
            <p>
              Solicite ao <strong className="text-foreground">administrador da empresa</strong> que redefina sua
              senha em <strong className="text-foreground">Usuários</strong> no painel.
            </p>
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#1a5c2e]" />
              <span>
                Se você é o dono da conta e não tem acesso, entre em contato com o suporte Atlas Technologies.
              </span>
            </p>
          </div>

          <Button asChild className="mt-5 h-10 w-full rounded-lg bg-[#1a5c2e] font-semibold hover:bg-[#145024]">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            É motorista?{" "}
            <Link href="/motorista/login" className="font-medium text-[#2563EB] hover:underline">
              App do motorista
            </Link>
          </p>
        </BrandLogoCard>
      </div>
    </main>
  );
}
