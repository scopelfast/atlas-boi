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

export function previewComissaoRota(input: {
  distanciaKm: number;
  valorKmComissaoMotorista: number;
  percentualComissao?: number | null;
}) {
  const { distanciaKm: km, valorKmComissaoMotorista: valorKm, percentualComissao: pct } = input;
  if (km <= 0 || valorKm <= 0) return null;
  const base = km * valorKm;
  const total = calcComissaoPorKm(km, valorKm, pct);
  return { km, valorKm, pct: pct ?? null, base, total };
}
