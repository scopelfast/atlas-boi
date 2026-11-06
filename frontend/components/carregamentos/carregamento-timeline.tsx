"use client";

import { cn } from "@/utils/cn";
import { Clock, FileText, Pencil, PlusCircle, RefreshCw } from "lucide-react";
import type { CarregamentoEvento } from "@/services/api";

const TIPO_ICON = {
  CRIADO: PlusCircle,
  STATUS_ALTERADO: RefreshCw,
  NFE_IMPORTADA: FileText,
  EDITADO: Pencil,
} as const;

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CarregamentoTimeline({
  eventos,
  loading,
  className,
}: {
  eventos: CarregamentoEvento[];
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground",
          className
        )}
      >
        Carregando timeline…
      </div>
    );
  }

  if (!eventos.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Nenhum evento registrado ainda.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-6", className)}>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="h-4 w-4 text-primary" />
        Histórico do carregamento
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {eventos.length}
        </span>
      </div>

      <ol className="relative space-y-0">
        {eventos.map((ev, idx) => {
          const Icon = TIPO_ICON[ev.tipo] ?? Clock;
          const isLast = idx === eventos.length - 1;
          return (
            <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* linha vertical */}
              {!isLast && (
                <span
                  className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                  aria-hidden
                />
              )}

              {/* ícone */}
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </span>

              {/* conteúdo */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-sm font-semibold leading-snug text-foreground">{ev.titulo}</p>

                  {ev.descricao && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {ev.descricao}
                    </p>
                  )}

                  {(ev.statusAnterior || ev.statusNovo) && (
                    <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                        {ev.statusAnterior ? STATUS_LABEL[ev.statusAnterior] : "—"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        {ev.statusNovo ? STATUS_LABEL[ev.statusNovo] : "—"}
                      </span>
                    </p>
                  )}
                </div>

                <p className="mt-2 pl-1 text-xs text-muted-foreground">
                  {fmtDate(ev.createdAt)}
                  {ev.user?.name ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      {ev.user.name}
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
