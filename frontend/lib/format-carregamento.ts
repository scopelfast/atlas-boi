import type { Carregamento } from "@/services/api";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarque",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export function rotuloCarregamento(c: Carregamento): string {
  const origem = c.clienteOrigem
    ? `${c.clienteOrigem.cidade}/${c.clienteOrigem.uf}`
    : "—";
  const destino = c.clienteDestino
    ? `${c.clienteDestino.cidade}/${c.clienteDestino.uf}`
    : "—";
  const st = STATUS_LABEL[c.status] || c.status;
  return `#${c.numero} · ${origem} → ${destino} · ${st}`;
}

export function resumoCarregamento(c: Carregamento): string {
  const parts = [
    `${c.quantidadeAnimais} cab.`,
    c.rota?.codigo ? `Rota ${c.rota.codigo}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
