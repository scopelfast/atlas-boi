"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Info, Package, Paperclip, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { CrudFieldSection, CRUD_SELECT_CLASS } from "@/components/crud/crud-panels";
import { FinanceiroEntityPicker } from "@/components/financeiro/financeiro-entity-picker";
import {
  CATEGORIAS_CUSTO_VIAGEM,
  FIN_ENTIDADE,
  TIPO_LABEL,
  entityIdField,
  exigeCategoriaCusto,
  exigeVeiculoNoLancamento,
  isDespesaViagemMotorista,
  tipoAceitaComprovante,
  type CategoriaCustoOperacional,
  type FinanceiroEntidade,
  type FormaPagamentoDespesa,
} from "@/lib/financeiro-entities";
import {
  embarquePrecisaEscolherPlaca,
  embarqueSemVeiculo,
  opcoesPlacaEmbarque,
  placaPadraoEmbarque,
  resolverPlacaAoVincularEmbarque,
  rotuloPlacaEmbarque,
} from "@/lib/carregamento-veiculos";
import { rotuloCarregamento, resumoCarregamento } from "@/lib/format-carregamento";
import { cn } from "@/utils/cn";
import { financeiroApi, type Carregamento, type Cliente, type LancamentoTipo, type Motorista, type PrestacaoContasPreview, type Veiculo } from "@/services/api";
import { formatMoneyBRL } from "@/lib/documents";

export type LancamentoFormState = {
  entidade: FinanceiroEntidade | "";
  carregamentoId: string;
  tipo: LancamentoTipo;
  categoriaCusto: CategoriaCustoOperacional | "";
  formaPagamento: FormaPagamentoDespesa;
  valor: string;
  descricao: string;
  dataLancamento: string;
  motoristaId: string;
  clienteId: string;
  veiculoId: string;
  observacoes: string;
};

export function emptyLancamentoForm(): LancamentoFormState {
  return {
    entidade: "",
    carregamentoId: "",
    tipo: "ADIANTAMENTO",
    categoriaCusto: "",
    formaPagamento: "ADIANTAMENTO",
    valor: "",
    descricao: "",
    dataLancamento: new Date().toISOString().slice(0, 10),
    motoristaId: "",
    clienteId: "",
    veiculoId: "",
    observacoes: "",
  };
}

type Props = {
  form: LancamentoFormState;
  setForm: React.Dispatch<React.SetStateAction<LancamentoFormState>>;
  carregamentos: Carregamento[];
  motoristas: Motorista[];
  clientes: Cliente[];
  veiculos: Veiculo[];
  saving: boolean;
  comprovanteFile: File | null;
  onComprovanteChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
};

