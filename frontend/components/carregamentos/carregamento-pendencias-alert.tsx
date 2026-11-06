"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";

export function CarregamentoPendenciasAlert({
  pendencias,
  className,
  titulo = "Embarque com dados operacionais incompletos",
  origemNfe = false,
  showLinks = false,
}: {
  pendencias: string[];
  className?: string;
  titulo?: string;
  origemNfe?: boolean;
  showLinks?: boolean;
}) {
  if (pendencias.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-amber-900 dark:text-amber-200">{titulo}</p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
          {origemNfe
            ? "A NF-e preenche clientes, rota e GTA — informe "
            : "Informe "}
          <strong>{pendencias.join(", ")}</strong> antes de avançar o status ou apurar o
          financeiro.
        </p>
        {showLinks && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            {pendencias.some((p) => p.includes("motorista")) && (
              <Link
                href="/dashboard/motoristas"
                className="text-amber-900 underline underline-offset-2 dark:text-amber-200"
              >
                Cadastro de motoristas
              </Link>
            )}
            {pendencias.some((p) => p.includes("veículo")) && (
              <Link
                href="/dashboard/veiculos"
                className="text-amber-900 underline underline-offset-2 dark:text-amber-200"
              >
                Cadastro de veículos
              </Link>
            )}
            {pendencias.some((p) => p.includes("rota") || p.includes("KM")) && (
              <Link
                href="/dashboard/rotas"
                className="text-amber-900 underline underline-offset-2 dark:text-amber-200"
              >
                Cadastro de rotas
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CarregamentosPendenciasResumo({
  items,
  className,
}: {
  items: { numero: string; pendencias: string[] }[];
  className?: string;
}) {
  const incompletos = items.filter((i) => i.pendencias.length > 0);
  if (incompletos.length === 0) return null;

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
          {incompletos.length === 1
            ? "1 embarque sem motorista, veículo ou KM"
            : `${incompletos.length} embarques com pendências operacionais`}
        </p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
          {incompletos.map((i) => `${i.numero} (${i.pendencias.join(", ")})`).join(" · ")}
        </p>
      </div>
    </div>
  );
}
