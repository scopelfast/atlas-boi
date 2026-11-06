"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatCnpjDisplay, onlyDigits } from "@/lib/documents";
import {
  agregarNotasFiscais,
  PAPEL_NOTA_LABEL,
  type NotaFiscalPapel,
} from "@/lib/nota-fiscal-aggregate";
import type { CarregamentoNotaFiscal, Cliente } from "@/services/api";

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtChave(chave?: string | null) {
  if (!chave) return null;
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function fmtDoc(doc?: string | null) {
  if (!doc) return null;
  const d = onlyDigits(doc);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return formatCnpjDisplay(doc);
}

type PendingNota = {
  numero?: string | null;
  serie?: string | null;
  valorTotal?: number | null;
  quantidadeAnimais?: number | null;
  emitenteNome?: string | null;
  emitenteCnpj?: string | null;
  destinatarioNome?: string | null;
  destinatarioCnpj?: string | null;
  produtoDescricao?: string | null;
  chave?: string | null;
  dataEmissao?: string | null;
  pending?: boolean;
};

function resolveParticipante(
  nome: string | null | undefined,
  cnpj: string | null | undefined,
  clientes: Cliente[]
) {
  if (nome) return { nome, local: null as string | null };
  if (!cnpj) return { nome: "—", local: null };
  const doc = onlyDigits(cnpj);
  const cliente = clientes.find((c) => onlyDigits(c.documento) === doc);
  if (cliente) {
    return {
      nome: cliente.nome,
      local: `${cliente.cidade}/${cliente.uf}`,
    };
  }
  return { nome: "—", local: null };
}

function ParticipanteBox({
  label,
  nome,
  documento,
  local,
}: {
  label: string;
  nome: string;
  documento?: string | null;
  local?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{nome}</p>
      {documento && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">{fmtDoc(documento)}</p>
      )}
      {local && <p className="mt-0.5 text-xs text-muted-foreground">{local}</p>}
    </div>
  );
}

