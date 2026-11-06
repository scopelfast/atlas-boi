import { clearAuthStorage, getStoredToken } from "@/lib/auth-storage";

const API_BASE = typeof window !== "undefined" ? "/api" : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"}/api`;

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/motorista")) {
    localStorage.removeItem("motorista_token");
    localStorage.removeItem("motorista_nome");
    if (!path.startsWith("/motorista/login")) {
      window.location.replace("/motorista/login?expired=1");
    }
    return;
  }
  clearAuthStorage();
  if (!path.startsWith("/login")) {
    window.location.replace("/login?expired=1");
  }
}

/** Requisição pública — sem token admin e sem redirect em 401 */
async function fetchPublicApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, err));
  }
  return res.json();
}

function parseApiError(res: Response, err: unknown): string {
  const body = err as { message?: string | string[] };
  const msg = body?.message;
  const text = Array.isArray(msg) ? msg.join(", ") : msg;
  if (text) return text;
  if (res.status >= 500) {
    return `Servidor indisponível (${res.status}). Reinicie o backend: cd backend && npm run dev`;
  }
  return res.statusText || "Erro na requisição";
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, err));
  }
  return res.json();
}

export async function fetchApiFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, err));
  }
  return res.json();
}

export async function fetchApiBlob(path: string): Promise<Blob> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || res.statusText);
  }
  return res.blob();
}

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

export type Module = { id: string; name: string; slug: string; order: number };
export type ApiFunction = { id: string; name: string; slug: string };
export type Plan = { id: string; name: string; slug: string; description?: string; price?: number; _count?: { companies: number; planModules: number } };
export type Company = { id: string; name: string; slug: string; cnpj?: string; planId: string; plan: Plan; _count?: { users: number } };
export type Role = { id: string; name: string; slug: string; companyId?: string; _count?: { users: number; rolePermissions: number } };
export type User = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  role: Role;
  companyId?: string;
  company?: { id: string; name: string };
  createdAt: string;
};

export type ClienteTipo = "EMBARQUE" | "DESEMBARQUE" | "AMBOS";
export type DocumentoTipo = "CPF" | "CNPJ";
export type TipoVeiculo = "CAMINHAO" | "CARRETA" | "JULIETA" | "TOCO" | "OUTRO";
export type TipoComissao = "POR_KM" | "PERCENTUAL_CARGA" | "VALOR_FIXO" | "MISTO";

export type CarregamentoStatus =
  | "RASCUNHO"
  | "PLANEJADO"
  | "EMBARCADO"
  | "EM_TRANSITO"
  | "DESEMBARCADO"
  | "FINALIZADO"
  | "CANCELADO";

export type Carregamento = {
  id: string;
  numero: string;
  numeroMinuta?: string | null;
  minutaFotoPath?: string | null;
  minutaFotoNome?: string | null;
  numeroGta?: string | null;
  gtaUf?: string | null;
  status: CarregamentoStatus;
  clienteOrigemId: string;
  clienteDestinoId: string;
  clienteOrigem?: { id: string; nome: string; cidade: string; uf: string };
  clienteDestino?: { id: string; nome: string; cidade: string; uf: string };
  rotaId?: string;
  rota?: { id: string; codigo: string; descricao: string; distanciaKm?: string };
  dataEmbarque?: string;
  dataDesembarque?: string;
  dataPrevisaoDesembarque?: string;
  quantidadeAnimais: number;
  pesoMedioEstimado?: string;
  pesoTotal?: string;
  kmRota?: string;
  kmReal?: string;
  valorCarga?: string;
  valorFreteCliente?: string;
  valorComissaoTotal?: string;
  valorPedagio?: string;
  valorBalanca?: string;
  margemBruta?: string;
  descontoFreteCliente?: string;
  motivoDescontoFrete?: string | null;
  valorFreteLiquido?: string;
  valorReceitaLiquida?: string;
  valorComissaoLiquida?: string;
  margemLiquida?: string;
  custoDespesasViagem?: string;
  custoVeiculoDireto?: string;
  margemOperacional?: string;
  financeiroFechadoAt?: string | null;
  observacoes?: string;
  nfeChave?: string | null;
  nfeNumero?: string | null;
  nfeSerie?: string | null;
  nfeValor?: string | null;
  nfeXmlHash?: string | null;
  nfeProdutoDescricao?: string | null;
  motoristas?: {
    motoristaId: string;
    principal: boolean;
    descontoComissao?: string | null;
    motivoDescontoComissao?: string | null;
    motorista: { id: string; nome: string };
  }[];
  veiculos?: { veiculoId: string; principal: boolean; veiculo: { id: string; placa: string; tipo: TipoVeiculo } }[];
  notasFiscais?: CarregamentoNotaFiscal[];
};

export type NotaFiscalPapel = "PRINCIPAL" | "TROCA";

export type CarregamentoNotaFiscal = {
  id: string;
  chave?: string | null;
  numero: string;
  serie?: string | null;
  valorTotal: string | number;
  quantidadeAnimais?: number | null;
  papel?: NotaFiscalPapel;
  emitenteCnpj?: string | null;
  emitenteNome?: string | null;
  destinatarioCnpj?: string | null;
  destinatarioNome?: string | null;
  produtoDescricao?: string | null;
  dataEmissao?: string | null;
  xmlHash?: string | null;
  createdAt: string;
};

