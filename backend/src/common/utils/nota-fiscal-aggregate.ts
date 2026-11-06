/** Linha mínima para agregar NF-e no carregamento. */
export type NotaFiscalAggRow = {
  papel?: string | null;
  quantidadeAnimais?: number | null;
  valorTotal: number | string | { toString(): string };
};

/** NF-e de troca/trânsito não entram na qty/valor da carga. */
export function notasParaContabilizacao<T extends { papel?: string | null }>(notas: T[]): T[] {
  return notas.filter((n) => (n.papel ?? "PRINCIPAL") !== "TROCA");
}

export function agregarNotasFiscais(notas: NotaFiscalAggRow[]) {
  const principais = notasParaContabilizacao(notas);
  const quantidadeAnimais = principais.reduce((sum, n) => sum + (n.quantidadeAnimais ?? 0), 0);
  const valorCarga = principais.reduce((sum, n) => sum + Number(n.valorTotal), 0);
  const troca = notas.length - principais.length;
  return { quantidadeAnimais, valorCarga, principais, troca };
}
