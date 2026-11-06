"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  financeiroApi,
  type Carregamento,
  type LancamentoFinanceiro,
  type LancamentoTipo,
} from "@/services/api";
import {
  CrudListPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { MoneyInput } from "@/components/ui/money-input";
import { parseMoneyBRL } from "@/lib/documents";
import { rotuloCarregamento } from "@/lib/format-carregamento";

const TIPO_LABEL: Partial<Record<LancamentoTipo, string>> = {
  FRETE_CLIENTE: "Frete",
  ABATIMENTO_FRETE_CLIENTE: "Abatimento",
  PEDAGIO_CLIENTE: "Pedágio",
  BALANCA_CLIENTE: "Balança",
  OUTROS_CLIENTE: "Outros",
  RECEITA: "Recebimento",
};

const SALDO_MIN = 0.01;

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function saldoPendente(saldo: number) {
  return saldo >= SALDO_MIN;
}

function fmtSaldoInput(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinanceiroCobrancaPanel({
  saldos,
  carregamentos,
  loading,
  onRefresh,
  onError,
}: {
  saldos: { id: string; nome: string; saldoAReceber: number; cobrado: number; recebido: number }[];
  carregamentos: Carregamento[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [extratoClienteId, setExtratoClienteId] = useState<string | null>(null);
  const [extrato, setExtrato] = useState<LancamentoFinanceiro[]>([]);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [recebendoId, setRecebendoId] = useState<string | null>(null);
  const [valorRecebimento, setValorRecebimento] = useState("");
  const [descRecebimento, setDescRecebimento] = useState("");
  const [carregamentoRecebimentoId, setCarregamentoRecebimentoId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const pendentes = useMemo(
    () => saldos.filter((s) => saldoPendente(s.saldoAReceber)),
    [saldos]
  );
  const quitados = useMemo(
    () => saldos.filter((s) => !saldoPendente(s.saldoAReceber) && s.cobrado > 0),
    [saldos]
  );

  const clienteRecebendo = recebendoId ? saldos.find((s) => s.id === recebendoId) : undefined;
  const valorNumerico = parseMoneyBRL(valorRecebimento) ?? 0;
  const saldoMax = clienteRecebendo?.saldoAReceber ?? 0;
  const recebimentoValido =
    !!recebendoId &&
    saldoPendente(saldoMax) &&
    !!carregamentoRecebimentoId &&
    valorNumerico >= SALDO_MIN &&
    valorNumerico <= saldoMax + 0.009;

  useEffect(() => {
    if (!recebendoId) return;
    const atual = saldos.find((s) => s.id === recebendoId);
    if (!atual || !saldoPendente(atual.saldoAReceber)) {
      setRecebendoId(null);
      setValorRecebimento("");
      setDescRecebimento("");
      setCarregamentoRecebimentoId("");
    }
  }, [recebendoId, saldos]);

  const carregamentosCliente = (clienteId: string) =>
    carregamentos.filter((c) => c.clienteDestinoId === clienteId);

  const abrirExtrato = async (clienteId: string) => {
    if (extratoClienteId === clienteId) {
      setExtratoClienteId(null);
      setExtrato([]);
      setRecebendoId(null);
      return;
    }
    setExtratoClienteId(clienteId);
    setRecebendoId(null);
    setExtratoLoading(true);
    try {
      const res = await financeiroApi.extratoCliente(clienteId, { limit: 100 });
      setExtrato(res.items);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao carregar extrato");
    } finally {
      setExtratoLoading(false);
    }
  };

  const abrirRecebimento = (s: (typeof saldos)[0]) => {
    if (!saldoPendente(s.saldoAReceber)) {
      onError("Este cliente já está quitado — não há valor a receber");
      return;
    }
    setRecebendoId(s.id);
    setExtratoClienteId(s.id);
    setCarregamentoRecebimentoId("");
    setValorRecebimento(fmtSaldoInput(s.saldoAReceber));
    setDescRecebimento("");
    onError(null);
  };

  const registrarRecebimento = async (clienteId: string) => {
    const valor = parseMoneyBRL(valorRecebimento);
    const saldo = saldos.find((s) => s.id === clienteId)?.saldoAReceber ?? 0;

    if (!valor || valor < SALDO_MIN) {
      onError("Informe um valor maior que zero");
      return;
    }
    if (!saldoPendente(saldo)) {
      onError("Cliente sem saldo a receber — cobrança já quitada");
      setRecebendoId(null);
      return;
    }
    if (valor > saldo + 0.009) {
      onError(`Valor não pode exceder o saldo a receber (${fmtBRL(saldo)})`);
      return;
    }
    if (!carregamentoRecebimentoId) {
      onError("Selecione o embarque (carregamento) vinculado ao recebimento");
      return;
    }
    setSalvando(true);
    onError(null);
    try {
      await financeiroApi.registrarRecebimento(clienteId, {
        valor,
        descricao: descRecebimento.trim() || undefined,
        carregamentoId: carregamentoRecebimentoId,
      });
      setValorRecebimento("");
      setDescRecebimento("");
      setCarregamentoRecebimentoId("");
      setRecebendoId(null);
      await onRefresh();
      if (extratoClienteId === clienteId) {
        const res = await financeiroApi.extratoCliente(clienteId, { limit: 100 });
        setExtrato(res.items);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao registrar recebimento");
    } finally {
      setSalvando(false);
    }
  };

  const renderLinha = (s: (typeof saldos)[0], opts?: { quitado?: boolean }) => (
    <CrudTableRow key={s.id}>
      <td className="py-3">
        <button
          type="button"
          className="flex items-center gap-2 font-medium hover:text-primary"
          onClick={() => abrirExtrato(s.id)}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              extratoClienteId === s.id ? "rotate-90" : ""
            }`}
          />
          {s.nome}
          {opts?.quitado && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              Quitado
            </Badge>
          )}
        </button>
      </td>
      <td className="py-3 text-right tabular-nums">{fmtBRL(s.cobrado)}</td>
      <td className="py-3 text-right tabular-nums text-emerald-600">{fmtBRL(s.recebido)}</td>
      <td
        className={`py-3 text-right text-lg font-bold tabular-nums ${
          saldoPendente(s.saldoAReceber) ? "text-amber-600" : "text-emerald-600"
        }`}
      >
        {fmtBRL(s.saldoAReceber)}
      </td>
      <td className="py-3 text-right">
        {saldoPendente(s.saldoAReceber) && (
          <Button variant="secondary" size="sm" onClick={() => abrirRecebimento(s)}>
            Receber
          </Button>
        )}
      </td>
    </CrudTableRow>
  );

  const clienteAtual = saldos.find((s) => s.id === extratoClienteId);

  return (
    <CrudListPanel
      title="Contas a receber — clientes"
      icon={Receipt}
      filteredCount={pendentes.length}
      totalCount={pendentes.length}
      loading={loading}
      emptyMessage="Nenhuma cobrança pendente — apure carregamentos para gerar frete"
      emptyFilterMessage="—"
    >
      {pendentes.length === 0 && !loading ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum saldo pendente a receber.
          {quitados.length > 0 && " Veja abaixo os clientes já quitados."}
        </div>
      ) : (
        <CrudTable>
          <CrudTableHead>
            <CrudTh>Cliente</CrudTh>
            <CrudTh align="right">Cobrado</CrudTh>
            <CrudTh align="right">Recebido</CrudTh>
            <CrudTh align="right">Saldo a receber</CrudTh>
            <CrudTh align="right">Ações</CrudTh>
          </CrudTableHead>
          <tbody>{pendentes.map((s) => renderLinha(s))}</tbody>
        </CrudTable>
      )}

      {recebendoId && clienteRecebendo && saldoPendente(clienteRecebendo.saldoAReceber) && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h4 className="mb-1 text-sm font-semibold">
            Registrar recebimento — {clienteRecebendo.nome}
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Saldo em aberto: <strong className="text-amber-600">{fmtBRL(saldoMax)}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>
                Embarque (carregamento) <span className="text-destructive">*</span>
              </Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={carregamentoRecebimentoId}
                onChange={(e) => setCarregamentoRecebimentoId(e.target.value)}
                required
              >
                <option value="">Selecione o embarque…</option>
                {carregamentosCliente(recebendoId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {rotuloCarregamento(c)}
                  </option>
                ))}
              </select>
              {carregamentosCliente(recebendoId).length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Nenhum embarque deste cliente — apure um carregamento primeiro.
                </p>
              )}
            </div>
            <div>
              <Label>Valor</Label>
              <MoneyInput
                value={valorRecebimento}
                onChange={(display) => setValorRecebimento(display)}
                hint={`Máximo: ${fmtBRL(saldoMax)}`}
              />
              {valorNumerico > 0 && valorNumerico < SALDO_MIN && (
                <p className="mt-1 text-xs text-destructive">Valor deve ser maior que zero</p>
              )}
              {valorNumerico > saldoMax + 0.009 && (
                <p className="mt-1 text-xs text-destructive">
                  Valor excede o saldo ({fmtBRL(saldoMax)})
                </p>
              )}
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                className="mt-1"
                value={descRecebimento}
                onChange={(e) => setDescRecebimento(e.target.value)}
                placeholder="Ex.: PIX ref. frete março"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={salvando || !recebimentoValido}
              onClick={() => registrarRecebimento(recebendoId)}
            >
              {salvando ? "Salvando…" : "Confirmar recebimento"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRecebendoId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {quitados.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Clientes quitados</h4>
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Cliente</CrudTh>
              <CrudTh align="right">Cobrado</CrudTh>
              <CrudTh align="right">Recebido</CrudTh>
              <CrudTh align="right">Saldo</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>{quitados.map((s) => renderLinha(s, { quitado: true }))}</tbody>
          </CrudTable>
        </div>
      )}

      {extratoClienteId && !recebendoId && (
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <h4 className="mb-3 text-sm font-semibold">Extrato — {clienteAtual?.nome}</h4>
          {extratoLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : extrato.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">CAR</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.map((l) => (
                    <tr key={l.id} className="border-b border-border/30 last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.dataLancamento)}</td>
                      <td className="px-3 py-2">{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{l.descricao}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {l.carregamento?.numero ? (
                          <Link
                            href={`/dashboard/carregamentos?id=${l.carregamentoId || l.carregamento.id}`}
                            className="text-emerald-700 hover:underline dark:text-emerald-300"
                          >
                            #{l.carregamento.numero}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums ${
                          l.tipo === "RECEITA" || l.tipo === "ABATIMENTO_FRETE_CLIENTE"
                            ? "text-emerald-600"
                            : "text-foreground"
                        }`}
                      >
                        {l.tipo === "RECEITA" || l.tipo === "ABATIMENTO_FRETE_CLIENTE" ? "+" : "−"}
                        {fmtBRL(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Saldo a receber = cobranças (frete, pedágio, balança, outros) − abatimentos − recebimentos
        confirmados. Só é possível receber com saldo em aberto e valor maior que zero.
      </p>
    </CrudListPanel>
  );
}
