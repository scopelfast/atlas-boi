"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatCnpjDisplay } from "@/lib/documents";
import type { NfeClienteParaCadastrar } from "@/services/api";

function fmtDoc(tipo: string, doc: string) {
  if (tipo === "CPF") return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return formatCnpjDisplay(doc);
}

function ClienteOpcao({
  cliente,
  checked,
  onChange,
}: {
  cliente: NfeClienteParaCadastrar;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const label = cliente.papel === "origem" ? "Cliente origem (emitente)" : "Cliente destino (destinatário)";
  const endereco = [cliente.logradouro, cliente.numero, cliente.bairro, `${cliente.cidade}/${cliente.uf}`]
    .filter(Boolean)
    .join(", ");

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border/70 bg-background/60 hover:border-border"
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-[#1a5c2e]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{cliente.nome}</p>
        <p className="text-sm text-muted-foreground">
          {cliente.tipoDocumento} {fmtDoc(cliente.tipoDocumento, cliente.documento)}
        </p>
        {endereco && <p className="text-xs text-muted-foreground">{endereco}</p>}
      </div>
    </label>
  );
}

export function CarregamentoNfeClientesPrompt({
  origem,
  destino,
  loading,
  editingCarregamento,
  onCadastrar,
  onDismiss,
}: {
  origem: NfeClienteParaCadastrar | null;
  destino: NfeClienteParaCadastrar | null;
  loading?: boolean;
  editingCarregamento?: boolean;
  onCadastrar: (opts: { cadastrarOrigem: boolean; cadastrarDestino: boolean }) => void;
  onDismiss?: () => void;
}) {
  const [cadOrigem, setCadOrigem] = useState(!!origem);
  const [cadDestino, setCadDestino] = useState(!!destino);

  if (!origem && !destino) return null;

  const podeCadastrar = (cadOrigem && origem) || (cadDestino && destino);

  return (
    <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          <UserPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">Clientes não cadastrados na NF-e</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {editingCarregamento
                ? "Estes participantes não existem no cadastro. Você pode registrá-los agora — o carregamento atual não será alterado."
                : "Cadastre origem e destino com os dados extraídos do XML. A rota será criada automaticamente quando ambos existirem."}
            </p>
          </div>

          <div className="space-y-2">
            {origem && (
              <ClienteOpcao cliente={origem} checked={cadOrigem} onChange={setCadOrigem} />
            )}
            {destino && (
              <ClienteOpcao cliente={destino} checked={cadDestino} onChange={setCadDestino} />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={loading || !podeCadastrar}
              onClick={() =>
                onCadastrar({
                  cadastrarOrigem: cadOrigem && !!origem,
                  cadastrarDestino: cadDestino && !!destino,
                })
              }
            >
              {loading ? "Cadastrando…" : "Cadastrar selecionados"}
            </Button>
            {onDismiss && (
              <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={onDismiss}>
                Agora não
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
