import Constants from "expo-constants";
import { Platform } from "react-native";

/** URL base da API NestJS (sem /api no final). */
export function getApiBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env) return env;

  // Emulador Android: host do PC
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3004";
  }
  // iOS simulator / web dev
  return "http://localhost:3004";
}

export const API_URL = `${getApiBaseUrl()}/api`;

export type Viagem = {
  id: string;
  numero: string;
  status: string;
  quantidadeAnimais: number;
  destaque?: boolean;
  clienteOrigem: { cidade: string; uf: string };
  clienteDestino: { cidade: string; uf: string };
  veiculos: { veiculo: { placa: string } }[];
};

export type ViagemDetalhe = Viagem & {
  financeira?: { saldoViagem: number };
  fotos?: { id: string; momento: string }[];
  clienteOrigem?: { cidade: string; uf: string; nome?: string };
  clienteDestino?: { cidade: string; uf: string; nome?: string };
};

export type PrestacaoContas = {
  jaFechada?: boolean;
  saldoViagem?: number;
  mensagem?: string;
};

const STATUS_LABEL: Record<string, string> = {
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
};

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

export function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg = (body as { message?: string | string[] }).message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (msg) return msg;
  return res.statusText || "Erro na requisição";
}

export async function loginMotorista(cpf: string, password: string, token?: string | null) {
  const res = await fetch(`${API_URL}/auth/motorista/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    access_token: string;
    motorista: { id: string; nome: string; companyId: string; companyName?: string };
  }>;
}

export async function fetchMotorista<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function registrarDespesa(
  token: string,
  input: {
    valor: number;
    observacoes?: string;
    carregamentoId?: string;
    veiculoId?: string;
    fotoUri?: string;
    fotoNome?: string;
  }
) {
  const fd = new FormData();
  fd.append("valor", String(input.valor));
  if (input.observacoes) fd.append("observacoes", input.observacoes);
  if (input.carregamentoId) fd.append("carregamentoId", input.carregamentoId);
  if (input.veiculoId) fd.append("veiculoId", input.veiculoId);
  if (input.fotoUri) {
    fd.append("foto", {
      uri: input.fotoUri,
      name: input.fotoNome || "comprovante.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
  }

  const res = await fetch(`${API_URL}/motorista/despesas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export const motoristaApi = {
  viagens: (token: string) => fetchMotorista<Viagem[]>("/motorista/viagens", token),
  viagem: (token: string, id: string) =>
    fetchMotorista<ViagemDetalhe>(`/motorista/viagens/${id}`, token),
  prestacao: (token: string, id: string) =>
    fetchMotorista<PrestacaoContas>(`/motorista/viagens/${id}/prestacao-contas`, token),
  fecharPrestacao: (token: string, id: string) =>
    fetchMotorista<PrestacaoContas>(`/motorista/viagens/${id}/prestacao-contas/fechar`, token, {
      method: "POST",
    }),
  enviarFoto: (
    token: string,
    id: string,
    input: { uri: string; momento: string; nome?: string; observacao?: string }
  ) => {
    const fd = new FormData();
    fd.append("foto", {
      uri: input.uri,
      name: input.nome || "carga.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    fd.append("momento", input.momento);
    if (input.observacao) fd.append("observacao", input.observacao);
    return fetch(`${API_URL}/motorista/viagens/${id}/fotos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    });
  },
  saldo: (token: string) =>
    fetchMotorista<{ motoristaId: string; saldo: number }>("/motorista/saldo", token),
};
