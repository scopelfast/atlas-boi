import { Building2, Truck, Users, type LucideIcon } from "lucide-react";
import type { LancamentoTipo } from "@/services/api";

export type FinanceiroEntidade = "motorista" | "cliente" | "veiculo";

/** Categorias de custo operacional (viagem ou veículo direto). */
export type CategoriaCustoOperacional = "COMBUSTIVEL" | "MANUTENCAO" | "PNEU" | "MULTA";

export type FormaPagamentoDespesa = "ADIANTAMENTO" | "DO_BOLSO";

export const CATEGORIAS_CUSTO_VIAGEM: { id: CategoriaCustoOperacional; label: string; hint: string }[] = [
  { id: "COMBUSTIVEL", label: "Combustível", hint: "Abastecimento na viagem" },
  { id: "MANUTENCAO", label: "Manutenção", hint: "Oficina, reparos, serviços" },
  { id: "PNEU", label: "Pneu / borracharia", hint: "Troca, recapagem, conserto" },
  { id: "MULTA", label: "Multa", hint: "Infrações de trânsito" },
];

export const TIPO_LABEL: Record<LancamentoTipo, string> = {
  ADIANTAMENTO: "Adiantamento",
  DESPESA_MOTORISTA: "Despesa de viagem",
  REEMBOLSO_MOTORISTA: "Reembolso",
  PRESTACAO_CONTAS: "Prestação de contas",
  COMISSAO_MOTORISTA: "Comissão",
  DESCONTO_COMISSAO_MOTORISTA: "Desconto comissão",
  ACERTO_MOTORISTA: "Acerto de viagem",
  FRETE_CLIENTE: "Frete",
  ABATIMENTO_FRETE_CLIENTE: "Abatimento frete",
  PEDAGIO_CLIENTE: "Pedágio",
  BALANCA_CLIENTE: "Balança",
  OUTROS_CLIENTE: "Outros (cliente)",
  COMBUSTIVEL: "Combustível",
  MANUTENCAO: "Manutenção",
  PNEU: "Pneu / borracharia",
  SEGURO: "Seguro",
  IPVA_LICENCIAMENTO: "IPVA / licenciamento",
  MULTA: "Multa",
  DEPRECIACAO: "Depreciação",
  OUTROS_VEICULO: "Outros (veículo)",
  RECEITA: "Receita",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
};

export type EntidadeConfig = {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  entityLabel: string;
  tipos: LancamentoTipo[];
  defaultTipo: LancamentoTipo;
  comprovanteTipos: LancamentoTipo[];
  descricaoPlaceholder: string;
};

export const FIN_ENTIDADE: Record<FinanceiroEntidade, EntidadeConfig> = {
  motorista: {
    label: "Motorista",
    subtitle: "Conta corrente — adiantamento, despesas de viagem, comissões e acertos",
    icon: Users,
    entityLabel: "Motorista",
    tipos: [
      "ADIANTAMENTO",
      "DESPESA_MOTORISTA",
      "REEMBOLSO_MOTORISTA",
      "COMISSAO_MOTORISTA",
      "DESCONTO_COMISSAO_MOTORISTA",
      "ACERTO_MOTORISTA",
      "PRESTACAO_CONTAS",
    ],
    defaultTipo: "ADIANTAMENTO",
    comprovanteTipos: ["DESPESA_MOTORISTA", "REEMBOLSO_MOTORISTA"],
    descricaoPlaceholder: "Ex.: Borracharia BR-153 — pneu dianteiro",
  },
  cliente: {
    label: "Cliente",
    subtitle: "Cobrança — fretes, pedágios e valores a receber",
    icon: Building2,
    entityLabel: "Cliente",
    tipos: ["FRETE_CLIENTE", "ABATIMENTO_FRETE_CLIENTE", "PEDAGIO_CLIENTE", "BALANCA_CLIENTE", "OUTROS_CLIENTE"],
    defaultTipo: "FRETE_CLIENTE",
    comprovanteTipos: [],
    descricaoPlaceholder: "Ex.: Frete carregamento #1042",
  },
  veiculo: {
    label: "Veículo",
    subtitle: "Centro de custo direto — pago pela empresa, sem reembolso ao motorista",
    icon: Truck,
    entityLabel: "Placa (centro de custo)",
    tipos: [
      "COMBUSTIVEL",
      "MANUTENCAO",
      "PNEU",
      "MULTA",
      "SEGURO",
      "IPVA_LICENCIAMENTO",
      "DEPRECIACAO",
    ],
    defaultTipo: "COMBUSTIVEL",
    comprovanteTipos: ["COMBUSTIVEL", "MANUTENCAO", "PNEU", "MULTA"],
    descricaoPlaceholder: "Ex.: Manutenção preventiva — oficina central",
  },
};

export const FIN_ENTIDADE_LIST: FinanceiroEntidade[] = ["motorista", "cliente", "veiculo"];

export function tiposDaEntidade(entidade: FinanceiroEntidade): LancamentoTipo[] {
  return FIN_ENTIDADE[entidade].tipos;
}

export function entidadeDoTipo(tipo: LancamentoTipo): FinanceiroEntidade | null {
  for (const key of FIN_ENTIDADE_LIST) {
    if (FIN_ENTIDADE[key].tipos.includes(tipo)) return key;
  }
  return null;
}

export function tipoAceitaComprovante(tipo: LancamentoTipo): boolean {
  for (const cfg of Object.values(FIN_ENTIDADE)) {
    if (cfg.comprovanteTipos.includes(tipo)) return true;
  }
  return false;
}

export function entityIdField(entidade: FinanceiroEntidade): "motoristaId" | "clienteId" | "veiculoId" {
  if (entidade === "motorista") return "motoristaId";
  if (entidade === "cliente") return "clienteId";
  return "veiculoId";
}

export function isDespesaViagemMotorista(tipo: LancamentoTipo): boolean {
  return tipo === "DESPESA_MOTORISTA";
}

export function exigeCategoriaCusto(entidade: FinanceiroEntidade, tipo: LancamentoTipo): boolean {
  if (entidade === "motorista" && tipo === "DESPESA_MOTORISTA") return true;
  if (entidade === "veiculo") {
    return (["COMBUSTIVEL", "MANUTENCAO", "PNEU", "MULTA"] as LancamentoTipo[]).includes(tipo);
  }
  return false;
}

export function exigeVeiculoNoLancamento(entidade: FinanceiroEntidade, tipo: LancamentoTipo): boolean {
  if (entidade === "veiculo") return true;
  if (entidade === "motorista" && tipo === "DESPESA_MOTORISTA") return true;
  return false;
}
