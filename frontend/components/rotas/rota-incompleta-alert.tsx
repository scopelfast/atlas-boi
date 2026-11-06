"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { isRotaIncompleta, rotaIncompletaPendencias } from "@/lib/rota-incompleta";
import type { Rota } from "@/services/api";
import { cn } from "@/utils/cn";

type RotaTarifas = Pick<
  Rota,
  "codigo" | "descricao" | "distanciaKm" | "valorKmCobrancaCliente" | "valorKmComissaoMotorista" | "percentualComissao"
>;

export function RotaIncompletaAlert({
  rota,
  className,
  showRotasLink = false,
  origemNfe = false,
}: {
  rota: RotaTarifas;
  className?: string;
  showRotasLink?: boolean;
  /** Rota criada automaticamente na importação da NF-e */
  origemNfe?: boolean;
}) {
  if (!isRotaIncompleta(rota)) return null;

  const pendencias = rotaIncompletaPendencias(rota);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          Rota {rota.codigo} com cadastro incompleto
        </p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
          {origemNfe
            ? "Esta rota foi criada automaticamente ao importar a NF-e. "
            : ""}
          Complete: <strong>{pendencias.join(", ")}</strong>
          {rota.descricao ? ` — ${rota.descricao}` : ""}.
        </p>
        {showRotasLink && (
          <Link
            href="/dashboard/rotas"
            className="mt-2 inline-block text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-100"
          >
            Abrir cadastro de rotas
          </Link>
        )}
      </div>
    </div>
  );
}

export function RotasIncompletasResumo({
  rotas,
  className,
}: {
  rotas: RotaTarifas[];
  className?: string;
}) {
  const incompletas = rotas.filter(isRotaIncompleta);
  if (incompletas.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-sm">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          {incompletas.length === 1
            ? "1 rota precisa de parâmetros financeiros"
            : `${incompletas.length} rotas precisam de parâmetros financeiros`}
        </p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
          Rotas criadas pela importação de NF-e entram só com origem e destino. Informe km e tarifas
          antes de apurar carregamentos:{" "}
          <strong>{incompletas.map((r) => r.codigo).join(", ")}</strong>.
        </p>
      </div>
    </div>
  );
}
