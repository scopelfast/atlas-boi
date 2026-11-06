"use client";

import { cn } from "@/utils/cn";
import {
  FIN_ENTIDADE,
  FIN_ENTIDADE_LIST,
  type FinanceiroEntidade,
} from "@/lib/financeiro-entities";

type Props = {
  value: FinanceiroEntidade | "";
  onChange: (entidade: FinanceiroEntidade) => void;
  compact?: boolean;
  className?: string;
};

export function FinanceiroEntityPicker({ value, onChange, compact, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-3" : "sm:grid-cols-3",
        className
      )}
    >
      {FIN_ENTIDADE_LIST.map((key) => {
        const cfg = FIN_ENTIDADE[key];
        const Icon = cfg.icon;
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "group flex flex-col items-start rounded-xl border text-left transition-all",
              compact ? "p-3" : "min-h-[8.5rem] p-5 lg:p-6",
              "hover:border-emerald-500/50 hover:bg-emerald-500/5",
              active
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                : "border-border/70 bg-card"
            )}
          >
            <div
              className={cn(
                "mb-2 flex h-10 w-10 items-center justify-center rounded-lg",
                active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-emerald-600/15 group-hover:text-emerald-700"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-foreground">{cfg.label}</span>
            {!compact && (
              <span className="mt-1 text-xs leading-snug text-muted-foreground">{cfg.subtitle}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
