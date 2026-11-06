export type NotaFiscalPapel = "PRINCIPAL" | "TROCA";

export type NotaAggRow = {
  papel?: NotaFiscalPapel | string | null;
  quantidadeAnimais?: number | null;
  valorTotal?: string | number | null;
};

export function notasParaContabilizacao<T extends { papel?: string | null }>(notas: T[]): T[] {
  return notas.filter((n) => (n.papel ?? "PRINCIPAL") !== "TROCA");
}

export function agregarNotasFiscais(notas: NotaAggRow[]) {
  const principais = notasParaContabilizacao(notas);
  const quantidadeAnimais = principais.reduce((s, n) => s + (n.quantidadeAnimais ?? 0), 0);
  const valorCarga = principais.reduce((s, n) => s + Number(n.valorTotal ?? 0), 0);
  const troca = notas.length - principais.length;
  return { quantidadeAnimais, valorCarga, troca };
}

export const PAPEL_NOTA_LABEL: Record<NotaFiscalPapel, string> = {
  PRINCIPAL: "Principal",
  TROCA: "Troca / trânsito",
};
