"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Search, List, Users, Filter, ChevronRight, Receipt, Truck, Paperclip, Scale } from "lucide-react";
import {
  financeiroApi,
  fetchApiBlob,
  motoristasApi,
  clientesApi,
  veiculosApi,
  carregamentosApi,
  type LancamentoFinanceiro,
  type LancamentoStatus,
  type Motorista,
  type Cliente,
  type Veiculo,
  type Carregamento,
  type PosicaoFinanceira,
} from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCrudPage } from "@/hooks/useCrudPage";
import { CrudPageLayout, type CrudTabDef } from "@/components/crud/crud-page-layout";
import {
  CrudFilterPanel,
  CrudListPanel,
  CrudDataPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { parseMoneyBRL } from "@/lib/documents";
import {
  FIN_ENTIDADE,
  TIPO_LABEL,
  tiposDaEntidade,
  tipoAceitaComprovante,
  type FinanceiroEntidade,
} from "@/lib/financeiro-entities";
import { FinanceiroEntityPicker } from "@/components/financeiro/financeiro-entity-picker";
import {
  FinanceiroLancamentoForm,
  emptyLancamentoForm,
  type LancamentoFormState,
} from "@/components/financeiro/financeiro-lancamento-form";
import { FinanceiroCobrancaPanel } from "@/components/financeiro/financeiro-cobranca-panel";
import { FinanceiroVeiculosPanel } from "@/components/financeiro/financeiro-veiculos-panel";
import { FinanceiroPosicaoPanel } from "@/components/financeiro/financeiro-posicao-panel";
import { rotuloCarregamento } from "@/lib/format-carregamento";
import { embarqueSemVeiculo } from "@/lib/carregamento-veiculos";

const STATUS_LABEL: Record<LancamentoStatus, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  ESTORNADO: "Estornado",
};

const FINANCEIRO_TABS: CrudTabDef[] = [
  { id: "lista", label: "Lançamentos", icon: List },
  { id: "contas", label: "Contas", icon: Scale },
  { id: "dados", label: "+ Registrar", icon: Plus },
  { id: "filtro", label: "Filtro", icon: Filter },
  { id: "saldos", label: "CC Motoristas", icon: Users },
  { id: "cobranca", label: "A receber", icon: Receipt },
  { id: "veiculos", label: "CC Veículos", icon: Truck },
];

type Filters = {
  search: string;
  entidade: "" | FinanceiroEntidade;
  entidadeId: string;
  carregamentoId: string;
  tipo: "" | LancamentoFormState["tipo"];
  status: "" | LancamentoStatus;
};

