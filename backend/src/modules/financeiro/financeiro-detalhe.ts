/** Detalhamento transparente de frete e comissão por embarque. */
import { calcComissaoPorKm, formulaComissaoPorKm } from "./comissao-km";
export type DetalheComissaoMotorista = {
  motoristaId: string;
  motoristaNome: string;
  tipoComissao: string;
  kmUsado: number;
  valorKmMotorista: number | null;
  valorKmRota: number | null;
  valorKmAplicado: number;
  origemTarifa: "MOTORISTA" | "ROTA";
  tarifaDivergeDaRota: boolean;
  comissaoCalculada: number;
  descontoComissao: number;
  comissaoLiquida: number;
  formula: string;
};

export type DetalheFrete = {
  kmUsado: number;
  valorKmCliente: number;
  pedagio: number;
  balanca: number;
  freteCalculado: number;
  formula: string;
};

export function buildDetalheFrete(input: {
  km: number;
  valorKmCobrancaCliente: number;
  pedagio: number;
  balanca: number;
}): DetalheFrete {
  const frete = input.km * input.valorKmCobrancaCliente + input.pedagio + input.balanca;
  const kmFmt = input.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return {
    kmUsado: input.km,
    valorKmCliente: input.valorKmCobrancaCliente,
    pedagio: input.pedagio,
    balanca: input.balanca,
    freteCalculado: frete,
    formula: `${kmFmt} km × R$ ${input.valorKmCobrancaCliente.toFixed(2)}/km + pedágio + balança`,
  };
}

export function buildDetalheComissaoMotorista(input: {
  motoristaId: string;
  motoristaNome: string;
  tipoComissao: string;
  km: number;
  valorKmMotorista: number | null;
  valorKmRota: number;
  valorCarga: number;
  percentualMotorista: number | null;
  percentualRota: number | null;
  splitPercent: number;
  descontoComissao?: number;
}): DetalheComissaoMotorista {
  const km = input.km;
  const motKm = input.valorKmMotorista;
  const rotaKm = input.valorKmRota;
  const origemTarifa: "MOTORISTA" | "ROTA" =
    motKm != null && motKm > 0 ? "MOTORISTA" : "ROTA";
  const valorKmAplicado = origemTarifa === "MOTORISTA" ? motKm! : rotaKm;
  const tarifaDivergeDaRota =
    origemTarifa === "MOTORISTA" && rotaKm > 0 && Math.abs(motKm! - rotaKm) > 0.001;

  let comissao = 0;
  const partes: string[] = [];

  if (input.tipoComissao === "POR_KM" || input.tipoComissao === "MISTO") {
    const origemLabel = origemTarifa === "MOTORISTA" ? "cadastro motorista" : "rota";
    const parte = calcComissaoPorKm(km, valorKmAplicado, input.percentualRota);
    comissao += parte;
    partes.push(
      formulaComissaoPorKm(km, valorKmAplicado, input.percentualRota, origemLabel)
    );
  }
  if (input.tipoComissao === "PERCENTUAL_CARGA" || input.tipoComissao === "MISTO") {
    const pct = input.percentualMotorista ?? 0;
    if (input.valorCarga > 0 && pct > 0) {
      const parte = input.valorCarga * (pct / 100);
      comissao += parte;
      partes.push(`${pct}% × carga R$ ${input.valorCarga.toLocaleString("pt-BR")}`);
    }
  }
  if (input.tipoComissao === "VALOR_FIXO" && motKm != null) {
    comissao = motKm;
    partes.push(`valor fixo R$ ${motKm.toFixed(2)}`);
  }

  if (input.splitPercent < 100 && input.splitPercent > 0) {
    comissao *= input.splitPercent / 100;
    partes.push(`split ${input.splitPercent}%`);
  }

  const desconto = input.descontoComissao ?? 0;

  return {
    motoristaId: input.motoristaId,
    motoristaNome: input.motoristaNome,
    tipoComissao: input.tipoComissao,
    kmUsado: km,
    valorKmMotorista: motKm,
    valorKmRota: rotaKm,
    valorKmAplicado,
    origemTarifa,
    tarifaDivergeDaRota: tarifaDivergeDaRota,
    comissaoCalculada: comissao,
    descontoComissao: desconto,
    comissaoLiquida: Math.max(0, comissao - desconto),
    formula: partes.join(" + ") || "—",
  };
}
