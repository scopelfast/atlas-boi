export type AlertaSeveridade = "info" | "warning" | "critical";

export type OpsAlerta = {
  id: string;
  tipo:
    | "MARGEM_ANOMALA"
    | "SALDO_MOTORISTA"
    | "CNH_VENCENDO"
    | "CARREGAMENTO_PARADO"
    | "VEICULO_DEFICITARIO"
    | "ROTA_SUBPRECIFICADA";
  severidade: AlertaSeveridade;
  titulo: string;
  mensagem: string;
  entidadeTipo?: "carregamento" | "motorista" | "veiculo" | "rota";
  entidadeId?: string;
  link?: string;
};

export type QueryBrainResult = {
  pergunta: string;
  intencao: string;
  resposta: string;
  valor?: number | string | null;
  dados?: Record<string, unknown>[];
  grafico?: {
    tipo: "bar" | "pie";
    titulo: string;
    itens: { label: string; valor: number }[];
  };
};

export type NfeBrainInsight = {
  alertas: { severidade: AlertaSeveridade; mensagem: string }[];
  sugestoes: { campo: string; valor: string; motivo: string }[];
  clientesFuzzy?: {
    origem?: { id: string; nome: string; documento: string; score: number };
    destino?: { id: string; nome: string; documento: string; score: number };
  };
  papelNotaSugerido?: "PRINCIPAL" | "TROCA";
  confianca: number;
};
