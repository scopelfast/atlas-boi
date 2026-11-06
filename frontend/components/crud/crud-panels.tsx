"use client";

import type { LucideIcon } from "lucide-react";
import { Search, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export const CRUD_SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-[#1a5c2e] focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

export function CrudFilterPanel({
  title = "Filtrar registros",
  children,
  onApply,
  onClear,
}: {
  title?: string;
  children: React.ReactNode;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <Card className="border-border/70 shadow-sm dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onApply}>
            <Search className="mr-2 h-4 w-4" /> Aplicar e ver lista
          </Button>
          <Button type="button" variant="secondary" onClick={onClear}>
            <RotateCcw className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CrudListPanel({
  title,
  icon: Icon,
  filteredCount,
  totalCount,
  loading,
  emptyMessage,
  emptyFilterMessage,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  filteredCount: number;
  totalCount: number;
  loading?: boolean;
  emptyMessage: string;
  emptyFilterMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm dark:border-white/10">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 dark:border-white/5">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-5 w-5" />
            </span>
          )}
          {title}
        </CardTitle>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {filteredCount} de {totalCount}
        </span>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filteredCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {totalCount === 0 ? emptyMessage : emptyFilterMessage}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function CrudDataPanel({
  editing,
  entityName,
  newTitle,
  editTitle,
  onCancel,
  children,
}: {
  editing: boolean;
  entityName: string;
  newTitle?: string;
  editTitle?: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const title = editing
    ? editTitle ?? `Editar ${entityName}`
    : newTitle ?? `Novo ${entityName}`;

  return (
    <Card className="border-border/70 shadow-sm dark:border-white/10">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 dark:border-white/5">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
          Voltar à lista
        </Button>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}

/** Agrupa campos do formulário com título de seção */
export function CrudFieldSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("col-span-full space-y-4", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function CrudFormFooter({
  editing,
  onCancel,
  createLabel,
  saveLabel,
}: {
  editing: boolean;
  onCancel: () => void;
  createLabel?: string;
  saveLabel?: string;
}) {
  return (
    <div className="col-span-full flex flex-wrap gap-2 border-t border-border/60 pt-4 dark:border-white/5">
      <Button type="submit">{editing ? saveLabel ?? "Salvar alterações" : createLabel ?? "Criar"}</Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}

export function CrudRowActions({
  onEdit,
  onDelete,
  deleteTitle = "Excluir",
  extra,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteTitle?: string;
  extra?: React.ReactNode;
}) {
  return (
    <td className="py-3 text-right">
      {extra}
      <Button variant="ghost" size="sm" onClick={onEdit} title="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} title={deleteTitle}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </td>
  );
}

export function CrudTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function CrudTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-muted-foreground dark:border-white/10">
        {children}
      </tr>
    </thead>
  );
}

export function CrudTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-border/60 last:border-0 dark:border-white/5", className)}>
      {children}
    </tr>
  );
}

export function CrudTh({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("pb-3 font-medium", align === "right" && "text-right")}>{children}</th>
  );
}