export type CarregamentoInput = {
  clienteOrigemId: string;
  clienteDestinoId: string;
  rotaId?: string;
  status?: CarregamentoStatus;
  quantidadeAnimais: number;
  pesoMedioEstimado?: number;
  pesoTotal?: number;
  kmRota?: number;
  kmReal?: number;
  valorCarga?: number;
  dataEmbarque?: string;
  dataDesembarque?: string;
  dataPrevisaoDesembarque?: string;
  observacoes?: string;
  numeroMinuta?: string;
  numeroGta?: string;
  gtaUf?: string;
  motoristas?: { motoristaId: string; principal?: boolean }[];
  veiculos?: { veiculoId: string; principal?: boolean }[];
  nfeChave?: string;
  nfeNumero?: string;
  nfeSerie?: string;
  nfeValor?: number;
  nfeEmitenteCnpj?: string;
  nfeDestinatarioCnpj?: string;
  nfeXmlHash?: string;
  nfeDataEmissao?: string;
  nfeProdutoDescricao?: string;
  clearNfe?: boolean;
};

export type CarregamentoEventoTipo = "CRIADO" | "STATUS_ALTERADO" | "NFE_IMPORTADA" | "EDITADO";

export type CarregamentoEvento = {
  id: string;
  tipo: CarregamentoEventoTipo;
  titulo: string;
  descricao?: string;
  statusAnterior?: CarregamentoStatus;
  statusNovo?: CarregamentoStatus;
  createdAt: string;
  user?: { id: string; name: string };
};

export type NfeClienteParaCadastrar = {
  papel: "origem" | "destino";
  tipoDocumento: DocumentoTipo;
  documento: string;
  nome: string;
  nomeFantasia?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  uf: string;
  codigoIbge?: string | null;
  tipo: ClienteTipo;
};

export type NfeBrainInsight = {
  alertas: { severidade: "info" | "warning" | "critical"; mensagem: string }[];
  sugestoes: { campo: string; valor: string; motivo: string }[];
  clientesFuzzy?: {
    origem?: { id: string; nome: string; documento: string; score: number };
    destino?: { id: string; nome: string; documento: string; score: number };
  };
  papelNotaSugerido?: "PRINCIPAL" | "TROCA";
  confianca: number;
};

export type NfeImportPreview = {
  parsed: {
    chave: string | null;
    numero: string | null;
    serie: string | null;
    valorTotal: number | null;
    emitenteCnpj: string | null;
    emitenteNome: string | null;
    destinatarioCnpj: string | null;
    destinatarioNome: string | null;
    quantidadeAnimais: number | null;
    produtoDescricao: string | null;
    numeroGta: string | null;
    gtaUf: string | null;
    gtaVencimento: string | null;
    dataEmissao: string | null;
    xmlHash: string;
  };
  clienteOrigem: { id: string; nome: string; documento: string } | null;
  clienteDestino: { id: string; nome: string; documento: string } | null;
  clientesParaCadastrar: {
    origem: NfeClienteParaCadastrar | null;
    destino: NfeClienteParaCadastrar | null;
  };
  rotaSugerida: { id: string; codigo: string; descricao: string } | null;
  rotaCriada?: boolean;
  duplicateCarregamento: { id: string; numero: string } | null;
  sugestao: Partial<CarregamentoInput>;
  inteligencia?: NfeBrainInsight;
};

export type AddNotaFiscalResult = {
  carregamento: Carregamento;
  clientesParaCadastrar: NfeImportPreview["clientesParaCadastrar"];
  inteligencia?: NfeBrainInsight;
};

export type Cliente = {
  id: string;
  tipoDocumento: DocumentoTipo;
  documento: string;
  nome: string;
  nomeFantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  tipo: ClienteTipo;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type Rota = {
  id: string;
  codigo: string;
  descricao: string;
  clienteOrigemId?: string;
  clienteDestinoId?: string;
  clienteOrigem?: { id: string; nome: string; cidade: string; uf: string };
  clienteDestino?: { id: string; nome: string; cidade: string; uf: string };
  origemTexto?: string;
  destinoTexto?: string;
  distanciaKm: string;
  valorPedagio: string;
  valorBalanca: string;
  valorKmCobrancaCliente: string;
  valorKmComissaoMotorista: string;
  percentualComissao?: string;
};

export type RotaInput = {
  codigo: string;
  descricao: string;
  clienteOrigemId?: string;
  clienteDestinoId?: string;
  origemTexto?: string;
  destinoTexto?: string;
  distanciaKm: number;
  valorPedagio?: number;
  valorBalanca?: number;
  valorKmCobrancaCliente?: number;
  valorKmComissaoMotorista?: number;
  percentualComissao?: number;
};

export type Motorista = {
  id: string;
  nome: string;
  cpf?: string;
  cnh?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  telefone?: string;
  email?: string;
  tipoComissao: TipoComissao;
  valorComissaoKm?: string;
  percentualComissao?: string;
  portalConfigurado?: boolean;
  /** Enviado apenas no create/update — nunca retornado pela API */
  portalSenha?: string;
};

export type Veiculo = {
  id: string;
  placa: string;
  renavam?: string;
  modelo?: string;
  marca?: string;
  ano?: number;
  tipo: TipoVeiculo;
  codigoCentroCusto?: string;
  descricaoCentroCusto?: string;
};

function paginatedQuery(base: string, params?: { page?: number; limit?: number; search?: string; tipo?: string }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.search) q.set("search", params.search);
  if (params?.tipo) q.set("tipo", params.tipo);
  const qs = q.toString();
  return `${base}${qs ? `?${qs}` : ""}`;
}

export const catalogApi = {
  getModules: () => fetchApi<Module[]>("/catalog/modules"),
  getFunctions: () => fetchApi<ApiFunction[]>("/catalog/functions"),
};

