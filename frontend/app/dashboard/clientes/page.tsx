"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CnpjInput } from "@/components/ui/cnpj-input";
import { CpfInput } from "@/components/ui/cpf-input";
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
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { Contact, Plus, Search } from "lucide-react";
import { clientesApi, type Cliente, type ClienteTipo, type DocumentoTipo } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { toCnpjRaw, toCpfRaw, validateCnpj, validateCpf, formatCnpjDisplay, formatCpfDisplay } from "@/lib/documents";

const TIPO_LABEL: Record<ClienteTipo, string> = {
  EMBARQUE: "Embarque",
  DESEMBARQUE: "Desembarque",
  AMBOS: "Ambos",
};

const emptyForm = {
  tipoDocumento: "CNPJ" as DocumentoTipo,
  documento: "",
  nome: "",
  nomeFantasia: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  latitude: "",
  longitude: "",
  tipo: "AMBOS" as ClienteTipo,
};

const emptyFilters = {
  search: "",
  tipo: "" as "" | ClienteTipo,
};

export default function ClientesPage() {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<{ items: Cliente[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [form, setForm] = useState(emptyForm);

  const {
    tab,
    setTab,
    error,
    setError,
    editing,
    startNew,
    startEdit,
    cancelForm,
    afterSave,
    applyFilters: goToLista,
  } = useCrudPage("lista");

  const load = () =>
    clientesApi
      .list({ limit: 100 })
      .then((r) => setClientes({ items: r.items, total: r.total }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId]);

  const filteredClientes = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return clientes.items.filter((c) => {
      if (q) {
        const nomeMatch = c.nome.toLowerCase().includes(q);
        const cidadeMatch = c.cidade.toLowerCase().includes(q);
        const docDisplay =
          c.tipoDocumento === "CNPJ" ? formatCnpjDisplay(c.documento) : formatCpfDisplay(c.documento);
        const docMatch =
          docDisplay.toLowerCase().includes(q) || (qDigits.length > 0 && c.documento.includes(qDigits));
        if (!nomeMatch && !cidadeMatch && !docMatch) return false;
      }
      if (appliedFilters.tipo && c.tipo !== appliedFilters.tipo) return false;
      return true;
    });
  }, [clientes.items, appliedFilters]);

  const openNew = () => startNew(() => setForm(emptyForm));

  const openEdit = (c: Cliente) => {
    startEdit(c.id, () =>
      setForm({
        tipoDocumento: c.tipoDocumento,
        documento:
          c.tipoDocumento === "CNPJ" ? formatCnpjDisplay(c.documento) : formatCpfDisplay(c.documento),
        nome: c.nome,
        nomeFantasia: c.nomeFantasia || "",
        cep: c.cep || "",
        logradouro: c.logradouro || "",
        numero: c.numero || "",
        complemento: c.complemento || "",
        bairro: c.bairro || "",
        cidade: c.cidade,
        uf: c.uf,
        latitude: c.latitude != null && c.latitude !== "" ? String(c.latitude) : "",
        longitude: c.longitude != null && c.longitude !== "" ? String(c.longitude) : "",
        tipo: c.tipo,
      })
    );
  };

  const handleCancel = () => cancelForm(() => setForm(emptyForm));

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    goToLista();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.tipoDocumento === "CNPJ") {
      const v = validateCnpj(form.documento);
      if (!v.valid) {
        setError(v.error ?? "CNPJ inválido");
        return;
      }
    } else {
      const v = validateCpf(form.documento);
      if (!v.valid) {
        setError(v.error ?? "CPF inválido");
        return;
      }
    }
    try {
      const lat = form.latitude.trim() ? Number(form.latitude.replace(",", ".")) : null;
      const lng = form.longitude.trim() ? Number(form.longitude.replace(",", ".")) : null;
      if (form.latitude.trim() && (lat == null || Number.isNaN(lat) || lat < -90 || lat > 90)) {
        setError("Latitude inválida (−90 a 90)");
        return;
      }
      if (form.longitude.trim() && (lng == null || Number.isNaN(lng) || lng < -180 || lng > 180)) {
        setError("Longitude inválida (−180 a 180)");
        return;
      }
      const data = {
        tipoDocumento: form.tipoDocumento,
        documento: form.tipoDocumento === "CNPJ" ? toCnpjRaw(form.documento) : toCpfRaw(form.documento),
        nome: form.nome,
        tipo: form.tipo,
        cidade: form.cidade,
        uf: form.uf,
        nomeFantasia: form.nomeFantasia || undefined,
        cep: form.cep || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        latitude: lat,
        longitude: lng,
      };
      if (editing) await clientesApi.update(editing, data);
      else await clientesApi.create(data);
      await load();
      afterSave(() => setForm(emptyForm));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir cliente",
      description: "O cadastro será removido. Carregamentos vinculados podem ser afetados.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await clientesApi.remove(id);
      if (editing === id) handleCancel();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <CrudPageLayout
      title="Clientes"
      subtitle="Embarque, desembarque ou ambos — CNPJ/CPF"
      tab={tab}
      onTabChange={setTab}
      error={error}
      actions={
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      }
      filter={
        <CrudFilterPanel title="Filtrar clientes" onApply={applyFilters} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Nome, documento ou cidade"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-tipo">Tipo cliente</Label>
              <select
                id="filter-tipo"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={filters.tipo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, tipo: e.target.value as typeof filters.tipo }))
                }
              >
                <option value="">Todos</option>
                <option value="EMBARQUE">Embarque</option>
                <option value="DESEMBARQUE">Desembarque</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de clientes"
          icon={Contact}
          filteredCount={filteredClientes.length}
          totalCount={clientes.items.length}
          loading={loading}
          emptyMessage="Nenhum cliente cadastrado"
          emptyFilterMessage="Nenhum cliente corresponde ao filtro"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Nome</CrudTh>
              <CrudTh>Documento</CrudTh>
              <CrudTh>Cidade/UF</CrudTh>
              <CrudTh>Tipo</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredClientes.map((c) => (
                <CrudTableRow key={c.id}>
                  <td className="py-3 font-medium">{c.nome}</td>
                  <td className="py-3 text-muted-foreground">
                    {c.tipoDocumento === "CNPJ" ? formatCnpjDisplay(c.documento) : formatCpfDisplay(c.documento)}
                  </td>
                  <td className="py-3">
                    {c.cidade}/{c.uf}
                  </td>
                  <td className="py-3">
                    <Badge variant="outline">{TIPO_LABEL[c.tipo]}</Badge>
                  </td>
                  <CrudRowActions onEdit={() => openEdit(c)} onDelete={() => handleDelete(c.id)} />
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        </CrudListPanel>
      }
      data={
        <CrudDataPanel editing={!!editing} entityName="cliente" onCancel={handleCancel}>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="tipoDocumento">Tipo documento</Label>
              <select
                id="tipoDocumento"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.tipoDocumento}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoDocumento: e.target.value as DocumentoTipo, documento: "" }))
                }
                disabled={!!editing}
              >
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
              </select>
            </div>
            <div>
              <Label htmlFor="documento">{form.tipoDocumento}</Label>
              {form.tipoDocumento === "CNPJ" ? (
                <CnpjInput
                  value={form.documento}
                  onChange={(v) => setForm((f) => ({ ...f, documento: v }))}
                  onCnpjData={(d) =>
                    setForm((f) => ({
                      ...f,
                      nome: d.razaoSocial,
                      nomeFantasia: d.nomeFantasia || f.nomeFantasia,
                    }))
                  }
                  disabled={!!editing}
                />
              ) : (
                <CpfInput
                  value={form.documento}
                  onChange={(v) => setForm((f) => ({ ...f, documento: v }))}
                  disabled={!!editing}
                />
              )}
            </div>
            <div>
              <Label htmlFor="tipo">Tipo cliente</Label>
              <select
                id="tipo"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ClienteTipo }))}
              >
                <option value="EMBARQUE">Embarque</option>
                <option value="DESEMBARQUE">Desembarque</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="nome">Nome / Razão social</Label>
              <Input
                id="nome"
                className="mt-1"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="nomeFantasia">Nome fantasia</Label>
              <Input
                id="nomeFantasia"
                className="mt-1"
                value={form.nomeFantasia}
                onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                className="mt-1"
                value={form.cep}
                onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                className="mt-1"
                value={form.logradouro}
                onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                className="mt-1"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                className="mt-1"
                value={form.bairro}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                className="mt-1"
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                className="mt-1"
                value={form.uf}
                maxLength={2}
                onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-foreground">GPS (mapa no app do motorista)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Opcional. No Google Maps: local → compartilhar → copiar coordenadas (ex.: −6.40, −49.94).
              </p>
            </div>
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                className="mt-1"
                inputMode="decimal"
                placeholder="Ex.: -6.4098"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                className="mt-1"
                inputMode="decimal"
                placeholder="Ex.: -49.9452"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              />
            </div>
            {(form.latitude.trim() || form.cidade) && (
              <div className="sm:col-span-2">
                <a
                  href={
                    form.latitude.trim() && form.longitude.trim()
                      ? `https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          [form.logradouro, form.cidade, form.uf, "Brasil"].filter(Boolean).join(", ")
                        )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Abrir no Google Maps para conferir / copiar coordenadas
                </a>
              </div>
            )}
            <CrudFormFooter
              editing={!!editing}
              onCancel={handleCancel}
              createLabel="Criar cliente"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
