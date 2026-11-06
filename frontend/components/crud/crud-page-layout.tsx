"use client";

import type { LucideIcon } from "lucide-react";
import { Filter, List, FileText } from "lucide-react";
import { cn } from "@/utils/cn";

export type CrudTab = string;

export type CrudTabDef = {
  id: CrudTab;
  label: string;
  icon: LucideIcon;
};

const DEFAULT_TABS: CrudTabDef[] = [
  { id: "filtro", label: "Filtro", icon: Filter },
  { id: "lista", label: "Lista", icon: List },
  { id: "dados", label: "Dados", icon: FileText },
];

type CrudPageLayoutProps = {
  title: string;
  subtitle?: string;
  tab: CrudTab;
  onTabChange: (tab: CrudTab) => void;
  /** Abas customizadas (ex.: carregamentos com notas, minuta, timeline) */
  tabs?: CrudTabDef[];
  /** Painéis por id de aba; quando omitido, usa filter/list/data */
  panels?: Record<string, React.ReactNode>;
  filter?: React.ReactNode;
  list?: React.ReactNode;
  data?: React.ReactNode;
  actions?: React.ReactNode;
  error?: string | null;
  /** KPIs ou resumo acima das abas */
  summary?: React.ReactNode;
};

export function CrudPageLayout({
  title,
  subtitle,
  tab,
  onTabChange,
  tabs,
  panels: panelsProp,
  filter,
  list,
  data,
  actions,
  error,
  summary,
}: CrudPageLayoutProps) {
  const tabDefs = tabs ?? DEFAULT_TABS;
  const panels: Record<string, React.ReactNode> =
    panelsProp ??
    ({
      filtro: filter,
      lista: list,
      dados: data,
    } satisfies Record<string, React.ReactNode>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {summary}

      <div className="scrollbar-atlas -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/30 p-1 dark:border-white/10 dark:bg-white/[0.03] sm:mx-0 sm:flex-wrap">
        {tabDefs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60 dark:bg-[#1a1a1a] dark:ring-white/10"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {label}
            </button>
          );
        })}
      </div>

      <div>{panels[tab]}</div>
    </div>
  );
}
