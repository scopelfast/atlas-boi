"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Navigation, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motoristaApi, type MotoristaViagem } from "@/services/api";
import {
  STATUS_VIAGEM,
  formatDateTime,
  formatMoney,
  setViagemAtivaId,
} from "@/lib/motorista-portal";
import { cn } from "@/utils/cn";

export default function MotoristaViagensPage() {
  const [items, setItems] = useState<MotoristaViagem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    motoristaApi
      .viagens()
      .then((list) => {
        setItems(list);
        const destaque = list.find((v) => v.destaque) ?? list[0];
        if (destaque) setViagemAtivaId(destaque.id);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  const abertas = items.filter((v) => v.status !== "DESEMBARCADO");
  const multiplas = abertas.length > 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Minhas viagens</h2>
        <p className="text-sm text-white/50">
          {multiplas
            ? `${abertas.length} viagens abertas — a primeira é a prioridade`
            : "Embarques ativos vinculados a você"}
        </p>
      </div>

      {loading && <p className="text-sm text-white/50">Carregando…</p>}
      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}

      {!loading && items.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <Truck className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-3 font-medium text-white/70">Nenhuma viagem ativa</p>
          <p className="mt-1 text-sm text-white/40">Quando houver embarque, aparece aqui.</p>
        </div>
      )}

      {items.map((v) => {
        const st = STATUS_VIAGEM[v.status] ?? { label: v.status, tone: "bg-white/10 text-white/70" };
        const placas = v.veiculos.map((x) => x.veiculo.placa).join(" · ");
        return (
          <Link
            key={v.id}
            href={`/motorista/viagens/${v.id}`}
            onClick={() => setViagemAtivaId(v.id)}
            className={cn(
              "block overflow-hidden rounded-2xl border bg-gradient-to-br from-white/[0.06] to-transparent transition hover:border-emerald-500/30",
              v.destaque ? "border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]" : "border-white/10"
            )}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{v.numero}</span>
                {v.destaque && multiplas && (
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    Prioridade
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`border-0 ${st.tone}`}>{st.label}</Badge>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </div>
            </div>
            <div className="space-y-3 px-4 py-3 text-sm">
              <div className="flex items-start gap-2 text-white/85">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-medium">
                    {v.clienteOrigem.cidade}/{v.clienteOrigem.uf}
                    <span className="mx-1.5 text-white/35">→</span>
                    {v.clienteDestino.cidade}/{v.clienteDestino.uf}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {v.clienteOrigem.nome} → {v.clienteDestino.nome}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                <span>{formatDateTime(v.dataEmbarque)}</span>
                {v.km != null && <span>· {v.km} km</span>}
                <span>· {v.quantidadeAnimais} animais</span>
                {placas && <span>· {placas}</span>}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Navigation className="h-3.5 w-3.5" />
                  Saldo desta viagem
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    v.financeira.saldoViagem >= 0 ? "text-emerald-400" : "text-amber-400"
                  )}
                >
                  {formatMoney(v.financeira.saldoViagem)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
