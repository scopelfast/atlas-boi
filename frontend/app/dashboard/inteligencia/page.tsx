"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  FileCode2,
  MessageSquare,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CrudPageLayout, type CrudTabDef } from "@/components/crud/crud-page-layout";
import { useCrudPage } from "@/hooks/useCrudPage";
import { intelligenceApi, type NfeBrainInsight, type OpsAlerta, type QueryBrainResult } from "@/services/api";
import { ReportBarChart } from "@/components/charts/report-bar-chart";
import { cn } from "@/utils/cn";

const TABS: CrudTabDef[] = [
  { id: "ops", label: "Ops Brain", icon: AlertTriangle },
  { id: "query", label: "Query Brain", icon: MessageSquare },
  { id: "nfe", label: "NF-e Brain", icon: FileCode2 },
];

function severidadeBadge(s: OpsAlerta["severidade"]) {
  if (s === "critical") return "destructive";
  if (s === "warning") return "secondary";
  return "outline";
}

function OpsPanel({ alertas, loading }: { alertas: OpsAlerta[]; loading: boolean }) {
  if (loading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando alertas…</p>;
  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 px-6 py-14 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-emerald-500" />
        <p className="mt-3 font-medium">Nenhum alerta no momento</p>
        <p className="mt-1 text-sm text-muted-foreground">Margem, CNH, saldo CC e carregamentos parados estão ok.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {alertas.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-xl border px-4 py-3",
            a.severidade === "critical" && "border-red-500/40 bg-red-500/5",
            a.severidade === "warning" && "border-amber-500/40 bg-amber-500/5",
            a.severidade === "info" && "border-border/70 bg-muted/20"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={severidadeBadge(a.severidade)}>{a.severidade}</Badge>
                <span className="font-medium">{a.titulo}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.mensagem}</p>
            </div>
            {a.link && (
              <Button asChild variant="secondary" size="sm">
                <Link href={a.link}>Ver</Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function QueryPanel() {
  const [pergunta, setPergunta] = useState("");
  const [exemplos, setExemplos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<QueryBrainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    intelligenceApi.getExemplos().then((r) => setExemplos(r.perguntas)).catch(() => {});
  }, []);

  async function enviar(q?: string) {
    const text = (q ?? pergunta).trim();
    if (!text) return;
    setLoading(true);
    setErro(null);
    try {
      setResultado(await intelligenceApi.perguntar(text));
      setPergunta(text);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na consulta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void enviar()}
            placeholder="Ex.: quantos carregamentos ativos? faturamento do mês?"
            className="pl-9"
          />
        </div>
        <Button onClick={() => void enviar()} disabled={loading}>
          {loading ? "Consultando…" : "Perguntar"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {exemplos.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => void enviar(ex)}
            className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {resultado && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-emerald-600" />
              Resposta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{resultado.resposta}</p>
            {resultado.grafico && resultado.grafico.itens.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{resultado.grafico.titulo}</p>
                <ReportBarChart
                  data={resultado.grafico.itens}
                  valueFormatter={(v) =>
                    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NfePanel() {
  const [insight, setInsight] = useState<NfeBrainInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setErro(null);
    try {
      const xml = await file.text();
      setInsight(await intelligenceApi.analyzeNfe(xml));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar XML.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">Analisar XML de NF-e</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Match fuzzy de clientes, detecção de troca de notas, alertas de GTA e duplicata.
        </p>
        <label className="mt-4 inline-block">
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="secondary" disabled={loading} asChild>
            <span>{loading ? "Analisando…" : "Selecionar XML"}</span>
          </Button>
        </label>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {insight && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Confiança da análise: {Math.round(insight.confianca * 100)}%
            {insight.papelNotaSugerido && (
              <span className="ml-2">
                · Papel sugerido: <strong>{insight.papelNotaSugerido}</strong>
              </span>
            )}
          </p>
          {insight.alertas.map((a, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                a.severidade === "critical" && "border-red-500/40 bg-red-500/5",
                a.severidade === "warning" && "border-amber-500/40 bg-amber-500/5"
              )}
            >
              {a.mensagem}
            </div>
          ))}
          {insight.sugestoes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sugestões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {insight.sugestoes.map((s, i) => (
                  <div key={i}>
                    <span className="font-medium">{s.campo}</span>: {s.valor}
                    <span className="text-muted-foreground"> — {s.motivo}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function InteligenciaPage() {
  const crud = useCrudPage("ops");
  const [alertas, setAlertas] = useState<OpsAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ pgCron: boolean; ultimoSnapshot: string | null } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([intelligenceApi.getAlertas(), intelligenceApi.getStatus()]);
      setAlertas(a);
      setStatus(s);
    } catch {
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (crud.tab === "ops") carregar();
  }, [crud.tab, carregar]);

  return (
    <CrudPageLayout
      title="Atlas Intelligence"
      subtitle="Ops Brain, Query Brain e NF-e Brain — análise segura em cima do PostgreSQL."
      tab={crud.tab}
      onTabChange={crud.setTab}
      tabs={TABS}
      actions={
        status && (
          <Badge variant="outline" className="font-normal">
            {status.pgCron ? "pg_cron ativo" : "refresh manual DRE"}
          </Badge>
        )
      }
      panels={{
        ops: <OpsPanel alertas={alertas} loading={loading} />,
        query: <QueryPanel />,
        nfe: <NfePanel />,
      }}
    />
  );
}
