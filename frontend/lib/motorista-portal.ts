import type { LancamentoTipo } from "@/services/api";

export type CategoriaDespesaMotorista = "COMBUSTIVEL" | "MANUTENCAO" | "PNEU" | "MULTA";

export const CATEGORIAS_DESPESA_MOTORISTA: {
  id: CategoriaDespesaMotorista;
  label: string;
  icon: string;
}[] = [
  { id: "COMBUSTIVEL", label: "Combustível", icon: "⛽" },
  { id: "MANUTENCAO", label: "Manutenção", icon: "🔧" },
  { id: "PNEU", label: "Pneu / borracharia", icon: "🛞" },
  { id: "MULTA", label: "Multa", icon: "🚨" },
];

export const FORMA_PAGAMENTO_MOTORISTA = [
  { id: "ADIANTAMENTO" as const, label: "Do adiantamento", hint: "Abate da conta corrente" },
  { id: "DO_BOLSO" as const, label: "Paguei do bolso", hint: "Gera reembolso" },
];

export const TIPO_DESPESA_LABEL: Partial<Record<LancamentoTipo, string>> = {
  DESPESA_MOTORISTA: "Despesa (adiantamento)",
  REEMBOLSO_MOTORISTA: "Reembolso (do bolso)",
  COMBUSTIVEL: "Combustível (CC veículo)",
  MANUTENCAO: "Manutenção (CC veículo)",
  PNEU: "Pneu (CC veículo)",
  MULTA: "Multa (CC veículo)",
  ADIANTAMENTO: "Adiantamento",
  COMISSAO_MOTORISTA: "Comissão",
  DESCONTO_COMISSAO_MOTORISTA: "Desconto comissão",
  ACERTO_MOTORISTA: "Acerto",
  PRESTACAO_CONTAS: "Prestação de contas",
};

export const STATUS_VIAGEM: Record<string, { label: string; tone: string }> = {
  PLANEJADO: { label: "Planejado", tone: "bg-sky-500/15 text-sky-400" },
  EMBARCADO: { label: "Embarcado", tone: "bg-amber-500/15 text-amber-400" },
  EM_TRANSITO: { label: "Em trânsito", tone: "bg-emerald-500/15 text-emerald-400" },
  DESEMBARCADO: { label: "Desembarcado", tone: "bg-violet-500/15 text-violet-400" },
};

export const VIAGEM_ATIVA_KEY = "motorista_viagem_ativa";

export function getViagemAtivaId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VIAGEM_ATIVA_KEY);
}

export function setViagemAtivaId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIAGEM_ATIVA_KEY, id);
}

export function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function categoriaLabel(tipo: LancamentoTipo, descricao: string) {
  const cat = CATEGORIAS_DESPESA_MOTORISTA.find((c) =>
    descricao.toUpperCase().includes(c.label.toUpperCase().slice(0, 4))
  );
  if (cat) return cat.label;
  if (tipo === "REEMBOLSO_MOTORISTA") return "Reembolso";
  return "Despesa de viagem";
}