export const plansApi = {
  list: () => fetchApi<Plan[]>("/plans"),
  get: (id: string) => fetchApi<Plan & { planModules?: unknown[]; planModuleFuncs?: unknown[] }>(`/plans/${id}`),
  create: (data: { name: string; slug: string; description?: string; price?: number }) =>
    fetchApi("/plans", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; slug: string; description?: string; price?: number }>) =>
    fetchApi(`/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/plans/${id}`, { method: "DELETE" }),
};

export const companiesApi = {
  list: () => fetchApi<Company[]>("/companies"),
  get: (id: string) => fetchApi<Company & { users?: unknown[] }>(`/companies/${id}`),
  create: (data: { name: string; slug: string; cnpj?: string; planId: string }) =>
    fetchApi("/companies", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; slug: string; cnpj?: string; planId: string; active: boolean }>) =>
    fetchApi(`/companies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/companies/${id}`, { method: "DELETE" }),
};

export const rolesApi = {
  list: (companyId?: string) =>
    fetchApi<Role[]>(`/roles${companyId !== undefined ? `?companyId=${companyId}` : ""}`),
  get: (id: string) =>
    fetchApi<Role & { rolePermissions?: { module: Module; function: ApiFunction }[] }>(`/roles/${id}`),
  create: (data: { name: string; slug: string; companyId?: string; permissions?: { moduleId: string; functionId: string }[] }) =>
    fetchApi("/roles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; slug: string; permissions: { moduleId: string; functionId: string }[] }>) =>
    fetchApi(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/roles/${id}`, { method: "DELETE" }),
};

export const usersApi = {
  list: (companyId?: string) =>
    fetchApi<User[]>(`/users${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`),
  get: (id: string) => fetchApi<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; roleId: string; companyId?: string }) =>
    fetchApi("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ email: string; password?: string; name: string; roleId: string; active: boolean }>) =>
    fetchApi(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/users/${id}`, { method: "DELETE" }),
};

export const clientesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; tipo?: ClienteTipo }) =>
    fetchApi<Paginated<Cliente>>(paginatedQuery("/clientes", params)),
  get: (id: string) => fetchApi<Cliente>(`/clientes/${id}`),
  create: (data: Omit<Cliente, "id"> & { latitude?: number | null; longitude?: number | null }) =>
    fetchApi("/clientes", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<Omit<Cliente, "id">> & { latitude?: number | null; longitude?: number | null }
  ) => fetchApi(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/clientes/${id}`, { method: "DELETE" }),
};

export const rotasApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    fetchApi<Paginated<Rota>>(paginatedQuery("/rotas", params)),
  get: (id: string) => fetchApi<Rota>(`/rotas/${id}`),
  create: (data: RotaInput) =>
    fetchApi("/rotas", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<RotaInput> & { ativa?: boolean }) =>
    fetchApi(`/rotas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/rotas/${id}`, { method: "DELETE" }),
};

export const motoristasApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    fetchApi<Paginated<Motorista>>(paginatedQuery("/motoristas", params)),
  get: (id: string) => fetchApi<Motorista>(`/motoristas/${id}`),
  create: (data: Partial<Motorista> & { nome: string }) =>
    fetchApi("/motoristas", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Motorista>) =>
    fetchApi(`/motoristas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/motoristas/${id}`, { method: "DELETE" }),
};

export const veiculosApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    fetchApi<Paginated<Veiculo>>(paginatedQuery("/veiculos", params)),
  get: (id: string) => fetchApi<Veiculo>(`/veiculos/${id}`),
  create: (data: Partial<Veiculo> & { placa: string }) =>
    fetchApi("/veiculos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Veiculo>) =>
    fetchApi(`/veiculos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => fetchApi(`/veiculos/${id}`, { method: "DELETE" }),
};

export const carregamentosApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: CarregamentoStatus }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return fetchApi<Paginated<Carregamento>>(`/carregamentos${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => fetchApi<Carregamento>(`/carregamentos/${id}`),
  eventos: (id: string) => fetchApi<CarregamentoEvento[]>(`/carregamentos/${id}/eventos`),
  importNfe: (file: File, opts?: { cadastrarClientes?: boolean }) => {
    const fd = new FormData();
    fd.append("file", file);
    if (opts?.cadastrarClientes) fd.append("cadastrarClientes", "true");
    return fetchApiFormData<NfeImportPreview>("/carregamentos/import-nfe", fd);
  },
  cadastrarClientesNfe: (body: {
    xml: string;
    cadastrarOrigem?: boolean;
    cadastrarDestino?: boolean;
  }) =>
    fetchApi<NfeImportPreview>("/carregamentos/import-nfe/cadastrar-clientes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addNotaFiscal: (carregamentoId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetchApiFormData<AddNotaFiscalResult>(`/carregamentos/${carregamentoId}/notas-fiscais`, fd);
  },
  removeNotaFiscal: (carregamentoId: string, notaId: string) =>
    fetchApi<Carregamento>(`/carregamentos/${carregamentoId}/notas-fiscais/${notaId}`, {
      method: "DELETE",
    }),
  updateNotaPapel: (carregamentoId: string, notaId: string, papel: NotaFiscalPapel) =>
    fetchApi<Carregamento>(`/carregamentos/${carregamentoId}/notas-fiscais/${notaId}/papel`, {
      method: "PUT",
      body: JSON.stringify({ papel }),
    }),
  uploadMinutaFoto: (carregamentoId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetchApiFormData<Carregamento>(`/carregamentos/${carregamentoId}/minuta-foto`, fd);
  },
  fetchMinutaFotoBlob: (carregamentoId: string) =>
    fetchApiBlob(`/carregamentos/${carregamentoId}/minuta-foto`),
  removeMinutaFoto: (carregamentoId: string) =>
    fetchApi<Carregamento>(`/carregamentos/${carregamentoId}/minuta-foto`, { method: "DELETE" }),
  listarFotosCarga: (carregamentoId: string) =>
    fetchApi<
      {
        id: string;
        momento: string;
        nome: string;
        observacao?: string | null;
        createdAt: string;
        motorista?: { id: string; nome: string } | null;
      }[]
    >(`/carregamentos/${carregamentoId}/fotos-carga`),
  fetchFotoCargaBlob: (carregamentoId: string, fotoId: string) =>
    fetchApiBlob(`/carregamentos/${carregamentoId}/fotos-carga/${fotoId}`),
  removeFotoCarga: (carregamentoId: string, fotoId: string) =>
    fetchApi<{ success: boolean }>(`/carregamentos/${carregamentoId}/fotos-carga/${fotoId}`, {
      method: "DELETE",
    }),
  create: (data: CarregamentoInput) =>
    fetchApi("/carregamentos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CarregamentoInput>) =>
    fetchApi(`/carregamentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  clearNfe: (id: string) => fetchApi(`/carregamentos/${id}/nfe`, { method: "DELETE" }),
  remove: (id: string) => fetchApi(`/carregamentos/${id}`, { method: "DELETE" }),
};