const emptyFilters: Filters = {
  search: "",
  entidade: "",
  entidadeId: "",
  carregamentoId: "",
  tipo: "",
  status: "",
};

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function listParamsFromFilters(f: Filters) {
  return {
    limit: 50,
    search: f.search || undefined,
    entidade: f.entidade || undefined,
    tipo: f.tipo || undefined,
    status: f.status || undefined,
    motoristaId: f.entidade === "motorista" && f.entidadeId ? f.entidadeId : undefined,
    clienteId: f.entidade === "cliente" && f.entidadeId ? f.entidadeId : undefined,
    veiculoId: f.entidade === "veiculo" && f.entidadeId ? f.entidadeId : undefined,
    carregamentoId: f.carregamentoId || undefined,
  };
}

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { tab, setTab, error, setError, applyFilters } = useCrudPage("lista");
  const [lancamentos, setLancamentos] = useState<{ items: LancamentoFinanceiro[]; total: number }>({
    items: [],
    total: 0,
  });
  const [saldos, setSaldos] = useState<{ id: string; nome: string; saldo: number }[]>([]);
  const [saldosClientes, setSaldosClientes] = useState<
    { id: string; nome: string; saldoAReceber: number; cobrado: number; recebido: number }[]
  >([]);
  const [custosVeiculos, setCustosVeiculos] = useState<
    { id: string; placa: string; codigoCentroCusto: string | null; custoTotal: number }[]
  >([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LancamentoFormState>(emptyLancamentoForm);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [extratoMotoristaId, setExtratoMotoristaId] = useState<string | null>(null);
  const [extrato, setExtrato] = useState<LancamentoFinanceiro[]>([]);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [posicao, setPosicao] = useState<PosicaoFinanceira | null>(null);
  const [posicaoLoading, setPosicaoLoading] = useState(false);

  const load = async () => {
    try {
      const [list, sal, salCli, custV, m, c, v, carg] = await Promise.all([
        financeiroApi.listLancamentos(listParamsFromFilters(appliedFilters)),
        financeiroApi.saldosMotoristas(),
        financeiroApi.saldosClientes(),
        financeiroApi.custosVeiculos(),
        motoristasApi.list({ limit: 100 }),
        clientesApi.list({ limit: 200 }),
        veiculosApi.list({ limit: 100 }),
        carregamentosApi.list({ limit: 150 }),
      ]);
      setLancamentos({ items: list.items, total: list.total });
      setSaldos(sal);
      setSaldosClientes(salCli);
      setCustosVeiculos(custV);
      setMotoristas(m.items);
      setClientes(c.items);
      setVeiculos(v.items);
      setCarregamentos(
        carg.items
          .filter((x) => x.status !== "CANCELADO")
          .sort((a, b) => Number(b.numero) - Number(a.numero))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar financeiro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId, appliedFilters]);

  useEffect(() => {
    if (tab !== "contas" || !user?.companyId) return;
    setPosicaoLoading(true);
    financeiroApi
      .getPosicao()
      .then(setPosicao)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar contas"))
      .finally(() => setPosicaoLoading(false));
  }, [tab, user?.companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      form.entidade === "motorista" &&
      form.tipo === "DESPESA_MOTORISTA" &&
      !form.categoriaCusto
    ) {
      setError("Selecione a categoria do custo (combustível, manutenção, pneu ou multa)");
      return;
    }
    if (
      (form.entidade === "motorista" && form.tipo === "DESPESA_MOTORISTA") ||
      form.entidade === "veiculo"
    ) {
      if (!form.carregamentoId) {
        setError("Selecione o embarque");
        return;
      }
      const carg = carregamentos.find((c) => c.id === form.carregamentoId);
      if (carg && embarqueSemVeiculo(carg)) {
        setError("Embarque sem veículo vinculado — cadastre o conjunto no carregamento");
        return;
      }
      if (!form.veiculoId) {
        setError("Selecione a placa (centro de custo) do embarque");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof financeiroApi.createLancamento>[0] = {
        tipo: form.tipo,
        valor: parseMoneyBRL(form.valor) ?? 0,
        descricao: form.descricao,
        dataLancamento: form.dataLancamento || undefined,
        carregamentoId: form.carregamentoId,
        motoristaId: form.motoristaId || undefined,
        clienteId: form.clienteId || undefined,
        veiculoId: form.veiculoId || undefined,
        observacoes: form.observacoes || undefined,
      };
      if (form.entidade === "motorista" && form.tipo === "DESPESA_MOTORISTA" && form.categoriaCusto) {
        payload.categoriaCustoVeiculo = form.categoriaCusto;
        payload.formaPagamentoMotorista = form.formaPagamento;
      }
      const created = await financeiroApi.createLancamento(payload);
      if (comprovanteFile && tipoAceitaComprovante(form.tipo)) {
        await financeiroApi.uploadComprovante(created.id, comprovanteFile);
      }
      setForm(emptyLancamentoForm());
      setComprovanteFile(null);
      await load();
      setTab("lista");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const abrirExtrato = async (motoristaId: string) => {
    if (extratoMotoristaId === motoristaId) {
      setExtratoMotoristaId(null);
      setExtrato([]);
      return;
    }
    setExtratoMotoristaId(motoristaId);
    setExtratoLoading(true);
    try {
      const res = await financeiroApi.extratoMotorista(motoristaId, { limit: 100 });
      setExtrato(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar extrato");
    } finally {
      setExtratoLoading(false);
    }
  };

  const verComprovante = async (lancamentoId: string) => {
    try {
      const blob = await fetchApiBlob(`/financeiro/lancamentos/${lancamentoId}/comprovante`);
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir comprovante");
    }
  };

  const cancelarLancamento = async (id: string) => {
    setError(null);
    try {
      await financeiroApi.updateLancamentoStatus(id, "CANCELADO");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const tiposFiltro =
    filters.entidade ? tiposDaEntidade(filters.entidade) : (Object.keys(TIPO_LABEL) as LancamentoFormState["tipo"][]);

  const entityFilterOptions =
    filters.entidade === "motorista"
      ? motoristas.map((m) => ({ id: m.id, label: m.nome }))
      : filters.entidade === "cliente"
        ? clientes.map((c) => ({ id: c.id, label: c.nome }))
        : filters.entidade === "veiculo"
          ? veiculos.map((v) => ({ id: v.id, label: v.placa }))
          : [];

  const appliedEntityLabel = (() => {
    if (!appliedFilters.entidadeId || !appliedFilters.entidade) return null;
    const opts =
      appliedFilters.entidade === "motorista"
        ? motoristas
        : appliedFilters.entidade === "cliente"
          ? clientes
          : veiculos;
    const found = opts.find((o) => o.id === appliedFilters.entidadeId);
    if (!found) return null;
    return "nome" in found ? found.nome : (found as Veiculo).placa;
  })();

  const filtrosAtivos =
    appliedFilters.entidade ||
    appliedFilters.entidadeId ||
    appliedFilters.carregamentoId ||
    appliedFilters.search ||
    appliedFilters.tipo ||
    appliedFilters.status;

  const appliedCarregamentoLabel = appliedFilters.carregamentoId
    ? carregamentos.find((c) => c.id === appliedFilters.carregamentoId)
    : undefined;

  return (
    <CrudPageLayout
      title="Financeiro"
      subtitle="Lançamentos vinculados a embarques — conta corrente de motoristas, cobrança e centro de custo por veículo"
      tab={tab}
      onTabChange={setTab}
      tabs={FINANCEIRO_TABS}
      error={error}
      actions={
        tab !== "dados" ? (
          <Button onClick={() => { setForm(emptyLancamentoForm()); setTab("dados"); }}>
            <Plus className="mr-2 h-4 w-4" /> Registrar lançamento
          </Button>
        ) : undefined
      }
      summary={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {saldosClientes.length > 0 && (
            <button
              type="button"
              onClick={() => setTab("cobranca")}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left shadow-sm transition hover:border-amber-500/50"
            >
              <p className="text-xs text-muted-foreground">Total a receber</p>
              <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {fmtBRL(saldosClientes.reduce((s, c) => s + c.saldoAReceber, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {saldosClientes.filter((c) => c.saldoAReceber > 0).length} cliente(s) · ver cobrança
              </p>
            </button>
          )}
          {saldos.slice(0, 3).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setAppliedFilters({
                  ...emptyFilters,
                  entidade: "motorista",
                  entidadeId: s.id,
                });
                setFilters({
                  ...emptyFilters,
                  entidade: "motorista",
                  entidadeId: s.id,
                });
                setTab("lista");
              }}
              className="rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition hover:border-emerald-500/40"
            >
              <p className="text-xs text-muted-foreground">Saldo CC motorista</p>
              <p className="truncate text-sm font-medium">{s.nome}</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  s.saldo >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {fmtBRL(s.saldo)}
              </p>
            </button>
          ))}
        </div>
      }
      panels={{
        filtro: (
          <CrudFilterPanel
            title="Filtrar lançamentos"
            onApply={() => {
              setAppliedFilters({ ...filters });
              applyFilters();
              setTab("lista");
            }}
            onClear={() => {
              setFilters(emptyFilters);
              setAppliedFilters(emptyFilters);
            }}
          >
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Contexto</Label>
                <FinanceiroEntityPicker
                  compact
                  value={filters.entidade}
                  onChange={(entidade) =>
                    setFilters((f) => ({
                      ...f,
                      entidade,
                      entidadeId: "",
                      tipo: "",
                    }))
                  }
                />
                {filters.entidade && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        entidade: "",
                        entidadeId: "",
                        tipo: "",
                      }))
                    }
                  >
                    Limpar contexto (todos)
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {filters.entidade && (
                  <div>
                    <Label>
                      {FIN_ENTIDADE[filters.entidade].entityLabel} específico (opcional)
                    </Label>
                    <select
                      className={CRUD_SELECT_CLASS + " mt-1"}
                      value={filters.entidadeId}
                      onChange={(e) => setFilters((f) => ({ ...f, entidadeId: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {entityFilterOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <Label>Embarque (carregamento)</Label>
                  <select
                    className={CRUD_SELECT_CLASS + " mt-1"}
                    value={filters.carregamentoId}
                    onChange={(e) => setFilters((f) => ({ ...f, carregamentoId: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {carregamentos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {rotuloCarregamento(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Buscar</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Descrição, carregamento…"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de lançamento</Label>
                  <select
                    className={CRUD_SELECT_CLASS + " mt-1"}
                    value={filters.tipo}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        tipo: e.target.value as Filters["tipo"],
                      }))
                    }
                  >
                    <option value="">Todos{filters.entidade ? " do contexto" : ""}</option>
                    {tiposFiltro.map((k) => (
                      <option key={k} value={k}>
                        {TIPO_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className={CRUD_SELECT_CLASS + " mt-1"}
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        status: e.target.value as Filters["status"],
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CrudFilterPanel>
        ),
        lista: (
          <CrudListPanel
            title="Lançamentos financeiros"
            icon={Wallet}
            filteredCount={lancamentos.items.length}
            totalCount={lancamentos.total}
            loading={loading}
            emptyMessage="Nenhum lançamento — use «+ Registrar» para criar o primeiro"
            emptyFilterMessage="Nenhum lançamento corresponde ao filtro"
          >
            {filtrosAtivos && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtros:</span>
                {appliedFilters.entidade && (
                  <Badge variant="secondary">{FIN_ENTIDADE[appliedFilters.entidade].label}</Badge>
                )}
                {appliedFilters.entidadeId && appliedEntityLabel && (
                  <Badge variant="outline">{appliedEntityLabel}</Badge>
                )}
                {appliedFilters.carregamentoId && appliedCarregamentoLabel && (
                  <Badge variant="outline">Embarque #{appliedCarregamentoLabel.numero}</Badge>
                )}
                {appliedFilters.tipo && (
                  <Badge variant="outline">{TIPO_LABEL[appliedFilters.tipo]}</Badge>
                )}
                {appliedFilters.status && (
                  <Badge variant="outline">{STATUS_LABEL[appliedFilters.status]}</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setFilters(emptyFilters);
                    setAppliedFilters(emptyFilters);
                  }}
                >
                  Limpar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTab("filtro")}>
                  Ajustar filtro
                </Button>
              </div>
            )}
            <CrudTable>
              <CrudTableHead>
                <CrudTh>Data</CrudTh>
                <CrudTh>Embarque</CrudTh>
                <CrudTh>Contexto</CrudTh>
                <CrudTh>Tipo</CrudTh>
                <CrudTh>Descrição</CrudTh>
                <CrudTh>Vínculo</CrudTh>
                <CrudTh align="right">Valor</CrudTh>
                <CrudTh>Status</CrudTh>
                <CrudTh align="right">Ações</CrudTh>
              </CrudTableHead>
              <tbody>
                {lancamentos.items.map((l) => (
                  <CrudTableRow key={l.id}>
                    <td className="py-3 text-sm">{fmtDate(l.dataLancamento)}</td>
                    <td className="py-3">
                      {l.carregamento?.numero ? (
                        <Link
                          href={`/dashboard/carregamentos?id=${l.carregamentoId || l.carregamento.id}`}
                          className="font-mono text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                        >
                          #{l.carregamento.numero}
                        </Link>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Sem embarque</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {l.motorista ? "Motorista" : l.cliente ? "Cliente" : l.veiculo ? "Veículo" : "—"}
                    </td>
                    <td className="py-3 text-sm">{TIPO_LABEL[l.tipo]}</td>
                    <td className="py-3 max-w-[180px] truncate text-sm">{l.descricao}</td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {l.motorista?.nome || l.cliente?.nome || l.veiculo?.placa || "—"}
                    </td>
                    <td
                      className={`py-3 text-right font-medium tabular-nums ${
                        l.natureza === "CREDITO" ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {l.natureza === "CREDITO" ? "+" : "−"}
                      {fmtBRL(l.valor)}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">{STATUS_LABEL[l.status]}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {l.comprovantePath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ver comprovante"
                            onClick={() => verComprovante(l.id)}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        )}
                        {l.status === "CONFIRMADO" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => cancelarLancamento(l.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </CrudTableRow>
                ))}
              </tbody>
            </CrudTable>
          </CrudListPanel>
        ),
        dados: (
          <CrudDataPanel
            editing={false}
            entityName="lançamento"
            newTitle="Registrar lançamento"
            onCancel={() => {
              setForm(emptyLancamentoForm());
              setComprovanteFile(null);
              setTab("lista");
            }}
          >
            <FinanceiroLancamentoForm
              form={form}
              setForm={setForm}
              carregamentos={carregamentos}
              motoristas={motoristas}
              clientes={clientes}
              veiculos={veiculos}
              saving={saving}
              comprovanteFile={comprovanteFile}
              onComprovanteChange={setComprovanteFile}
              onSubmit={handleSubmit}
            />
          </CrudDataPanel>
        ),
        saldos: (
          <CrudListPanel
            title="Conta corrente — motoristas"
            icon={Users}
            filteredCount={saldos.length}
            totalCount={saldos.length}
            loading={loading}
            emptyMessage="Nenhum motorista cadastrado"
            emptyFilterMessage="—"
          >
            <CrudTable>
              <CrudTableHead>
                <CrudTh>Motorista</CrudTh>
                <CrudTh align="right">Saldo CC</CrudTh>
              </CrudTableHead>
              <tbody>
                {saldos.map((s) => (
                  <CrudTableRow key={s.id}>
                    <td className="py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 font-medium hover:text-primary"
                        onClick={() => abrirExtrato(s.id)}
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            extratoMotoristaId === s.id ? "rotate-90" : ""
                          }`}
                        />
                        {s.nome}
                      </button>
                    </td>
                    <td
                      className={`py-3 text-right text-lg font-bold tabular-nums ${
                        s.saldo >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {fmtBRL(s.saldo)}
                    </td>
                  </CrudTableRow>
                ))}
              </tbody>
            </CrudTable>

            {extratoMotoristaId && (
              <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                <h4 className="mb-3 text-sm font-semibold">
                  Extrato — {saldos.find((s) => s.id === extratoMotoristaId)?.nome}
                </h4>
                {extratoLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : extrato.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lançamento nesta conta.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2">Data</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Descrição</th>
                          <th className="px-3 py-2">Carregamento</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extrato.map((l) => (
                          <tr key={l.id} className="border-b border-border/30 last:border-0">
                            <td className="px-3 py-2 whitespace-nowrap">
                              {fmtDate(l.dataLancamento)}
                            </td>
                            <td className="px-3 py-2">{TIPO_LABEL[l.tipo]}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate">{l.descricao}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {l.carregamento?.numero ? (
                                <Link
                                  href={`/dashboard/carregamentos?id=${l.carregamentoId || l.carregamento.id}`}
                                  className="text-emerald-700 hover:underline dark:text-emerald-300"
                                >
                                  #{l.carregamento.numero}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-medium tabular-nums ${
                                l.natureza === "CREDITO" ? "text-emerald-600" : "text-foreground"
                              }`}
                            >
                              {l.natureza === "CREDITO" ? "+" : "−"}
                              {fmtBRL(l.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Saldo = comissões + reembolso de despesas − adiantamento não usado − acertos. O adiantamento
              já foi pago ao motorista; despesas acima dele entram no acerto. Clique no motorista para ver o
              extrato ou use «+ Registrar» → Motorista.
            </p>
          </CrudListPanel>
        ),
        cobranca: (
          <FinanceiroCobrancaPanel
            saldos={saldosClientes}
            carregamentos={carregamentos}
            loading={loading}
            onRefresh={load}
            onError={(msg) => setError(msg || null)}
          />
        ),
        contas: <FinanceiroPosicaoPanel posicao={posicao} loading={posicaoLoading} />,
        veiculos: (
          <FinanceiroVeiculosPanel
            veiculos={custosVeiculos}
            loading={loading}
            onError={(msg) => setError(msg || null)}
          />
        ),
      }}
    />
  );
}
