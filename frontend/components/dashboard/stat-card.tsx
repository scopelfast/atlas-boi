import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type StatTone = "default" | "positive" | "negative" | "warning" | "highlight" | "info";

const TONE_STYLES: Record<
  StatTone,
  { card: string; icon: string; value?: string; hover: string }
> = {
  default: {
    card: "",
    icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    hover: "hover:border-emerald-500/25 hover:shadow-emerald-500/5",
  },
  positive: {
    card: "border-emerald-500/20 bg-emerald-500/[0.03]",
    icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    value: "text-emerald-700 dark:text-emerald-400",
    hover: "hover:border-emerald-500/30 hover:shadow-emerald-500/5",
  },
  negative: {
    card: "border-red-500/15 bg-red-500/[0.02]",
    icon: "bg-red-500/10 text-red-600 ring-red-500/15 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20",
    value: "text-red-600 dark:text-red-400",
    hover: "hover:border-red-500/25 hover:shadow-red-500/5",
  },
  warning: {
    card: "border-amber-500/20 bg-amber-500/[0.03]",
    icon: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20",
    value: "text-amber-700 dark:text-amber-400",
    hover: "hover:border-amber-500/30 hover:shadow-amber-500/5",
  },
  highlight: {
    card: "border-primary/25 bg-primary/[0.04] ring-1 ring-primary/10",
    icon: "bg-primary/10 text-primary ring-primary/15",
    value: "text-primary",
    hover: "hover:border-primary/35 hover:shadow-primary/5",
  },
  info: {
    card: "border-blue-500/20 bg-blue-500/[0.03]",
    icon: "bg-blue-500/10 text-blue-600 ring-blue-500/15 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20",
    value: "text-blue-700 dark:text-blue-300",
    hover: "hover:border-blue-500/25 hover:shadow-blue-500/5",
  },
};

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  compact?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  compact = false,
  className,
}: StatCardProps) {
  const t = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300",
        "dark:border-white/10 dark:bg-gradient-to-br dark:from-[#121212] dark:to-[#0d0d0d]",
        t.card,
        t.hover,
        "hover:-translate-y-0.5 hover:shadow-lg",
        compact ? "p-4" : "p-5",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-50" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={cn(
              "font-bold tracking-tight tabular-nums text-foreground",
              compact ? "text-xl" : "text-3xl",
              t.value
            )}
          >
            {value}
          </p>
          {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl ring-1",
            compact ? "h-9 w-9" : "h-11 w-11",
            t.icon
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      </div>
    </div>
  );
}
