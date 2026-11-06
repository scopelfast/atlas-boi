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
import { Layers, Search, Eye } from "lucide-react";
import { catalogApi } from "@/services/api";
import { useCrudPage } from "@/hooks/useCrudPage";

type Module = { id: string; name: string; slug: string; order: number };
type Function = { id: string; name: string; slug: string };

type CatalogItem =
  | { kind: "module"; id: string; name: string; slug: string; order: number }
  | { kind: "function"; id: string; name: string; slug: string };

const itemKey = (item: CatalogItem) => `${item.kind}:${item.id}`;

const emptyFilters = { search: "" };

export default function CatalogoPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [functions, setFunctions] = useState<Function[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  const { tab, setTab, error, setError, editing, startEdit, cancelForm, applyFilters } = useCrudPage();

  useEffect(() => {
    Promise.all([catalogApi.getModules(), catalogApi.getFunctions()])
      .then(([m, f]) => {
        setModules(m);
        setFunctions(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  const allItems = useMemo<CatalogItem[]>(
    () => [
      ...modules.map((m) => ({ kind: "module" as const, ...m })),
      ...functions.map((f) => ({ kind: "function" as const, ...f })),
    ],
    [modules, functions]
  );

  const filteredItems = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [allItems, appliedFilters]);

  const openItem = (item: CatalogItem) => {
    setSelectedItem(item);
    startEdit(itemKey(item), () => {});
  };

  const handleCancel = () => {
    cancelForm(() => setSelectedItem(null));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    applyFilters();
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const detailTitle = selectedItem
    ? selectedItem.kind === "module"
      ? `Módulo: ${selectedItem.name}`
      : `Função: ${selectedItem.name}`
    : "Detalhes do item";

  return (
    <CrudPageLayout
      title="Catálogo do Sistema"
      subtitle="Módulos e funções disponíveis na plataforma"
      tab={tab}
      onTabChange={setTab}
      error={error}
      filter={
        <CrudFilterPanel title="Filtrar catálogo" onApply={handleApplyFilters} onClear={handleClearFilters}>
          <div className="max-w-md">
            <Label htmlFor="filter-search">Buscar</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filter-search"
                className="pl-10"
                placeholder="Nome ou slug"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
              />
            </div>
          </div>
        </CrudFilterPanel>
      }
      list={
        <CrudListPanel
          title="Módulos e funções"
          icon={Layers}
          filteredCount={filteredItems.length}
          totalCount={allItems.length}
          loading={loading}
          emptyMessage="Nenhum item no catálogo"
          emptyFilterMessage="Nenhum item corresponde ao filtro"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Tipo</CrudTh>
              <CrudTh>Nome</CrudTh>
              <CrudTh>Slug</CrudTh>
              <CrudTh>Ordem</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredItems.map((item) => (
                <CrudTableRow key={itemKey(item)}>
                  <td className="py-3">
                    <Badge variant={item.kind === "module" ? "secondary" : "default"}>
                      {item.kind === "module" ? "Módulo" : "Função"}
                    </Badge>
                  </td>
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3 text-muted-foreground">{item.slug}</td>
                  <td className="py-3 text-muted-foreground">
                    {item.kind === "module" ? item.order : "—"}
                  </td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openItem(item)} title="Ver detalhes">
                      <Eye className="h-4 w-4" />
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
            <CardTitle className="text-base">{detailTitle}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Voltar à lista
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedItem || !editing ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Selecione um módulo ou função na lista para ver os detalhes
              </p>
            ) : selectedItem.kind === "module" ? (
              <dl className="grid max-w-lg gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nome</dt>
                  <dd className="mt-1 text-sm">{selectedItem.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Slug</dt>
                  <dd className="mt-1 font-mono text-sm">{selectedItem.slug}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Ordem</dt>
                  <dd className="mt-1 text-sm">{selectedItem.order}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tipo</dt>
                  <dd className="mt-1">
                    <Badge variant="secondary">Módulo</Badge>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Descrição</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Módulo que compõe o Atlas ERP. As funções podem ser atribuídas a este módulo nos
                    perfis de acesso.
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="grid max-w-lg gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nome</dt>
                  <dd className="mt-1 text-sm">{selectedItem.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Slug</dt>
                  <dd className="mt-1 font-mono text-sm">{selectedItem.slug}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tipo</dt>
                  <dd className="mt-1">
                    <Badge>Função</Badge>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Descrição</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Ação que pode ser atribuída aos módulos nos perfis de permissão.
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
