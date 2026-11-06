"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  Navigation,
  Plus,
  Receipt,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  motoristaApi,
  type MotoristaFotoCarga,
  type MotoristaPrestacaoContas,
  type MotoristaViagemDetalhe,
} from "@/services/api";
import {
  STATUS_VIAGEM,
  TIPO_DESPESA_LABEL,
  formatDateTime,
  formatMoney,
  setViagemAtivaId,
} from "@/lib/motorista-portal";
import { MotoristaRotaMap } from "@/components/motorista/motorista-rota-map";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/utils/cn";

const MOMENTOS = [
  { id: "EMBARQUE" as const, label: "Embarque" },
  { id: "TRANSITO" as const, label: "Na estrada" },
  { id: "DESCARGA" as const, label: "Descarga" },
  { id: "OUTROS" as const, label: "Outros" },
];

export default function MotoristaViagemDetalhePage() {
  const params = useParams();
  const { confirm } = useConfirm();
  const id = String(params.id ?? "");
  const [v, setV] = useState<MotoristaViagemDetalhe | null>(null);
  const [prestacao, setPrestacao] = useState<MotoristaPrestacaoContas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [momento, setMomento] = useState<(typeof MOMENTOS)[number]["id"]>("EMBARQUE");
  const [obsFoto, setObsFoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fechandoAcerto, setFechandoAcerto] = useState(false);
  const [avancando, setAvancando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [data, presc] = await Promise.all([
        motoristaApi.viagem(id),
        motoristaApi.prestacaoContas(id).catch(() => null),
      ]);
      setV(data);
      setPrestacao(presc);
      setViagemAtivaId(data.id);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function conferirAcerto() {
    if (!v || !prestacao?.podeFechar) return;
    const ok = await confirm({
      title: "Confirmar acerto da viagem",
      context: { label: "Viagem", value: v.numero },
      description:
        "Isso registra a conferência do acerto. O pagamento em dinheiro é feito pela transportadora no financeiro.",
      warning: `Saldo desta viagem: ${formatMoney(prestacao.saldoViagem)}`,
      confirmLabel: "Confirmar acerto",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    setFechandoAcerto(true);
    setErro(null);
    try {
      const updated = await motoristaApi.fecharPrestacaoContas(v.id);
      setPrestacao(updated);
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao conferir acerto");
    } finally {
      setFechandoAcerto(false);
    }
  }

  async function avancarEtapa() {
    if (!v?.etapa?.podeAvancar || !v.etapa.proximoLabel || !v.etapa.botao) return;
    const ok = await confirm({
      title: "Avançar etapa da viagem",
      context: { label: "Viagem", value: v.numero },
      transition: {
        from: v.etapa.atualLabel,
        to: v.etapa.proximoLabel,
      },
      description: v.etapa.dica ?? "Confirma que a operação realmente avançou?",
      confirmLabel: v.etapa.botao,
      cancelLabel: "Manter como está",
    });
    if (!ok) return;
    setAvancando(true);
    setErro(null);
    try {
      const updated = await motoristaApi.avancarStatus(v.id);
      setV(updated);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao avançar etapa");
    } finally {
      setAvancando(false);
    }
  }

  async function onPickFoto(file: File | null) {
    if (!file || !v) return;
    setUploading(true);
    setErro(null);
    try {
      await motoristaApi.enviarFotoCarga(v.id, {
        foto: file,
        momento,
        observacao: obsFoto.trim() || undefined,
      });
      setObsFoto("");
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return <p className="text-sm text-white/50">Carregando viagem…</p>;
  }
  if (erro && !v) {
    return (
      <div className="space-y-3">
        <Link href="/motorista/viagens" className="inline-flex items-center gap-1 text-sm text-emerald-400">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>
      </div>
    );
  }
  if (!v) return null;

  const st = STATUS_VIAGEM[v.status] ?? { label: v.status, tone: "bg-white/10 text-white/70" };
  const fin = prestacao ?? {
    saldoViagem: v.financeira.saldoViagem,
    adiantamentos: v.financeira.adiantamentos,
    comissoes: v.financeira.comissoes,
    despesas: v.financeira.despesas,
    reembolsos: v.financeira.reembolsos,
    jaFechado: false,
    podeFechar: false,
    mensagem: "",
    reembolsoDespesas: 0,
    devolucaoAdiantamento: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/motorista/viagens"
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Viagens
          </Link>
          <h2 className="text-xl font-bold text-white">{v.numero}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge className={`border-0 ${st.tone}`}>{st.label}</Badge>
            {v.principal && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                Motorista principal
              </span>
            )}
          </div>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}

      {v.etapa && (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Etapa da viagem
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{v.etapa.atualLabel}</p>
              {v.etapa.dica && (
                <p className="mt-1 text-xs leading-relaxed text-white/45">{v.etapa.dica}</p>
              )}
            </div>
            {!v.etapa.podeAvancar && (v.status === "DESEMBARCADO" || v.status === "FINALIZADO") && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {(["PLANEJADO", "EMBARCADO", "EM_TRANSITO", "DESEMBARCADO"] as const).map((s, i, arr) => {
              const order =
                v.status === "FINALIZADO"
                  ? arr.length - 1
                  : arr.indexOf(v.status as (typeof arr)[number]);
              const done = order >= 0 && i <= order;
              return (
                <div key={s} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      done ? "bg-emerald-500" : "bg-white/10"
                    )}
                  />
                </div>
              );
            })}
          </div>

          {v.etapa.podeAvancar && v.etapa.botao && (
            <Button
              type="button"
              className="h-12 w-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500"
              disabled={avancando}
              onClick={avancarEtapa}
            >
              {avancando ? "Atualizando…" : v.etapa.botao}
              {!avancando && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          )}
        </section>
      )}

      {/* Orientação GPS — abre o app Maps com rota passo a passo */}
      <section className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 to-black">
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Orientação no caminho</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                Abre o Google Maps com a rota do carregamento até a descarga — com voz e GPS no celular.
              </p>
            </div>
          </div>
          <a
            href={v.mapaRotaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(16,185,129,0.6)] active:scale-[0.99]"
          >
            <Navigation className="h-4 w-4" />
            Iniciar navegação
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <div className="flex gap-2">
            <a
              href={wazeUrl(v)}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/70 hover:bg-white/10"
            >
              Abrir no Waze
            </a>
            <a
              href={v.clienteDestino.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/70 hover:bg-white/10"
            >
              Só o destino
            </a>
          </div>

          {/* Resumo da rota — sempre útil, mesmo sem GPS no cadastro */}
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Roteiro</p>
            <p className="mt-1.5 text-sm font-medium text-white">
              {v.clienteOrigem.cidade}/{v.clienteOrigem.uf}
              <span className="mx-2 text-emerald-400">→</span>
              {v.clienteDestino.cidade}/{v.clienteDestino.uf}
            </p>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {v.clienteOrigem.nome} → {v.clienteDestino.nome}
            </p>
          </div>
        </div>
        {(v.clienteOrigem.latitude != null && v.clienteOrigem.longitude != null) ||
        (v.clienteDestino.latitude != null && v.clienteDestino.longitude != null) ? (
          <MotoristaRotaMap
            origem={v.clienteOrigem}
            destino={v.clienteDestino}
            className="border-t border-white/10"
          />
        ) : (
          <p className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-white/40">
            Prévia do mapa aparece quando origem e/ou destino tiverem GPS no cadastro do cliente.
            Use <span className="text-emerald-400/90">Iniciar navegação</span> — o Maps monta a rota
            pelas cidades ({v.clienteOrigem.cidade} → {v.clienteDestino.cidade}).
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <LocalBlock title="Carregamento" local={v.clienteOrigem} when={v.dataEmbarque} accent="emerald" />
        <div className="ml-3 border-l border-dashed border-white/15 py-1 pl-4 text-xs text-white/35">
          {v.kmReal ?? v.kmRota ?? v.km ?? "—"} km · {v.quantidadeAnimais} animais
        </div>
        <LocalBlock
          title="Descarga"
          local={v.clienteDestino}
          when={v.dataDesembarque ?? v.dataPrevisaoDesembarque}
          whenHint={!v.dataDesembarque && v.dataPrevisaoDesembarque ? "Previsão" : undefined}
          accent="amber"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Conjunto</p>
        <div className="flex flex-wrap gap-2">
          {v.veiculos.map((vv) => (
            <span
              key={vv.veiculo.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white"
            >
              <Truck className="h-3.5 w-3.5 text-emerald-400" />
              {vv.veiculo.placa}
            </span>
          ))}
        </div>
        {(v.numeroMinuta || v.numeroGta) && (
          <p className="mt-3 text-xs text-white/45">
            {v.numeroMinuta ? `Minuta ${v.numeroMinuta}` : ""}
            {v.numeroMinuta && v.numeroGta ? " · " : ""}
            {v.numeroGta ? `GTA ${v.numeroGta}${v.gtaUf ? `/${v.gtaUf}` : ""}` : ""}
          </p>
        )}
        {v.observacoes && <p className="mt-2 text-sm text-white/60">{v.observacoes}</p>}
      </section>

      {/* Fotos da carga */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-emerald-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Fotos da carga</p>
        </div>
        <p className="text-xs text-white/40">Registre animais / carga no embarque e na descarga.</p>

        <div className="flex flex-wrap gap-1.5">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMomento(m.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                momento === m.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <input
          value={obsFoto}
          onChange={(e) => setObsFoto(e.target.value)}
          placeholder="Observação (ex.: 340 cabeças)"
          className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {uploading ? "Enviando…" : "Tirar / enviar foto"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {(v.fotos ?? []).map((f) => (
            <FotoThumb key={f.id} viagemId={v.id} foto={f} />
          ))}
        </div>
        {(v.fotos ?? []).length === 0 && (
          <p className="py-4 text-center text-sm text-white/35">Nenhuma foto ainda</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-[#121212] to-black p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
            Prestação de contas
          </p>
          {fin.jaFechado ? (
            <Badge className="border-0 bg-emerald-500/20 text-emerald-300">Conferido</Badge>
          ) : (
            <Badge className="border-0 bg-amber-500/15 text-amber-300">Em aberto</Badge>
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-3xl font-bold tabular-nums",
            fin.saldoViagem >= 0 ? "text-white" : "text-amber-300"
          )}
        >
          {formatMoney(fin.saldoViagem)}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {fin.saldoViagem >= 0 ? "Empresa a pagar a você" : "Valor a devolver / abater"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <FinCell label="Adiantamento" value={fin.adiantamentos} />
          <FinCell label="Comissão" value={fin.comissoes} />
          <FinCell label="Despesas" value={fin.despesas} muted />
          <FinCell label="Reembolsos" value={fin.reembolsos} />
        </div>

        {prestacao && (prestacao.reembolsoDespesas > 0 || prestacao.devolucaoAdiantamento > 0) && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {prestacao.reembolsoDespesas > 0 && (
              <FinCell label="Reemb. despesas" value={prestacao.reembolsoDespesas} />
            )}
            {prestacao.devolucaoAdiantamento > 0 && (
              <FinCell label="Devol. adiant." value={prestacao.devolucaoAdiantamento} muted />
            )}
          </div>
        )}

        {prestacao?.mensagem && (
          <p className="mt-3 text-[11px] leading-relaxed text-white/40">{prestacao.mensagem}</p>
        )}

        {prestacao?.podeFechar && (
          <Button
            type="button"
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={fechandoAcerto}
            onClick={conferirAcerto}
          >
            {fechandoAcerto ? "Registrando…" : "Confirmar acerto desta viagem"}
          </Button>
        )}

        {fin.jaFechado && (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300/90">
            Acerto conferido. O pagamento / quitação em dinheiro é feito pela transportadora.
          </p>
        )}

        {!fin.jaFechado && !prestacao?.podeFechar && (
          <p className="mt-3 text-[11px] text-white/35">
            Assim que houver lançamentos (adiantamento, despesas ou comissão), você poderá confirmar o
            acerto aqui.
          </p>
        )}
      </section>

      <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
        <Link href={`/motorista/despesas?viagem=${v.id}`}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova despesa
        </Link>
      </Button>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Receipt className="h-3.5 w-3.5" /> Lançamentos desta viagem
        </p>
        {v.lancamentos.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-white/40">
            Ainda sem lançamentos no seu CC para esta viagem.
          </p>
        )}
        {v.lancamentos.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <div>
              <p className="text-sm text-white">{l.descricao}</p>
              <p className="text-[11px] text-white/40">
                {TIPO_DESPESA_LABEL[l.tipo] ?? l.tipo} · {formatDateTime(l.dataLancamento)}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-emerald-400">
              {formatMoney(l.valor)}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

/** Waze com navegação até o destino (lat/lng se houver, senão endereço). */
function wazeUrl(v: MotoristaViagemDetalhe) {
  const d = v.clienteDestino;
  if (d.latitude != null && d.longitude != null) {
    return `https://waze.com/ul?ll=${d.latitude},${d.longitude}&navigate=yes`;
  }
  const q = [d.endereco, d.cidade, d.uf, "Brasil"].filter(Boolean).join(", ");
  return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
}

function FotoThumb({ viagemId, foto }: { viagemId: string; foto: MotoristaFotoCarga }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    motoristaApi.fotoCargaBlob(viagemId, foto.id).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [viagemId, foto.id]);

  const label = MOMENTOS.find((m) => m.id === foto.momento)?.label ?? foto.momento;

  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="relative aspect-[4/3] bg-white/5">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={foto.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">…</div>
        )}
      </div>
      <figcaption className="space-y-0.5 px-2 py-1.5">
        <p className="text-[11px] font-medium text-emerald-400/90">{label}</p>
        <p className="truncate text-[10px] text-white/40">{formatDateTime(foto.createdAt)}</p>
        {foto.observacao && <p className="truncate text-[10px] text-white/55">{foto.observacao}</p>}
      </figcaption>
    </figure>
  );
}

function LocalBlock({
  title,
  local,
  when,
  whenHint,
  accent,
}: {
  title: string;
  local: MotoristaViagemDetalhe["clienteOrigem"];
  when?: string | null;
  whenHint?: string;
  accent: "emerald" | "amber";
}) {
  const pin = accent === "emerald" ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="flex gap-3">
      <MapPin className={cn("mt-0.5 h-4 w-4 shrink-0", pin)} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{title}</p>
        <p className="font-semibold text-white">{local.nome}</p>
        <p className="text-sm text-white/70">
          {local.cidade}/{local.uf}
          {local.endereco ? ` · ${local.endereco}` : ""}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {whenHint ? `${whenHint}: ` : ""}
          {formatDateTime(when)}
        </p>
        <a
          href={local.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          Abrir no mapa <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function FinCell({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="rounded-lg bg-black/35 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", muted ? "text-white/70" : "text-white")}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
