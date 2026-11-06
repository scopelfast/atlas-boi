"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function PageLoadingOverlay({
  active,
  title = "Carregando…",
  description,
  className,
}: {
  active: boolean;
  title?: string;
  description?: string;
  className?: string;
}) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex items-start justify-center pt-20",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/95 px-5 py-4 shadow-lg backdrop-blur-sm dark:border-white/10">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
