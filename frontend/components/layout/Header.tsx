"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <div className="flex flex-1 items-center gap-6">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Pesquisar"
            className="h-10 w-full rounded-lg border border-input bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#1a5c2e] focus:bg-background focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Tarefas"
        >
          <FileText className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center gap-3 border-l border-border pl-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.name || "Usuário"}</p>
            <p className="text-xs text-muted-foreground">
              {user?.companyName || "—"}
              {user?.role ? ` · ${user.role === "SUPER_ADMIN" ? "Plataforma" : user.role}` : ""}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1a5c2e] to-[#b8860b] text-sm font-semibold text-white shadow-md">
            {user?.name?.charAt(0) || "A"}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