function FinanceiroTipoPicker({
  tipos,
  value,
  onChange,
}: {
  tipos: LancamentoTipo[];
  value: LancamentoTipo;
  onChange: (t: LancamentoTipo) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        tipos.length <= 4 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
      role="radiogroup"
      aria-label="Tipo de lançamento"
    >
      {tipos.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t)}
            className={cn(
              "rounded-lg border px-4 py-3 text-left text-sm leading-snug transition-all",
              active
                ? "border-emerald-500 bg-emerald-500/15 font-medium text-emerald-800 shadow-sm ring-1 ring-emerald-500/30 dark:text-emerald-200"
                : "border-border/80 bg-background text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5"
            )}
          >
            {TIPO_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}

/** Só motoristas vinculados ao embarque — nunca a frota toda. */
function motoristasDoEmbarque(c: Carregamento, cadastro: Motorista[]) {
  return (c.motoristas ?? []).map((row) => ({
    id: row.motoristaId,
    nome: row.motorista?.nome ?? cadastro.find((m) => m.id === row.motoristaId)?.nome ?? row.motoristaId,
    principal: row.principal,
  }));
}

/** Só origem/destino do embarque (quem pode receber cobrança nesta viagem). */
function clientesDoEmbarque(c: Carregamento, cadastro: Cliente[]) {
  const out: { id: string; nome: string; papel: string }[] = [];
  const push = (id: string | undefined, papel: string, nested?: { nome?: string } | null) => {
    if (!id || out.some((x) => x.id === id)) return;
    out.push({
      id,
      nome: nested?.nome ?? cadastro.find((x) => x.id === id)?.nome ?? id,
      papel,
    });
  };
  push(c.clienteOrigemId, "Origem (embarque)", c.clienteOrigem);
  push(c.clienteDestinoId, "Destino (cobrança usual)", c.clienteDestino);
  return out;
}

function aplicarEmbarque(
  c: Carregamento,
  entidade: FinanceiroEntidade,
  prev: LancamentoFormState
): Partial<LancamentoFormState> {
  const out: Partial<LancamentoFormState> = { carregamentoId: c.id };

  if (entidade === "motorista") {
    const m = c.motoristas?.find((x) => x.principal) ?? c.motoristas?.[0];
    out.motoristaId = m?.motoristaId ?? "";
  }
  if (entidade === "cliente") {
    out.clienteId = c.clienteDestinoId || c.clienteOrigemId || "";
  }
  const precisaPlaca =
    entidade === "veiculo" ||
    (entidade === "motorista" && exigeVeiculoNoLancamento(entidade, prev.tipo));
  if (precisaPlaca) {
    out.veiculoId = resolverPlacaAoVincularEmbarque(c);
  }

  return out;
}

function ResumoViagemMotorista({ preview }: { preview: PrestacaoContasPreview | null }) {
  if (!preview) return null;
  return (
    <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4 text-sm">
      <p className="font-semibold text-blue-900 dark:text-blue-200">Resumo da viagem (embarque #{preview.carregamentoNumero})</p>
      <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
        <span>Adiantamentos: <strong className="tabular-nums">{formatMoneyBRL(preview.adiantamentos)}</strong></span>
        <span>Despesas (adiant.): <strong className="tabular-nums">{formatMoneyBRL(preview.despesas)}</strong></span>
        <span>Reembolsos: <strong className="tabular-nums">{formatMoneyBRL(preview.reembolsos)}</strong></span>
        <span>Saldo viagem: <strong className={cn("tabular-nums", preview.saldoViagem >= 0 ? "text-emerald-600" : "text-red-600")}>{formatMoneyBRL(preview.saldoViagem)}</strong></span>
      </div>
      {preview.jaFechado && (
        <p className="mt-2 text-xs text-amber-600">Prestação de contas já fechada neste embarque.</p>
      )}
    </div>
  );
}

export function FinanceiroLancamentoForm({
  form,
  setForm,
  carregamentos,
  motoristas,
  clientes,
  veiculos,
  saving,
  comprovanteFile,
  onComprovanteChange,
  onSubmit,
}: Props) {
  const [previewViagem, setPreviewViagem] = useState<PrestacaoContasPreview | null>(null);

  const carregamentoSel = form.carregamentoId
    ? carregamentos.find((c) => c.id === form.carregamentoId)
    : undefined;

  const motoristasOpcoes = useMemo(
    () => (carregamentoSel ? motoristasDoEmbarque(carregamentoSel, motoristas) : []),
    [carregamentoSel, motoristas]
  );
  const clientesOpcoes = useMemo(
    () => (carregamentoSel ? clientesDoEmbarque(carregamentoSel, clientes) : []),
    [carregamentoSel, clientes]
  );
  const motoristaUnico = motoristasOpcoes.length === 1 ? motoristasOpcoes[0] : null;
  const clienteUnico = clientesOpcoes.length === 1 ? clientesOpcoes[0] : null;

  useEffect(() => {
    if (!form.carregamentoId || !form.motoristaId || form.entidade !== "motorista") {
      setPreviewViagem(null);
      return;
    }
    financeiroApi
      .previewPrestacaoContas(form.carregamentoId, form.motoristaId)
      .then(setPreviewViagem)
      .catch(() => setPreviewViagem(null));
  }, [form.carregamentoId, form.motoristaId, form.entidade]);

  // Embarque mudou → não deixar seleção de outro cliente/motorista “órfã”.
  useEffect(() => {
    if (!carregamentoSel) return;
    setForm((f) => {
      let next = f;
      if (f.entidade === "motorista" && f.motoristaId && !motoristasOpcoes.some((m) => m.id === f.motoristaId)) {
        const padrao = motoristasOpcoes.find((m) => m.principal) ?? motoristasOpcoes[0];
        next = { ...next, motoristaId: padrao?.id ?? "" };
      }
      if (f.entidade === "cliente" && f.clienteId && !clientesOpcoes.some((c) => c.id === f.clienteId)) {
        next = {
          ...next,
          clienteId:
            clientesOpcoes.find((c) => c.papel.startsWith("Destino"))?.id ?? clientesOpcoes[0]?.id ?? "",
        };
      }
      return next;
    });
  }, [carregamentoSel?.id, motoristasOpcoes, clientesOpcoes, setForm]);

  const escolherEntidade = (entidade: FinanceiroEntidade) => {
    const cfg = FIN_ENTIDADE[entidade];
    const c = form.carregamentoId ? carregamentos.find((x) => x.id === form.carregamentoId) : undefined;
    const base = {
      ...emptyLancamentoForm(),
      entidade,
      carregamentoId: form.carregamentoId,
      tipo: cfg.defaultTipo,
    };
    setForm(c ? { ...base, ...aplicarEmbarque(c, entidade, base) } : base);
    onComprovanteChange(null);
  };

  const onCarregamentoChange = (carregamentoId: string) => {
    const c = carregamentos.find((x) => x.id === carregamentoId);
    setForm((f) => {
      if (!c || !f.entidade) return { ...f, carregamentoId };
      return { ...f, carregamentoId, ...aplicarEmbarque(c, f.entidade, f) };
    });
  };

  const onTipoChange = (tipo: LancamentoTipo) => {
    setForm((f) => {
      const next = {
        ...f,
        tipo,
        categoriaCusto: "" as const,
        formaPagamento: "ADIANTAMENTO" as const,
      };
      if (f.carregamentoId && f.entidade) {
        const c = carregamentos.find((x) => x.id === f.carregamentoId);
        if (c && (f.entidade === "veiculo" || exigeVeiculoNoLancamento(f.entidade, tipo))) {
          next.veiculoId = resolverPlacaAoVincularEmbarque(c);
        }
      }
      return next;
    });
  };

  const mostraPlaca =
    form.entidade &&
    form.carregamentoId &&
    carregamentoSel &&
    (form.entidade === "veiculo" ||
      (form.entidade === "motorista" && exigeVeiculoNoLancamento(form.entidade, form.tipo)));

  const opcoesPlaca = carregamentoSel && mostraPlaca ? opcoesPlacaEmbarque(carregamentoSel) : [];
  const escolherPlaca = carregamentoSel ? embarquePrecisaEscolherPlaca(carregamentoSel) : false;
  const semVeiculoEmbarque = carregamentoSel ? embarqueSemVeiculo(carregamentoSel) : false;
  const placaUnica = opcoesPlaca.length === 1 ? opcoesPlaca[0] : null;

  useEffect(() => {
    if (!carregamentoSel || !mostraPlaca) return;
    const opcoes = opcoesPlacaEmbarque(carregamentoSel);
    if (opcoes.length === 1) {
      setForm((f) => (f.veiculoId === opcoes[0].id ? f : { ...f, veiculoId: opcoes[0].id }));
    } else if (opcoes.length > 1 && !opcoes.some((o) => o.id === form.veiculoId)) {
      const padrao = placaPadraoEmbarque(carregamentoSel);
      if (padrao) setForm((f) => ({ ...f, veiculoId: padrao }));
    }
  }, [carregamentoSel?.id, mostraPlaca, form.tipo]);

  const mostraCategoria =
    form.entidade && exigeCategoriaCusto(form.entidade, form.tipo);
  const mostraFormaPagamento =
    form.entidade === "motorista" && isDespesaViagemMotorista(form.tipo);

  return (
    <div className="w-full space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Contexto do lançamento</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Motorista (conta corrente + espelho no veículo) · Cliente (cobrança) · Veículo (custo direto, sem reembolso)
          </p>
        </div>
        <FinanceiroEntityPicker value={form.entidade} onChange={escolherEntidade} className="gap-4 lg:gap-5" />
      </section>

      {form.entidade && (
        <form onSubmit={onSubmit} className="grid gap-8 border-t border-border/60 pt-8 lg:grid-cols-12 lg:gap-10">
          <aside className="space-y-6 lg:col-span-4 lg:border-r lg:border-border/50 lg:pr-8">
            <div className="flex items-center gap-3">
              {(() => {
                const cfg = FIN_ENTIDADE[form.entidade];
                const Icon = cfg.icon;
                return (
                  <>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fin-carregamento" className="flex items-center gap-1.5 text-sm font-semibold">
                <Package className="h-4 w-4 text-emerald-600" />
                Embarque
                <span className="font-normal text-destructive">*</span>
              </Label>
              <select
                id="fin-carregamento"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.carregamentoId}
                onChange={(e) => onCarregamentoChange(e.target.value)}
                required
              >
                <option value="">Selecione o embarque…</option>
                {carregamentos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {rotuloCarregamento(c)}
                  </option>
                ))}
              </select>
            </div>

            {carregamentoSel && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm">
                <p className="font-mono font-semibold text-emerald-800 dark:text-emerald-200">
                  #{carregamentoSel.numero}
                </p>
                <p className="mt-1 text-muted-foreground">{resumoCarregamento(carregamentoSel)}</p>
              </div>
            )}

            {form.entidade === "motorista" && (
              <div>
                <Label htmlFor="fin-motorista">Motorista *</Label>
                {!form.carregamentoId ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Selecione o embarque — só aparecem motoristas dessa viagem.
                  </p>
                ) : motoristasOpcoes.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Este embarque não tem motorista vinculado. Cadastre no carregamento antes de lançar.
                  </p>
                ) : motoristaUnico ? (
                  <>
                    <input type="hidden" name="fin-motorista" value={motoristaUnico.id} />
                    <div
                      id="fin-motorista"
                      className="mt-1.5 flex h-10 items-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-sm font-medium"
                    >
                      {motoristaUnico.nome}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Único motorista deste embarque — preenchido automaticamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Só motoristas vinculados a este embarque.
                    </p>
                    <select
                      id="fin-motorista"
                      className={CRUD_SELECT_CLASS + " mt-1.5"}
                      value={form.motoristaId}
                      onChange={(e) => setForm((f) => ({ ...f, motoristaId: e.target.value }))}
                      required
                    >
                      <option value="">Selecione…</option>
                      {motoristasOpcoes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                          {m.principal ? " · principal" : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {form.entidade === "cliente" && (
              <div>
                <Label htmlFor="fin-cliente">Cliente *</Label>
                {!form.carregamentoId ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Selecione o embarque — só aparecem origem e destino dessa viagem.
                  </p>
                ) : clientesOpcoes.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Embarque sem cliente de origem/destino. Corrija o carregamento.
                  </p>
                ) : clienteUnico ? (
                  <>
                    <input type="hidden" name="fin-cliente" value={clienteUnico.id} />
                    <div
                      id="fin-cliente"
                      className="mt-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm font-medium"
                    >
                      {clienteUnico.nome}
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {clienteUnico.papel}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Só origem e destino deste embarque — não a lista inteira de clientes.
                    </p>
                    <select
                      id="fin-cliente"
                      className={CRUD_SELECT_CLASS + " mt-1.5"}
                      value={form.clienteId}
                      onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                      required
                    >
                      <option value="">Selecione…</option>
                      {clientesOpcoes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} — {c.papel}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {mostraPlaca && (
              <div>
                <Label htmlFor="fin-placa" className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Placa (centro de custo) *
                </Label>
                {semVeiculoEmbarque ? (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Este embarque não tem veículo vinculado — cadastre o conjunto no carregamento antes de lançar.
                  </p>
                ) : placaUnica ? (
                  <>
                    <input type="hidden" name="fin-placa" value={placaUnica.id} />
                    <div
                      id="fin-placa"
                      className="mt-1.5 flex h-10 items-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 font-mono text-sm font-medium"
                    >
                      {rotuloPlacaEmbarque(placaUnica)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Veículo único no embarque — preenchido automaticamente.
                    </p>
                  </>
                ) : escolherPlaca ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Só as placas deste embarque (cavalo + carreta). Escolha o centro de custo
                      (padrão: tracionador).
                    </p>
                    <select
                      id="fin-placa"
                      className={CRUD_SELECT_CLASS + " mt-1.5"}
                      value={form.veiculoId}
                      onChange={(e) => setForm((f) => ({ ...f, veiculoId: e.target.value }))}
                      required
                    >
                      <option value="">Selecione a placa…</option>
                      {opcoesPlaca.map((v) => (
                        <option key={v.id} value={v.id}>
                          {rotuloPlacaEmbarque(v)}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            )}

            {form.entidade === "veiculo" && !form.carregamentoId && (
              <p className="text-xs text-muted-foreground">
                Selecione um embarque para preencher motorista e placa automaticamente, ou escolha a placa acima.
              </p>
            )}

            {mostraFormaPagamento && previewViagem && (
              <ResumoViagemMotorista preview={previewViagem} />
            )}
          </aside>

          <div className="space-y-8 lg:col-span-8">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Tipo de lançamento</h3>
              </div>
              <FinanceiroTipoPicker
                tipos={FIN_ENTIDADE[form.entidade].tipos}
                value={form.tipo}
                onChange={onTipoChange}
              />
            </div>

            {mostraCategoria && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Categoria do custo *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CATEGORIAS_CUSTO_VIAGEM.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, categoriaCusto: cat.id }))}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                        form.categoriaCusto === cat.id
                          ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                          : "border-border/80 hover:border-emerald-500/40"
                      )}
                    >
                      <span className="font-medium">{cat.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{cat.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mostraFormaPagamento && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Como foi pago? *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, formaPagamento: "ADIANTAMENTO" }))}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm",
                      form.formaPagamento === "ADIANTAMENTO"
                        ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                        : "border-border/80"
                    )}
                  >
                    <span className="font-medium">Abatido do adiantamento</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Desconta da conta corrente do motorista (já recebeu o adiantamento).
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, formaPagamento: "DO_BOLSO" }))}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm",
                      form.formaPagamento === "DO_BOLSO"
                        ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                        : "border-border/80"
                    )}
                  >
                    <span className="font-medium">Pago do bolso (reembolso)</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Motorista pagou com dinheiro próprio — gera reembolso na CC.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {form.entidade === "motorista" && isDespesaViagemMotorista(form.tipo) && (
              <div className="flex gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>
                  Este valor entra na <strong>conta corrente do motorista</strong> e é espelhado no{" "}
                  <strong>centro de custo do veículo</strong> (DRE) — mesmo valor, duas visões contábeis.
                </p>
              </div>
            )}

            {form.entidade === "veiculo" && (
              <div className="flex gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>
                  Custo pago diretamente pela empresa — <strong>sem reembolso</strong> ao motorista. Só afeta o centro de custo do veículo.
                </p>
              </div>
            )}

            <CrudFieldSection title="Valor e data">
              <div>
                <Label htmlFor="fin-valor" className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Valor
                </Label>
                <MoneyInput id="fin-valor" value={form.valor} onChange={(v) => setForm((f) => ({ ...f, valor: v }))} className="h-10" />
              </div>
              <div>
                <Label htmlFor="fin-data" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Data
                </Label>
                <Input id="fin-data" type="date" className="mt-1.5 h-10" value={form.dataLancamento} onChange={(e) => setForm((f) => ({ ...f, dataLancamento: e.target.value }))} />
              </div>
            </CrudFieldSection>

            <CrudFieldSection title="Detalhes">
              <div className="sm:col-span-2">
                <Label htmlFor="fin-desc">Descrição *</Label>
                <Input
                  id="fin-desc"
                  className="mt-1.5 h-10"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder={FIN_ENTIDADE[form.entidade].descricaoPlaceholder}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="fin-obs">Observações</Label>
                <textarea
                  id="fin-obs"
                  rows={2}
                  className={cn(CRUD_SELECT_CLASS, "mt-1.5 min-h-[4rem] resize-y py-2.5")}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
              {tipoAceitaComprovante(form.tipo) && (
                <div className="sm:col-span-2">
                  <Label htmlFor="fin-comp" className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Comprovante (NF, cupom, foto)
                  </Label>
                  <Input
                    id="fin-comp"
                    type="file"
                    className="mt-1.5 h-10"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => onComprovanteChange(e.target.files?.[0] ?? null)}
                  />
                  {comprovanteFile && (
                    <p className="mt-1.5 text-xs text-emerald-600">{comprovanteFile.name}</p>
                  )}
                </div>
              )}
            </CrudFieldSection>

            <div className="flex justify-end border-t border-border/60 pt-6">
              <Button type="submit" disabled={saving} className="min-w-[12rem]">
                {saving ? "Salvando…" : "Registrar lançamento"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