export type LancamentoTipo =
  | "ADIANTAMENTO"
  | "DESPESA_MOTORISTA"
  | "REEMBOLSO_MOTORISTA"
  | "PRESTACAO_CONTAS"
  | "COMISSAO_MOTORISTA"
  | "DESCONTO_COMISSAO_MOTORISTA"
  | "ACERTO_MOTORISTA"
  | "FRETE_CLIENTE"
  | "ABATIMENTO_FRETE_CLIENTE"
  | "PEDAGIO_CLIENTE"
  | "BALANCA_CLIENTE"
  | "OUTROS_CLIENTE"
  | "COMBUSTIVEL"
  | "MANUTENCAO"
  | "PNEU"
  | "SEGURO"
  | "IPVA_LICENCIAMENTO"
  | "MULTA"
  | "DEPRECIACAO"
  | "OUTROS_VEICULO"
  | "RECEITA"
  | "DESPESA"
  | "TRANSFERENCIA";

export type LancamentoNatureza = "CREDITO" | "DEBITO";
export type LancamentoStatus = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "ESTORNADO";

export type LancamentoFinanceiro = {
  id: string;
  tipo: LancamentoTipo;
  natureza: LancamentoNatureza;
  status: LancamentoStatus;
  valor: string | number;
  dataLancamento: string;
  dataCompetencia: string;
  descricao: string;
  carregamentoId?: string | null;
  motoristaId?: string | null;
  clienteId?: string | null;
  veiculoId?: string | null;
  observacoes?: string | null;
  comprovantePath?: string | null;
  comprovanteNome?: string | null;
  motorista?: { id: string; nome: string } | null;
  cliente?: { id: string; nome: string } | null;
  veiculo?: { id: string; placa: string } | null;
  carregamento?: { id: string; numero: string } | null;
  criadoPor?: { id: string; name: string } | null;
  createdAt: string;
};

export type LancamentoInput = {
  tipo: LancamentoTipo;
  valor: number;
  descricao: string;
  dataLancamento?: string;
  dataCompetencia?: string;
  carregamentoId?: string;
  motoristaId?: string;
  clienteId?: string;
  veiculoId?: string;
  observacoes?: string;
  /** Despesa de viagem (motorista): espelha custo no centro do veículo */
  categoriaCustoVeiculo?: CategoriaCustoOperacional;
  /** ADIANTAMENTO = abate do adiantamento; DO_BOLSO = gera reembolso ao motorista */
  formaPagamentoMotorista?: FormaPagamentoDespesa;
};

export type CategoriaCustoOperacional = "COMBUSTIVEL" | "MANUTENCAO" | "PNEU" | "MULTA";
export type FormaPagamentoDespesa = "ADIANTAMENTO" | "DO_BOLSO";

export type PosicaoFinanceira = {
  totais: {
    faturado: number;
    recebido: number;
    aReceber: number;
    aPagarMotoristas: number;
    aReceberDeMotoristas: number;
    saldoLiquido: number;
  };
  clientes: {
    id: string;
    nome: string;
    cobrado: number;
    recebido: number;
    saldoAReceber: number;
  }[];
  motoristas: {
    id: string;
    nome: string;
    saldo: number;
    aPagar: number;
    aReceber: number;
  }[];
};

