"use client";

import { AlertTriangle, FileCheck2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import type { CarregamentoStatus } from "@/services/api";

const STATUS_LABEL: Record<CarregamentoStatus, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const STATUS_EXIGE_GTA: CarregamentoStatus[] = [
  "EM_TRANSITO",
  "DESEMBARCADO",
  "FINALIZADO",
];

export function CarregamentoGtaSection({
  numeroGta,
  gtaUf,
  status,
  onNumeroGtaChange,
  onGtaUfChange,
  preenchidoNfe,
  gtaVencimentoNfe,
  className,
}: {
  numeroGta: string;
  gtaUf: string;
  status: CarregamentoStatus;
  onNumeroGtaChange: (v: string) => void;
  onGtaUfChange: (v: string) => void;
  preenchidoNfe?: boolean;
  gtaVencimentoNfe?: string | null;
  className?: string;
}) {
  const ausente = !numeroGta.trim();
  const exigeGta = STATUS_EXIGE_GTA.includes(status);

  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileCheck2 className="h-4 w-4 text-primary" />
          GTA — Guia de Trânsito Animal
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Preenchida automaticamente quando a NF-e traz GTA em infAdic/obsCont. Confira o número e a
          UF antes de salvar.
        </p>
      </div>

      {preenchidoNfe && numeroGta.trim() && (
        <div className="flex gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/40">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">
              Dados extraídos da NF-e
            </p>
            <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/90">
              GTA <strong>{numeroGta}</strong>
              {gtaUf ? ` · UF ${gtaUf}` : ""}
              {gtaVencimentoNfe ? ` · vencimento ${gtaVencimentoNfe}` : ""}
            </p>
          </div>
        </div>
      )}

      {ausente && exigeGta && (
        <div className="flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">GTA não informada</p>
            <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
              O carregamento está em <strong>{STATUS_LABEL[status]}</strong> sem número de GTA.
              Informe a guia antes de seguir em trânsito.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="numero-gta">Número da GTA</Label>
          <Input
            id="numero-gta"
            className="mt-1 font-mono tabular-nums"
            placeholder="Ex.: 123456789"
            value={numeroGta}
            onChange={(e) => onNumeroGtaChange(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {preenchidoNfe && numeroGta.trim()
              ? "Extraído do XML da NF-e — ajuste se necessário."
              : "Número impresso na guia — conforme documento do MAPA/estado."}
          </p>
        </div>
        <div>
          <Label htmlFor="gta-uf">UF emissora</Label>
          <select
            id="gta-uf"
            className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-[#1a5c2e] focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20"
            value={gtaUf}
            onChange={(e) => onGtaUfChange(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">Estado que emitiu a guia.</p>
        </div>
      </div>
    </section>
  );
}
