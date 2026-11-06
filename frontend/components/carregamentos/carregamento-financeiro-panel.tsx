"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator, CheckCircle2, Circle, FileDown, Info, Loader2, Lock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import {
  financeiroApi,
  type FechamentoFinanceiroChecklist,
  type LancamentoFinanceiro,
  type LancamentoTipo,
  type PrestacaoContasPreview,
  type PreviewApuracao,
} from "@/services/api";
import { useConfirm } from "@/hooks/useConfirm";
import { CarregamentoFinanceiroDescontos } from "./carregamento-financeiro-descontos";
import { CarregamentoFinanceiroDetalhe } from "./carregamento-financeiro-detalhe";
import {
  CarregamentoFinanceiroResumo,
  type FinanceiroResumo,
} from "./carregamento-financeiro-resumo";
import { TIPO_LABEL } from "@/lib/financeiro-entities";

const TIPO_LABEL_VIAGEM: Partial<Record<LancamentoTipo, string>> = {
  FRETE_CLIENTE: "Frete",
  ABATIMENTO_FRETE_CLIENTE: "Abatimento frete",
  COMISSAO_MOTORISTA: "Comissão",
  DESCONTO_COMISSAO_MOTORISTA: "Desconto comissão",
  ADIANTAMENTO: "Adiantamento",
  DESPESA_MOTORISTA: "Despesa",
  REEMBOLSO_MOTORISTA: "Reembolso",
  PRESTACAO_CONTAS: "Prestação",
  ACERTO_MOTORISTA: "Acerto",
  RECEITA: "Recebimento",
};

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LancamentosTable({
  lancamentos,
  tipoLabels,
}: {
  lancamentos: LancamentoFinanceiro[];
  tipoLabels: Partial<Record<LancamentoTipo, string>>;
}) {
  if (!lancamentos.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Descrição</th>
            <th className="px-3 py-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => (
            <tr key={l.id} className="border-b border-border/30 last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.dataLancamento)}</td>
              <td className="px-3 py-2">{tipoLabels[l.tipo] ?? TIPO_LABEL[l.tipo] ?? l.tipo}</td>
              <td className="px-3 py-2 max-w-[220px] truncate text-muted-foreground">{l.descricao}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-medium tabular-nums",
                  l.natureza === "CREDITO" ? "text-emerald-600" : "text-foreground"
                )}
              >
                {l.natureza === "CREDITO" ? "+" : "−"}
                {fmtBRL(l.valor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function AvisoItem({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

function ActionButtonIcon({
  loading,
  icon: Icon,
}: {
  loading: boolean;
  icon: typeof Calculator;
}) {
  return (
    <span className="relative mr-2 inline-flex h-4 w-4 shrink-0">
      <Loader2
        className={cn("absolute inset-0 h-4 w-4 animate-spin", !loading && "hidden")}
        aria-hidden
      />
      <Icon className={cn("absolute inset-0 h-4 w-4", loading && "hidden")} aria-hidden />
    </span>
  );
}

export function CarregamentoFinanceiroPanel({
  carregamentoId,
  carregamentoNumero,
  status,
  motoristas,
  financas,
  onFinanceiroChange,
  className,
}: {
  carregamentoId: string;
  carregamentoNumero: string;
  status: string;
  motoristas: { id: string; nome: string }[];
  financas?: FinanceiroResumo | null;
  onFinanceiroChange?: () => void | Promise<void>;
  className?: string;
}) {
  const { confirm } = useConfirm();
  const [lancamentosViagem, setLancamentosViagem] = useState<LancamentoFinanceiro[]>([]);
  const [lancamentosVeiculo, setLancamentosVeiculo] = useState<LancamentoFinanceiro[]>([]);
  const [apurado, setApurado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apurando, setApurando] = useState(false);
  const [prestacoes, setPrestacoes] = useState<PrestacaoContasPreview[]>([]);
  const [fechandoId, setFechandoId] = useState<string | null>(null);
  const [fechandoFinanceiro, setFechandoFinanceiro] = useState(false);
  const [checklist, setChecklist] = useState<FechamentoFinanceiroChecklist | null>(null);
  const [previewApuracao, setPreviewApuracao] = useState<PreviewApuracao | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gerandoTermo, setGerandoTermo] = useState(false);

  const podeApurar =
    status !== "RASCUNHO" &&
    status !== "CANCELADO" &&
    !apurado &&
    !checklist?.financeiroFechadoAt;

  const motoristaIds = motoristas.map((m) => m.id).join(",");
  const motoristasRef = useRef(motoristas);
  motoristasRef.current = motoristas;
  const onFinanceiroChangeRef = useRef(onFinanceiroChange);
  onFinanceiroChangeRef.current = onFinanceiroChange;
  const hasLoadedRef = useRef(false);

  const syncParentFinancas = useCallback(async () => {
    await onFinanceiroChangeRef.current?.();
  }, []);

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const mot = motoristasRef.current;
      const res = await financeiroApi.lancamentosCarregamento(carregamentoId);
      setLancamentosViagem(res.viagem ?? res.items);
      setLancamentosVeiculo(res.veiculo ?? []);

      if (mot.length) {
        const previews = await Promise.all(
          mot.map((m) =>
            financeiroApi.previewPrestacaoContas(carregamentoId, m.id).catch(() => null)
          )
        );
        setPrestacoes(previews.filter(Boolean) as PrestacaoContasPreview[]);
      } else {
        setPrestacoes([]);
      }

      const [chk, prev] = await Promise.all([
        financeiroApi.checklistFechamento(carregamentoId),
        financeiroApi.previewApuracao(carregamentoId).catch(() => null),
      ]);
      setChecklist(chk);
      setApurado(chk.apurado);
      setPreviewApuracao(prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar financeiro");
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [carregamentoId, motoristaIds]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setLoading(true);
    load();
  }, [load]);

  const handleApurar = async () => {
    let desc =
      "Serão gerados lançamentos de frete (cliente) e comissão (motoristas) com base nos valores calculados.";
    if (previewApuracao) {
      desc = `Cobrança cliente: ${fmtBRL(previewApuracao.valorReceitaLiquida ?? previewApuracao.valorFreteLiquido)} · Comissão: ${fmtBRL(previewApuracao.valorComissaoLiquida)} · Margem líquida: ${fmtBRL(previewApuracao.margemLiquida)}. Confirma a apuração?`;
    }

    const ok = await confirm({
      title: "Apurar financeiro",
      context: { label: "Código", value: carregamentoNumero },
      description: desc,
      confirmLabel: "Apurar agora",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    setApurando(true);
    setError(null);
    try {
      await financeiroApi.apurarCarregamento(carregamentoId);
      await load();
      await syncParentFinancas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao apurar");
    } finally {
      setApurando(false);
    }
  };

  const handleFecharPrestacao = async (motoristaId: string, nome: string) => {
    const preview = prestacoes.find((p) => p.motoristaId === motoristaId);
    if (!preview || preview.jaFechado) return;

    const ok = await confirm({
      title: "Conferir acerto da viagem",
      context: { label: "Motorista", value: nome },
      description: `Saldo da viagem: ${fmtBRL(preview.saldoViagem)}. Registra que você conferiu o acerto — não é o pagamento em si (isso fica no Financeiro → CC Motoristas).`,
      confirmLabel: "Conferir acerto",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    setFechandoId(motoristaId);
    setError(null);
    try {
      await financeiroApi.fecharPrestacaoContas(carregamentoId, motoristaId);
      await load();
      await syncParentFinancas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fechar prestação");
    } finally {
      setFechandoId(null);
    }
  };

  const handleFecharFinanceiro = async () => {
    if (checklist?.financeiroFechadoAt) return;

    const ok = await confirm({
      title: "Encerrar financeiro da viagem",
      context: { label: "Código", value: carregamentoNumero },
      description:
        "Trava os valores calculados desta viagem. Não exige receber do cliente nem pagar o motorista — isso continua no Financeiro.",
      confirmLabel: "Encerrar financeiro",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    setFechandoFinanceiro(true);
    setError(null);
    try {
      await financeiroApi.fecharCarregamentoFinanceiro(carregamentoId);
      await load();
      await syncParentFinancas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fechar financeiro");
    } finally {
      setFechandoFinanceiro(false);
    }
  };

  const financeiroFechado = !!checklist?.financeiroFechadoAt;

  async function handleTermoQuitacao() {
    setGerandoTermo(true);
    setError(null);
    try {
      const dados = await financeiroApi.getTermoQuitacao(carregamentoId);
      const { exportTermoQuitacaoPdf } = await import("@/lib/export-termo-quitacao");
      exportTermoQuitacaoPdf(dados);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar termo de quitação");
    } finally {
      setGerandoTermo(false);
    }
  }

  return (
    <>
      <CarregamentoFinanceiroResumo
        valores={financas ?? null}
        preview={previewApuracao}
        prestacoes={prestacoes}
      />

      <CarregamentoFinanceiroDetalhe preview={previewApuracao} />

      <CarregamentoFinanceiroDescontos
        carregamentoId={carregamentoId}
        motoristas={motoristas}
        apurado={apurado}
        financeiroFechado={financeiroFechado}
        onSaved={async () => {
          await load();
          await syncParentFinancas();
        }}
      />

      <section
        className={cn("mb-4 rounded-xl border border-border/70 bg-muted/20 p-4", className)}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Lançamentos financeiros</h3>
            {financeiroFechado ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Financeiro fechado
              </Badge>
            ) : apurado ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Apurado
              </Badge>
            ) : (
              <Badge variant="outline">Pendente</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {podeApurar && !financeiroFechado && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={apurando}
                onClick={handleApurar}
              >
                <ActionButtonIcon loading={apurando} icon={Calculator} />
                {apurando ? "Apurando…" : "Apurar (gerar lançamentos de frete e comissão)"}
              </Button>
            )}
            {apurado && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={gerandoTermo}
                onClick={() => void handleTermoQuitacao()}
              >
                <ActionButtonIcon loading={gerandoTermo} icon={FileDown} />
                {gerandoTermo ? "Gerando…" : "Termo de quitação (PDF)"}
              </Button>
            )}
            {!financeiroFechado &&
              status !== "RASCUNHO" &&
              status !== "CANCELADO" &&
              checklist?.pronto && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={fechandoFinanceiro}
                  onClick={handleFecharFinanceiro}
                >
                  <ActionButtonIcon loading={fechandoFinanceiro} icon={Lock} />
                  {fechandoFinanceiro ? "Fechando…" : "Encerrar financeiro"}
                </Button>
              )}
          </div>
        </div>

        {checklist && !financeiroFechado && (
          <div className="mb-4 rounded-lg border border-border/50 bg-background/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Para fechar o financeiro desta viagem
            </p>
            <ul className="space-y-1.5">
              <CheckItem
                ok={!checklist.precisaApurar || checklist.apurado}
                label={
                  checklist.precisaApurar
                    ? "Apurar (gerar lançamentos de frete e comissão)"
                    : "Apuração (sem valores a apurar)"
                }
              />
            </ul>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contas em aberto — não bloqueiam finalizar
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {checklist.valorFreteApurado > 0 && (
                <AvisoItem
                  label={`Cliente ${checklist.clienteNome}: ${fmtBRL(checklist.valorRecebido)} recebido de ${fmtBRL(checklist.valorFreteApurado)} cobrado`}
                />
              )}
              {checklist.motoristas
                .filter((m) => m.requerPrestacao)
                .map((m) => (
                  <AvisoItem
                    key={m.motoristaId}
                    label={`Motorista ${m.motoristaNome}: prestação ${m.prestacaoFechada ? "fechada" : "em aberto"}`}
                  />
                ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link href="/dashboard/financeiro" className="font-medium text-primary underline">
                Financeiro → A receber (cliente)
              </Link>
              <Link href="/dashboard/financeiro" className="font-medium text-primary underline">
                Financeiro → CC Motoristas (pagamentos)
              </Link>
            </div>
            {checklist.pendencias.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Pendências: {checklist.pendencias.join(" · ")}
              </p>
            )}
          </div>
        )}

        {financeiroFechado && checklist?.financeiroFechadoAt && (
          <p className="mb-3 text-xs text-muted-foreground">
            Financeiro fechado em{" "}
            {new Date(checklist.financeiroFechadoAt).toLocaleString("pt-BR")}. O carregamento pode
            ser marcado como <strong>Finalizado</strong>.
          </p>
        )}

        {error && (
          <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando lançamentos…</p>
        ) : lancamentosViagem.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento de viagem. Registre adiantamentos no Financeiro ou apure o embarque.
          </p>
        ) : (
          <LancamentosTable lancamentos={lancamentosViagem} tipoLabels={TIPO_LABEL_VIAGEM} />
        )}

        {lancamentosVeiculo.length > 0 && (() => {
          const espelho = lancamentosVeiculo.filter((l) =>
            (l.observacoes ?? "").toLowerCase().includes("espelho")
          );
          const direto = lancamentosVeiculo.filter(
            (l) => !(l.observacoes ?? "").toLowerCase().includes("espelho")
          );
          return (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              CC veículo: espelho das despesas do motorista (já entram no resultado) vs. custos pagos direto pela
              empresa.
            </p>
            {espelho.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Espelho despesas viagem ({espelho.length}) — não somar de novo
                </p>
                <LancamentosTable lancamentos={espelho} tipoLabels={TIPO_LABEL} />
              </div>
            )}
            {direto.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Custo direto veículo ({direto.length}) — pago pela empresa
                </p>
                <LancamentosTable lancamentos={direto} tipoLabels={TIPO_LABEL} />
              </div>
            )}
          </div>
          );
        })()}

        {prestacoes.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acerto da viagem — motoristas
            </h4>
            {prestacoes.map((p) => (
              <div
                key={p.motoristaId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-sm">{p.motoristaNome}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Comissão {fmtBRL(p.comissoes)}
                  {(p.reembolsoDespesas ?? 0) > 0 && <> + Reemb. despesas {fmtBRL(p.reembolsoDespesas)}</>}
                  {(p.devolucaoAdiantamento ?? 0) > 0 && <> − Adiant. não usado {fmtBRL(p.devolucaoAdiantamento)}</>}
                  {(p.descontosComissao ?? 0) > 0 && <> − Desc. {fmtBRL(p.descontosComissao)}</>}
                  {" "}= {fmtBRL(p.saldoViagem)}
                </p>
                {(p.reembolsoDespesas ?? 0) > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Despesas {fmtBRL(p.despesas)} − adiantamento {fmtBRL(p.adiantamentos)}
                    {(p.reembolsos ?? 0) > 0 && <> + do bolso {fmtBRL(p.reembolsos)}</>}
                    {" "}= {fmtBRL(p.reembolsoDespesas)} a reembolsar, somado à comissão.
                  </p>
                )}
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      p.saldoViagem >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {fmtBRL(p.saldoViagem)}
                  </p>
                  {p.jaFechado ? (
                    <Badge variant="secondary">Conferido</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={
                        fechandoId === p.motoristaId ||
                        p.lancamentos.length === 0 ||
                        financeiroFechado
                      }
                      onClick={() => handleFecharPrestacao(p.motoristaId, p.motoristaNome)}
                    >
                      {fechandoId === p.motoristaId ? "Salvando…" : "Conferir acerto"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