export const financeiroApi = {
  listLancamentos: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tipo?: LancamentoTipo;
    status?: LancamentoStatus;
    motoristaId?: string;
    clienteId?: string;
    veiculoId?: string;
    carregamentoId?: string;
    entidade?: "motorista" | "cliente" | "veiculo";
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.tipo) q.set("tipo", params.tipo);
    if (params?.status) q.set("status", params.status);
    if (params?.motoristaId) q.set("motoristaId", params.motoristaId);
    if (params?.clienteId) q.set("clienteId", params.clienteId);
    if (params?.veiculoId) q.set("veiculoId", params.veiculoId);
    if (params?.carregamentoId) q.set("carregamentoId", params.carregamentoId);
    if (params?.entidade) q.set("entidade", params.entidade);
    const qs = q.toString();
    return fetchApi<Paginated<LancamentoFinanceiro>>(`/financeiro/lancamentos${qs ? `?${qs}` : ""}`);
  },
  createLancamento: (data: LancamentoInput) =>
    fetchApi<LancamentoFinanceiro>("/financeiro/lancamentos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLancamentoStatus: (id: string, status: LancamentoStatus) =>
    fetchApi<LancamentoFinanceiro>(`/financeiro/lancamentos/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  saldosMotoristas: () =>
    fetchApi<{ id: string; nome: string; saldo: number }[]>("/financeiro/motoristas/saldos"),
  saldoMotorista: (motoristaId: string) =>
    fetchApi<{ motoristaId: string; saldo: number }>(`/financeiro/motoristas/${motoristaId}/saldo`),
  extratoMotorista: (motoristaId: string, params?: { page?: number; limit?: number }) =>
    fetchApi<Paginated<LancamentoFinanceiro>>(
      paginatedQuery(`/financeiro/motoristas/${motoristaId}/extrato`, params)
    ),
  apurarCarregamento: (carregamentoId: string) =>
    fetchApi<{ carregamentoId: string; lancamentos: LancamentoFinanceiro[] }>(
      `/financeiro/carregamentos/${carregamentoId}/apurar`,
      { method: "POST" }
    ),
  previewApuracao: (carregamentoId: string) =>
    fetchApi<PreviewApuracao>(`/financeiro/carregamentos/${carregamentoId}/preview-apuracao`),
  atualizarDescontos: (
    carregamentoId: string,
    data: {
      descontoFreteCliente?: number;
      motivoDescontoFrete?: string;
      motoristas?: {
        motoristaId: string;
        descontoComissao?: number;
        motivoDescontoComissao?: string;
      }[];
    }
  ) =>
    fetchApi<PreviewApuracao>(`/financeiro/carregamentos/${carregamentoId}/descontos`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  lancamentosCarregamento: (carregamentoId: string) =>
    fetchApi<{
      carregamentoId: string;
      apurado: boolean;
      items: LancamentoFinanceiro[];
      viagem: LancamentoFinanceiro[];
      veiculo: LancamentoFinanceiro[];
    }>(`/financeiro/carregamentos/${carregamentoId}/lancamentos`),
  previewPrestacaoContas: (carregamentoId: string, motoristaId: string) =>
    fetchApi<PrestacaoContasPreview>(
      `/financeiro/carregamentos/${carregamentoId}/prestacao-contas/${motoristaId}`
    ),
  fecharPrestacaoContas: (carregamentoId: string, motoristaId: string) =>
    fetchApi<PrestacaoContasPreview & { lancamentosGerados: LancamentoFinanceiro[] }>(
      `/financeiro/carregamentos/${carregamentoId}/prestacao-contas/${motoristaId}/fechar`,
      { method: "POST" }
    ),
  checklistFechamento: (carregamentoId: string) =>
    fetchApi<FechamentoFinanceiroChecklist>(
      `/financeiro/carregamentos/${carregamentoId}/fechamento-financeiro`
    ),
  fecharCarregamentoFinanceiro: (carregamentoId: string) =>
    fetchApi<FechamentoFinanceiroChecklist>(
      `/financeiro/carregamentos/${carregamentoId}/fechamento-financeiro`,
      { method: "POST" }
    ),
  getPosicao: () => fetchApi<PosicaoFinanceira>("/financeiro/posicao"),
  getTermoQuitacao: (carregamentoId: string) =>
    fetchApi<TermoQuitacao>(`/financeiro/carregamentos/${carregamentoId}/termo-quitacao`),
  saldosClientes: () =>
    fetchApi<
      { id: string; nome: string; saldoAReceber: number; cobrado: number; recebido: number }[]
    >("/financeiro/clientes/saldos"),
  extratoCliente: (clienteId: string, params?: { page?: number; limit?: number }) =>
    fetchApi<Paginated<LancamentoFinanceiro>>(
      paginatedQuery(`/financeiro/clientes/${clienteId}/extrato`, params)
    ),
  registrarRecebimento: (
    clienteId: string,
    data: {
      valor: number;
      descricao?: string;
      dataLancamento?: string;
      carregamentoId?: string;
      observacoes?: string;
    }
  ) =>
    fetchApi<LancamentoFinanceiro>(`/financeiro/clientes/${clienteId}/recebimentos`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  custosVeiculos: () =>
    fetchApi<
      { id: string; placa: string; codigoCentroCusto: string | null; custoTotal: number }[]
    >("/financeiro/veiculos/custos"),
  extratoVeiculo: (veiculoId: string, params?: { page?: number; limit?: number }) =>
    fetchApi<Paginated<LancamentoFinanceiro>>(
      paginatedQuery(`/financeiro/veiculos/${veiculoId}/extrato`, params)
    ),
  uploadComprovante: (lancamentoId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetchApiFormData<LancamentoFinanceiro>(
      `/financeiro/lancamentos/${lancamentoId}/comprovante`,
      fd
    );
  },
  comprovanteUrl: (lancamentoId: string) =>
    `${typeof window !== "undefined" ? "/api" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004/api"}/financeiro/lancamentos/${lancamentoId}/comprovante`,
};

export type PrestacaoContasPreview = {
  carregamentoId: string;
  motoristaId: string;
  motoristaNome: string;
  carregamentoNumero: string;
  adiantamentos: number;
  despesas: number;
  reembolsos: number;
  comissoes: number;
  acertos: number;
  descontosComissao: number;
  prestacoes: number;
  reembolsoDespesas?: number;
  devolucaoAdiantamento?: number;
  saldoViagem: number;
  jaFechado: boolean;
  lancamentos: {
    id: string;
    tipo: LancamentoTipo;
    natureza: LancamentoNatureza;
    valor: string | number;
    descricao: string;
    dataLancamento: string;
  }[];
};

export type PreviewApuracao = {
  carregamentoId: string;
  carregamentoNumero: string;
  clienteNome: string;
  jaApurado: boolean;
  kmUsado: number;
  tarifaComissaoDivergeDaRota?: boolean;
  freteDetalhe?: {
    kmUsado: number;
    valorKmCliente: number;
    pedagio: number;
    balanca: number;
    freteCalculado: number;
    formula: string;
  };
  comissaoDetalhes?: {
    motoristaId: string;
    motoristaNome: string;
    tipoComissao: string;
    kmUsado: number;
    valorKmMotorista: number | null;
    valorKmRota: number | null;
    valorKmAplicado: number;
    origemTarifa: "MOTORISTA" | "ROTA";
    tarifaDivergeDaRota: boolean;
    comissaoCalculada: number;
    descontoComissao: number;
    comissaoLiquida: number;
    formula: string;
  }[];
  valorFreteBruto: number;
  descontoFreteCliente: number;
  valorFreteLiquido: number;
  valorReceitaLiquida?: number;
  cobrancaAdicional?: number;
  motivoDescontoFrete?: string | null;
  valorComissaoBruta: number;
  descontoComissaoTotal: number;
  valorComissaoLiquida: number;
  valorComissaoApurada?: number;
  comissaoExtra?: number;
  valorPedagio: number;
  valorBalanca: number;
  margemBruta: number;
  margemLiquida: number;
  margemContratual?: number;
  custoDespesasViagem?: number | null;
  custoVeiculoEspelho?: number;
  custoVeiculoDireto?: number;
  margemOperacional?: number | null;
  margemAposVeiculo?: number | null;
  comissoesMotoristas: {
    motoristaId: string;
    motoristaNome: string;
    comissaoBruta: number;
    descontoComissao: number;
    comissaoLiquida: number;
    motivoDescontoComissao?: string | null;
    detalhe?: PreviewApuracao["comissaoDetalhes"] extends (infer U)[] | undefined ? U : never;
  }[];
};

export type TermoQuitacao = {
  emitidoEm: string;
  transportadora: { nome: string; cnpj: string | null };
  carregamento: {
    id: string;
    numero: string;
    dataEmbarque: string | null;
    dataDesembarque: string | null;
    quantidadeAnimais: number;
    placa: string | null;
    rota: string | null;
    valorReceitaLiquida: number;
    margemOperacional: number;
  };
  cliente: {
    id: string;
    nome: string;
    documento: string;
    cidade: string;
    uf: string;
    cobrado: number;
    recebido: number;
    saldoAReceber: number;
    quitado: boolean;
  };
  motoristas: {
    motoristaId: string;
    nome: string;
    cpf: string | null;
    comissao: number;
    saldoViagem: number;
    prestacaoFechada: boolean;
    pagamentosRegistrados: number;
  }[];
};

export type FechamentoFinanceiroChecklist = {
  carregamentoId: string;
  carregamentoNumero: string;
  clienteNome: string;
  financeiroFechadoAt: string | null;
  apurado: boolean;
  precisaApurar: boolean;
  valorFreteBrutoApurado?: number;
  valorFreteApurado: number;
  valorRecebido: number;
  cobrancaQuitada: boolean;
  motoristas: {
    motoristaId: string;
    motoristaNome: string;
    temComissao: boolean;
    requerPrestacao: boolean;
    prestacaoFechada: boolean;
  }[];
  pendencias: string[];
  avisos?: string[];
  pronto: boolean;
};

export type DashboardKpis = {
  carregamentosAtivos: number;
  animaisEmTransito: number;
  margemMedia: number | null;
  margemTotal: number | null;
  carregamentosMes: number;
  porStatus: { status: CarregamentoStatus; total: number }[];
  recentes: {
    id: string;
    numero: string;
    status: CarregamentoStatus;
    quantidadeAnimais: number;
    margemBruta: number | null;
    margemOperacional: number | null;
    valorFreteCliente: number | null;
    clienteOrigem: { cidade: string; uf: string };
    clienteDestino: { cidade: string; uf: string };
    motoristas?: { motorista: { id: string; nome: string } }[];
    veiculos?: { veiculo: { id: string; placa: string } }[];
  }[];
};

export const dashboardApi = {
  getKpis: () => fetchApi<DashboardKpis>("/dashboard/kpis"),
};

export type DreVeiculoRow = {
  veiculoId: string;
  placa: string;
  competencia: string;
  receita: number;
  custo: number;
  resultado: number;
};

export type DreConsolidadoRow = {
  competencia: string;
  receita: number;
  custo: number;
  resultado: number;
  qtdVeiculos: number;
};

export type RankingRotaRow = {
  rotaId: string;
  codigo: string;
  descricao: string;
  totalViagens: number;
  margemMedia: number | null;
  kmTotal: number | null;
  posicao: number;
};

export type RankingMotoristaRow = {
  motoristaId: string;
  nome: string;
  totalViagens: number;
  totalComissao: number;
  posicao: number;
};

export const relatoriosApi = {
  getDreVeiculo: (params?: { competencia?: string; veiculoId?: string }) => {
    const q = new URLSearchParams();
    if (params?.competencia) q.set("competencia", params.competencia);
    if (params?.veiculoId) q.set("veiculoId", params.veiculoId);
    const qs = q.toString();
    return fetchApi<DreVeiculoRow[]>(`/relatorios/dre-veiculo${qs ? `?${qs}` : ""}`);
  },
  getDreConsolidado: (competencia?: string) => {
    const qs = competencia ? `?competencia=${encodeURIComponent(competencia)}` : "";
    return fetchApi<DreConsolidadoRow[]>(`/relatorios/dre-consolidado${qs}`);
  },
  getRankingRotas: () => fetchApi<RankingRotaRow[]>("/relatorios/ranking-rotas"),
  getRankingMotoristas: () => fetchApi<RankingMotoristaRow[]>("/relatorios/ranking-motoristas"),
  refreshDre: () =>
    fetchApi<{ ok: boolean; refreshedAt: string }>("/relatorios/refresh-dre", { method: "POST" }),
  getDreCompetencias: (veiculoId?: string) => {
    const qs = veiculoId ? `?veiculoId=${encodeURIComponent(veiculoId)}` : "";
    return fetchApi<{ competencia: string; mes: string }[]>(`/relatorios/dre-competencias${qs}`);
  },
};

export type OpsAlerta = {
  id: string;
  tipo: string;
  severidade: "info" | "warning" | "critical";
  titulo: string;
  mensagem: string;
  entidadeTipo?: string;
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

export type RotaBrainSuggestion = {
  rotaId: string;
  codigo: string;
  descricao: string;
  distanciaKm: number;
  tarifaAtualKm: number;
  comissaoKm: number;
  custoEstimadoKm: number;
  tarifaMinimaKm: number | null;
  tarifaSugeridaKm: number | null;
  margemAlvoPct: number;
  margemMediaHistoricoPct: number | null;
  viagensHistorico: number;
  abaixoDaMinima: boolean;
  mensagem: string;
};

export const intelligenceApi = {
  getStatus: () =>
    fetchApi<{ pgCron: boolean; ultimoSnapshot: string | null; modulos: Record<string, boolean> }>(
      "/intelligence/status"
    ),
  getAlertas: () => fetchApi<OpsAlerta[]>("/intelligence/alertas"),
  getExemplos: () => fetchApi<{ perguntas: string[] }>("/intelligence/exemplos"),
  perguntar: (pergunta: string) =>
    fetchApi<QueryBrainResult>("/intelligence/perguntar", {
      method: "POST",
      body: JSON.stringify({ pergunta }),
    }),
  analyzeNfe: (xml: string, carregamentoId?: string) =>
    fetchApi<NfeBrainInsight>("/intelligence/nfe-analyze", {
      method: "POST",
      body: JSON.stringify({ xml, carregamentoId }),
    }),
  rotaBrain: (rotaId: string) => fetchApi<RotaBrainSuggestion>(`/intelligence/rota-brain/${rotaId}`),
  rotasSubprecificadas: () => fetchApi<RotaBrainSuggestion[]>("/intelligence/rota-brain"),
  ocrComprovante: (foto: File) => {
    const fd = new FormData();
    fd.append("foto", foto);
    return fetchApiFormData<OcrComprovanteResult>("/intelligence/ocr-comprovante", fd);
  },
};

export type OcrComprovanteResult = {
  texto: string;
  valor?: number;
  data?: string;
  estabelecimento?: string;
  confianca: number;
};

function getMotoristaToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("motorista_token");
}

async function fetchMotoristaApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getMotoristaToken();
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("motorista_token");
      localStorage.removeItem("motorista_nome");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/motorista/login")) {
        window.location.replace("/motorista/login?expired=1");
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, err));
  }
  return res.json();
}

