"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { UserCog, Plus, Search, Building2, Users, Shield, Pencil, Trash2 } from "lucide-react";
import { usersApi, rolesApi, companiesApi, type Company, type User } from "@/services/api";
import { useAuth, type User as AuthUser } from "@/hooks/useAuth";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { isPlatformAdmin } from "@/lib/platform-admin";

const emptyForm = { email: "", password: "", name: "", roleId: "", companyId: "" };

const emptyFilters = {
  search: "",
  roleId: "",
  companyId: "",
  status: "" as "" | "active" | "inactive",
};

function canManageAllCompanies(user: AuthUser | null) {
  return isPlatformAdmin(user);
}

export default function UsuariosPage() {
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const empresaFromUrl = searchParams.get("empresa") ?? "";
  const { user } = useAuth();
  const platformAdmin = canManageAllCompanies(user);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...emptyFilters, companyId: empresaFromUrl });
  const [appliedFilters, setAppliedFilters] = useState({ ...emptyFilters, companyId: empresaFromUrl });
  const [form, setForm] = useState(emptyForm);
  const [editingUserCompany, setEditingUserCompany] = useState<{ id: string; name: string; slug?: string } | null>(
    null
  );

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
    applyFilters,
  } = useCrudPage();

  const listCompanyId = platformAdmin ? appliedFilters.companyId || undefined : user?.companyId;

  const loadRoles = useCallback(
    async (companyId?: string) => {
      const target = companyId || user?.companyId;
      const r = await rolesApi.list(target);
      setRoles(r);
      return r;
    },
    [user?.companyId]
  );

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const companyListPromise = platformAdmin ? companiesApi.list() : Promise.resolve([] as Company[]);
      const [u, companyList] = await Promise.all([usersApi.list(listCompanyId), companyListPromise]);
      setUsers(u);
      if (platformAdmin) setCompanies(companyList);
      await loadRoles(listCompanyId || user.companyId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, platformAdmin, listCompanyId, loadRoles, setError]);

  useEffect(() => {
    if (user?.companyId) load();
  }, [user?.companyId, load]);

  const filteredUsers = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (appliedFilters.roleId && u.role.id !== appliedFilters.roleId) return false;
      if (appliedFilters.status === "active" && !u.active) return false;
      if (appliedFilters.status === "inactive" && u.active) return false;
      return true;
    });
  }, [users, appliedFilters]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.active).length;
    const companyIds = new Set(users.map((u) => u.companyId ?? u.company?.id).filter(Boolean));
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      tenants: companyIds.size,
    };
  }, [users]);

  const defaultCompanyId = () => appliedFilters.companyId || empresaFromUrl || "";

  const openNew = () => {
    const companyId = defaultCompanyId();
    startNew(() =>
      setForm({
        ...emptyForm,
        roleId: roles[0]?.id ?? "",
        companyId,
      })
    );
    setEditingUserCompany(null);
  };

  const openEdit = async (u: User) => {
    const companyId = u.companyId ?? u.company?.id ?? user?.companyId ?? "";
    const companyName = u.company?.name ?? companies.find((c) => c.id === companyId)?.name ?? "";
    const companySlug = companies.find((c) => c.id === companyId)?.slug;
    await loadRoles(companyId);
    setEditingUserCompany({ id: companyId, name: companyName, slug: companySlug });
    startEdit(u.id, () =>
      setForm({
        email: u.email,
        password: "",
        name: u.name,
        roleId: u.role.id,
        companyId,
      })
    );
  };

  const handleCancel = () => {
    setEditingUserCompany(null);
    cancelForm(() => setForm(emptyForm));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    applyFilters();
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleCompanyChange = async (companyId: string) => {
    setForm((f) => ({ ...f, companyId, roleId: "" }));
    const r = await loadRoles(companyId);
    setForm((f) => ({ ...f, roleId: r[0]?.id ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        const data: { name?: string; email?: string; password?: string; roleId?: string } = {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
        };
        if (form.password) data.password = form.password;
        await usersApi.update(editing, data);
      } else {
        await usersApi.create({
          email: form.email,
          password: form.password,
          name: form.name,
          roleId: form.roleId,
          companyId: platformAdmin ? form.companyId : undefined,
        });
      }
      await load();
      afterSave(() => setForm(emptyForm));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Desativar usuário",
      description: "O usuário perderá acesso ao sistema. Você pode reativá-lo depois, se necessário.",
      confirmLabel: "Desativar",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await usersApi.remove(id);
      if (editing === id) handleCancel();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const selectedCompanyName =
    editingUserCompany?.name ??
    companies.find((c) => c.id === form.companyId)?.name ??
    user?.companyName ??
    "sua empresa";

  const selectedCompanySlug =
    editingUserCompany?.slug ?? companies.find((c) => c.id === form.companyId)?.slug;

  const UserCard = ({ u }: { u: User }) => (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCog className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{u.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} title="Desativar">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {platformAdmin && u.company?.name && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Building2 className="h-3 w-3" />
            {u.company.name}
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs">
          {u.role?.name}
        </Badge>
        {u.active ? (
          <Badge variant="active">Ativo</Badge>
        ) : (
          <Badge variant="inactive">Inativo</Badge>
        )}
      </div>
    </div>
  );

  return (
    <CrudPageLayout
      title="Usuários"
      subtitle={
        platformAdmin
          ? "Gestão multi-tenant — cada usuário acessa somente os dados da empresa vinculada"
          : "Gestão de usuários da sua transportadora"
      }
      tab={tab}
      onTabChange={setTab}
      error={error}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Usuários cadastrados"
            value={String(stats.total)}
            hint={platformAdmin ? "No contexto do filtro atual" : "Total na empresa"}
            icon={Users}
          />
          <StatCard
            label="Ativos"
            value={String(stats.active)}
            hint={`${stats.inactive} inativo(s)`}
            icon={UserCog}
          />
          <StatCard
            label={platformAdmin ? "Tenants no filtro" : "Perfis disponíveis"}
            value={String(platformAdmin ? stats.tenants : roles.length)}
            hint={platformAdmin ? "Empresas com usuários listados" : "Papéis de acesso"}
            icon={platformAdmin ? Building2 : Shield}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      }
      actions={
        <Button
          className="w-full sm:w-auto"
          onClick={openNew}
          disabled={!roles.length || (platformAdmin && !companies.length)}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo usuário
        </Button>
      }
      filter={
        <CrudFilterPanel onApply={handleApplyFilters} onClear={handleClearFilters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformAdmin && (
              <div>
                <Label htmlFor="filter-company">Empresa</Label>
                <select
                  id="filter-company"
                  className={CRUD_SELECT_CLASS + " mt-1"}
                  value={filters.companyId}
                  onChange={(e) => setFilters((f) => ({ ...f, companyId: e.target.value }))}
                >
                  <option value="">Empresa do login (padrão)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Nome ou e-mail"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-role">Perfil</Label>
              <select
                id="filter-role"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={filters.roleId}
                onChange={(e) => setFilters((f) => ({ ...f, roleId: e.target.value }))}
              >
                <option value="">Todos</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="filter-status">Status</Label>
              <select
                id="filter-status"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as typeof filters.status }))
                }
              >
                <option value="">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de usuários"
          icon={UserCog}
          filteredCount={filteredUsers.length}
          totalCount={users.length}
          loading={loading}
          emptyMessage="Nenhum usuário cadastrado — clique em Novo usuário"
          emptyFilterMessage="Nenhum usuário corresponde ao filtro"
        >
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((u) => (
              <UserCard key={u.id} u={u} />
            ))}
          </div>

          <div className="hidden md:block">
            <CrudTable>
              <CrudTableHead>
                <CrudTh>Usuário</CrudTh>
                <CrudTh>E-mail</CrudTh>
                {platformAdmin && <CrudTh>Empresa</CrudTh>}
                <CrudTh>Perfil</CrudTh>
                <CrudTh>Status</CrudTh>
                <CrudTh align="right">Ações</CrudTh>
              </CrudTableHead>
              <tbody>
                {filteredUsers.map((u) => (
                  <CrudTableRow key={u.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <UserCog className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    {platformAdmin && (
                      <td className="py-3">
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {u.company?.name ?? "—"}
                        </Badge>
                      </td>
                    )}
                    <td className="py-3">
                      <Badge variant="secondary">{u.role?.name}</Badge>
                    </td>
                    <td className="py-3">
                      {u.active ? (
                        <Badge variant="active">Ativo</Badge>
                      ) : (
                        <Badge variant="inactive">Inativo</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} title="Desativar">
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
          entityName="usuário"
          newTitle="Novo usuário"
          editTitle="Editar usuário"
          onCancel={handleCancel}
        >
          <form onSubmit={handleSubmit} className="grid gap-6">
            {platformAdmin && (
              <CrudFieldSection
                title="Empresa (tenant)"
                description="Define qual transportadora este usuário acessa ao fazer login"
              >
                {!editing ? (
                  <div className="sm:col-span-2">
                    <Label htmlFor="companyId">Selecione a empresa</Label>
                    <select
                      id="companyId"
                      className={CRUD_SELECT_CLASS + " mt-1"}
                      value={form.companyId}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      required
                    >
                      <option value="">— Selecione a empresa —</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.slug})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      O login dará acesso <strong>somente</strong> aos dados desta empresa.
                    </p>
                  </div>
                ) : (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 dark:border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Tenant vinculado
                        </p>
                        <p className="mt-0.5 text-lg font-semibold text-foreground">{selectedCompanyName}</p>
                        {selectedCompanySlug && (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">slug: {selectedCompanySlug}</p>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground">
                          Vê apenas dados de <strong>{selectedCompanyName}</strong>. O vínculo não muda após a
                          criação.
                        </p>
                        {editingUserCompany?.id && (
                          <Button type="button" variant="secondary" size="sm" className="mt-3" asChild>
                            <Link href={`/dashboard/empresas`}>
                              <Building2 className="mr-2 h-4 w-4" />
                              Ver empresa
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CrudFieldSection>
            )}

            <CrudFieldSection title="Identificação" description="Nome e e-mail de login">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Ana Paula Araldi"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  className="mt-1"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@empresa.local"
                  required
                  disabled={!!editing}
                />
              </div>
            </CrudFieldSection>

            <CrudFieldSection title="Acesso" description="Senha e perfil de permissões">
              <div>
                <Label htmlFor="password">{editing ? "Nova senha (opcional)" : "Senha"}</Label>
                <Input
                  id="password"
                  type="password"
                  className="mt-1"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editing}
                />
              </div>
              <div>
                <Label htmlFor="roleId">Perfil</Label>
                <select
                  id="roleId"
                  className={CRUD_SELECT_CLASS + " mt-1"}
                  value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>
            </CrudFieldSection>

            <CrudFormFooter
              editing={!!editing}
              onCancel={handleCancel}
              createLabel="Criar usuário"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      }
    />
  );
}