function NotaEspelhoCard({
  nota,
  clientes,
  onRemove,
  removing,
  onPapelChange,
  updatingPapel,
}: {
  nota: PendingNota & { id?: string; papel?: NotaFiscalPapel };
  clientes: Cliente[];
  onRemove?: () => void;
  removing?: boolean;
  onPapelChange?: (papel: NotaFiscalPapel) => void;
  updatingPapel?: boolean;
}) {
  const emitente = resolveParticipante(nota.emitenteNome, nota.emitenteCnpj, clientes);
  const destinatario = resolveParticipante(nota.destinatarioNome, nota.destinatarioCnpj, clientes);
  const papel = (nota.papel ?? "PRINCIPAL") as NotaFiscalPapel;
  const isTroca = papel === "TROCA";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        isTroca ? "border-amber-500/40" : "border-border/70"
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 bg-muted/15 px-4 py-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4 shrink-0" />
              NF {nota.numero ?? "—"}
              {nota.serie ? ` · série ${nota.serie}` : ""}
            </span>
            {nota.pending && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Vincula ao salvar
              </span>
            )}
            {!nota.pending && onPapelChange ? (
              <select
                value={papel}
                disabled={updatingPapel}
                onChange={(e) => onPapelChange(e.target.value as NotaFiscalPapel)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                title="Papel da NF-e na operação"
              >
                <option value="PRINCIPAL">{PAPEL_NOTA_LABEL.PRINCIPAL}</option>
                <option value="TROCA">{PAPEL_NOTA_LABEL.TROCA}</option>
              </select>
            ) : (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  isTroca
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                )}
              >
                {PAPEL_NOTA_LABEL[papel]}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-right text-lg font-bold tabular-nums text-foreground">
            {fmtBRL(nota.valorTotal)}
          </p>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              disabled={removing}
              onClick={onRemove}
              title="Remover nota"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Animais</span>
            <p className="font-semibold tabular-nums">{nota.quantidadeAnimais ?? "—"}</p>
          </div>
          <div className="h-8 w-px bg-border/60" aria-hidden />
          <div>
            <span className="text-xs text-muted-foreground">Emissão</span>
            <p className="font-semibold">{fmtDate(nota.dataEmissao)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ParticipanteBox
            label="Emitente"
            nome={emitente.nome}
            documento={nota.emitenteCnpj}
            local={emitente.local}
          />
          <ParticipanteBox
            label="Destinatário"
            nome={destinatario.nome}
            documento={nota.destinatarioCnpj}
            local={destinatario.local}
          />
        </div>

        {nota.produtoDescricao && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Produto
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{nota.produtoDescricao}</p>
          </div>
        )}

        {nota.chave && (
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Chave de acesso
            </p>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              {fmtChave(nota.chave)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export function CarregamentoNotasPanel({
  notas,
  pendingNota,
  clientes = [],
  canAdd,
  adding,
  onAddClick,
  onRemoveNota,
  onPapelChange,
  removingId,
  updatingPapelId,
  embedded,
  className,
}: {
  notas: CarregamentoNotaFiscal[];
  pendingNota?: PendingNota | null;
  clientes?: Cliente[];
  canAdd: boolean;
  adding?: boolean;
  onAddClick?: () => void;
  onRemoveNota?: (notaId: string) => void;
  onPapelChange?: (notaId: string, papel: NotaFiscalPapel) => void;
  removingId?: string | null;
  updatingPapelId?: string | null;
  /** Oculta cabeçalho duplicado quando já está na aba dedicada */
  embedded?: boolean;
  className?: string;
}) {
  const allCards: (PendingNota & { id?: string; papel?: NotaFiscalPapel })[] = [
    ...notas.map((n) => ({
      id: n.id,
      papel: n.papel ?? "PRINCIPAL",
      numero: n.numero,
      serie: n.serie,
      valorTotal: n.valorTotal != null ? Number(n.valorTotal) : null,
      quantidadeAnimais: n.quantidadeAnimais,
      emitenteNome: n.emitenteNome,
      emitenteCnpj: n.emitenteCnpj,
      destinatarioNome: n.destinatarioNome,
      destinatarioCnpj: n.destinatarioCnpj,
      produtoDescricao: n.produtoDescricao,
      chave: n.chave,
      dataEmissao: n.dataEmissao,
    })),
    ...(pendingNota ? [{ ...pendingNota, pending: true }] : []),
  ];

  const { quantidadeAnimais: totalAnimais, valorCarga: totalValor, troca } =
    agregarNotasFiscais(allCards.filter((n) => !n.pending));
  const count = allCards.length;

  return (
    <section className={cn(!embedded && "rounded-xl border border-border bg-muted/20 p-4", className)}>
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Notas fiscais
              {count > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {count}
                </span>
              )}
            </h3>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Várias NF-e por embarque. Marque <strong className="text-foreground">Troca</strong> para
              notas de trânsito — só a <strong className="text-foreground">Principal</strong> soma animais e
              valor da carga.
            </p>
          </div>
          {canAdd && onAddClick && (
            <Button type="button" variant="secondary" size="sm" disabled={adding} onClick={onAddClick}>
              <Plus className="mr-1.5 h-4 w-4" />
              {adding ? "Importando…" : "Adicionar NF-e"}
            </Button>
          )}
        </div>
      )}

      {embedded && canAdd && onAddClick && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Importe cada XML — só notas <strong className="text-foreground">Principal</strong> entram nos
            totais.
          </p>
          <Button type="button" variant="secondary" size="sm" disabled={adding} onClick={onAddClick}>
            <Plus className="mr-1.5 h-4 w-4" />
            {adding ? "Importando…" : "Adicionar NF-e"}
          </Button>
        </div>
      )}

      {count > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/60 bg-muted/25 px-4 py-2.5 text-sm",
            !embedded && "mt-3"
          )}
        >
          <span>
            <strong className="text-foreground">{count}</strong>{" "}
            {count === 1 ? "nota" : "notas"}
          </span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span>
            <strong className="tabular-nums text-foreground">{totalAnimais}</strong> animais
          </span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span>
            Total contabilizado{" "}
            <strong className="tabular-nums text-foreground">{fmtBRL(totalValor)}</strong>
          </span>
          {troca > 0 && (
            <>
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <span className="text-amber-700 dark:text-amber-400">
                {troca} {troca === 1 ? "troca" : "trocas"} (fora do total)
              </span>
            </>
          )}
        </div>
      )}

      {allCards.length === 0 ? (
        <div
          className={cn(
            "rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground",
            !embedded && "mt-4"
          )}
        >
          Nenhuma NF-e vinculada.
          {canAdd ? (
            <>
              {" "}
              Use <strong className="text-foreground">Adicionar NF-e</strong> ou o botão no topo da
              página.
            </>
          ) : null}
        </div>
      ) : (
        <div className={cn("grid gap-4", count > 0 && (embedded ? "mt-4" : "mt-4"))}>
          {allCards.map((nota, idx) => (
            <NotaEspelhoCard
              key={nota.id ?? `pending-${idx}`}
              nota={nota}
              clientes={clientes}
              removing={removingId === nota.id}
              onRemove={
                nota.id && onRemoveNota && !nota.pending ? () => onRemoveNota(nota.id!) : undefined
              }
              onPapelChange={
                nota.id && onPapelChange && !nota.pending
                  ? (papel) => onPapelChange(nota.id!, papel)
                  : undefined
              }
              updatingPapel={updatingPapelId === nota.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
