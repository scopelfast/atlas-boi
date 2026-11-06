"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CrudPageLayout } from "@/components/crud/crud-page-layout";
import {
  CrudFilterPanel,
  CrudListPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
} from "@/components/crud/crud-panels";
import { Shield, Search, Eye, Pencil } from "lucide-react";
import { rolesApi, catalogApi } from "@/services/api";
import { useCrudPage } from "@/hooks/useCrudPage";

type Role = {
  id: string;
  name: string;
  slug: string;
  companyId?: string;
  _count?: { users: number; rolePermissions: number };
};

type RoleDetail = Role & {
  rolePermissions?: { module: { slug: string }; function: { slug: string } }[];
};

const emptyFilters = { search: "" };

export default function PerfisPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modules, setModules] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [functions, setFunctions] = useState<{ id: string; name: string; slug: string }[]>([]);

  const { tab, setTab, error, setError, editing, startEdit, cancelForm, applyFilters } = useCrudPage();

  const load = () =>
    rolesApi
      .list()
      .then(setRoles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    catalogApi.getModules().then(setModules).catch(() => {});
    catalogApi.getFunctions().then(setFunctions).catch(() => {});
  }, []);

  const filteredRoles = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
    );
  }, [roles, appliedFilters]);

  const openRole = (id: string) => {
    setDetailLoading(true);
    setRoleDetail(null);
    startEdit(id, () => {});
    rolesApi
      .get(id)
      .then(setRoleDetail)
      .catch((e) => setError(e.message))
      .finally(() => setDetailLoading(false));
  };

  const handleCancel = () => {
    cancelForm(() => setRoleDetail(null));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    applyFilters();
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const permsSet = (rd: RoleDetail) =>
    new Set((rd.rolePermissions || []).map((p) => `${p.module.slug}:${p.function.slug}`));

  const hasPerm = (rd: RoleDetail | null, modSlug: string, fnSlug: string) =>
    rd && permsSet(rd).has(`${modSlug}:${fnSlug}`);

  const isAdmin = (r: Role) => r.slug === "ADMIN";

  return (
    <CrudPageLayout
      title="Perfis e Permissões"
      subtitle="Gestão de perfis e permissões por módulo"
      tab={tab}
      onTabChange={setTab}
      error={error}
      filter={
        <CrudFilterPanel title="Filtrar perfis" onApply={handleApplyFilters} onClear={handleClearFilters}>
          <div className="max-w-md">
            <Label htmlFor="filter-search">Buscar perfil</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-search"
                className="pl-10"
                placeholder="Nome ou slug do perfil"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
              />
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Lista de perfis"
          icon={Shield}
          filteredCount={filteredRoles.length}
          totalCount={roles.length}
          loading={loading}
          emptyMessage="Nenhum perfil cadastrado"
          emptyFilterMessage="Nenhum perfil corresponde ao filtro"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Perfil</CrudTh>
              <CrudTh>Slug</CrudTh>
              <CrudTh>Permissões</CrudTh>
              <CrudTh>Usuários</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredRoles.map((r) => (
                <CrudTableRow key={r.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {isAdmin(r) && <Badge>Acesso total</Badge>}
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{r.slug}</td>
                  <td className="py-3">{r._count?.rolePermissions ?? 0}</td>
                  <td className="py-3">{r._count?.users ?? 0}</td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openRole(r.id)} title="Ver">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openRole(r.id)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        </CrudListPanel>
      }
      data={
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {roleDetail ? `Permissões: ${roleDetail.name}` : "Detalhes do perfil"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Voltar à lista
            </Button>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando permissões...</p>
            ) : !roleDetail ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Selecione um perfil na lista para ver as permissões
              </p>
            ) : isAdmin(roleDetail) ? (
              <p className="text-sm text-muted-foreground">
                Perfil ADMIN possui acesso total a todos os módulos e funções.
              </p>
            ) : (
              <div className="max-h-[32rem] space-y-4 overflow-y-auto">
                {modules.map((mod) => (
                  <div key={mod.id} className="rounded border p-3">
                    <p className="mb-2 text-sm font-medium">{mod.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {functions.map((fn) => (
                        <Badge
                          key={fn.id}
                          variant={hasPerm(roleDetail, mod.slug, fn.slug) ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {fn.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
