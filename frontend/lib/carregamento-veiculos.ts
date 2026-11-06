import type { Carregamento, TipoVeiculo } from "@/services/api";

export type VeiculoEmbarque = {
  id: string;
  placa: string;
  tipo: TipoVeiculo;
  principal: boolean;
};

const TIPO_VEICULO_LABEL: Record<TipoVeiculo, string> = {
  CAMINHAO: "Cavalo mecânico",
  CARRETA: "Carreta / semirreboque",
  JULIETA: "Reboque (Romeu e Julieta)",
  TOCO: "Toco (veículo único)",
  OUTRO: "Outro",
};

export function labelTipoVeiculo(tipo: TipoVeiculo): string {
  return TIPO_VEICULO_LABEL[tipo] || tipo;
}

export function veiculosDoEmbarque(c: Carregamento): VeiculoEmbarque[] {
  return (
    c.veiculos?.map((v) => ({
      id: v.veiculoId,
      placa: v.veiculo.placa,
      tipo: v.veiculo.tipo as TipoVeiculo,
      principal: v.principal,
    })) ?? []
  );
}

function isImplemento(tipo: TipoVeiculo): boolean {
  return tipo === "CARRETA" || tipo === "JULIETA";
}

function isTracionador(tipo: TipoVeiculo): boolean {
  return tipo === "CAMINHAO" || tipo === "TOCO" || tipo === "OUTRO";
}

export function tracionadorDoEmbarque(c: Carregamento): VeiculoEmbarque | null {
  const vs = veiculosDoEmbarque(c);
  if (vs.length === 0) return null;
  return (
    vs.find((v) => v.principal && isTracionador(v.tipo)) ??
    vs.find((v) => isTracionador(v.tipo)) ??
    vs.find((v) => v.principal) ??
    vs.find((v) => !isImplemento(v.tipo)) ??
    vs[0]
  );
}

export function implementosDoEmbarque(c: Carregamento): VeiculoEmbarque[] {
  return veiculosDoEmbarque(c).filter((v) => isImplemento(v.tipo));
}

export function embarqueTemConjunto(c: Carregamento): boolean {
  const tracionador = tracionadorDoEmbarque(c);
  const implementos = implementosDoEmbarque(c);
  return !!tracionador && implementos.length > 0;
}

export function opcoesPlacaEmbarque(c: Carregamento): VeiculoEmbarque[] {
  const vs = veiculosDoEmbarque(c);
  if (vs.length <= 1) return vs;
  const tracionador = tracionadorDoEmbarque(c);
  if (!tracionador) return vs;
  const rest = vs.filter((v) => v.id !== tracionador.id);
  return [tracionador, ...rest];
}

export function placaPadraoEmbarque(c: Carregamento): string | null {
  return opcoesPlacaEmbarque(c)[0]?.id ?? null;
}

export function embarquePrecisaEscolherPlaca(c: Carregamento): boolean {
  return veiculosDoEmbarque(c).length > 1;
}

export function embarqueSemVeiculo(c: Carregamento): boolean {
  return veiculosDoEmbarque(c).length === 0;
}

export function rotuloPlacaEmbarque(v: VeiculoEmbarque): string {
  let papel: string;
  if (v.tipo === "CAMINHAO") papel = "Tracionador";
  else if (v.tipo === "TOCO") papel = "Toco";
  else if (isImplemento(v.tipo)) papel = labelTipoVeiculo(v.tipo);
  else papel = labelTipoVeiculo(v.tipo);
  return `${v.placa} · ${papel}`;
}

export function resolverPlacaAoVincularEmbarque(c: Carregamento): string {
  return placaPadraoEmbarque(c) ?? "";
}
