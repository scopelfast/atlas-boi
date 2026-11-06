import { Filter, List, Receipt, ClipboardList, Clock, FileCheck2, TrendingUp, Route } from "lucide-react";
import type { CrudTabDef } from "@/components/crud/crud-page-layout";
import type { Carregamento, CarregamentoStatus } from "@/services/api";
import type { FinanceiroResumo } from "@/components/carregamentos/carregamento-financeiro-resumo";
import {
  calcularResultadoOperacional,
  montarComponentesResultado,
} from "@/lib/financeiro-resultado";

export const STATUS_LABEL: Record<CarregamentoStatus, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const STATUS_FLOW: CarregamentoStatus[] = [
  "RASCUNHO",
  "PLANEJADO",
  "EMBARCADO",
  "EM_TRANSITO",
  "DESEMBARCADO",
  "FINALIZADO",
];

export const STATUS_PRECISA_GTA: CarregamentoStatus[] = [
  "EM_TRANSITO",
  "DESEMBARCADO",
  "FINALIZADO",
];

export const STATUS_COLOR: Record<CarregamentoStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  PLANEJADO: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  EMBARCADO: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  EM_TRANSITO: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  DESEMBARCADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  FINALIZADO: "bg-emerald-600 text-white dark:bg-emerald-700",
  CANCELADO: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export const emptyForm = {
  clienteOrigemId: "",
  clienteDestinoId: "",
  rotaId: "",
  status: "RASCUNHO" as CarregamentoStatus,
  quantidadeAnimais: "",
  kmRota: "",
  valorCarga: "",
  dataEmbarque: "",
  dataPrevisaoDesembarque: "",
  motoristaId: "",
  veiculoTracionadorId: "",
  veiculoImplementoId: "",
  observacoes: "",
  numeroMinuta: "",
  numeroGta: "",
  gtaUf: "",
};

export type CarregamentoFormState = typeof emptyForm;

export const emptyFilters = {
  search: "",
  status: "" as "" | CarregamentoStatus,
};

export const CARREGAMENTO_TABS: CrudTabDef[] = [
  { id: "filtro", label: "Filtro", icon: Filter },
  { id: "lista", label: "Lista", icon: List },
  { id: "programacao", label: "Programação", icon: Route },
  { id: "resultado", label: "Resultado financeiro", icon: TrendingUp },
  { id: "notas", label: "Notas fiscais", icon: Receipt },
  { id: "minuta", label: "Minuta", icon: ClipboardList },
  { id: "gta", label: "GTA", icon: FileCheck2 },
  { id: "timeline", label: "Timeline", icon: Clock },
];

export const TABS_COM_CADASTROS = new Set([
  "programacao",
  "resultado",
  "notas",
  "minuta",
  "gta",
]);

export const DETAIL_TABS = new Set([
  "programacao",
  "resultado",
  "notas",
  "minuta",
  "gta",
  "timeline",
]);

export function carregamentoContext(c: Pick<Carregamento, "numero" | "numeroMinuta">) {
  return {
    label: "Código",
    value: c.numero,
    ...(c.numeroMinuta ? { extra: { label: "Minuta", value: c.numeroMinuta } } : {}),
  };
}

export function avisoGtaStatus(proximo: CarregamentoStatus, temGta: boolean): string | undefined {
  if (temGta || !STATUS_PRECISA_GTA.includes(proximo)) return undefined;
  if (proximo === "EM_TRANSITO") {
    return "GTA não cadastrada. Antes de sair em trânsito, informe o número da guia na aba GTA do carregamento.";
  }
  return "GTA não cadastrada neste carregamento.";
}

export function proximoStatus(atual: CarregamentoStatus): CarregamentoStatus | null {
  const idx = STATUS_FLOW.indexOf(atual);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

/** Etapa anterior no fluxo (correção no escritório). */
export function statusAnterior(atual: CarregamentoStatus): CarregamentoStatus | null {
  const idx = STATUS_FLOW.indexOf(atual);
  if (idx <= 0) return null;
  return STATUS_FLOW[idx - 1];
}

export function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function financasFromCarregamento(c: Carregamento): FinanceiroResumo {
  return {
    valorFreteCliente: c.valorFreteCliente,
    valorComissaoTotal: c.valorComissaoTotal,
    valorPedagio: c.valorPedagio,
    valorBalanca: c.valorBalanca,
    margemBruta: c.margemBruta,
    descontoFreteCliente: c.descontoFreteCliente,
    motivoDescontoFrete: c.motivoDescontoFrete,
    valorFreteLiquido: c.valorFreteLiquido,
    valorReceitaLiquida: c.valorReceitaLiquida,
    valorComissaoLiquida: c.valorComissaoLiquida,
    margemLiquida: c.margemLiquida,
    custoDespesasViagem: c.custoDespesasViagem,
    custoVeiculoDireto: c.custoVeiculoDireto,
    margemOperacional: c.margemOperacional,
  };
}

export function freteExibir(c: Carregamento) {
  return c.valorFreteLiquido ?? c.valorFreteCliente;
}

export function margemExibir(c: Carregamento) {
  const comp = montarComponentesResultado(null, financasFromCarregamento(c));
  if (comp) return calcularResultadoOperacional(comp);
  return c.margemOperacional ?? c.margemLiquida ?? c.margemBruta;
}
