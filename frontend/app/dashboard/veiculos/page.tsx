"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Search } from "lucide-react";
import { veiculosApi, type Veiculo, type TipoVeiculo } from "@/services/api";
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

const TIPO_LABEL: Record<TipoVeiculo, string> = {
  CAMINHAO: "Caminhão",
  CARRETA: "Carreta",
  JULIETA: "Julieta",
  TOCO: "Toco",
  OUTRO: "Outro",
};

const emptyForm = {
  placa: "",
  renavam: "",
  modelo: "",
  marca: "",
  ano: "",
  tipo: "CAMINHAO" as TipoVeiculo,
  codigoCentroCusto: "",
  descricaoCentroCusto: "",
};

const emptyFilters = {
  search: "",
  tipo: "" as "" | TipoVeiculo,
};

export default function VeiculosPage() {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const crud = useCrudPage("lista");
  const [veiculos, setVeiculos] = useState<{ items: Veiculo[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const load = () =>
    veiculosApi
      .list({ limit: 100 })
      .then((r) => setVeiculos({ items: r.items, total: r.total }))
      .catch((e) => crud.setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId]);

  const filteredVeiculos = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return veiculos.items.filter((v) => {
      if (appliedFilters.tipo && v.tipo !== appliedFilters.tipo) return false;
      if (!q) return true;
      const marcaModelo = [v.marca, v.modelo].filter(Boolean).join(" ").toLowerCase();
      return (
        v.placa.toLowerCase().includes(q) ||
        marcaModelo.includes(q) ||
        (v.codigoCentroCusto?.toLowerCase().includes(q) ?? false) ||
        (v.descricaoCentroCusto?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [veiculos.items, appliedFilters]);

  const loadFormFromVeiculo = (v: Veiculo) => {
    setForm({
      placa: v.placa,
      renavam: v.renavam || "",
      modelo: v.modelo || "",
      marca: v.marca || "",
      ano: v.ano ? String(v.ano) : "",
      tipo: v.tipo,
      codigoCentroCusto: v.codigoCentroCusto || "",
      descricaoCentroCusto: v.descricaoCentroCusto || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    crud.setError(null);
    try {
      const data = {
        placa: form.placa,
        renavam: form.renavam || undefined,
        modelo: form.modelo || undefined,
        marca: form.marca || undefined,
        ano: form.ano ? Number(form.ano) : undefined,
        tipo: form.tipo,
        codigoCentroCusto: form.codigoCentroCusto || undefined,
        descricaoCentroCusto: form.descricaoCentroCusto || undefined,
      };
      if (crud.editing) await veiculosApi.update(crud.editing, data);
      else await veiculosApi.create(data);
      crud.afterSave(() => setForm(emptyForm));
      load();
    } catch (e) {
      crud.setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir veículo",
      description: "O veículo será removido do cadastro da empresa.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    crud.setError(null);
    try {
      await veiculosApi.remove(id);
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
      title="Veículos"
      subtitle="Frota com centro de custo (DRE por caminhão)"
      tab={crud.tab}
      onTabChange={crud.setTab}
      error={crud.error}
      actions={
        <Button onClick={() => crud.startNew(() => setForm(emptyForm))}>
          <Plus className="mr-2 h-4 w-4" /> Novo Veículo
        </Button>
      }
      filter={
        <CrudFilterPanel title="Filtrar veículos" onApply={applyFilters} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Placa, marca, modelo ou centro de custo"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-tipo">Tipo</Label>
              <select
                id="filter-tipo"
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={filters.tipo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, tipo: e.target.value as typeof filters.tipo }))
                }
              >
                <option value="">Todos</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de veículos"
          icon={Car}
          filteredCount={filteredVeiculos.length}
          totalCount={veiculos.items.length}
          loading={loading}
          emptyMessage="Nenhum veículo cadastrado"
          emptyFilterMessage="Nenhum veículo corresponde ao filtro"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Placa</CrudTh>
              <CrudTh>Tipo</CrudTh>
              <CrudTh>Marca/Modelo</CrudTh>
              <CrudTh>Centro custo</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredVeiculos.map((v) => (
                <CrudTableRow key={v.id}>
                  <td className="py-3 font-medium">{v.placa}</td>
                  <td className="py-3">
                    <Badge variant="outline">{TIPO_LABEL[v.tipo]}</Badge>
                  </td>
                  <td className="py-3">{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</td>
                  <td className="py-3">{v.codigoCentroCusto || "—"}</td>
                  <CrudRowActions
                    onEdit={() => crud.startEdit(v.id, () => loadFormFromVeiculo(v))}
                    onDelete={() => handleDelete(v.id)}
                    deleteTitle="Excluir veículo"
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
          entityName="veículo"
          onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Placa</Label>
              <Input
                className="mt-1"
                value={form.placa}
                onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC1D23"
                required
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoVeiculo }))}
              >
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Renavam</Label>
              <Input
                className="mt-1"
                value={form.renavam}
                onChange={(e) => setForm((f) => ({ ...f, renavam: e.target.value }))}
              />
            </div>
            <div>
              <Label>Marca</Label>
              <Input
                className="mt-1"
                value={form.marca}
                onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                className="mt-1"
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Ano</Label>
              <Input
                className="mt-1"
                type="number"
                value={form.ano}
                onChange={(e) => setForm((f) => ({ ...f, ano: e.target.value }))}
              />
            </div>
            <div>
              <Label>Código centro de custo</Label>
              <Input
                className="mt-1"
                value={form.codigoCentroCusto}
                onChange={(e) => setForm((f) => ({ ...f, codigoCentroCusto: e.target.value }))}
                placeholder="CC-001"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição centro de custo</Label>
              <Input
                className="mt-1"
                value={form.descricaoCentroCusto}
                onChange={(e) => setForm((f) => ({ ...f, descricaoCentroCusto: e.target.value }))}
              />
            </div>
            <CrudFormFooter
              editing={!!crud.editing}
              onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
              createLabel="Criar veículo"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
