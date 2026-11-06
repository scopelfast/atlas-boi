"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Users, CreditCard, Pencil, Trash2 } from "lucide-react";
import { CrudPageLayout } from "@/components/crud/crud-page-layout";
import {
  CrudFilterPanel,
  CrudListPanel,
  CrudDataPanel,
  CrudFormFooter,
  CrudFieldSection,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { StatCard } from "@/components/dashboard/stat-card";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { companiesApi, plansApi, type Plan, type Company } from "@/services/api";
import { CnpjInput } from "@/components/ui/cnpj-input";
import { toCnpjRaw, maskCnpj, validateCnpj, formatCnpjDisplay } from "@/lib/documents";
import { cn } from "@/utils/cn";

const emptyForm = { name: "", slug: "", cnpj: "", planId: "" };
const emptyFilters = { search: "", planId: "" };

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  professional: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

function planBadgeClass(slug?: string) {
  if (!slug) return "bg-muted text-muted-foreground";
  return PLAN_BADGE[slug.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

export default function EmpresasPage() {
  const searchParams = useSearchParams();
  const planoFromUrl = searchParams.get("plano") ?? "";
  const { confirm } = useConfirm();
  const { tab, setTab, error, setError, editing, startNew, startEdit, cancelForm, afterSave, applyFilters } =
    useCrudPage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...emptyFilters, planId: planoFromUrl });
  const [appliedFilters, setAppliedFilters] = useState({ ...emptyFilters, planId: planoFromUrl });
  const [form, setForm] = useState(emptyForm);
  const [editingUsers, setEditingUsers] = useState<
    { id: string; name: string; email: string; active: boolean; role: { name: string } }[]
  >([]);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([companiesApi.list(), plansApi.list()]);
      setCompanies(c);
      setPlans(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) {
      setEditingUsers([]);
      return;
    }
    companiesApi
      .get(editing)
      .then((c) => {
        const users = (c as Company & { users?: typeof editingUsers }).users ?? [];
        setEditingUsers(users);
      })
      .catch(() => setEditingUsers([]));
  }, [editing]);

  const filteredCompanies = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    const qRaw = appliedFilters.search.replace(/\D/g, "");
    return companies.filter((c) => {
      if (appliedFilters.planId && c.plan.id !== appliedFilters.planId) return false;
      if (!q && !qRaw) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (qRaw.length > 0 && (c.cnpj?.replace(/\D/g, "").includes(qRaw) ?? false))
      );
    });
  }, [companies, appliedFilters]);

  const stats = useMemo(() => {
    const totalUsers = companies.reduce((acc, c) => acc + (c._count?.users ?? 0), 0);
    const planSlugs = new Set(companies.map((c) => c.plan?.slug).filter(Boolean));
    return {
      total: companies.length,
      users: totalUsers,
      plansInUse: planSlugs.size,
    };
  }, [companies]);

  const slugPreview = form.slug || (form.name ? slugFromName(form.name) : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.cnpj) {
      const v = validateCnpj(form.cnpj);
      if (!v.valid) {
        setError(v.error ?? "CNPJ inválido");
        return;
      }
    }
    try {
      const cnpjRaw = form.cnpj ? toCnpjRaw(form.cnpj) : undefined;
      const data = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugFromName(form.name),
        cnpj: cnpjRaw,
        planId: form.planId,
      };
      if (editing) await companiesApi.update(editing, data);
      else await companiesApi.create(data);
      await load();
      afterSave(() => setForm(emptyForm));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleEdit = (c: Company) => {
    startEdit(c.id, () =>
      setForm({
        name: c.name,
        slug: c.slug,
        cnpj: c.cnpj ? maskCnpj(c.cnpj) : "",
        planId: c.plan.id,
      })
    );
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Desativar empresa",
      description: "A empresa deixará de aparecer nas listagens. Usuários vinculados perdem acesso ao tenant.",
      confirmLabel: "Desativar",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await companiesApi.remove(id);
      if (editing === id) cancelForm(() => setForm(emptyForm));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const applyAndGoToList = () => {
    setAppliedFilters({ ...filters });
    applyFilters();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const CompanyCard = ({ c }: { c: Company }) => (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{c.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{formatCnpjDisplay(c.cnpj || "") || "Sem CNPJ"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="Desativar">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {c.slug}
        </Badge>
        <Badge className={cn("text-xs", planBadgeClass(c.plan?.slug))}>{c.plan?.name}</Badge>
        <span className="text-xs text-muted-foreground">
          <Users className="mr-1 inline h-3 w-3" />
          {c._count?.users ?? 0} usuário(s)
        </span>
      </div>
    </div>
  );

  return (
    <CrudPageLayout
      title="Empresas Contratantes"
      subtitle="Cadastro multi-tenant — cada empresa é um cliente isolado no PostgreSQL"
      tab={tab}
      onTabChange={setTab}
      error={error}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Empresas ativas"
            value={String(stats.total)}
            hint="Tenants cadastrados"
            icon={Building2}
          />
          <StatCard
            label="Usuários totais"
            value={String(stats.users)}
            hint="Soma de todos os tenants"
            icon={Users}
          />
          <StatCard
            label="Planos em uso"
            value={String(stats.plansInUse)}
            hint={`De ${plans.length} plano(s) disponíveis`}
            icon={CreditCard}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      }
      actions={
        <Button
          className="w-full sm:w-auto"
          onClick={() => startNew(() => setForm({ ...emptyForm, planId: plans[0]?.id ?? "" }))}
          disabled={!plans.length}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      }
      filter={
        <CrudFilterPanel onApply={applyAndGoToList} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Nome, slug ou CNPJ"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-plan">Plano</Label>
              <select
                id="filter-plan"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={filters.planId}
                onChange={(e) => setFilters((f) => ({ ...f, planId: e.target.value }))}
              >
                <option value="">Todos os planos</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de empresas"
          icon={Building2}
          filteredCount={filteredCompanies.length}
          totalCount={companies.length}
          loading={loading}
          emptyMessage="Nenhuma empresa cadastrada — clique em Nova Empresa"
          emptyFilterMessage="Nenhuma empresa corresponde ao filtro"
        >
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filteredCompanies.map((c) => (
              <CompanyCard key={c.id} c={c} />
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block">
            <CrudTable>
              <CrudTableHead>
                <CrudTh>Empresa</CrudTh>
                <CrudTh>Slug</CrudTh>
                <CrudTh>CNPJ</CrudTh>
                <CrudTh>Plano</CrudTh>
                <CrudTh>Usuários</CrudTh>
                <CrudTh align="right">Ações</CrudTh>
              </CrudTableHead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <CrudTableRow key={c.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.slug}
                      </Badge>
                    </td>
                    <td className="py-3 tabular-nums text-muted-foreground">
                      {formatCnpjDisplay(c.cnpj || "") || "—"}
                    </td>
                    <td className="py-3">
                      <Badge className={cn("text-xs", planBadgeClass(c.plan?.slug))}>{c.plan?.name}</Badge>
                    </td>
                    <td className="py-3 tabular-nums">{c._count?.users ?? 0}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="Desativar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </CrudTableRow>
                ))}
              </tbody>
            </CrudTable>
          </div>
        </CrudListPanel>
      }
      data={
        <CrudDataPanel
          editing={!!editing}
          entityName="empresa"
          newTitle="Nova empresa"
          editTitle="Editar empresa"
          onCancel={() => cancelForm(() => setForm(emptyForm))}
        >
          <form onSubmit={handleSubmit} className="grid gap-6">
            <CrudFieldSection
              title="Identificação"
              description="Nome público e identificador único do tenant (slug na URL interna)"
            >
              <div className="sm:col-span-2">
                <Label htmlFor="name">Razão social / Nome</Label>
                <Input
                  id="name"
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Fazenda Santa Rita Ltda"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  className="mt-1 font-mono text-sm"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="fazenda-santa-rita"
                />
                {slugPreview && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Identificador: <span className="font-mono text-foreground">{slugPreview}</span>
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <CnpjInput
                  id="cnpj"
                  className="mt-1"
                  value={form.cnpj}
                  onChange={(v) => setForm((f) => ({ ...f, cnpj: v }))}
                  onCnpjData={(data) =>
                    setForm((f) => ({
                      ...f,
                      name: data.nomeFantasia || data.razaoSocial || f.name,
                      slug:
                        f.slug ||
                        slugFromName(data.nomeFantasia || data.razaoSocial || "") ||
                        f.slug,
                    }))
                  }
                  hint="Digite o CNPJ e clique na lupa para preencher automaticamente via Brasil API"
                />
              </div>
            </CrudFieldSection>

            <CrudFieldSection title="Contrato SaaS" description="Plano define módulos e limites do tenant">
              <div className="sm:col-span-2">
                <Label htmlFor="planId">Plano</Label>
                <select
                  id="planId"
                  className={CRUD_SELECT_CLASS + " mt-1"}
                  value={form.planId}
                  onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                  required
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.description ? ` — ${p.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </CrudFieldSection>

            {editing && (
              <CrudFieldSection
                title="Usuários deste tenant"
                description="Quem faz login nesta empresa — dados isolados das demais transportadoras"
              >
                <div className="sm:col-span-2 space-y-3">
                  {editingUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum usuário vinculado a esta empresa ainda.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60 rounded-lg border border-border/70 dark:border-white/10">
                      {editingUsers.map((u) => (
                        <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-muted-foreground">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{u.role?.name}</Badge>
                            {u.active ? (
                              <Badge variant="active">Ativo</Badge>
                            ) : (
                              <Badge variant="inactive">Inativo</Badge>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <Link href={`/dashboard/usuarios?empresa=${editing}`}>
                      <Users className="mr-2 h-4 w-4" />
                      {editingUsers.length ? "Gerenciar usuários" : "Cadastrar usuário nesta empresa"}
                    </Link>
                  </Button>
                </div>
              </CrudFieldSection>
            )}

            <CrudFormFooter
              editing={!!editing}
              onCancel={() => cancelForm(() => setForm(emptyForm))}
              createLabel="Criar empresa"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
