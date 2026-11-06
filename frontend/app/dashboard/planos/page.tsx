"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Search, Building2, Layers, Pencil, Trash2 } from "lucide-react";
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
} from "@/components/crud/crud-panels";
import { StatCard } from "@/components/dashboard/stat-card";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { plansApi, type Plan } from "@/services/api";
import { cn } from "@/utils/cn";

const emptyForm = { name: "", slug: "", description: "", price: "" };
const emptyFilters = { search: "" };

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  professional: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

function planBadgeClass(slug?: string) {
  if (!slug) return "bg-muted text-muted-foreground";
  return PLAN_BADGE[slug.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function PlanosPage() {
  const { confirm } = useConfirm();
  const { tab, setTab, error, setError, editing, startNew, startEdit, cancelForm, afterSave, applyFilters } =
    useCrudPage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setPlans(await plansApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredPlans = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return plans.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [plans, appliedFilters]);

  const stats = useMemo(() => {
    const subscriptions = plans.reduce((acc, p) => acc + (p._count?.companies ?? 0), 0);
    const modules = plans.reduce((acc, p) => acc + (p._count?.planModules ?? 0), 0);
    return { total: plans.length, subscriptions, modules };
  }, [plans]);

  const editingPlan = editing ? plans.find((p) => p.id === editing) : undefined;
  const slugPreview = form.slug || (form.name ? slugFromName(form.name) : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugFromName(form.name),
        description: form.description.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
      };
      if (editing) await plansApi.update(editing, data);
      else await plansApi.create(data);
      await load();
      afterSave(() => setForm(emptyForm));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleEdit = (p: Plan) => {
    startEdit(p.id, () =>
      setForm({
        name: p.name,
        slug: p.slug,
        description: p.description || "",
        price: p.price?.toString() ?? "",
      })
    );
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Desativar plano",
      description: "Empresas já vinculadas mantêm o plano atual. Novas assinaturas não poderão escolher este plano.",
      confirmLabel: "Desativar",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await plansApi.remove(id);
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

  const PlanCard = ({ p }: { p: Plan }) => (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{p.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description || "Sem descrição"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} title="Desativar">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {p.slug}
        </Badge>
        {p.price != null && (
          <Badge className="text-xs">R$ {Number(p.price).toFixed(2)}/mês</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          <Building2 className="mr-1 inline h-3 w-3" />
          {p._count?.companies ?? 0} empresa(s)
        </span>
        <span className="text-xs text-muted-foreground">
          <Layers className="mr-1 inline h-3 w-3" />
          {p._count?.planModules ?? 0} módulo(s)
        </span>
      </div>
    </div>
  );

  return (
    <CrudPageLayout
      title="Planos SaaS"
      subtitle="Catálogo de planos — define módulos, funções e limites por tenant"
      tab={tab}
      onTabChange={setTab}
      error={error}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Planos ativos"
            value={String(stats.total)}
            hint="Opções de contratação"
            icon={CreditCard}
          />
          <StatCard
            label="Empresas assinantes"
            value={String(stats.subscriptions)}
            hint="Tenants vinculados a planos"
            icon={Building2}
          />
          <StatCard
            label="Módulos configurados"
            value={String(stats.modules)}
            hint="Soma de módulos por plano"
            icon={Layers}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      }
      actions={
        <Button className="w-full sm:w-auto" onClick={() => startNew(() => setForm(emptyForm))}>
          <Plus className="mr-2 h-4 w-4" /> Novo plano
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
                  placeholder="Nome, slug ou descrição"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de planos"
          icon={CreditCard}
          filteredCount={filteredPlans.length}
          totalCount={plans.length}
          loading={loading}
          emptyMessage="Nenhum plano cadastrado — clique em Novo plano"
          emptyFilterMessage="Nenhum plano corresponde ao filtro"
        >
          <div className="space-y-3 md:hidden">
            {filteredPlans.map((p) => (
              <PlanCard key={p.id} p={p} />
            ))}
          </div>

          <div className="hidden md:block">
            <CrudTable>
              <CrudTableHead>
                <CrudTh>Plano</CrudTh>
                <CrudTh>Slug</CrudTh>
                <CrudTh>Preço</CrudTh>
                <CrudTh>Empresas</CrudTh>
                <CrudTh>Módulos</CrudTh>
                <CrudTh align="right">Ações</CrudTh>
              </CrudTableHead>
              <tbody>
                {filteredPlans.map((p) => (
                  <CrudTableRow key={p.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CreditCard className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.description && (
                            <p className="max-w-xs truncate text-xs text-muted-foreground">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge className={cn("font-mono text-xs", planBadgeClass(p.slug))}>{p.slug}</Badge>
                    </td>
                    <td className="py-3 tabular-nums">
                      {p.price != null ? `R$ ${Number(p.price).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 tabular-nums">{p._count?.companies ?? 0}</td>
                    <td className="py-3 tabular-nums">{p._count?.planModules ?? 0}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} title="Desativar">
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
          entityName="plano"
          newTitle="Novo plano"
          editTitle="Editar plano"
          onCancel={() => cancelForm(() => setForm(emptyForm))}
        >
          <form onSubmit={handleSubmit} className="grid gap-6">
            <CrudFieldSection
              title="Identificação"
              description="Nome comercial e identificador único do plano (slug)"
            >
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nome do plano</Label>
                <Input
                  id="name"
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Professional"
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
                  placeholder="professional"
                />
                {slugPreview && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Identificador: <span className="font-mono text-foreground">{slugPreview}</span>
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  className="mt-1"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex.: 6–30 veículos — financeiro e relatórios"
                />
              </div>
            </CrudFieldSection>

            <CrudFieldSection title="Comercial" description="Valor mensal exibido na contratação">
              <div>
                <Label htmlFor="price">Preço mensal (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </CrudFieldSection>

            {editing && editingPlan && (
              <CrudFieldSection
                title="Uso do plano"
                description="Empresas (tenants) que contrataram este plano"
              >
                <div className="sm:col-span-2 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{editingPlan._count?.companies ?? 0}</strong> empresa(s)
                    assinante(s) ·{" "}
                    <strong className="text-foreground">{editingPlan._count?.planModules ?? 0}</strong> módulo(s)
                    habilitado(s)
                  </p>
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <Link href={`/dashboard/empresas?plano=${editing}`}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Ver empresas neste plano
                    </Link>
                  </Button>
                </div>
              </CrudFieldSection>
            )}

            <CrudFormFooter
              editing={!!editing}
              onCancel={() => cancelForm(() => setForm(emptyForm))}
              createLabel="Criar plano"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
