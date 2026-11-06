import { isRotaIncompleta } from "@/lib/rota-incompleta";
import type { Carregamento, CarregamentoStatus, Rota } from "@/services/api";

export type CarregamentoOperacaoInput = {
  status?: CarregamentoStatus;
  motoristaId?: string;
  veiculoTracionadorId?: string;
  kmRota?: string | number | null;
  rota?: Pick<Rota, "codigo" | "distanciaKm" | "valorKmCobrancaCliente" | "valorKmComissaoMotorista" | "percentualComissao"> | null;
};

const num = (v: string | number | null | undefined) => Number(v ?? 0);

const STATUS_IGNORA_ALERTA: CarregamentoStatus[] = ["CANCELADO", "FINALIZADO"];

export function carregamentoOperacaoPendencias(input: CarregamentoOperacaoInput): string[] {
  if (input.status && STATUS_IGNORA_ALERTA.includes(input.status)) return [];

  const pendencias: string[] = [];
  if (!input.motoristaId?.trim()) pendencias.push("motorista");
  if (!input.veiculoTracionadorId?.trim()) pendencias.push("veículo (tracionador)");
  if (num(input.kmRota) <= 0) pendencias.push("KM da rota");
  if (input.rota && isRotaIncompleta(input.rota)) {
    pendencias.push(`tarifas da rota ${input.rota.codigo}`);
  }
  return pendencias;
}

export function isCarregamentoOperacaoIncompleta(input: CarregamentoOperacaoInput): boolean {
  return carregamentoOperacaoPendencias(input).length > 0;
}

/** Preenche KM do carregamento a partir da rota quando o valor salvo está zerado. */
export function kmRotaSincronizadoComRota(
  kmRota: string | number | null | undefined,
  rota?: { distanciaKm?: string | number | null } | null
): string {
  const kmSalvo = num(kmRota);
  if (kmSalvo > 0) return String(kmSalvo);
  const kmRotaCadastro = num(rota?.distanciaKm);
  if (kmRotaCadastro > 0) return String(kmRotaCadastro);
  return kmRota != null && String(kmRota).trim() !== "" ? String(kmRota) : "";
}

export function pendenciasFrota(input: {
  status?: CarregamentoStatus;
  motoristaId?: string;
  veiculoTracionadorId?: string;
  motoristas?: { motorista?: { id: string } | null }[];
  veiculos?: { veiculo?: { id: string } | null }[];
}): string[] {
  if (input.status && STATUS_IGNORA_ALERTA.includes(input.status)) return [];
  const pendencias: string[] = [];
  const temMotorista =
    !!input.motoristaId?.trim() || (input.motoristas?.length ?? 0) > 0;
  const temVeiculo =
    !!input.veiculoTracionadorId?.trim() || (input.veiculos?.length ?? 0) > 0;
  if (!temMotorista) pendencias.push("motorista");
  if (!temVeiculo) pendencias.push("veículo");
  return pendencias;
}

export function pendenciasFromCarregamento(
  c: Carregamento,
  rotas: Rota[]
): string[] {
  const rota =
    (c.rotaId ? rotas.find((r) => r.id === c.rotaId) : undefined) ??
    (c.rota as Rota | undefined);
  const veiculoPrincipal =
    c.veiculos?.find((v) => v.principal)?.veiculoId ?? c.veiculos?.[0]?.veiculoId;

  return carregamentoOperacaoPendencias({
    status: c.status,
    motoristaId: c.motoristas?.[0]?.motoristaId,
    veiculoTracionadorId: veiculoPrincipal,
    kmRota: c.kmRota,
    rota: rota ?? null,
  });
}
