"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Truck, Users, TrendingUp, CalendarDays, AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSse } from "@/hooks/useDashboardSse";
import { dashboardApi, intelligenceApi, type DashboardKpis } from "@/services/api";
import { pendenciasFrota } from "@/lib/carregamento-pendencias";
import { ReportPieChart } from "@/components/charts/report-pie-chart";

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export default function DashboardPage() {
  const { user, token, ready } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [alertasOps, setAlertasOps] = useState(0);

  useDashboardSse(Boolean(ready && token && user?.companyId));

  useEffect(() => {
    if (!ready || !token || !user?.companyId) return;
    const load = () => {
      dashboardApi.getKpis().then(setKpis).catch(() => setKpis(null));
      intelligenceApi
        .getAlertas()
        .then((a) => setAlertasOps(a.filter((x) => x.severidade !== "info").length))
        .catch(() => setAlertasOps(0));
    };
    load();
    const onLive = () => load();
    window.addEventListener("atlas-dashboard-refresh", onLive);
    const iv = setInterval(load, 30_000);
    return () => {
      window.removeEventListener("atlas-dashboard-refresh", onLive);
      clearInterval(iv);
    };
  }, [ready, token, user?.companyId]);

  const cards = [
    { label: "Carregamentos ativos", value: kpis ? String(kpis.carregamentosAtivos) : "—", icon: Truck, hint: "Planejado → em trânsito" },
    { label: "Animais em trânsito", value: kpis ? String(kpis.animaisEmTransito) : "—", icon: Users, hint: "Embarcados + trânsito" },
    { label: "Resultado médio", value: kpis ? fmtBRL(kpis.margemMedia) : "—", icon: TrendingUp, hint: "Frete − comissão − despesas viagem − custo veículo" },
    { label: "Carregamentos no mês", value: kpis ? String(kpis.carregamentosMes) : "—", icon: CalendarDays, hint: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) },
  ];

  const recentesComPendencia =
    kpis?.recentes.filter((c) => pendenciasFrota(c).length > 0) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Olá, {user?.name ?? "operador"} — operação, frota e inteligência no PostgreSQL.
          </p>
        </div>
        <Badge variant="phase" className="rounded-full px-3 py-1">
          Fase 4 — Inteligência
        </Badge>
      </div>

      {alertasOps > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {alertasOps} alerta(s) do Ops Brain
            </p>
            <Link
              href="/dashboard/inteligencia"
              className="mt-1 inline-block font-medium text-amber-900 underline underline-offset-2 dark:text-amber-200"
            >
              Ver Atlas Intelligence
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {kpis && kpis.porStatus.length > 0 && (
        <Card className="border-border/70 shadow-sm dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Carregamentos por status</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportPieChart
              data={kpis.porStatus.map((s) => ({
                label: STATUS_LABEL[s.status] ?? s.status,
                valor: s.total,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {recentesComPendencia.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Embarques sem motorista ou veículo
            </p>
            <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
              {recentesComPendencia
                .map((c) => {
                  const p = pendenciasFrota(c);
                  return `${c.numero} (falta ${p.join(" e ")})`;
                })
                .join(" · ")}
            </p>
            <Link
              href="/dashboard/carregamentos"
              className="mt-2 inline-block font-medium text-amber-900 underline underline-offset-2 dark:text-amber-200"
            >
              Abrir carregamentos
            </Link>
          </div>
        </div>
      )}

      {kpis && kpis.recentes.length > 0 && (
        <Card className="overflow-hidden border-border/70 shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <CardHeader className="border-b border-border/60 bg-muted/30 dark:border-white/5 dark:bg-white/[0.02]">
            <CardTitle className="text-base font-semibold">Últimos carregamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/5">
                    <th className="px-6 py-3 font-medium">Número</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Trecho</th>
                    <th className="px-6 py-3 font-medium">Frota</th>
                    <th className="px-6 py-3 font-medium">Animais</th>
                    <th className="px-6 py-3 text-right font-medium">Frete</th>
                    <th className="px-6 py-3 text-right font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.recentes.map((c) => {
                    const pendencias = pendenciasFrota(c);
                    const mot = c.motoristas?.[0]?.motorista?.nome;
                    const placa = c.veiculos?.[0]?.veiculo?.placa;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40 dark:border-white/5 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/dashboard/carregamentos?id=${c.id}`}
                            className="inline-flex items-center gap-2 font-medium hover:underline"
                          >
                            {c.numero}
                            {pendencias.length > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                Pendente
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5">{STATUS_LABEL[c.status] ?? c.status}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">
                          {c.clienteOrigem.cidade} → {c.clienteDestino.cidade}
                        </td>
                        <td className="px-6 py-3.5">
                          {!mot && !placa ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              Sem motorista / placa
                            </span>
                          ) : (
                            <>
                              {mot || (
                                <span className="text-amber-700 dark:text-amber-400">
                                  — sem motorista
                                </span>
                              )}
                              {" / "}
                              {placa || (
                                <span className="text-amber-700 dark:text-amber-400">— sem placa</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3.5 tabular-nums">{c.quantidadeAnimais}</td>
                        <td className="px-6 py-3.5 text-right tabular-nums">{fmtBRL(c.valorFreteCliente)}</td>
                        <td className="px-6 py-3.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {fmtBRL(c.margemOperacional ?? c.margemBruta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/relatorios"
          className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition hover:bg-muted/40 dark:border-white/10"
        >
          <p className="font-medium">Relatórios</p>
          <p className="text-xs text-muted-foreground">DRE, rankings e faturamento</p>
        </Link>
        <Link
          href="/dashboard/inteligencia"
          className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition hover:bg-muted/40 dark:border-white/10"
        >
          <p className="font-medium">Atlas Intelligence</p>
          <p className="text-xs text-muted-foreground">Ops Brain e consultas</p>
        </Link>
        <Link
          href="/dashboard/financeiro"
          className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm transition hover:bg-muted/40 dark:border-white/10"
        >
          <p className="font-medium">Financeiro</p>
          <p className="text-xs text-muted-foreground">Contas e conta corrente</p>
        </Link>
        <Link
          href="/motorista/login"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm shadow-sm transition hover:bg-emerald-500/10"
        >
          <p className="font-medium text-emerald-700 dark:text-emerald-400">App Motorista</p>
          <p className="text-xs text-muted-foreground">PWA — viagens e despesas</p>
        </Link>
      </div>
    </div>
  );
}
