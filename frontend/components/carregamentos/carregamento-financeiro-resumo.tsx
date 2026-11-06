"use client";

import {
  Calculator,
  Minus,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { StatCard } from "@/components/dashboard/stat-card";
import type { PreviewApuracao, PrestacaoContasPreview } from "@/services/api";
import {
  calcularResultadoOperacional,
  formulaResultadoOperacional,
  montarComponentesResultado,
} from "@/lib/financeiro-resultado";

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type FinanceiroResumo = {
  valorFreteCliente?: string | number | null;
  valorComissaoTotal?: string | number | null;
  valorPedagio?: string | number | null;
  valorBalanca?: string | number | null;
  margemBruta?: string | number | null;
  descontoFreteCliente?: string | number | null;
  valorFreteLiquido?: string | number | null;
  valorReceitaLiquida?: string | number | null;
  valorComissaoLiquida?: string | number | null;
  margemLiquida?: string | number | null;
  custoDespesasViagem?: string | number | null;
  custoVeiculoDireto?: string | number | null;
  margemOperacional?: string | number | null;
  motivoDescontoFrete?: string | null;
};

function temDesconto(valores: FinanceiroResumo) {
  return (
    Number(valores.descontoFreteCliente ?? 0) > 0 ||
    Number(valores.valorFreteLiquido ?? valores.valorFreteCliente ?? 0) !==
      Number(valores.valorFreteCliente ?? 0) ||
    Number(valores.valorComissaoLiquida ?? valores.valorComissaoTotal ?? 0) !==
      Number(valores.valorComissaoTotal ?? 0)
  );
}

export function CarregamentoFinanceiroResumo({
  valores,
  preview,
  prestacoes,
  className,
}: {
  valores: FinanceiroResumo | null;
  preview?: PreviewApuracao | null;
  prestacoes?: PrestacaoContasPreview[];
  className?: string;
}) {
  if (!valores) return null;

  const temAlgum =
    valores.valorFreteCliente != null ||
    valores.valorComissaoTotal != null ||
    valores.margemBruta != null;

  const comp = montarComponentesResultado(preview, valores);
  if (!temAlgum || !comp) return null;

  const {
    receita,
    freteLiquido,
    cobrancaAdicional,
    comissao,
    comissaoApurada,
    comissaoExtra,
    despesasViagem,
    custoVeiculoDireto,
    margemContratual,
  } = comp;
  const resultado = calcularResultadoOperacional(comp);
  const saldoMotorista = prestacoes?.reduce((s, p) => s + (p.saldoViagem ?? 0), 0) ?? null;
  const comDesconto = temDesconto(valores);

  const preApuracao = preview?.jaApurado === false;

  const receitaHint =
    cobrancaAdicional > 0
      ? preApuracao
        ? `Frete contratual ${fmtBRL(freteLiquido)} + extras ${fmtBRL(cobrancaAdicional)} (apura para formalizar)`
        : `Frete líq. ${fmtBRL(freteLiquido)} + outros ${fmtBRL(cobrancaAdicional)}`
      : preApuracao && freteLiquido > 0
        ? "Frete contratual — apure para gerar cobrança no Financeiro"
        : comDesconto && valores.valorFreteCliente != null
          ? `Após abatimento (bruto ${fmtBRL(valores.valorFreteCliente)})`
          : "Cobrança total ao cliente";

  const comissaoHint =
    comissaoExtra > 0
      ? `Apurada ${fmtBRL(comissaoApurada)} + extra ${fmtBRL(comissaoExtra)}`
      : preApuracao && comissaoApurada > 0 && comissao <= comissaoApurada + 0.009
        ? "Comissão prevista pela rota — apure para lançar na CC"
        : "Comissão lançada na viagem";

  return (
    <section className={cn("mb-4 space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Calculator className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Resultado da viagem</h3>
          <p className="text-xs text-muted-foreground">
            Receita − comissão − despesas − custo veículo direto
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          custoVeiculoDireto > 0 ? "xl:grid-cols-5" : "xl:grid-cols-4"
        )}
      >
        <StatCard
          compact
          tone="positive"
          label="Receita"
          value={fmtBRL(receita)}
          hint={receitaHint}
          icon={TrendingUp}
        />
        <StatCard
          compact
          tone="negative"
          label="Comissão"
          value={fmtBRL(comissao)}
          hint={comissaoHint}
          icon={Users}
        />
        <StatCard
          compact
          tone="negative"
          label="Despesas viagem"
          value={fmtBRL(despesasViagem)}
          hint="CC motorista — reembolsos e custos"
          icon={Wallet}
        />
        {custoVeiculoDireto > 0 && (
          <StatCard
            compact
            tone="warning"
            label="Custo veículo"
            value={fmtBRL(custoVeiculoDireto)}
            hint="Pago direto pela empresa"
            icon={Truck}
          />
        )}
        <StatCard
          compact
          tone={resultado >= 0 ? "highlight" : "negative"}
          label="Resultado operacional"
          value={fmtBRL(resultado)}
          hint={formulaResultadoOperacional(comp)}
          icon={resultado >= 0 ? TrendingUp : TrendingDown}
          className={cn(custoVeiculoDireto > 0 ? "sm:col-span-2 xl:col-span-1" : "")}
        />
      </div>

      {saldoMotorista != null && (
        <StatCard
          compact
          tone={saldoMotorista === 0 ? "positive" : "info"}
          label="Acerto motorista (CC)"
          value={fmtBRL(Math.abs(saldoMotorista))}
          hint={
            saldoMotorista > 0
              ? "A pagar ao motorista — quitação em Financeiro → CC Motoristas"
              : saldoMotorista < 0
                ? "Motorista deve à empresa"
                : "Viagem quitada na conta corrente"
          }
          icon={Minus}
        />
      )}

      <details className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground dark:border-white/10">
        <summary className="cursor-pointer font-medium text-foreground">Referência contratual e detalhes</summary>
        <div className="mt-2 space-y-1.5">
          <p>
            Margem {comDesconto ? "líquida" : "bruta"} {fmtBRL(margemContratual)} — frete − comissão apurada −
            pedágio − balança (<em>sem</em> despesas de viagem nem custo veículo).
          </p>
          <p>
            Pedágio {fmtBRL(valores.valorPedagio)} · Balança {fmtBRL(valores.valorBalanca)}
          </p>
          {Number(valores.descontoFreteCliente ?? 0) > 0 && (
            <p className="text-amber-700 dark:text-amber-400">
              Abatimento frete: −{fmtBRL(valores.descontoFreteCliente)}
              {valores.motivoDescontoFrete ? ` — ${valores.motivoDescontoFrete}` : ""}
            </p>
          )}
          <p>Recebimento do cliente e pagamento ao motorista são independentes — veja Financeiro ou Relatórios.</p>
        </div>
      </details>
    </section>
  );
}
