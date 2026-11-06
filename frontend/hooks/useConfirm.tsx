"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export type ConfirmContext = {
  label: string;
  value: string;
  /** Segunda linha (ex.: minuta além do código CAR) */
  extra?: { label: string; value: string };
};

export type ConfirmTransition = {
  from: string;
  to: string;
};

export type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  /** Ex.: minuta, placa, nome do registro */
  context?: ConfirmContext;
  /** Transição visual de status ou etapa */
  transition?: ConfirmTransition;
  /** Alerta destacado (ex.: GTA ausente) */
  warning?: string;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const defaults: Required<Pick<ConfirmOptions, "title" | "confirmLabel" | "cancelLabel" | "variant">> = {
  title: "Confirmar ação",
  confirmLabel: "Confirmar",
  cancelLabel: "Cancelar",
  variant: "default",
};

function normalizeOptions(options: ConfirmOptions | string): ConfirmOptions {
  if (typeof options === "string") return { description: options };
  return options;
}

function ConfirmIcon({ variant, hasTransition }: { variant: "default" | "danger"; hasTransition: boolean }) {
  if (variant === "danger") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive ring-1 ring-destructive/20">
        <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
      </span>
    );
  }
  if (hasTransition) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/25">
        <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/80">
      <HelpCircle className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

function ConfirmTransitionBlock({
  transition,
  variant,
}: {
  transition: ConfirmTransition;
  variant: "default" | "danger";
}) {
  const toHighlight =
    variant === "danger"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-primary/30 bg-primary/10 text-primary";

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 p-3 sm:gap-3 sm:p-4"
      aria-label={`${transition.from} para ${transition.to}`}
    >
      <span className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-center text-xs font-medium leading-tight text-muted-foreground sm:px-3 sm:text-sm">
        {transition.from}
      </span>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          variant === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}
        aria-hidden
      >
        <ArrowRight className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-center text-xs font-semibold leading-tight sm:px-3 sm:text-sm",
          toHighlight
        )}
      >
        {transition.to}
      </span>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    const normalized = normalizeOptions(input);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(normalized);
      setOpen(true);
    });
  }, []);

  const finish = (result: boolean) => {
    setOpen(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) finish(false);
  };

  const merged = options
    ? {
        title: options.title ?? defaults.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? defaults.confirmLabel,
        cancelLabel: options.cancelLabel ?? defaults.cancelLabel,
        variant: options.variant ?? defaults.variant,
        context: options.context,
        transition: options.transition,
        warning: options.warning,
      }
    : null;

  const isDanger = merged?.variant === "danger";
  const hasRichLayout = !!(merged?.context || merged?.transition || merged?.warning);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "confirm-dialog gap-0 overflow-hidden p-0 sm:max-w-[440px]",
            "border-border/80 shadow-2xl dark:border-white/10 dark:shadow-black/40"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => finish(false)}
        >
          {merged && (
            <>
              <div className="space-y-4 px-6 pb-5 pt-6">
                <DialogHeader className="space-y-4 pr-6 text-left">
                  <div className="flex items-start gap-3.5">
                    <ConfirmIcon variant={merged.variant} hasTransition={!!merged.transition} />
                    <DialogTitle className="pt-2 text-base font-semibold leading-snug tracking-tight">
                      {merged.title}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="sr-only">{merged.description}</DialogDescription>

                  {merged.context && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {merged.context.label}
                      </p>
                      <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums tracking-tight text-foreground">
                        {merged.context.value}
                      </p>
                      {merged.context.extra && (
                        <div className="mt-3 border-t border-border/50 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {merged.context.extra.label}
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                            {merged.context.extra.value}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {merged.transition && (
                    <ConfirmTransitionBlock transition={merged.transition} variant={merged.variant} />
                  )}

                  {merged.warning && (
                    <div className="flex gap-3 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/50">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                        {merged.warning}
                      </p>
                    </div>
                  )}

                  <p
                    className={cn(
                      "text-sm leading-relaxed text-muted-foreground",
                      !hasRichLayout && !merged.warning && "whitespace-pre-line"
                    )}
                  >
                    {merged.description}
                  </p>
                </DialogHeader>
              </div>

              <DialogFooter className="flex-row gap-2.5 border-t border-border/60 bg-muted/15 px-4 py-4 sm:justify-stretch">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 flex-1 border-border/80 bg-background/80 text-sm font-medium hover:bg-muted"
                  onClick={() => finish(false)}
                >
                  {merged.cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={isDanger ? "danger" : "primary"}
                  className="h-10 flex-1 text-sm font-semibold shadow-sm"
                  onClick={() => finish(true)}
                >
                  {merged.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  return ctx;
}
