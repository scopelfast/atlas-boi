"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motoristaApi, type MotoristaDespesa, type MotoristaViagem } from "@/services/api";
import {
  CATEGORIAS_DESPESA_MOTORISTA,
  FORMA_PAGAMENTO_MOTORISTA,
  TIPO_DESPESA_LABEL,
  getViagemAtivaId,
  setViagemAtivaId,
  type CategoriaDespesaMotorista,
} from "@/lib/motorista-portal";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/utils/cn";
import {
  enqueueDespesa,
  fileToDataUrl,
  flushOutboxDespesas,
  listOutboxDespesas,
  dataUrlToFile,
} from "@/lib/motorista-offline";

type Tab = "lista" | "nova";

export default function MotoristaDespesasPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Carregando…</p>}>
      <MotoristaDespesasContent />
    </Suspense>
  );
}

function MotoristaDespesasContent() {
  const searchParams = useSearchParams();
  const { confirm } = useConfirm();
  const viagemQuery = searchParams.get("viagem");
  const [tab, setTab] = useState<Tab>(viagemQuery ? "nova" : "lista");
  const [despesas, setDespesas] = useState<MotoristaDespesa[]>([]);
  const [viagens, setViagens] = useState<MotoristaViagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [carregamentoId, setCarregamentoId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesaMotorista>("COMBUSTIVEL");
  const [forma, setForma] = useState<"ADIANTAMENTO" | "DO_BOLSO">("ADIANTAMENTO");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [obs, setObs] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingOffline, setPendingOffline] = useState(0);

  const viagemSel = useMemo(
    () => viagens.find((v) => v.id === carregamentoId),
    [viagens, carregamentoId]
  );

  const pickViagemDefault = useCallback((list: MotoristaViagem[]) => {
    const fromQuery = viagemQuery && list.find((x) => x.id === viagemQuery);
    const fromStorage = getViagemAtivaId();
    const fromLs = fromStorage ? list.find((x) => x.id === fromStorage) : undefined;
    const destaque = list.find((x) => x.destaque);
    return fromQuery ?? fromLs ?? destaque ?? list[0];
  }, [viagemQuery]);

  const load = useCallback(async () => {
    setErro(null);
    try {
      const [d, v] = await Promise.all([motoristaApi.listarDespesas(), motoristaApi.viagens()]);
      setDespesas(Array.isArray(d) ? d : []);
      setViagens(v);
      const preferida = pickViagemDefault(v);
      if (preferida) {
        setCarregamentoId((prev) => prev || preferida.id);
        setVeiculoId((prev) => prev || preferida.veiculos[0]?.veiculo.id || "");
        setViagemAtivaId(preferida.id);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [pickViagemDefault]);

  useEffect(() => {
    load();
    setPendingOffline(listOutboxDespesas().length);
  }, [load]);

  useEffect(() => {
    if (viagemQuery) setTab("nova");
  }, [viagemQuery]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    async function syncOutbox() {
      if (!navigator.onLine) return;
      const { ok } = await flushOutboxDespesas(async (item) => {
        const f =
          item.fotoDataUrl != null
            ? await dataUrlToFile(item.fotoDataUrl, item.fotoNome || "comprovante.jpg")
            : undefined;
        await motoristaApi.despesa({ ...item.payload, foto: f });
      });
      setPendingOffline(listOutboxDespesas().length);
      if (ok > 0) await load();
    }
    window.addEventListener("online", syncOutbox);
    syncOutbox();
    return () => window.removeEventListener("online", syncOutbox);
  }, [load]);

  function resetForm() {
    setEditId(null);
    setValor("");
    setDescricao("");
    setObs("");
    setFoto(null);
    setCategoria("COMBUSTIVEL");
    setForma("ADIANTAMENTO");
  }

  function startEdit(d: MotoristaDespesa) {
    if (d.editavel === false) return;
    setEditId(d.id);
    setValor(String(d.valor));
    setDescricao(d.descricao);
    setObs(d.observacoes ?? "");
    setCarregamentoId(d.carregamento?.id ?? carregamentoId);
    setTab("nova");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!v || v <= 0) {
      setErro("Informe o valor");
      return;
    }
    if (!carregamentoId || !veiculoId) {
      setErro("Selecione a viagem e a placa");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      if (editId) {
        await motoristaApi.atualizarDespesa(editId, {
          valor: v,
          descricao: descricao.trim() || undefined,
          observacoes: obs.trim() || undefined,
        });
      } else if (!navigator.onLine) {
        const payload = {
          valor: v,
          descricao: descricao.trim() || undefined,
          observacoes: obs.trim() || undefined,
          carregamentoId,
          veiculoId,
          categoriaCusto: categoria,
          formaPagamento: forma,
        };
        let fotoDataUrl: string | undefined;
        let fotoNome: string | undefined;
        if (foto) {
          fotoDataUrl = await fileToDataUrl(foto);
          fotoNome = foto.name;
        }
        enqueueDespesa({ payload, fotoDataUrl, fotoNome });
        setPendingOffline(listOutboxDespesas().length);
        resetForm();
        setTab("lista");
        setErro(null);
        return;
      } else {
        await motoristaApi.despesa({
          valor: v,
          descricao: descricao.trim() || undefined,
          observacoes: obs.trim() || undefined,
          carregamentoId,
          veiculoId,
          categoriaCusto: categoria,
          formaPagamento: forma,
          foto: foto ?? undefined,
        });
      }
      resetForm();
      setTab("lista");
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: string) {
    const ok = await confirm({
      title: "Estornar despesa",
      description: "A despesa será marcada como estornada e sai da sua conta corrente desta viagem.",
      confirmLabel: "Estornar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await motoristaApi.excluirDespesa(id);
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Despesas</h2>
          <p className="text-sm text-white/50">Lançamentos da viagem com comprovante</p>
        </div>
      </div>

      <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["lista", "nova"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              if (t === "nova" && !editId) resetForm();
            }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              tab === t ? "bg-emerald-600 text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {t === "lista" ? "Minhas despesas" : editId ? "Editar" : "Nova despesa"}
          </button>
        ))}
      </div>

      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}

      {pendingOffline > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {pendingOffline} despesa(s) na fila offline — serão enviadas ao reconectar.
        </p>
      )}

      {tab === "lista" && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-white/50">Carregando…</p>}
          {!loading && despesas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 py-12 text-center">
              <Camera className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-white/70">Nenhuma despesa lançada</p>
              <p className="mx-auto mt-2 max-w-xs text-xs text-white/40">
                Aparecem aqui despesas e reembolsos do seu CC no financeiro web, além dos lançados neste app.
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => load()}>
                  Atualizar lista
                </Button>
                <Button variant="secondary" onClick={() => setTab("nova")}>
                  <Plus className="mr-2 h-4 w-4" /> Nova despesa
                </Button>
              </div>
            </div>
          )}
          {despesas.map((d) => (
            <article key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{d.descricao}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">
                    {d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  {TIPO_DESPESA_LABEL[d.tipo] ?? d.tipo}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-white/45">
                {new Date(d.dataLancamento).toLocaleDateString("pt-BR")}
                {d.carregamento?.numero ? ` · ${d.carregamento.numero}` : ""}
                {d.veiculo?.placa ? ` · ${d.veiculo.placa}` : ""}
                {d.comprovanteNome ? " · 📎 comprovante" : ""}
              </p>
              {d.observacoes && <p className="mt-1 text-sm text-white/55">{d.observacoes}</p>}
              {d.origem === "veiculo" && (
                <p className="mt-2 text-xs text-white/40">Lançado no financeiro (centro de custo veículo)</p>
              )}
              {d.editavel !== false && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => startEdit(d)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-red-400 hover:text-red-300"
                    onClick={() => excluir(d.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "nova" && (
        <form onSubmit={salvar} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <Label className="text-white/80">Viagem (embarque)</Label>
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
              value={carregamentoId}
              onChange={(e) => {
                const id = e.target.value;
                setCarregamentoId(id);
                setViagemAtivaId(id);
                const found = viagens.find((x) => x.id === id);
                setVeiculoId(found?.veiculos[0]?.veiculo.id ?? "");
              }}
              required
            >
              <option value="">Selecione…</option>
              {viagens.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.destaque ? "★ " : ""}
                  {v.numero} — {v.clienteOrigem.cidade} → {v.clienteDestino.cidade}
                </option>
              ))}
            </select>
          </div>

          {viagemSel && viagemSel.veiculos.length > 0 && (
            <div>
              <Label className="text-white/80">Placa (conjunto)</Label>
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
                value={veiculoId}
                onChange={(e) => setVeiculoId(e.target.value)}
                required
              >
                {viagemSel.veiculos.map((vv) => (
                  <option key={vv.veiculo.id} value={vv.veiculo.id}>
                    {vv.veiculo.placa}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-white/80">Categoria</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CATEGORIAS_DESPESA_MOTORISTA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoria(c.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                    categoria === c.id
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 text-white/60 hover:border-white/20"
                  )}
                >
                  <span className="mr-1">{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-white/80">Pagamento</Label>
            <div className="mt-2 space-y-2">
              {FORMA_PAGAMENTO_MOTORISTA.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForma(f.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    forma === f.id
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-white/45">{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="valor" className="text-white/80">
              Valor (R$)
            </Label>
            <Input
              id="valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 border-white/15 bg-black/40 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="desc" className="text-white/80">
              Descrição
            </Label>
            <Input
              id="desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Posto BR-153"
              className="mt-1 border-white/15 bg-black/40 text-white"
            />
          </div>
          <div>
            <Label htmlFor="obs" className="text-white/80">
              Observações
            </Label>
            <Input
              id="obs"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="mt-1 border-white/15 bg-black/40 text-white"
            />
          </div>
          {!editId && (
            <div>
              <Label htmlFor="foto" className="text-white/80">
                Foto do comprovante
              </Label>
              <Input
                id="foto"
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1 border-white/15 bg-black/40 text-white file:mr-3 file:rounded file:border-0 file:bg-emerald-700 file:px-3 file:py-1 file:text-white"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
            {saving ? "Salvando…" : editId ? "Salvar alterações" : "Registrar despesa"}
          </Button>
        </form>
      )}
    </div>
  );
}