async function fetchMotoristaFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getMotoristaToken();
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("motorista_token");
      localStorage.removeItem("motorista_nome");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/motorista/login")) {
        window.location.replace("/motorista/login?expired=1");
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, err));
  }
  return res.json();
}

async function fetchMotoristaBlob(path: string): Promise<Blob> {
  const token = getMotoristaToken();
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("motorista_token");
      localStorage.removeItem("motorista_nome");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/motorista/login")) {
        window.location.replace("/motorista/login?expired=1");
      }
    }
    throw new Error("Falha ao carregar imagem");
  }
  return res.blob();
}

export type MotoristaDespesa = {
  id: string;
  tipo: LancamentoTipo;
  valor: number;
  descricao: string;
  observacoes?: string | null;
  status: string;
  dataLancamento: string;
  comprovanteNome?: string | null;
  carregamento?: { id: string; numero: string } | null;
  veiculo?: { id: string; placa: string } | null;
  /** Despesas do CC veículo (web) são só leitura no app */
  editavel?: boolean;
  origem?: "motorista" | "veiculo";
};

export type MotoristaLocal = {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  endereco?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl: string;
};

export type MotoristaFinanceiroViagem = {
  adiantamentos: number;
  despesas: number;
  reembolsos: number;
  comissoes: number;
  descontosComissao: number;
  saldoViagem: number;
};

