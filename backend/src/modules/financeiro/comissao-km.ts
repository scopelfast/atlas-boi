/** Comissão por KM: km × valorKm; se percentualRota informado, aplica % sobre esse total. */
export function calcComissaoPorKm(
  km: number,
  valorKm: number,
  percentualRota?: number | null
): number {
  const base = km * valorKm;
  if (percentualRota != null && percentualRota > 0) {
    return base * (percentualRota / 100);
  }
  return base;
}

export function formulaComissaoPorKm(
  km: number,
  valorKm: number,
  percentualRota?: number | null,
  origemLabel?: string
): string {
  const kmFmt = km.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const base = km * valorKm;
  const origem = origemLabel ? ` (${origemLabel})` : "";
  const baseFmt = base.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (percentualRota != null && percentualRota > 0) {
    return `${kmFmt} km × R$ ${valorKm.toFixed(2)}/km${origem} = R$ ${baseFmt} × ${percentualRota}%`;
  }
  return `${kmFmt} km × R$ ${valorKm.toFixed(2)}/km${origem}`;
}
