"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogoBlock, BrandLogoCard } from "@/components/brand/brand-logo-block";
import { BRAND } from "@/components/brand/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function CadastroPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#0a0a0a] py-4 sm:py-6">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a5c2e]/30 via-black to-[#b8860b]/10" />

      <div className="relative z-10 my-auto w-full max-w-[440px] px-4">
        <BrandLogoCard>
          <div className="mb-4 text-center">
            <BrandLogoBlock priority sizes="360px" />
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{BRAND.name}</h1>
          </div>

          <h2 className="mb-2 text-center text-base font-semibold text-foreground">Cadastro de transportadora</h2>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            O Atlas Boi é um ERP SaaS multi-tenant. Cada transportadora recebe um ambiente isolado.
          </p>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1a5c2e]" />
              <div>
                <p className="font-medium text-foreground">Nova transportadora</p>
                <p className="mt-1">
                  O cadastro da empresa é feito pelo <strong>administrador SaaS</strong> (menu Empresas no painel
                  admin). Auto-cadastro público será disponibilizado em versão futura.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-foreground">Sou motorista</p>
                <p className="mt-1">
                  Motoristas usam o app dedicado com CPF e senha fornecidos pela transportadora.
                </p>
                <Link
                  href="/motorista/login"
                  className="mt-2 inline-block font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Abrir app do motorista →
                </Link>
              </div>
            </div>
          </div>

          <Button asChild className="mt-5 h-10 w-full rounded-lg bg-[#1a5c2e] font-semibold hover:bg-[#145024]">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Já tenho conta — entrar
            </Link>
          </Button>
        </BrandLogoCard>
      </div>
    </main>
  );
}
