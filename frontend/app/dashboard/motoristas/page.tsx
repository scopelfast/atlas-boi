"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CpfInput } from "@/components/ui/cpf-input";
import { Users, Plus, Search, Eye, EyeOff, ExternalLink } from "lucide-react";
import { motoristasApi, type Motorista, type TipoComissao } from "@/services/api";
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
import { toCpfRaw, validateCpf, maskCpf, formatCpfDisplay } from "@/lib/documents";

const TIPO_COMISSAO_LABEL: Record<TipoComissao, string> = {
  POR_KM: "Por km",
  PERCENTUAL_CARGA: "% carga",
  VALOR_FIXO: "Valor fixo",
  MISTO: "Misto",
};

const emptyForm = {
  nome: "",
  cpf: "",
  cnh: "",
  cnhCategoria: "",
  telefone: "",
  email: "",
  tipoComissao: "POR_KM" as TipoComissao,
  valorComissaoKm: "",
  percentualComissao: "",
  portalSenha: "",
};

const emptyFilters = {
  search: "",
  tipoComissao: "" as "" | TipoComissao,
};

function comissaoResumo(m: Motorista) {
  if (m.tipoComissao === "POR_KM" && m.valorComissaoKm) {
    return `R$ ${Number(m.valorComissaoKm).toFixed(2)}/km`;
  }
  if (m.tipoComissao === "PERCENTUAL_CARGA" && m.percentualComissao) {
    return `${Number(m.percentualComissao).toFixed(1)}%`;
  }
  if (m.tipoComissao === "VALOR_FIXO" && m.valorComissaoKm) {
    return `R$ ${Number(m.valorComissaoKm).toFixed(2)}`;
  }
  return "—";
}

