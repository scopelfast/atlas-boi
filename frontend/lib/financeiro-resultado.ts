import type { PreviewApuracao } from "@/services/api";
import type { FinanceiroResumo } from "@/components/carregamentos/carregamento-financeiro-resumo";

/** Componentes do DRE da viagem — única fonte para exibição. */
export type ComponentesResultadoViagem = {
  receita: number;
  freteLiquido: number;
  cobrancaAdicional: number;
  comissao: number;
  comissaoApurada: number;
  comissaoExtra: number;
  despesasViagem: number;
  custoVeiculoDireto: number;
  margemContratual: number;
};

export function montarComponentesResultado(
  preview: PreviewApuracao | null | undefined,
  valores: FinanceiroResumo | null | undefined
): ComponentesResultadoViagem | null {
  if (!valores && !preview) return null;

  const freteLiquido = Number(
    preview?.valorFreteLiquido ??
      valores?.valorFreteLiquido ??
      valores?.valorFreteCliente ??
      0
  );

  const receita = Number(
    preview?.valorReceitaLiquida ??
      valores?.valorReceitaLiquida ??
      freteLiquido
  );

  const cobrancaAdicional =
    preview?.cobrancaAdicional ??
    (receita > freteLiquido + 0.009
      ? Math.round((receita - freteLiquido) * 100) / 100
      : 0);

  const comissaoApurada = Number(
    preview?.valorComissaoApurada ??
      (Number(valores?.valorComissaoTotal ?? 0) - Number(preview?.descontoComissaoTotal ?? 0))
  );

  const comissao = Number(
    preview?.valorComissaoLiquida ?? valores?.valorComissaoLiquida ?? valores?.valorComissaoTotal ?? 0
  );

  const comissaoExtra =
    preview?.comissaoExtra ??
    (comissao > comissaoApurada + 0.009 ? Math.round((comissao - comissaoApurada) * 100) / 100 : 0);

  const despesasViagem = Number(
    preview?.custoDespesasViagem ?? valores?.custoDespesasViagem ?? 0
  );

  const custoVeiculoDireto = Number(
    preview?.custoVeiculoDireto ?? valores?.custoVeiculoDireto ?? 0
  );

  const margemContratual = Number(
    preview?.margemContratual ?? preview?.margemLiquida ?? valores?.margemLiquida ?? valores?.margemBruta ?? 0
  );

  return {
    receita,
    freteLiquido,
    cobrancaAdicional,
    comissao,
    comissaoApurada,
    comissaoExtra,
    despesasViagem,
    custoVeiculoDireto,
    margemContratual,
  };
}

/** Resultado operacional = receita − comissão lançada − despesas viagem − custo veículo direto. */
export function calcularResultadoOperacional(c: ComponentesResultadoViagem): number {
  return c.receita - c.comissao - c.despesasViagem - c.custoVeiculoDireto;
}

export function formulaResultadoOperacional(c: ComponentesResultadoViagem): string {
  const parts = [
    fmt(c.receita),
    `− ${fmt(c.comissao)}`,
    `− ${fmt(c.despesasViagem)}`,
  ];
  if (c.custoVeiculoDireto > 0) parts.push(`− ${fmt(c.custoVeiculoDireto)}`);
  return parts.join(" ");
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