export type MotoristaViagem = {
  id: string;
  numero: string;
  status: string;
  quantidadeAnimais: number;
  dataEmbarque?: string | null;
  dataDesembarque?: string | null;
  dataPrevisaoDesembarque?: string | null;
  km?: number | null;
  clienteOrigem: MotoristaLocal;
  clienteDestino: MotoristaLocal;
  veiculos: { veiculoId: string; principal?: boolean; veiculo: { id: string; placa: string; tipo?: string } }[];
  principal?: boolean;
  percentualComissao?: number | null;
  financeira: MotoristaFinanceiroViagem;
  destaque?: boolean;
  ordem?: number;
};

export type MotoristaViagemDetalhe = MotoristaViagem & {
  kmRota?: number | null;
  kmReal?: number | null;
  observacoes?: string | null;
  numeroMinuta?: string | null;
  numeroGta?: string | null;
  gtaUf?: string | null;
  mapaRotaUrl: string;
  mapaEmbedUrl?: string | null;
  descontoComissao?: number | null;
  lancamentos: {
    id: string;
    tipo: LancamentoTipo;
    valor: number;
    descricao: string;
    status: string;
    dataLancamento: string;
  }[];
  fotos: MotoristaFotoCarga[];
  etapa?: {
    atual: string;
    atualLabel: string;
    proximo: string | null;
    proximoLabel: string | null;
    podeAvancar: boolean;
    botao: string | null;
    dica: string | null;
  };
};