export default function MotoristasPage() {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const crud = useCrudPage("lista");
  const [motoristas, setMotoristas] = useState<{ items: Motorista[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showPortalSenha, setShowPortalSenha] = useState(false);
  const [editingPortalConfigurado, setEditingPortalConfigurado] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const load = () =>
    motoristasApi
      .list({ limit: 100 })
      .then((r) => setMotoristas({ items: r.items, total: r.total }))
      .catch((e) => crud.setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId]);

  const filteredMotoristas = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return motoristas.items.filter((m) => {
      if (appliedFilters.tipoComissao && m.tipoComissao !== appliedFilters.tipoComissao) return false;
      if (!q) return true;
      const cpfDisplay = formatCpfDisplay(m.cpf || "").toLowerCase();
      return (
        m.nome.toLowerCase().includes(q) ||
        cpfDisplay.includes(q) ||
        (m.cnh?.toLowerCase().includes(q) ?? false) ||
        (m.telefone?.includes(q) ?? false) ||
        (m.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [motoristas.items, appliedFilters]);

  const loadFormFromMotorista = (m: Motorista) => {
    setEditingPortalConfigurado(Boolean(m.portalConfigurado));
    setForm({
      nome: m.nome,
      cpf: m.cpf ? maskCpf(m.cpf) : "",
      cnh: m.cnh || "",
      cnhCategoria: m.cnhCategoria || "",
      telefone: m.telefone || "",
      email: m.email || "",
      tipoComissao: m.tipoComissao,
      valorComissaoKm: m.valorComissaoKm ? String(m.valorComissaoKm) : "",
      percentualComissao: m.percentualComissao ? String(m.percentualComissao) : "",
      portalSenha: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    crud.setError(null);
    if (form.cpf) {
      const v = validateCpf(form.cpf);
      if (!v.valid) {
        crud.setError(v.error ?? "CPF inválido");
        return;
      }
    }
    if (form.portalSenha.trim() && !form.cpf) {
      crud.setError("Informe o CPF para habilitar o app do motorista");
      return;
    }
    if (form.portalSenha.trim() && form.portalSenha.trim().length < 6) {
      crud.setError("Senha do portal deve ter no mínimo 6 caracteres");
      return;
    }
    try {
      const data = {
        nome: form.nome.trim(),
        cpf: form.cpf ? toCpfRaw(form.cpf) : undefined,
        cnh: form.cnh.trim() || undefined,
        cnhCategoria: form.cnhCategoria.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
        tipoComissao: form.tipoComissao,
        valorComissaoKm: form.valorComissaoKm ? form.valorComissaoKm : undefined,
        percentualComissao: form.percentualComissao ? form.percentualComissao : undefined,
        ...(form.portalSenha.trim() ? { portalSenha: form.portalSenha.trim() } : {}),
      };
      if (crud.editing) await motoristasApi.update(crud.editing, data);
      else await motoristasApi.create(data);
      crud.afterSave(() => {
        setForm(emptyForm);
        setEditingPortalConfigurado(false);
      });
      load();
    } catch (e) {
      crud.setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir motorista",
      description: "O motorista será removido do cadastro da empresa.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    crud.setError(null);
    try {
      await motoristasApi.remove(id);
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
      title="Motoristas"
      subtitle="Cadastro, CNH e regras de comissão por viagem"
      tab={crud.tab}
      onTabChange={crud.setTab}
      error={crud.error}
      actions={
        <Button onClick={() => crud.startNew(() => {
          setForm(emptyForm);
          setEditingPortalConfigurado(false);
        })}>
          <Plus className="mr-2 h-4 w-4" /> Novo Motorista
        </Button>
      }
      filter={
        <CrudFilterPanel title="Filtrar motoristas" onApply={applyFilters} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Nome, CPF, CNH, telefone ou e-mail"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-comissao">Tipo comissão</Label>
              <select
                id="filter-comissao"
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={filters.tipoComissao}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, tipoComissao: e.target.value as typeof filters.tipoComissao }))
                }
              >
                <option value="">Todos</option>
                {Object.entries(TIPO_COMISSAO_LABEL).map(([k, v]) => (
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
          title="Lista de motoristas"
          icon={Users}
          filteredCount={filteredMotoristas.length}
          totalCount={motoristas.items.length}
          loading={loading}
          emptyMessage="Nenhum motorista cadastrado"
          emptyFilterMessage="Nenhum motorista corresponde ao filtro"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Nome</CrudTh>
              <CrudTh>CPF</CrudTh>
              <CrudTh>Portal</CrudTh>
              <CrudTh>CNH</CrudTh>
              <CrudTh>Comissão</CrudTh>
              <CrudTh>Contato</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredMotoristas.map((m) => (
                <CrudTableRow key={m.id}>
                  <td className="py-3 font-medium">{m.nome}</td>
                  <td className="py-3 tabular-nums">{formatCpfDisplay(m.cpf || "") || "—"}</td>
                  <td className="py-3">
                    {m.portalConfigurado ? (
                      <Badge variant="secondary" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                        App ativo
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem senha</span>
                    )}
                  </td>
                  <td className="py-3">{m.cnh || "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{TIPO_COMISSAO_LABEL[m.tipoComissao]}</Badge>
                      <span className="text-xs text-muted-foreground">{comissaoResumo(m)}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {m.telefone || m.email || "—"}
                  </td>
                  <CrudRowActions
                    onEdit={() => crud.startEdit(m.id, () => loadFormFromMotorista(m))}
                    onDelete={() => handleDelete(m.id)}
                    deleteTitle="Excluir motorista"
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
          entityName="motorista"
          onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                className="mt-1"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: João Silva"
                required
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <CpfInput
                id="cpf"
                className="mt-1"
                value={form.cpf}
                onChange={(v) => setForm((f) => ({ ...f, cpf: v }))}
                hint="Opcional. Validação e máscara automáticas."
              />
            </div>
            <div>
              <Label htmlFor="cnh">CNH</Label>
              <Input
                id="cnh"
                className="mt-1"
                value={form.cnh}
                onChange={(e) => setForm((f) => ({ ...f, cnh: e.target.value }))}
                placeholder="Número da CNH"
              />
            </div>
            <div>
              <Label htmlFor="cnhCategoria">Categoria CNH</Label>
              <Input
                id="cnhCategoria"
                className="mt-1"
                value={form.cnhCategoria}
                onChange={(e) => setForm((f) => ({ ...f, cnhCategoria: e.target.value.toUpperCase() }))}
                placeholder="Ex.: E"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                className="mt-1"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="(17) 99999-0000"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                className="mt-1"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tipoComissao">Tipo comissão</Label>
              <select
                id="tipoComissao"
                className={`${CRUD_SELECT_CLASS} mt-1`}
                value={form.tipoComissao}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoComissao: e.target.value as TipoComissao }))
                }
              >
                {Object.entries(TIPO_COMISSAO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="valorComissaoKm">
                {form.tipoComissao === "PERCENTUAL_CARGA" ? "Valor fixo (R$)" : "Valor por km (R$)"}
              </Label>
              <Input
                id="valorComissaoKm"
                type="number"
                step="0.01"
                min="0"
                className="mt-1"
                value={form.valorComissaoKm}
                onChange={(e) => setForm((f) => ({ ...f, valorComissaoKm: e.target.value }))}
                disabled={form.tipoComissao === "PERCENTUAL_CARGA"}
                placeholder="1,20"
              />
            </div>
            <div>
              <Label htmlFor="percentualComissao">Percentual (%)</Label>
              <Input
                id="percentualComissao"
                type="number"
                step="0.1"
                min="0"
                className="mt-1"
                value={form.percentualComissao}
                onChange={(e) => setForm((f) => ({ ...f, percentualComissao: e.target.value }))}
                disabled={form.tipoComissao === "POR_KM" || form.tipoComissao === "VALOR_FIXO"}
                placeholder="2,0"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">App do motorista</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  O motorista entra em <strong>/motorista/login</strong> com CPF e esta senha. Deixe em branco para não alterar
                  {editingPortalConfigurado ? " (senha já configurada)." : "."}
                </p>
              </div>
              <Link
                href="/motorista/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir app motorista
              </Link>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <Label htmlFor="portalSenha">Senha do portal</Label>
              <div className="relative mt-2 max-w-sm">
                <Input
                  id="portalSenha"
                  type={showPortalSenha ? "text" : "password"}
                  className="pr-11"
                  value={form.portalSenha}
                  onChange={(e) => setForm((f) => ({ ...f, portalSenha: e.target.value }))}
                  placeholder={editingPortalConfigurado ? "Nova senha (opcional)" : "Senha do app (mín. 6 caracteres)"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPortalSenha(!showPortalSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPortalSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPortalSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <CrudFormFooter
              editing={!!crud.editing}
              onCancel={() => crud.cancelForm(() => setForm(emptyForm))}
              createLabel="Criar motorista"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
