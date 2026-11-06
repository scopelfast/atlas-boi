"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  RefreshCw,
  Truck,
  Route,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  Database,
  ArrowRight,
  FileSpreadsheet,
  FileDown,
  Printer,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CrudPageLayout, type CrudTabDef } from "@/components/crud/crud-page-layout";
import {
  CrudListPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { cn } from "@/utils/cn";
import {
  relatoriosApi,
  financeiroApi,
  veiculosApi,
  type DreConsolidadoRow,
  type DreVeiculoRow,
  type PosicaoFinanceira,
  type RankingMotoristaRow,
  type RankingRotaRow,
  type Veiculo,
} from "@/services/api";
import { formatMoneyBRL } from "@/lib/documents";
import { useCrudPage } from "@/hooks/useCrudPage";
import { FinanceiroPosicaoPanel } from "@/components/financeiro/financeiro-posicao-panel";
import { PageLoadingOverlay } from "@/components/ui/page-loading-overlay";
import { ReportBarChart } from "@/components/charts/report-bar-chart";

const RELATORIO_TABS: CrudTabDef[] = [
  { id: "posicao", label: "Faturamento e pagamentos", icon: Scale },
  { id: "dre", label: "DRE veículo", icon: Truck },
  { id: "rotas", label: "Ranking rotas", icon: Route },
  { id: "motoristas", label: "Ranking motoristas", icon: Users },
];

function fmtCompetencia(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function mesAtualInput() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function KpiMini({
  label,
  value,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums tracking-tight",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-red-600 dark:text-red-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyReport({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function RelatoriosPage() {
  const crud = useCrudPage("posicao");
  const tab = crud.tab;
  const setTab = crud.setTab;

  const [competencia, setCompetencia] = useState(mesAtualInput());
  const [veiculoId, setVeiculoId] = useState("");
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [dreVeiculo, setDreVeiculo] = useState<DreVeiculoRow[]>([]);
  const [dreConsolidado, setDreConsolidado] = useState<DreConsolidadoRow[]>([]);
  const [competenciasDisponiveis, setCompetenciasDisponiveis] = useState<string[]>([]);
  const [dreAviso, setDreAviso] = useState<string | null>(null);
  const [posicao, setPosicao] = useState<PosicaoFinanceira | null>(null);
  const [rankingRotas, setRankingRotas] = useState<RankingRotaRow[]>([]);
  const [rankingMotoristas, setRankingMotoristas] = useState<RankingMotoristaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "dre" || veiculos.length > 0) return;
    veiculosApi.list({ limit: 200 }).then((r) => setVeiculos(r.items)).catch(() => {});
  }, [tab, veiculos.length]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      if (tab === "posicao") {
        setPosicao(await financeiroApi.getPosicao());
      } else if (tab === "dre") {
        const fetchDre = (mes: string) =>
          Promise.all([
            relatoriosApi.getDreVeiculo({
              competencia: mes || undefined,
              veiculoId: veiculoId || undefined,
            }),
            relatoriosApi.getDreConsolidado(mes || undefined),
          ]);

        let comps: { mes: string }[] = [];
        try {
          comps = await relatoriosApi.getDreCompetencias(veiculoId || undefined);
        } catch {
          /* endpoint pode não existir até reiniciar o backend */
        }
        setCompetenciasDisponiveis(comps.map((c) => c.mes));

        let mesEfetivo = competencia;
        let [det, cons] = await fetchDre(mesEfetivo);

        if (det.length === 0 && comps.length > 0 && !comps.some((c) => c.mes === mesEfetivo)) {
          const mesAnterior = mesEfetivo;
          mesEfetivo = comps[0].mes;
          setCompetencia(mesEfetivo);
          setDreAviso(
            `Sem dados em ${fmtCompetencia(mesAnterior + "-01")} — exibindo ${fmtCompetencia(mesEfetivo + "-01")}.`
          );
          [det, cons] = await fetchDre(mesEfetivo);
        } else {
          setDreAviso(null);
        }

        setDreVeiculo(det);
        setDreConsolidado(cons);
      } else if (tab === "rotas") {
        setRankingRotas(await relatoriosApi.getRankingRotas());
      } else {
        setRankingMotoristas(await relatoriosApi.getRankingMotoristas());
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, [tab, competencia, veiculoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizarDre() {
    setRefreshing(true);
    setErro(null);
    try {
      await relatoriosApi.refreshDre();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar DRE.");
    } finally {
      setRefreshing(false);
    }
  }

  const cons = dreConsolidado[0];
  const kpiReceita = cons?.receita ?? dreVeiculo.reduce((s, r) => s + r.receita, 0);
  const kpiCusto = cons?.custo ?? dreVeiculo.reduce((s, r) => s + r.custo, 0);
  const kpiResultado = cons?.resultado ?? dreVeiculo.reduce((s, r) => s + r.resultado, 0);
  const kpiCompetencia = cons
    ? fmtCompetencia(cons.competencia)
    : dreVeiculo[0]
      ? fmtCompetencia(dreVeiculo[0].competencia)
      : fmtCompetencia(competencia + "-01");

  const podeExportar =
    !loading &&
    ((tab === "posicao" && posicao !== null) ||
      (tab === "dre" && dreVeiculo.length > 0) ||
      (tab === "rotas" && rankingRotas.length > 0) ||
      (tab === "motoristas" && rankingMotoristas.length > 0));

  async function exportarExcel() {
    const exp = await import("@/lib/export-relatorios");
    if (tab === "posicao" && posicao) exp.exportPosicaoExcel(posicao);
    else if (tab === "dre") exp.exportDreExcel(dreVeiculo, cons, competencia);
    else if (tab === "rotas") exp.exportRankingRotasExcel(rankingRotas);
    else exp.exportRankingMotoristasExcel(rankingMotoristas);
  }

  async function exportarPdf() {
    const exp = await import("@/lib/export-relatorios");
    if (tab === "posicao" && posicao) exp.exportPosicaoPdf(posicao);
    else if (tab === "dre") exp.exportDrePdf(dreVeiculo, cons, competencia);
    else if (tab === "rotas") exp.exportRankingRotasPdf(rankingRotas);
    else exp.exportRankingMotoristasPdf(rankingMotoristas);
  }

  async function exportarImprimir() {
    if (tab !== "posicao" || !posicao) return;
    const exp = await import("@/lib/export-relatorios");
    exp.printPosicao(posicao);
  }

  const drePanel = (
    <div className="space-y-4">
      {dreAviso && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {dreAviso}
          {competenciasDisponiveis.length > 0 && (
            <span className="ml-1 text-muted-foreground">
              (meses com dados: {competenciasDisponiveis.map((m) => fmtCompetencia(m + "-01")).join(", ")})
            </span>
          )}
        </div>
      )}
      <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <Label htmlFor="competencia" className="flex items-center gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            Competência
          </Label>
          <Input
            id="competencia"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="mt-1.5 h-10"
          />
        </div>
        <div>
          <Label htmlFor="veiculo" className="flex items-center gap-1.5 text-xs">
            <Truck className="h-3.5 w-3.5" />
            Veículo
          </Label>
          <select
            id="veiculo"
            value={veiculoId}
            onChange={(e) => setVeiculoId(e.target.value)}
            className={CRUD_SELECT_CLASS + " mt-1.5"}
          >
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiMini label="Competência" value={kpiCompetencia} icon={CalendarDays} />
          <KpiMini
            label="Receita"
            value={formatMoneyBRL(kpiReceita)}
            tone="positive"
            icon={TrendingUp}
          />
          <KpiMini
            label="Custos"
            value={formatMoneyBRL(kpiCusto)}
            tone="warning"
            icon={Wallet}
          />
          <KpiMini
            label="Resultado"
            value={formatMoneyBRL(kpiResultado)}
            tone={kpiResultado < 0 ? "negative" : kpiResultado > 0 ? "positive" : "default"}
            icon={kpiResultado < 0 ? TrendingDown : TrendingUp}
          />
        </div>
      )}

      {!loading && dreVeiculo.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
          <p className="mb-3 text-sm font-medium">Resultado por veículo</p>
          <ReportBarChart
            data={dreVeiculo.map((r) => ({ label: r.placa, valor: r.resultado }))}
            valueFormatter={(v) => formatMoneyBRL(v)}
          />
        </div>
      )}

      {!loading && dreVeiculo.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10">
          <div className="border-b border-border/60 px-6 py-4 dark:border-white/5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-5 w-5" />
              </span>
              DRE por veículo
            </h3>
          </div>
          <div className="p-4">
            <EmptyReport
              title="Nenhum dado neste período"
              description={
                competenciasDisponiveis.length > 0
                  ? `Há dados em ${competenciasDisponiveis.map((m) => fmtCompetencia(m + "-01")).join(", ")}. Selecione a competência correta acima — ela segue a data de embarque, não o mês atual.`
                  : "Apure viagens em Carregamentos → Resultado financeiro e clique em «Recalcular DRE»."
              }
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/carregamentos">
                    Ver carregamentos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <CrudListPanel
          title="DRE por veículo"
          icon={Truck}
          filteredCount={dreVeiculo.length}
          totalCount={dreVeiculo.length}
          loading={loading}
          emptyMessage="Nenhum dado neste período"
          emptyFilterMessage="Nenhum dado neste período"
        >
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Placa</CrudTh>
              <CrudTh>Competência</CrudTh>
              <CrudTh align="right">Receita</CrudTh>
              <CrudTh align="right">Custo</CrudTh>
              <CrudTh align="right">Resultado</CrudTh>
            </CrudTableHead>
            <tbody>
              {dreVeiculo.map((r) => (
                <CrudTableRow key={`${r.veiculoId}-${r.competencia}`}>
                  <td className="py-3 font-medium">{r.placa}</td>
                  <td className="py-3 capitalize text-muted-foreground">
                    {fmtCompetencia(r.competencia)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoneyBRL(r.receita)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {formatMoneyBRL(r.custo)}
                  </td>
                  <td
                    className={cn(
                      "py-3 text-right font-semibold tabular-nums",
                      r.resultado >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatMoneyBRL(r.resultado)}
                  </td>
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        </CrudListPanel>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5 shrink-0" />
        Fonte: view materializada <code className="rounded bg-muted px-1">mv_dre_veiculo</code> — dados
        de carregamentos apurados; competência = mês do embarque. Use «Recalcular DRE» após apurar viagens.
      </p>
    </div>
  );

  const rotasPanel = (
    <div className="space-y-4">
      {rankingRotas.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
          <p className="mb-3 text-sm font-medium">Margem média por rota (top 10)</p>
          <ReportBarChart
            data={rankingRotas.slice(0, 10).map((r) => ({
              label: r.codigo,
              valor: r.margemMedia ?? 0,
            }))}
            valueFormatter={(v) => formatMoneyBRL(v)}
          />
        </div>
      )}
    <CrudListPanel
      title="Ranking de rotas"
      icon={Route}
      filteredCount={loading ? 0 : Math.max(rankingRotas.length, 1)}
      totalCount={rankingRotas.length}
      loading={loading}
      emptyMessage="Sem rotas ranqueadas"
      emptyFilterMessage="Sem rotas ranqueadas"
    >
      {rankingRotas.length === 0 ? (
        <EmptyReport
          title="Sem rotas ranqueadas"
          description="Finalize carregamentos vinculados a rotas para aparecerem aqui."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/carregamentos">
                Ver carregamentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <CrudTable>
          <CrudTableHead>
            <CrudTh>#</CrudTh>
            <CrudTh>Rota</CrudTh>
            <CrudTh align="right">Viagens</CrudTh>
            <CrudTh align="right">Margem média</CrudTh>
            <CrudTh align="right">KM total</CrudTh>
          </CrudTableHead>
          <tbody>
            {rankingRotas.map((r) => (
              <CrudTableRow key={r.rotaId}>
                <td className="py-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      r.posicao === 1 && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                      r.posicao === 2 && "bg-slate-500/15",
                      r.posicao === 3 && "bg-orange-600/10"
                    )}
                  >
                    {r.posicao}º
                  </Badge>
                </td>
                <td className="py-3">
                  <span className="font-medium">{r.codigo}</span>
                  <span className="ml-2 text-muted-foreground">{r.descricao}</span>
                </td>
                <td className="py-3 text-right tabular-nums">{r.totalViagens}</td>
                <td className="py-3 text-right tabular-nums">
                  {r.margemMedia != null ? formatMoneyBRL(r.margemMedia) : "—"}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {r.kmTotal != null ? Number(r.kmTotal).toLocaleString("pt-BR") : "—"}
                </td>
              </CrudTableRow>
            ))}
          </tbody>
        </CrudTable>
      )}
    </CrudListPanel>
    </div>
  );

  const motoristasPanel = (
    <div className="space-y-4">
      {rankingMotoristas.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
          <p className="mb-3 text-sm font-medium">Comissões por motorista (top 10)</p>
          <ReportBarChart
            data={rankingMotoristas.slice(0, 10).map((m) => ({
              label: m.nome.split(" ")[0],
              valor: m.totalComissao,
            }))}
            valueFormatter={(v) => formatMoneyBRL(v)}
          />
        </div>
      )}
    <CrudListPanel
      title="Ranking de motoristas"
      icon={Users}
      filteredCount={loading ? 0 : Math.max(rankingMotoristas.length, 1)}
      totalCount={rankingMotoristas.length}
      loading={loading}
      emptyMessage="Sem motoristas no ranking"
      emptyFilterMessage="Sem motoristas no ranking"
    >
      {rankingMotoristas.length === 0 ? (
        <EmptyReport
          title="Sem motoristas no ranking"
          description="Registre viagens e comissões no Financeiro para montar o ranking."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/financeiro">
                Ir para Financeiro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <CrudTable>
          <CrudTableHead>
            <CrudTh>#</CrudTh>
            <CrudTh>Motorista</CrudTh>
            <CrudTh align="right">Viagens</CrudTh>
            <CrudTh align="right">Comissões</CrudTh>
          </CrudTableHead>
          <tbody>
            {rankingMotoristas.map((m) => (
              <CrudTableRow key={m.motoristaId}>
                <td className="py-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      m.posicao === 1 && "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {m.posicao}º
                  </Badge>
                </td>
                <td className="py-3 font-medium">{m.nome}</td>
                <td className="py-3 text-right tabular-nums">{m.totalViagens}</td>
                <td className="py-3 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoneyBRL(m.totalComissao)}
                </td>
              </CrudTableRow>
            ))}
          </tbody>
        </CrudTable>
      )}
    </CrudListPanel>
    </div>
  );

  return (
    <div className="relative min-h-[420px]">
      <PageLoadingOverlay
        active={loading || refreshing}
        title={refreshing ? "Recalculando DRE no banco…" : "Carregando relatório…"}
        description={
          tab === "dre"
            ? "Consultando views materializadas — use «Recalcular DRE» se estiver vazio"
            : tab === "posicao"
              ? "Buscando faturamento e contas em aberto"
              : "Aguarde"
        }
      />
      <div className={cn((loading || refreshing) && "pointer-events-none opacity-50")}>
    <CrudPageLayout
      title="Relatórios"
      subtitle="Faturamento, pagamentos, DRE por veículo e rankings — calculados no banco de dados."
      tab={tab}
      onTabChange={setTab}
      tabs={RELATORIO_TABS}
      error={erro}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {podeExportar && (
            <>
              <Button variant="secondary" size="sm" onClick={() => void exportarExcel()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void exportarPdf()}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              {tab === "posicao" && (
                <Button variant="secondary" size="sm" onClick={() => void exportarImprimir()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              )}
            </>
          )}
          {tab === "dre" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={atualizarDre}
              disabled={refreshing || loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Recalcular DRE
            </Button>
          )}
        </div>
      }
      panels={{
        posicao: <FinanceiroPosicaoPanel posicao={posicao} loading={loading} />,
        dre: drePanel,
        rotas: rotasPanel,
        motoristas: motoristasPanel,
      }}
    />
      </div>
    </div>
  );
}