export type MotoristaFotoCarga = {
  id: string;
  momento: "EMBARQUE" | "TRANSITO" | "DESCARGA" | "OUTROS";
  nome: string;
  observacao?: string | null;
  createdAt: string;
  propria?: boolean;
};

export type MotoristaPrestacaoContas = {
  carregamentoId: string;
  motoristaId: string;
  motoristaNome: string;
  carregamentoNumero: string;
  adiantamentos: number;
  despesas: number;
  reembolsos: number;
  comissoes: number;
  descontosComissao: number;
  acertos: number;
  prestacoes: number;
  reembolsoDespesas: number;
  devolucaoAdiantamento: number;
  saldoViagem: number;
  jaFechado: boolean;
  podeFechar: boolean;
  mensagem: string;
  lancamentos: {
    id: string;
    tipo: LancamentoTipo;
    valor: number;
    descricao: string;
    dataLancamento: string;
  }[];
};

export type MotoristaSaldo = {
  motoristaId: string;
  saldo: number;
  totais: {
    adiantamentos: number;
    despesas: number;
    reembolsos: number;
    comissoes: number;
    descontosComissao: number;
    acertos: number;
  };
  viagensAbertas: {
    id: string;
    numero: string;
    status: string;
    destaque: boolean;
    origem: string;
    destino: string;
    financeira: MotoristaFinanceiroViagem;
  }[];
};

export const motoristaApi = {
  login: (cpf: string, password: string) =>
    fetchPublicApi<{ access_token: string; motorista: { id: string; nome: string; companyId: string } }>(
      "/auth/motorista/login",
      { method: "POST", body: JSON.stringify({ cpf, password }) }
    ),
  viagens: () => fetchMotoristaApi<MotoristaViagem[]>("/motorista/viagens"),
  viagem: (id: string) => fetchMotoristaApi<MotoristaViagemDetalhe>(`/motorista/viagens/${id}`),
  avancarStatus: (id: string) =>
    fetchMotoristaApi<MotoristaViagemDetalhe>(`/motorista/viagens/${id}/avancar-status`, {
      method: "POST",
    }),
  enviarFotoCarga: (
    viagemId: string,
    input: { foto: File; momento: string; observacao?: string }
  ) => {
    const fd = new FormData();
    fd.append("foto", input.foto);
    fd.append("momento", input.momento);
    if (input.observacao) fd.append("observacao", input.observacao);
    return fetchMotoristaFormData<MotoristaFotoCarga>(`/motorista/viagens/${viagemId}/fotos`, fd);
  },
  fotoCargaBlob: (viagemId: string, fotoId: string) =>
    fetchMotoristaBlob(`/motorista/viagens/${viagemId}/fotos/${fotoId}`),
  prestacaoContas: (viagemId: string) =>
    fetchMotoristaApi<MotoristaPrestacaoContas>(`/motorista/viagens/${viagemId}/prestacao-contas`),
  fecharPrestacaoContas: (viagemId: string) =>
    fetchMotoristaApi<MotoristaPrestacaoContas>(`/motorista/viagens/${viagemId}/prestacao-contas/fechar`, {
      method: "POST",
    }),
  pushVapidKey: () =>
    fetchMotoristaApi<{ enabled: boolean; publicKey: string | null }>("/motorista/push/vapid-key"),
  pushSubscribe: (body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) =>
    fetchMotoristaApi("/motorista/push/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pushUnsubscribe: (endpoint: string) =>
    fetchMotoristaApi("/motorista/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    }),
  pushTest: () => fetchMotoristaApi("/motorista/push/test", { method: "POST" }),
  saldo: () => fetchMotoristaApi<MotoristaSaldo>("/motorista/saldo"),
  listarDespesas: () => fetchMotoristaApi<MotoristaDespesa[]>("/motorista/despesas"),
  despesa: (input: {
    valor: number;
    descricao?: string;
    observacoes?: string;
    carregamentoId?: string;
    veiculoId?: string;
    categoriaCusto?: string;
    formaPagamento?: "ADIANTAMENTO" | "DO_BOLSO";
    foto?: File;
  }) => {
    const fd = new FormData();
    fd.append("valor", String(input.valor));
    if (input.descricao) fd.append("descricao", input.descricao);
    if (input.observacoes) fd.append("observacoes", input.observacoes);
    if (input.carregamentoId) fd.append("carregamentoId", input.carregamentoId);
    if (input.veiculoId) fd.append("veiculoId", input.veiculoId);
    if (input.categoriaCusto) fd.append("categoriaCusto", input.categoriaCusto);
    if (input.formaPagamento) fd.append("formaPagamento", input.formaPagamento);
    if (input.foto) fd.append("foto", input.foto);
    return fetchMotoristaFormData("/motorista/despesas", fd);
  },
  atualizarDespesa: (id: string, data: { valor?: number; descricao?: string; observacoes?: string }) =>
    fetchMotoristaApi<MotoristaDespesa>(`/motorista/despesas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  excluirDespesa: (id: string) =>
    fetchMotoristaApi<{ success: boolean }>(`/motorista/despesas/${id}`, { method: "DELETE" }),
};
