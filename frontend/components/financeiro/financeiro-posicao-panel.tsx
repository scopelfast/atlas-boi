"use client";

import Link from "next/link";
import { ArrowRight, Receipt, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CrudListPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
} from "@/components/crud/crud-panels";
import { cn } from "@/utils/cn";
import type { PosicaoFinanceira } from "@/services/api";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KpiCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 dark:border-white/10">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-red-600 dark:text-red-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FinanceiroPosicaoPanel({
  posicao,
  loading,
  className,
}: {
  posicao: PosicaoFinanceira | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <p className={cn("py-8 text-center text-sm text-muted-foreground", className)}>Carregando…</p>;
  }
  if (!posicao) return null;

  const { totais, clientes, motoristas } = posicao;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Contas em aberto — independente do embarque</p>
        <p className="mt-1">
          Encerrar uma viagem <strong>não exige</strong> receber do cliente nem pagar o motorista. Use esta tela
          para acompanhar faturamento, pagamentos e registrar quitações (com comprovante no Financeiro).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Faturado (clientes)"
          value={fmtBRL(totais.faturado)}
          tone="positive"
          hint="Total cobrado em viagens"
        />
        <KpiCard
          label="Recebido"
          value={fmtBRL(totais.recebido)}
          hint="Pagamentos já registrados"
        />
        <KpiCard
          label="A receber"
          value={fmtBRL(totais.aReceber)}
          tone="warning"
          hint="Saldo em aberto — quitação do cliente"
        />
        <KpiCard
          label="A pagar (motoristas)"
          value={fmtBRL(totais.aPagarMotoristas)}
          tone="negative"
          hint="Saldo CC — quitação ao motorista"
        />
      </div>

      <CrudListPanel
        title="Clientes — a receber"
        icon={Receipt}
        filteredCount={clientes.length}
        totalCount={clientes.length}
        emptyMessage="Nenhum saldo a receber de clientes"
        emptyFilterMessage="Nenhum saldo a receber"
      >
        {clientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Todas as cobranças quitadas ou sem faturamento.</p>
        ) : (
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Cliente</CrudTh>
              <CrudTh align="right">Cobrado</CrudTh>
              <CrudTh align="right">Recebido</CrudTh>
              <CrudTh align="right">Saldo</CrudTh>
            </CrudTableHead>
            <tbody>
              {clientes.map((c) => (
                <CrudTableRow key={c.id}>
                  <td className="py-3 font-medium">{c.nome}</td>
                  <td className="py-3 text-right tabular-nums">{fmtBRL(c.cobrado)}</td>
                  <td className="py-3 text-right tabular-nums text-emerald-600">{fmtBRL(c.recebido)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums text-amber-600">{fmtBRL(c.saldoAReceber)}</td>
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        )}
        <div className="mt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/financeiro">
              Registrar recebimento
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CrudListPanel>

      <CrudListPanel
        title="Motoristas — a pagar / a receber"
        icon={Users}
        filteredCount={motoristas.length}
        totalCount={motoristas.length}
        emptyMessage="Nenhum saldo em aberto com motoristas"
        emptyFilterMessage="Nenhum saldo em aberto"
      >
        {motoristas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Contas correntes dos motoristas quitadas.</p>
        ) : (
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Motorista</CrudTh>
              <CrudTh align="right">A pagar</CrudTh>
              <CrudTh align="right">A receber (devol.)</CrudTh>
            </CrudTableHead>
            <tbody>
              {motoristas.map((m) => (
                <CrudTableRow key={m.id}>
                  <td className="py-3 font-medium">{m.nome}</td>
                  <td className="py-3 text-right tabular-nums text-red-600">
                    {m.aPagar > 0 ? fmtBRL(m.aPagar) : "—"}
                  </td>
                  <td className="py-3 text-right tabular-nums text-emerald-600">
                    {m.aReceber > 0 ? fmtBRL(m.aReceber) : "—"}
                  </td>
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        )}
        <div className="mt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/financeiro">
              CC Motoristas — pagamentos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CrudListPanel>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        Para quitação formal: registre recebimento ou pagamento no Financeiro e anexe comprovante/termo assinado ao
        lançamento.
      </p>
    </div>
  );
}
