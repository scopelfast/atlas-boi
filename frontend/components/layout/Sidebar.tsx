"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Car,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Building2,
  CreditCard,
  Shield,
  UserCog,
  Layers,
  Contact,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogoBlock } from "@/components/brand/brand-logo-block";
import { canAccessModule } from "@/lib/platform-admin";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; module: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/dashboard/carregamentos", label: "Carregamentos", icon: Truck, module: "carregamentos" },
  { href: "/dashboard/clientes", label: "Clientes", icon: Contact, module: "clientes" },
  { href: "/dashboard/rotas", label: "Rotas", icon: MapPin, module: "rotas" },
  { href: "/dashboard/motoristas", label: "Motoristas", icon: Users, module: "motoristas" },
  { href: "/dashboard/veiculos", label: "Veículos", icon: Car, module: "veiculos" },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: Wallet, module: "financeiro" },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3, module: "relatorios" },
  { href: "/dashboard/inteligencia", label: "Inteligência", icon: Sparkles, module: "inteligencia" },
  { href: "/dashboard/catalogo", label: "Módulos e Funções", icon: Layers, module: "catalogo" },
  { href: "/dashboard/empresas", label: "Empresas", icon: Building2, module: "empresas" },
  { href: "/dashboard/planos", label: "Planos", icon: CreditCard, module: "planos" },
  { href: "/dashboard/perfis", label: "Perfis", icon: Shield, module: "usuarios" },
  { href: "/dashboard/usuarios", label: "Usuários", icon: UserCog, module: "usuarios" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, module: "configuracoes" },
];

function canAccess(
  user: { role: string; permissions?: { module: string; function: string }[] } | null,
  moduleSlug: string
): boolean {
  return canAccessModule(user, moduleSlug);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = user ? navItems.filter((item) => canAccess(user, item.module)) : navItems;

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0a0a0a] shadow-xl">
      <Link href="/dashboard" className="block shrink-0 border-b border-white/10 px-3 py-4">
        <BrandLogoBlock priority sizes="232px" />
      </Link>
      <nav className="scrollbar-atlas-dark flex-1 space-y-0.5 overflow-y-auto p-3 pr-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#1a5c2e] text-white shadow-lg shadow-black/30"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
