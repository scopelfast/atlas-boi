"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { financeiroApi, type PreviewApuracao } from "@/services/api";
import { parseMoneyBRL } from "@/lib/documents";
import {
  calcularResultadoOperacional,
  formulaResultadoOperacional,
  montarComponentesResultado,
} from "@/lib/financeiro-resultado";
import { cn } from "@/utils/cn";

function fmtBRL(v?: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CarregamentoFinanceiroDescontos({
  carregamentoId,
  motoristas,
  apurado,
  financeiroFechado,
  onSaved,
  className,
}: {
  carregamentoId: string;
  motoristas: { id: string; nome: string }[];
  apurado: boolean;
  financeiroFechado: boolean;
  onSaved?: () => void;
  className?: string;
}) {
  const [preview, setPreview] = useState<PreviewApuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [descontoFrete, setDescontoFrete] = useState("");
  const [motivoFrete, setMotivoFrete] = useState("");
  const [descontosMotorista, setDescontosMotorista] = useState<
    Record<string, { valor: string; motivo: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await financeiroApi.previewApuracao(carregamentoId);
      setPreview(p);
      setDescontoFrete(p.descontoFreteCliente > 0 ? String(p.descontoFreteCliente) : "");
      setMotivoFrete(p.motivoDescontoFrete ?? "");
      const dm: Record<string, { valor: string; motivo: string }> = {};
      for (const m of p.comissoesMotoristas) {
        dm[m.motoristaId] = {
          valor: m.descontoComissao > 0 ? String(m.descontoComissao) : "",
          motivo: m.motivoDescontoComissao ?? "",
        };
      }
      setDescontosMotorista(dm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar preview");
    } finally {
      setLoading(false);
    }
  }, [carregamentoId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const df = parseMoneyBRL(descontoFrete) ?? 0;
      await financeiroApi.atualizarDescontos(carregamentoId, {
        descontoFreteCliente: df,
        motivoDescontoFrete: motivoFrete.trim() || undefined,
        motoristas: motoristas.map((m) => ({
          motoristaId: m.id,
          descontoComissao: parseMoneyBRL(descontosMotorista[m.id]?.valor ?? "") ?? 0,
          motivoDescontoComissao: descontosMotorista[m.id]?.motivo?.trim() || undefined,
        })),
      });
      await load();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar descontos");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = apurado || financeiroFechado;

  if (loading) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>Carregando ajustes financeiros…</p>
    );
  }

  if (!preview) return null;

  return (
    <section
      className={cn(
        "mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">Ajustes — descontos e abatimentos</h3>
        </div>
        {!readOnly && (
          <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={handleSave}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar ajustes"
            )}
          </Button>
        )}
      </div>

      {readOnly && (
        <p className="mb-3 text-xs text-muted-foreground">
          {financeiroFechado
            ? "Financeiro fechado — descontos bloqueados."
            : "Já apurado — descontos registrados nos lançamentos. Para alterar, cancele os lançamentos de abatimento/desconto no Financeiro."}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Abatimento frete (cliente)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="descontoFrete">Valor</Label>
              <MoneyInput
                id="descontoFrete"
                value={descontoFrete}
                onChange={(v) => setDescontoFrete(v)}
                disabled={readOnly}
                placeholder="0,00"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="motivoFrete">Motivo</Label>
              <Input
                id="motivoFrete"
                value={motivoFrete}
                onChange={(e) => setMotivoFrete(e.target.value)}
                disabled={readOnly}
                placeholder="Ex.: mortalidade 1 cabeça — valor R$ 555,55"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Frete bruto {fmtBRL(preview.valorFreteBruto)} → líquido{" "}
            <strong className="text-foreground">{fmtBRL(preview.valorFreteLiquido)}</strong>
          </p>
        </div>

        {motoristas.map((m) => {
          const cm = preview.comissoesMotoristas.find((x) => x.motoristaId === m.id);
          return (
            <div
              key={m.id}
              className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Desconto comissão — {m.nome}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Valor</Label>
                  <MoneyInput
                    value={descontosMotorista[m.id]?.valor ?? ""}
                    onChange={(v) =>
                      setDescontosMotorista((prev) => ({
                        ...prev,
                        [m.id]: { ...prev[m.id], valor: v, motivo: prev[m.id]?.motivo ?? "" },
                      }))
                    }
                    disabled={readOnly}
                    placeholder="0,00"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Motivo</Label>
                  <Input
                    value={descontosMotorista[m.id]?.motivo ?? ""}
                    onChange={(e) =>
                      setDescontosMotorista((prev) => ({
                        ...prev,
                        [m.id]: { valor: prev[m.id]?.valor ?? "", motivo: e.target.value },
                      }))
                    }
                    disabled={readOnly}
                    placeholder="Ex.: imperícia — mortalidade no trecho"
                  />
                </div>
              </div>
              {cm && (
                <p className="text-xs text-muted-foreground">
                  Comissão bruta {fmtBRL(cm.comissaoBruta)} → líquida{" "}
                  <strong className="text-foreground">{fmtBRL(cm.comissaoLiquida)}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm">
        <p className="font-medium text-emerald-900 dark:text-emerald-200">Preview da apuração</p>
        {(() => {
          const comp = montarComponentesResultado(preview, null);
          const resultado = comp ? calcularResultadoOperacional(comp) : null;
          return (
        <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <span>
            Cobrança cliente: <strong>{fmtBRL(preview.valorReceitaLiquida ?? preview.valorFreteLiquido)}</strong>
          </span>
          <span>
            Comissão lançada: <strong>{fmtBRL(preview.valorComissaoLiquida)}</strong>
          </span>
          <span>
            Desp. viagem: <strong>{fmtBRL(preview.custoDespesasViagem ?? 0)}</strong>
          </span>
          {(preview.custoVeiculoDireto ?? 0) > 0 && (
            <span>
              Custo veículo: <strong>{fmtBRL(preview.custoVeiculoDireto)}</strong>
            </span>
          )}
          <span className="sm:col-span-2 lg:col-span-3">
            <strong className="text-emerald-700">Resultado operacional: {fmtBRL(resultado)}</strong>
            {comp && (
              <span className="ml-2 font-mono text-muted-foreground">({formulaResultadoOperacional(comp)})</span>
            )}
          </span>
          <span>
            Ref. contratual: <span className="text-muted-foreground">{fmtBRL(preview.margemContratual ?? preview.margemLiquida)}</span>
            <span className="text-muted-foreground"> (sem despesas viagem nem veículo)</span>
          </span>
        </div>
          );
        })()}
      </div>
    </section>
  );
}
