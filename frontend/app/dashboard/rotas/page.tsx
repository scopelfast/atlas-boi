"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Search } from "lucide-react";
import { rotasApi, clientesApi, intelligenceApi, type Rota, type Cliente, type RotaBrainSuggestion } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { CrudPageLayout } from "@/components/crud/crud-page-layout";
import {
  CrudFilterPanel,
  CrudListPanel,
  CrudDataPanel,
  CrudFormFooter,
  CrudRowActions,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { RotasIncompletasResumo, RotaIncompletaAlert } from "@/components/rotas/rota-incompleta-alert";
import { isRotaIncompleta } from "@/lib/rota-incompleta";
import { previewComissaoRota } from "@/lib/comissao-km";
import { formatMoneyBRL } from "@/lib/documents";

const emptyForm = {
  codigo: "",
  descricao: "",
  clienteOrigemId: "",
  clienteDestinoId: "",
  distanciaKm: "",
  valorPedagio: "0",
  valorBalanca: "0",
  valorKmCobrancaCliente: "0",
  valorKmComissaoMotorista: "0",
  percentualComissao: "",
};

const emptyFilters = {
  search: "",
  clienteOrigemId: "",
  clienteDestinoId: "",
};

export default function RotasPage() {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const crud = useCrudPage("lista");
  const [rotas, setRotas] = useState<{ items: Rota[]; total: number }>({ items: [], total: 0 });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [brain, setBrain] = useState<RotaBrainSuggestion | null>(null);
  const [brainLoading, setBrainLoading] = useState(false);
  const [brainErro, setBrainErro] = useState<string | null>(null);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([
        rotasApi.list({ limit: 100 }),
        clientesApi.list({ limit: 200 }),
      ]);
      setRotas({ items: r.items, total: r.total });
      setClientes(c.items);
    } catch (e) {
      crud.setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId]);

  useEffect(() => {
    if (!crud.editing) {
      setBrain(null);
      setBrainErro(null);
      return;
    }
    let cancelled = false;
    setBrainLoading(true);
    setBrainErro(null);
    intelligenceApi
      .rotaBrain(crud.editing)
      .then((r) => {
        if (!cancelled) setBrain(r);
      })
      .catch((e) => {
        if (!cancelled) {
          setBrain(null);
          setBrainErro(e instanceof Error ? e.message : "Falha no Rota Brain");
        }
      })
      .finally(() => {
        if (!cancelled) setBrainLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crud.editing]);

  const filteredRotas = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return rotas.items.filter((r) => {
      if (appliedFilters.clienteOrigemId && r.clienteOrigemId !== appliedFilters.clienteOrigemId) return false;
      if (appliedFilters.clienteDestinoId && r.clienteDestinoId !== appliedFilters.clienteDestinoId) return false;
      if (!q) return true;
      return (
        r.codigo.toLowerCase().includes(q) ||
        r.descricao.toLowerCase().includes(q) ||
        (r.clienteOrigem?.nome?.toLowerCase().includes(q) ?? false) ||
        (r.clienteDestino?.nome?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rotas.items, appliedFilters]);

  const editingRota = crud.editing ? rotas.items.find((r) => r.id === crud.editing) : undefined;

  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  const previewComissao = useMemo(
    () =>
      previewComissaoRota({
        distanciaKm: num(form.distanciaKm),
        valorKmComissaoMotorista: num(form.valorKmComissaoMotorista),
        percentualComissao: form.percentualComissao ? num(form.percentualComissao) : null,
      }),
    [form.distanciaKm, form.valorKmComissaoMotorista, form.percentualComissao]
  );

  const loadFormFromRota = (r: Rota) => {
    setForm({
      codigo: r.codigo,
      descricao: r.descricao,
      clienteOrigemId: r.clienteOrigemId || "",
      clienteDestinoId: r.clienteDestinoId || "",
      distanciaKm: String(r.distanciaKm),
      valorPedagio: String(r.valorPedagio),
      valorBalanca: String(r.valorBalanca),
      valorKmCobrancaCliente: String(r.valorKmCobrancaCliente),
      valorKmComissaoMotorista: String(r.valorKmComissaoMotorista),
      percentualComissao: r.percentualComissao ? String(r.percentualComissao) : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    crud.setError(null);
    try {
      const data = {
        codigo: form.codigo,
        descricao: form.descricao,
        clienteOrigemId: form.clienteOrigemId || undefined,
        clienteDestinoId: form.clienteDestinoId || undefined,
        distanciaKm: num(form.distanciaKm),
        valorPedagio: num(form.valorPedagio),
        valorBalanca: num(form.valorBalanca),
        valorKmCobrancaCliente: num(form.valorKmCobrancaCliente),
        valorKmComissaoMotorista: num(form.valorKmComissaoMotorista),
        percentualComissao: form.percentualComissao ? num(form.percentualComissao) : undefined,
      };
      if (crud.editing) await rotasApi.update(crud.editing, data);
      else await rotasApi.create(data);
      crud.afterSave(() => setForm(emptyForm));
      load();
    } catch (e) {
      crud.setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir rota",
      description: "A rota será removida do cadastro. Carregamentos existentes não são alterados.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    crud.setError(null);
    try {
      await rotasApi.remove(id);
      if (crud.editing === id) crud.cancelForm(() => setForm(emptyForm));
      load();
    } catch (e) {
      crud.setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    crud.applyFilters();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  return (
    <CrudPageLayout
      title="Rotas"
      subtitle="Origem, destino, KM e tarifas"
      tab={crud.tab}
      onTabChange={crud.setTab}
      error={crud.error}
      actions={
        <Button onClick={() => crud.startNew(() => setForm(emptyForm))}>
          <Plus className="mr-2 h-4 w-4" /> Nova Rota
        </Button>
      }
      filter={
        <CrudFilterPanel title="Filtrar rotas" onApply={applyFilters} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Código, descrição ou cliente"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-origem">Cliente origem</Label>
              <select
                id="filter-origem"
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={filters.clienteOrigemId}
                onChange={(e) => setFilters((f) => ({ ...f, clienteOrigemId: e.target.value }))}
              >
                <option value="">Todos</option>
                {clientes.filter((c) => c.tipo !== "DESEMBARQUE").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.cidade}/{c.uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="filter-destino">Cliente destino</Label>
              <select
                id="filter-destino"
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={filters.clienteDestinoId}
                onChange={(e) => setFilters((f) => ({ ...f, clienteDestinoId: e.target.value }))}
              >
                <option value="">Todos</option>
                {clientes.filter((c) => c.tipo !== "EMBARQUE").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.cidade}/{c.uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de rotas"
          icon={MapPin}
          filteredCount={filteredRotas.length}
          totalCount={rotas.items.length}
          loading={loading}
          emptyMessage="Nenhuma rota cadastrada"
          emptyFilterMessage="Nenhuma rota corresponde ao filtro"
        >
          <RotasIncompletasResumo rotas={filteredRotas} />
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Código</CrudTh>
              <CrudTh>Descrição</CrudTh>
              <CrudTh>Origem → Destino</CrudTh>
              <CrudTh align="right">KM</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredRotas.map((r) => (
                <CrudTableRow key={r.id}>
                  <td className="py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {r.codigo}
                      {isRotaIncompleta(r) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          Incompleta
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3">{r.descricao}</td>
                  <td className="py-3 text-muted-foreground">
                    {r.clienteOrigem?.nome || "—"} → {r.clienteDestino?.nome || "—"}
                  </td>
                  <td className="py-3 text-right">{Number(r.distanciaKm).toLocaleString("pt-BR")}</td>
                  <CrudRowActions
                    onEdit={() => crud.startEdit(r.id, () => loadFormFromRota(r))}
                    onDelete={() => handleDelete(r.id)}
                    deleteTitle="Excluir rota"
                  />
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        </CrudListPanel>
      }
      data={
        <CrudDataPanel
          editing={!!crud.editing}
          entityName="rota"
          onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
        >
          {editingRota && isRotaIncompleta(editingRota) && (
            <RotaIncompletaAlert
              rota={editingRota}
              className="mb-4"
              origemNfe={
                Number(editingRota.distanciaKm) === 0 &&
                Number(editingRota.valorKmCobrancaCliente) === 0 &&
                Number(editingRota.valorKmComissaoMotorista) === 0
              }
            />
          )}
          {crud.editing && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                brain?.abaixoDaMinima
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border bg-muted/40"
              }`}
            >
              <p className="font-medium text-foreground">Rota Brain — precificação</p>
              {brainLoading && <p className="mt-1 text-muted-foreground">Analisando histórico…</p>}
              {brainErro && <p className="mt-1 text-destructive">{brainErro}</p>}
              {!brainLoading && brain && (
                <>
                  <p className="mt-1 text-muted-foreground">{brain.mensagem}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Atual: {formatMoneyBRL(brain.tarifaAtualKm)}/km
                    </span>
                    {brain.tarifaMinimaKm != null && (
                      <span>Mín. 15%: {formatMoneyBRL(brain.tarifaMinimaKm)}/km</span>
                    )}
                    {brain.tarifaSugeridaKm != null && (
                      <span>Sugerida: {formatMoneyBRL(brain.tarifaSugeridaKm)}/km</span>
                    )}
                    <span>{brain.viagensHistorico} viagem(ns) no histórico</span>
                  </div>
                  {brain.tarifaSugeridaKm != null && brain.abaixoDaMinima && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          valorKmCobrancaCliente: String(brain.tarifaSugeridaKm),
                        }))
                      }
                    >
                      Aplicar tarifa sugerida
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Código</Label>
              <Input
                className="mt-1"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                placeholder="SP-GO-001"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input
                className="mt-1"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Barretos → Goiânia"
                required
              />
            </div>
            <div>
              <Label>Cliente origem</Label>
              <select
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={form.clienteOrigemId}
                onChange={(e) => setForm((f) => ({ ...f, clienteOrigemId: e.target.value }))}
              >
                <option value="">— Selecione —</option>
                {clientes.filter((c) => c.tipo !== "DESEMBARQUE").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.cidade}/{c.uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cliente destino</Label>
              <select
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={form.clienteDestinoId}
                onChange={(e) => setForm((f) => ({ ...f, clienteDestinoId: e.target.value }))}
              >
                <option value="">— Selecione —</option>
                {clientes.filter((c) => c.tipo !== "EMBARQUE").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.cidade}/{c.uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Distância (KM)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.distanciaKm}
                onChange={(e) => setForm((f) => ({ ...f, distanciaKm: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Pedágio (R$)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.valorPedagio}
                onChange={(e) => setForm((f) => ({ ...f, valorPedagio: e.target.value }))}
              />
            </div>
            <div>
              <Label>Balança (R$)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.valorBalanca}
                onChange={(e) => setForm((f) => ({ ...f, valorBalanca: e.target.value }))}
              />
            </div>
            <div>
              <Label>R$/KM cobrança cliente</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.0001"
                value={form.valorKmCobrancaCliente}
                onChange={(e) => setForm((f) => ({ ...f, valorKmCobrancaCliente: e.target.value }))}
              />
            </div>
            <div>
              <Label>R$/KM comissão motorista</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.0001"
                value={form.valorKmComissaoMotorista}
                onChange={(e) => setForm((f) => ({ ...f, valorKmComissaoMotorista: e.target.value }))}
              />
            </div>
            <div>
              <Label>% comissão (opcional)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={form.percentualComissao}
                onChange={(e) => setForm((f) => ({ ...f, percentualComissao: e.target.value }))}
                placeholder="Ex.: 12"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se preenchido, aplica sobre o total km × R$/km motorista (ex.: 912 km × R$ 8,50 × 12%).
              </p>
            </div>
            {previewComissao && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Comissão estimada por viagem</p>
                <p className="mt-1 text-muted-foreground">
                  {previewComissao.pct != null && previewComissao.pct > 0 ? (
                    <>
                      {previewComissao.km.toLocaleString("pt-BR")} km ×{" "}
                      {formatMoneyBRL(previewComissao.valorKm)}/km = {formatMoneyBRL(previewComissao.base)} ×{" "}
                      {previewComissao.pct}% ={" "}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {formatMoneyBRL(previewComissao.total)}
                      </strong>
                    </>
                  ) : (
                    <>
                      {previewComissao.km.toLocaleString("pt-BR")} km ×{" "}
                      {formatMoneyBRL(previewComissao.valorKm)}/km ={" "}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {formatMoneyBRL(previewComissao.total)}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            )}
            <CrudFormFooter
              editing={!!crud.editing}
              onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
              createLabel="Criar rota"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
