import type { Rota } from "@/services/api";

type RotaTarifas = Pick<
  Rota,
  "distanciaKm" | "valorKmCobrancaCliente" | "valorKmComissaoMotorista" | "percentualComissao"
>;

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export function rotaIncompletaPendencias(rota: RotaTarifas): string[] {
  const pendencias: string[] = [];
  if (num(rota.distanciaKm) <= 0) pendencias.push("distância (km)");
  if (num(rota.valorKmCobrancaCliente) <= 0) pendencias.push("R$/km cobrança cliente");
  if (num(rota.valorKmComissaoMotorista) <= 0 && num(rota.percentualComissao) <= 0) {
    pendencias.push("comissão do motorista (R$/km ou %)");
  }
  return pendencias;
}

export function isRotaIncompleta(rota: RotaTarifas): boolean {
  return rotaIncompletaPendencias(rota).length > 0;
}
