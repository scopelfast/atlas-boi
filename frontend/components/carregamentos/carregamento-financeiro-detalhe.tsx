"use client";

import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { PreviewApuracao } from "@/services/api";
import { cn } from "@/utils/cn";
import {
  calcularResultadoOperacional,
  formulaResultadoOperacional,
  montarComponentesResultado,
} from "@/lib/financeiro-resultado";

function fmtBRL(v?: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CarregamentoFinanceiroDetalhe({
  preview,
  className,
}: {
  preview: PreviewApuracao | null;
  className?: string;
}) {
  if (!preview) return null;

  const comp = montarComponentesResultado(preview, null);
  const resultado = comp ? calcularResultadoOperacional(comp) : null;

  return (
    <section
      className={cn(
        "mb-4 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4 text-sm",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-foreground">Como estes valores foram calculados</h3>
      </div>

      <div className="space-y-3 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/50 bg-background/60 p-3">
          <p className="font-semibold text-foreground">Frete ao cliente</p>
          <p className="mt-1 font-mono tabular-nums">{preview.freteDetalhe?.formula}</p>
          <p className="mt-1">
            = {fmtBRL(preview.freteDetalhe?.freteCalculado ?? preview.valorFreteBruto)}
            {preview.valorPedagio > 0 && (
              <> (incl. pedágio {fmtBRL(preview.valorPedagio)} + balança {fmtBRL(preview.valorBalanca)})</>
            )}
            {preview.descontoFreteCliente > 0 && (
              <> → frete líquido {fmtBRL(preview.valorFreteLiquido)} (abatimento {fmtBRL(preview.descontoFreteCliente)})</>
            )}
          </p>
        </div>

        {(preview.cobrancaAdicional ?? 0) > 0 && (
          <div className="rounded-lg border border-border/50 bg-background/60 p-3">
            <p className="font-semibold text-foreground">Cobrança total ao cliente</p>
            <p className="mt-1">
              Frete líquido {fmtBRL(preview.valorFreteLiquido)} + outros (lançamentos){" "}
              {fmtBRL(preview.cobrancaAdicional)} ={" "}
              <strong className="text-foreground">{fmtBRL(preview.valorReceitaLiquida ?? preview.valorFreteLiquido)}</strong>
            </p>
            <p className="mt-1 text-[10px]">
              Alinhado ao saldo a receber no Financeiro (frete + pedágio + balança + outros − abatimentos).
            </p>
          </div>
        )}

        {preview.comissaoDetalhes?.map((d) => (
          <div key={d.motoristaId} className="rounded-lg border border-border/50 bg-background/60 p-3">
            <p className="font-semibold text-foreground">Comissão — {d.motoristaNome}</p>
            <p className="mt-1 font-mono tabular-nums">{d.formula}</p>
            <p className="mt-1">= {fmtBRL(d.comissaoCalculada)} (apurada)</p>
            {d.descontoComissao > 0 && (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                − Desconto {fmtBRL(d.descontoComissao)} → líquida apurada {fmtBRL(d.comissaoLiquida)}
              </p>
            )}
            {d.tarifaDivergeDaRota && (
              <p className="mt-2 flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Tarifa do <strong>motorista</strong> (R$ {d.valorKmAplicado.toFixed(2)}/km) difere da{" "}
                  <strong>rota</strong> (R$ {(d.valorKmRota ?? 0).toFixed(2)}/km). O cadastro do motorista
                  prevalece.{" "}
                  <Link href="/dashboard/motoristas" className="underline">
                    Ajustar motorista
                  </Link>
                </span>
              </p>
            )}
          </div>
        ))}

        {(preview.comissaoExtra ?? 0) > 0 && (
          <div className="rounded-lg border border-border/50 bg-background/60 p-3">
            <p className="font-semibold text-foreground">Comissão extra (lançamento manual)</p>
            <p className="mt-1">+ {fmtBRL(preview.comissaoExtra)} → total lançado {fmtBRL(preview.valorComissaoLiquida)}</p>
          </div>
        )}

        {comp && resultado != null && (
          <div className="rounded-lg border border-border/50 bg-background/60 p-3">
            <p className="font-semibold text-foreground">Resultado operacional (DRE da viagem)</p>
            <p className="mt-1 font-mono tabular-nums">
              {formulaResultadoOperacional(comp)} ={" "}
              <strong className="text-emerald-700">{fmtBRL(resultado)}</strong>
            </p>
            <p className="mt-1 text-[10px]">
              Mesma fórmula do painel acima e do dashboard. Espelho CC veículo não duplica despesas viagem.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-background/60 p-3">
          <p className="font-semibold text-foreground">Prestação de contas (saldo da viagem)</p>
          <p className="mt-1">
            Saldo = comissões lançadas + reembolso de despesas − adiantamento não usado (± acertos)
          </p>
          <p className="mt-1 text-[10px]">Valor a pagar ao motorista — não é lucro da transportadora.</p>
        </div>
      </div>
    </section>
  );
}
