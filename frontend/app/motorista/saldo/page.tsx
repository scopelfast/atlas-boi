"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, TrendingDown, TrendingUp, WifiOff } from "lucide-react";
import { motoristaApi, type MotoristaSaldo } from "@/services/api";
import { STATUS_VIAGEM, formatMoney } from "@/lib/motorista-portal";
import { registerMotoristaServiceWorker, subscribeMotoristaPush } from "@/lib/motorista-push";
import { flushOutboxDespesas, listOutboxDespesas, dataUrlToFile } from "@/lib/motorista-offline";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";

export default function MotoristaSaldoPage() {
  const [data, setData] = useState<MotoristaSaldo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    motoristaApi
      .saldo()
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
    registerMotoristaServiceWorker().catch(() => undefined);
    setPending(listOutboxDespesas().length);
  }, []);

  useEffect(() => {
    async function sync() {
      if (!navigator.onLine) return;
      const { ok, fail } = await flushOutboxDespesas(async (item) => {
        const foto =
          item.fotoDataUrl != null
            ? await dataUrlToFile(item.fotoDataUrl, item.fotoNome || "comprovante.jpg")
            : undefined;
        await motoristaApi.despesa({ ...item.payload, foto });
      });
      setPending(listOutboxDespesas().length);
      if (ok > 0) setSyncMsg(`${ok} despesa(s) sincronizada(s)${fail ? ` · ${fail} falhou` : ""}`);
    }
    window.addEventListener("online", sync);
    sync();
    return () => window.removeEventListener("online", sync);
  }, []);

  async function ativarPush() {
    setPushBusy(true);
    setPushMsg(null);
    setErro(null);
    try {
      await subscribeMotoristaPush(
        () => motoristaApi.pushVapidKey(),
        (body) => motoristaApi.pushSubscribe(body)
      );
      await motoristaApi.pushTest();
      setPushMsg("Notificações ativas. Você receberá avisos quando a viagem mudar de status.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ativar push");
    } finally {
      setPushBusy(false);
    }
  }

  const saldo = data?.saldo ?? 0;
  const positivo = saldo >= 0;
  const totais = data?.totais;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Conta corrente</h2>
        <p className="text-sm text-white/50">Saldo consolidado com a transportadora</p>
      </div>

      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}
      {pushMsg && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{pushMsg}</p>}
      {syncMsg && <p className="rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-300">{syncMsg}</p>}

      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <WifiOff className="h-4 w-4" />
          {pending} despesa(s) aguardando conexão para enviar
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/50 via-[#121212] to-black p-6">
        <p className="text-sm text-white/60">Saldo atual</p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-white">
          {loading ? "—" : formatMoney(saldo)}
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm">
          {positivo ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-amber-400" />
          )}
          <span className="text-white/60">
            {positivo ? "Empresa deve a você" : "Devolução / acerto pendente"}
          </span>
        </div>
      </div>

      {totais && (
        <div className="grid grid-cols-2 gap-2">
          <Tot label="Adiantamentos" value={totais.adiantamentos} />
          <Tot label="Comissões" value={totais.comissoes} />
          <Tot label="Despesas" value={totais.despesas} />
          <Tot label="Reembolsos" value={totais.reembolsos} />
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
        disabled={pushBusy}
        onClick={ativarPush}
      >
        <Bell className="mr-2 h-4 w-4" />
        {pushBusy ? "Ativando…" : "Ativar notificações de viagem"}
      </Button>

      {data && data.viagensAbertas.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Por viagem aberta</p>
          {data.viagensAbertas.map((v) => {
            const st = STATUS_VIAGEM[v.status]?.label ?? v.status;
            return (
              <Link
                key={v.id}
                href={`/motorista/viagens/${v.id}`}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-3 transition hover:border-emerald-500/30",
                  v.destaque ? "border-emerald-500/35 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {v.numero}
                    {v.destaque ? " · prioridade" : ""}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {st} · {v.origem} → {v.destino}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      v.financeira.saldoViagem >= 0 ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {formatMoney(v.financeira.saldoViagem)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <p className="text-xs leading-relaxed text-white/40">
        Frete e margem da empresa não entram neste saldo. Aqui só o que move a sua conta corrente.
      </p>
    </div>
  );
}

function Tot({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{formatMoney(value)}</p>
    </div>
  );
}
