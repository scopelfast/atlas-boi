"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type {
  CarregamentosDetailTab,
  CarregamentosDetailPanelsProps,
} from "@/components/carregamentos/carregamentos-detail-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Plus,
  Search,
  FileUp,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Route,
} from "lucide-react";
import { CrudPageLayout } from "@/components/crud/crud-page-layout";
import {
  CrudFilterPanel,
  CrudListPanel,
  CrudRowActions,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import {
  carregamentosApi,
  financeiroApi,
  clientesApi,
  rotasApi,
  motoristasApi,
  veiculosApi,
  type Carregamento,
  type CarregamentoEvento,
  type CarregamentoInput,
  type CarregamentoStatus,
  type Cliente,
  type Rota,
  type Motorista,
  type Veiculo,
  type CarregamentoNotaFiscal,
  type NotaFiscalPapel,
  type NfeImportPreview,
} from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";
import { formatMoneyBRL, parseMoneyBRL } from "@/lib/documents";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageLoadingOverlay } from "@/components/ui/page-loading-overlay";
import type { FinanceiroResumo } from "@/components/carregamentos/carregamento-financeiro-resumo";
import { CarregamentosPendenciasResumo } from "@/components/carregamentos/carregamento-pendencias-alert";
import {
  CARREGAMENTO_TABS,
  TABS_COM_CADASTROS,
  STATUS_COLOR,
  STATUS_LABEL,
  avisoGtaStatus,
  carregamentoContext,
  emptyFilters,
  emptyForm,
  financasFromCarregamento,
  fmtBRL,
  freteExibir,
  margemExibir,
  proximoStatus,
  statusAnterior,
} from "@/components/carregamentos/carregamentos-shared";
import {
  carregamentoOperacaoPendencias,
  isCarregamentoOperacaoIncompleta,
  kmRotaSincronizadoComRota,
  pendenciasFromCarregamento,
} from "@/lib/carregamento-pendencias";

const CarregamentosDetailPanel = dynamic(
  () =>
    import("@/components/carregamentos/carregamentos-detail-panels").then((m) => ({
      default: m.CarregamentosDetailPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando painel…</p>
      </div>
    ),
  }
);

function renderDetailPanel(
  detailTab: CarregamentosDetailTab,
  activeTab: string,
  props: Omit<CarregamentosDetailPanelsProps, "tab">
) {
  if (activeTab !== detailTab) return null;
  return <CarregamentosDetailPanel {...props} tab={detailTab} />;
}

export default function CarregamentosView() {
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const openedFromUrl = useRef<string | null>(null);
  const { user } = useAuth();
  const { tab, setTab, error, setError, editing, setEditing, startNew, startEdit, cancelForm, afterSave, applyFilters } =
    useCrudPage();
  const [items, setItems] = useState<{ items: Carregamento[]; total: number }>({ items: [], total: 0 });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refsLoading, setRefsLoading] = useState(false);
  const refsLoadedRef = useRef(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [form, setForm] = useState(emptyForm);
  const [nfeMeta, setNfeMeta] = useState<Partial<CarregamentoInput>>({});
  const [notasFiscais, setNotasFiscais] = useState<CarregamentoNotaFiscal[]>([]);
  const [pendingNfeParsed, setPendingNfeParsed] = useState<NfeImportPreview["parsed"] | null>(null);
  const [removingNotaId, setRemovingNotaId] = useState<string | null>(null);
  const [updatingPapelId, setUpdatingPapelId] = useState<string | null>(null);
  const [hasMinutaFoto, setHasMinutaFoto] = useState(false);
  const [minutaFotoNome, setMinutaFotoNome] = useState<string | null>(null);
  const [pendingMinutaFile, setPendingMinutaFile] = useState<File | null>(null);
  const [eventos, setEventos] = useState<CarregamentoEvento[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [importingNfe, setImportingNfe] = useState(false);
  const [pendingNfeXml, setPendingNfeXml] = useState<string | null>(null);
  const [nfeClientesParaCadastrar, setNfeClientesParaCadastrar] = useState<
    NfeImportPreview["clientesParaCadastrar"] | null
  >(null);
  const [cadastrandoClientesNfe, setCadastrandoClientesNfe] = useState(false);
  const [financas, setFinancas] = useState<FinanceiroResumo | null>(null);
  const [editingNumero, setEditingNumero] = useState<string | null>(null);
  const [editingStatusOriginal, setEditingStatusOriginal] = useState<CarregamentoStatus | null>(null);
  const [nfeAutoFilled, setNfeAutoFilled] = useState<{
    quantidade?: boolean;
    valorCarga?: boolean;
    gta?: boolean;
  }>({});
  const [rotaPreenchida, setRotaPreenchida] = useState(false);
  const [nfeRotaCriada, setNfeRotaCriada] = useState<{ codigo: string; descricao: string } | null>(
    null
  );
  const [kmSincronizadoRota, setKmSincronizadoRota] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveRota = (rotaId?: string, rotaEmbed?: Carregamento["rota"]) =>
    (rotaId ? rotas.find((r) => r.id === rotaId) : undefined) ?? rotaEmbed ?? null;

  const loadRefs = useCallback(async () => {
    if (refsLoadedRef.current) return;
    refsLoadedRef.current = true;
    setRefsLoading(true);
    try {
      const [c, r, m, v] = await Promise.all([
        clientesApi.list({ limit: 200 }),
        rotasApi.list({ limit: 100 }),
        motoristasApi.list({ limit: 100 }),
        veiculosApi.list({ limit: 100 }),
      ]);
      setClientes(c.items);
      setRotas(r.items);
      setMotoristas(m.items);
      setVeiculos(v.items);
    } catch (e) {
      refsLoadedRef.current = false;
      setError(e instanceof Error ? e.message : "Erro ao carregar cadastros");
    } finally {
      setRefsLoading(false);
    }
  }, [setError]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await carregamentosApi.list({ limit: 50 });
      setItems({ items: list.items, total: list.total });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    if (user?.companyId) void load();
  }, [user?.companyId, load]);

  useEffect(() => {
    if (!user?.companyId) return;
    if (editing || TABS_COM_CADASTROS.has(tab)) {
      void loadRefs();
    }
  }, [tab, editing, user?.companyId, loadRefs]);

  const loadEventos = async (id: string) => {
    setEventosLoading(true);
    try {
      setEventos(await carregamentosApi.eventos(id));
    } catch {
      setEventos([]);
    } finally {
      setEventosLoading(false);
    }
  };

  useEffect(() => {
    if (editing) loadEventos(editing);
    else setEventos([]);
  }, [editing]);

  useEffect(() => {
    if (!editing || !form.rotaId) return;
    if (Number(String(form.kmRota).replace(",", ".")) > 0) return;
    const rota = resolveRota(form.rotaId);
    if (!rota || Number(rota.distanciaKm) <= 0) return;
    setForm((f) => ({ ...f, kmRota: String(rota.distanciaKm) }));
    setKmSincronizadoRota(true);
  }, [editing, form.rotaId, rotas]);

  const filteredItems = useMemo(() => {
    const q = appliedFilters.search.trim().toLowerCase();
    return items.items.filter((c) => {
      if (appliedFilters.status && c.status !== appliedFilters.status) return false;
      if (!q) return true;
      const motorista = c.motoristas?.[0]?.motorista?.nome?.toLowerCase() ?? "";
      const placa = c.veiculos?.[0]?.veiculo?.placa?.toLowerCase() ?? "";
      return (
        c.numero.toLowerCase().includes(q) ||
        (c.numeroMinuta?.toLowerCase().includes(q) ?? false) ||
        (c.clienteOrigem?.cidade?.toLowerCase().includes(q) ?? false) ||
        (c.clienteDestino?.cidade?.toLowerCase().includes(q) ?? false) ||
        motorista.includes(q) ||
        placa.includes(q)
      );
    });
  }, [items.items, appliedFilters]);

  const rotaSelecionada = useMemo(
    () => (form.rotaId ? rotas.find((r) => r.id === form.rotaId) : undefined),
    [form.rotaId, rotas]
  );

  const pendenciasForm = useMemo(
    () =>
      carregamentoOperacaoPendencias({
        status: form.status,
        motoristaId: form.motoristaId,
        veiculoTracionadorId: form.veiculoTracionadorId,
        kmRota: form.kmRota,
        rota: rotaSelecionada ?? null,
      }),
    [form.status, form.motoristaId, form.veiculoTracionadorId, form.kmRota, rotaSelecionada]
  );

  const listaPendencias = useMemo(
    () =>
      filteredItems.map((c) => ({
        numero: c.numero,
        pendencias: pendenciasFromCarregamento(c, rotas),
      })),
    [filteredItems, rotas]
  );

  const resumoOperacao = useMemo(() => {
    const base = items.items.filter((c) => c.status !== "CANCELADO");
    const ativos = base.filter((c) => !["FINALIZADO", "RASCUNHO"].includes(c.status));
    const emTransito = base.filter((c) => ["EMBARCADO", "EM_TRANSITO"].includes(c.status));
    const incompletos = base.filter((c) => pendenciasFromCarregamento(c, rotas).length > 0);
    const resultadoSoma = base.reduce((s, c) => {
      const m = Number(margemExibir(c) ?? 0);
      return Number.isNaN(m) ? s : s + m;
    }, 0);
    return { total: base.length, ativos: ativos.length, emTransito: emTransito.length, incompletos: incompletos.length, resultadoSoma };
  }, [items.items, rotas]);

  const motoristasFinancas = useMemo(
    () =>
      form.motoristaId
        ? [
            {
              id: form.motoristaId,
              nome: motoristas.find((m) => m.id === form.motoristaId)?.nome ?? "Motorista",
            },
          ]
        : [],
    [form.motoristaId, motoristas]
  );

  const onRotaChange = (rotaId: string) => {
    setForm((f) => {
      const rota = rotas.find((r) => r.id === rotaId);
      return {
        ...f,
        rotaId,
        kmRota: rota ? String(rota.distanciaKm) : f.kmRota,
        clienteOrigemId: rota?.clienteOrigemId || f.clienteOrigemId,
        clienteDestinoId: rota?.clienteDestinoId || f.clienteDestinoId,
      };
    });
    setRotaPreenchida(!!rotaId && !!rotas.find((r) => r.id === rotaId)?.clienteOrigemId);
    setKmSincronizadoRota(false);
  };

  const buildPayload = (): CarregamentoInput => ({
    clienteOrigemId: form.clienteOrigemId,
    clienteDestinoId: form.clienteDestinoId,
    rotaId: form.rotaId || undefined,
    status: form.status,
    quantidadeAnimais: Number(form.quantidadeAnimais),
    kmRota: form.kmRota ? Number(form.kmRota.replace(",", ".")) : undefined,
    valorCarga: parseMoneyBRL(form.valorCarga),
    dataEmbarque: form.dataEmbarque || undefined,
    dataPrevisaoDesembarque: form.dataPrevisaoDesembarque || undefined,
    observacoes: form.observacoes || undefined,
    numeroMinuta: form.numeroMinuta.trim() || undefined,
    numeroGta: form.numeroGta.trim() || undefined,
    gtaUf: form.gtaUf.trim() || undefined,
    motoristas: form.motoristaId ? [{ motoristaId: form.motoristaId, principal: true }] : [],
    veiculos: [
      ...(form.veiculoTracionadorId
        ? [{ veiculoId: form.veiculoTracionadorId, principal: true }]
        : []),
      ...(form.veiculoImplementoId
        ? [{ veiculoId: form.veiculoImplementoId, principal: false }]
        : []),
    ],
    ...nfeMeta,
  });

  const resetForm = () => {
    setForm(emptyForm);
    setNfeMeta({});
    setNotasFiscais([]);
    setRemovingNotaId(null);
    setPendingMinutaFile(null);
    setHasMinutaFoto(false);
    setMinutaFotoNome(null);
    setPendingNfeParsed(null);
    setPendingNfeXml(null);
    setNfeClientesParaCadastrar(null);
    setEventos([]);
    setEditingNumero(null);
    setEditingStatusOriginal(null);
    setNfeAutoFilled({});
    setRotaPreenchida(false);
    setNfeRotaCriada(null);
    setKmSincronizadoRota(false);
    setFinancas(null);
  };

  const syncFromCarregamento = (c: Carregamento) => {
    setFinancas(financasFromCarregamento(c));
    setNotasFiscais(c.notasFiscais ?? []);
  };

  const refreshEditingCarregamento = useCallback(async () => {
    if (!editing) return null;
    const full = await carregamentosApi.get(editing);
    syncFromCarregamento(full);
    return full;
  }, [editing]);

  const handleFinanceiroChange = useCallback(async () => {
    await refreshEditingCarregamento();
  }, [refreshEditingCarregamento]);

  useEffect(() => {
    if (!editing) return;
    if (tab === "notas" || tab === "resultado") {
      void refreshEditingCarregamento().catch(() => undefined);
    }
  }, [editing, tab, refreshEditingCarregamento]);

  const applyCarregamentoTotals = (c: Carregamento) => {
    setForm((f) => ({
      ...f,
      quantidadeAnimais: String(c.quantidadeAnimais),
      valorCarga: c.valorCarga ? formatMoneyBRL(c.valorCarga) : "",
    }));
    syncFromCarregamento(c);
  };

  const applyNfePreviewToForm = (
    preview: NfeImportPreview,
    mergeExisting = false,
    rotasList?: Rota[]
  ) => {
    const s = preview.sugestao;
    const rotasRef = rotasList ?? rotas;
    const rotaId = s.rotaId ?? preview.rotaSugerida?.id;
    const rota = rotaId ? rotasRef.find((r) => r.id === rotaId) : undefined;

    setForm((current) => {
      const base = mergeExisting ? current : { ...emptyForm, status: "RASCUNHO" as CarregamentoStatus };
      return {
        ...base,
        clienteOrigemId: s.clienteOrigemId || base.clienteOrigemId,
        clienteDestinoId: s.clienteDestinoId || base.clienteDestinoId,
        rotaId: rotaId || base.rotaId,
        quantidadeAnimais: s.quantidadeAnimais
          ? String(s.quantidadeAnimais)
          : base.quantidadeAnimais || "1",
        kmRota: kmRotaSincronizadoComRota(base.kmRota, rota),
        valorCarga: s.valorCarga != null ? formatMoneyBRL(s.valorCarga) : base.valorCarga,
        dataEmbarque: s.dataEmbarque || base.dataEmbarque,
        observacoes: s.observacoes || base.observacoes,
        numeroGta: s.numeroGta || base.numeroGta,
        gtaUf: s.gtaUf || base.gtaUf,
      };
    });

    setPendingNfeParsed(preview.parsed);
    setNfeMeta({
      nfeChave: preview.parsed.chave ?? undefined,
      nfeNumero: preview.parsed.numero ?? undefined,
      nfeSerie: preview.parsed.serie ?? undefined,
      nfeValor: preview.parsed.valorTotal ?? undefined,
      nfeEmitenteCnpj: preview.parsed.emitenteCnpj ?? undefined,
      nfeDestinatarioCnpj: preview.parsed.destinatarioCnpj ?? undefined,
      nfeXmlHash: preview.parsed.xmlHash,
      nfeProdutoDescricao: preview.parsed.produtoDescricao ?? undefined,
      nfeDataEmissao: preview.parsed.dataEmissao ?? undefined,
    });
    setNfeAutoFilled({
      quantidade: !!s.quantidadeAnimais,
      valorCarga: s.valorCarga != null,
      gta: !!(s.numeroGta || preview.parsed.numeroGta),
    });
    setRotaPreenchida(!!rotaId);
    setKmSincronizadoRota(false);
    setNfeRotaCriada(
      preview.rotaCriada && preview.rotaSugerida
        ? { codigo: preview.rotaSugerida.codigo, descricao: preview.rotaSugerida.descricao }
        : null
    );
    setNfeClientesParaCadastrar(preview.clientesParaCadastrar);
  };

  const handleCadastrarClientesNfe = async (opts: {
    cadastrarOrigem: boolean;
    cadastrarDestino: boolean;
  }) => {
    if (!pendingNfeXml) return;
    setError(null);
    setCadastrandoClientesNfe(true);
    try {
      const preview = await carregamentosApi.cadastrarClientesNfe({
        xml: pendingNfeXml,
        cadastrarOrigem: opts.cadastrarOrigem,
        cadastrarDestino: opts.cadastrarDestino,
      });
      const [clientesRes, rotasRes] = await Promise.all([
        clientesApi.list({ limit: 200 }),
        rotasApi.list({ limit: 100 }),
      ]);
      setClientes(clientesRes.items);
      setRotas(rotasRes.items);
      refsLoadedRef.current = true;
      if (!editing) {
        applyNfePreviewToForm(preview, true, rotasRes.items);
      } else {
        setNfeClientesParaCadastrar(preview.clientesParaCadastrar);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar clientes");
    } finally {
      setCadastrandoClientesNfe(false);
    }
  };

  const handleRemoveNota = async (notaId: string) => {
    if (!editing) return;
    const nota = notasFiscais.find((n) => n.id === notaId);
    const ok = await confirm({
      title: "Remover NF-e",
      context: editingNumero ? { label: "Minuta", value: editingNumero } : undefined,
      description: nota
        ? `Remover a NF ${nota.numero}${nota.serie ? `/${nota.serie}` : ""} deste carregamento? Os totais serão recalculados.`
        : "Remover esta NF-e do carregamento?",
      confirmLabel: "Remover NF-e",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    setRemovingNotaId(notaId);
    try {
      const updated = await carregamentosApi.removeNotaFiscal(editing, notaId);
      applyCarregamentoTotals(updated);
      await loadEventos(editing);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover NF-e");
    } finally {
      setRemovingNotaId(null);
    }
  };

  const handleUpdateNotaPapel = async (notaId: string, papel: NotaFiscalPapel) => {
    if (!editing) return;
    setError(null);
    setUpdatingPapelId(notaId);
    try {
      const updated = await carregamentosApi.updateNotaPapel(editing, notaId, papel);
      applyCarregamentoTotals(updated);
      await loadEventos(editing);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar papel da NF-e");
    } finally {
      setUpdatingPapelId(null);
    }
  };

  const handleImportNfe = async (file: File) => {
    setError(null);
    setImportingNfe(true);
    const xmlText = await file.text();
    try {
      if (editing) {
        const result = await carregamentosApi.addNotaFiscal(editing, file);
        applyCarregamentoTotals(result.carregamento);
        setPendingNfeXml(xmlText);
        setNfeClientesParaCadastrar(result.clientesParaCadastrar);
        setNfeAutoFilled({ quantidade: true, valorCarga: true });
        await loadEventos(editing);
        await load();
        setTab("notas");
        return;
      }

      const preview = await carregamentosApi.importNfe(file);
      if (preview.duplicateCarregamento) {
        throw new Error(`NF-e já importada no carregamento ${preview.duplicateCarregamento.numero}`);
      }
      let rotasRef = rotas;
      if (preview.rotaCriada) {
        const rotasRes = await rotasApi.list({ limit: 100 });
        setRotas(rotasRes.items);
        rotasRef = rotasRes.items;
      }
      setPendingNfeXml(xmlText);
      setEditing(null);
      setEditingNumero(null);
      setEditingStatusOriginal(null);
      setNotasFiscais([]);
      applyNfePreviewToForm(preview, false, rotasRef);
      setError(null);
      setTab("notas");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao importar NF-e";
      setError(msg);
      if (editing && /j[aá] est[aá] vinculada|already/i.test(msg)) {
        try {
          await refreshEditingCarregamento();
        } catch {
          /* ignore refresh failure */
        }
      }
    } finally {
      setImportingNfe(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editing && editingStatusOriginal && form.status !== editingStatusOriginal) {
      if (form.status === "FINALIZADO") {
        try {
          const chk = await financeiroApi.checklistFechamento(editing);
          if (!chk.financeiroFechadoAt) {
            setError(
              chk.pendencias.length
                ? `Financeiro pendente: ${chk.pendencias.join(" · ")}`
                : 'Encerre o financeiro na aba Resultado financeiro (botão "Encerrar financeiro") antes de finalizar.'
            );
            return;
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao validar financeiro");
          return;
        }
      }

      const warning = avisoGtaStatus(form.status, !!form.numeroGta.trim());
      const ok = await confirm({
        title: "Alterar status do carregamento",
        context: editingNumero
          ? carregamentoContext({
              numero: editingNumero,
              numeroMinuta: form.numeroMinuta || undefined,
            })
          : undefined,
        transition: {
          from: STATUS_LABEL[editingStatusOriginal],
          to: STATUS_LABEL[form.status],
        },
        warning,
        description: warning
          ? "Confirme somente se a etapa operacional corresponde à realidade."
          : "Confirma a alteração de status? Verifique se a etapa operacional corresponde à realidade.",
        confirmLabel: `Alterar para ${STATUS_LABEL[form.status]}`,
        cancelLabel: "Manter status atual",
      });
      if (!ok) return;
    }

    try {
      const data = buildPayload();
      if (editing) {
        const updated = (await carregamentosApi.update(editing, data)) as Carregamento;
        setFinancas(financasFromCarregamento(updated));
        await loadEventos(editing);
      } else {
        const created = await carregamentosApi.create(data) as Carregamento;
        if (pendingMinutaFile) {
          await carregamentosApi.uploadMinutaFoto(created.id, pendingMinutaFile);
          setPendingMinutaFile(null);
        }
      }
      await load();
      afterSave(resetForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const populateFormFromCarregamento = (c: Carregamento) => {
    const rota = resolveRota(c.rotaId, c.rota);
    const km = kmRotaSincronizadoComRota(c.kmRota, rota);
    setEditingNumero(c.numero);
    setEditingStatusOriginal(c.status);
    setNfeAutoFilled({});
    setRotaPreenchida(!!c.rotaId);
    setKmSincronizadoRota(Number(c.kmRota ?? 0) <= 0 && Number(rota?.distanciaKm ?? 0) > 0);
    setNfeMeta({});
    syncFromCarregamento(c);
    setHasMinutaFoto(!!c.minutaFotoPath);
    setMinutaFotoNome(c.minutaFotoNome ?? null);
    setPendingMinutaFile(null);
    setForm({
      clienteOrigemId: c.clienteOrigemId,
      clienteDestinoId: c.clienteDestinoId,
      rotaId: c.rotaId || "",
      status: c.status,
      quantidadeAnimais: String(c.quantidadeAnimais),
      kmRota: km,
      valorCarga: c.valorCarga ? formatMoneyBRL(c.valorCarga) : "",
      dataEmbarque: c.dataEmbarque ? c.dataEmbarque.slice(0, 10) : "",
      dataPrevisaoDesembarque: c.dataPrevisaoDesembarque ? c.dataPrevisaoDesembarque.slice(0, 10) : "",
      motoristaId: c.motoristas?.[0]?.motoristaId || "",
      veiculoTracionadorId: (() => {
        const vs = c.veiculos ?? [];
        const trac =
          vs.find((v) => v.principal && v.veiculo.tipo !== "CARRETA" && v.veiculo.tipo !== "JULIETA") ??
          vs.find((v) => v.veiculo.tipo === "CAMINHAO" || v.veiculo.tipo === "TOCO") ??
          vs.find((v) => v.principal) ??
          vs[0];
        return trac?.veiculoId || "";
      })(),
      veiculoImplementoId: (() => {
        const imp = c.veiculos?.find(
          (v) => v.veiculo.tipo === "CARRETA" || v.veiculo.tipo === "JULIETA"
        );
        return imp?.veiculoId || "";
      })(),
      observacoes: c.observacoes || "",
      numeroMinuta: c.numeroMinuta || "",
      numeroGta: c.numeroGta || "",
      gtaUf: c.gtaUf || "",
    });
  };

  const handleEdit = async (c: Carregamento) => {
    setError(null);
    try {
      const full = await carregamentosApi.get(c.id);
      startEdit(full.id, () => populateFormFromCarregamento(full));
      setTab("programacao");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir carregamento");
    }
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || !user?.companyId) return;
    if (openedFromUrl.current === id || editing === id) return;

    const open = (c: Carregamento) => {
      openedFromUrl.current = id;
      void handleEdit(c);
    };

    if (!loading) {
      carregamentosApi
        .get(id)
        .then(open)
        .catch(() => setError("Carregamento não encontrado."));
    }
  }, [user?.companyId, searchParams, loading, editing]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Cancelar carregamento",
      description: "O carregamento será marcado como cancelado. Esta ação não pode ser desfeita.",
      confirmLabel: "Cancelar carregamento",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await carregamentosApi.remove(id);
      if (editing === id) cancelForm(resetForm);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const avancarStatus = async (c: Carregamento) => {
    const proximo = proximoStatus(c.status);
    if (!proximo) return;

    const warning = avisoGtaStatus(proximo, !!c.numeroGta?.trim());
    let fechamentoWarning: string | undefined;

    if (proximo === "FINALIZADO" && !c.financeiroFechadoAt) {
      try {
        const chk = await financeiroApi.checklistFechamento(c.id);
        if (!chk.financeiroFechadoAt) {
          fechamentoWarning =
            chk.pendencias.length > 0
              ? `Financeiro pendente: ${chk.pendencias.join(" · ")}. Encerre o financeiro na aba Resultado financeiro antes de finalizar.`
              : 'Encerre o financeiro na aba Resultado financeiro (botão "Encerrar financeiro") antes de finalizar.';
        }
      } catch {
        fechamentoWarning =
          'Encerre o financeiro na aba Resultado financeiro antes de marcar como Finalizado.';
      }
    }

    if (fechamentoWarning) {
      setError(fechamentoWarning);
      return;
    }

    const ok = await confirm({
      title: "Avançar status do carregamento",
      context: carregamentoContext(c),
      transition: {
        from: STATUS_LABEL[c.status],
        to: STATUS_LABEL[proximo],
      },
      warning,
      variant: warning && proximo === "EM_TRANSITO" ? "danger" : "default",
      description:
        proximo === "FINALIZADO"
          ? "O carregamento será marcado como concluído. Confirma que todas as etapas foram realizadas?"
          : warning
            ? "Confirme somente se a operação corresponde à realidade."
            : "Confirma que a operação realmente avançou para esta etapa?",
      confirmLabel: `Avançar para ${STATUS_LABEL[proximo]}`,
      cancelLabel: "Manter status atual",
    });
    if (!ok) return;

    setError(null);
    try {
      await carregamentosApi.update(c.id, { status: proximo });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const voltarStatus = async (c: Carregamento) => {
    const anterior = statusAnterior(c.status);
    if (!anterior) return;

    const ok = await confirm({
      title: "Voltar etapa do carregamento",
      context: carregamentoContext(c),
      transition: {
        from: STATUS_LABEL[c.status],
        to: STATUS_LABEL[anterior],
      },
      variant: "danger",
      description:
        "Use só para corrigir erro (ex.: motorista avançou a etapa errada). Confirma o retorno?",
      confirmLabel: `Voltar para ${STATUS_LABEL[anterior]}`,
      cancelLabel: "Manter status atual",
    });
    if (!ok) return;

    setError(null);
    try {
      await carregamentosApi.update(c.id, { status: anterior });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao voltar status");
    }
  };

  const applyAndGoToList = () => {
    setAppliedFilters({ ...filters });
    applyFilters();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const detailPanelProps = {
    editing,
    form,
    setForm,
    editingNumero,
    pendenciasForm,
    pendingNfeParsed,
    pendingNfeXml,
    nfeAutoFilled,
    setNfeAutoFilled,
    rotas,
    rotaSelecionada,
    rotaPreenchida,
    nfeRotaCriada,
    onRotaChange,
    clientes,
    refsLoading,
    motoristas,
    veiculos,
    kmSincronizadoRota,
    setKmSincronizadoRota,
    handleSubmit,
    cancelForm,
    resetForm,
    financas,
    motoristasFinancas,
    handleFinanceiroChange,
    nfeClientesParaCadastrar,
    setNfeClientesParaCadastrar,
    cadastrandoClientesNfe,
    handleCadastrarClientesNfe,
    notasFiscais,
    importingNfe,
    fileInputRef,
    handleRemoveNota,
    handleUpdateNotaPapel,
    removingNotaId,
    updatingPapelId,
    minutaFotoNome,
    hasMinutaFoto,
    pendingMinutaFile,
    setPendingMinutaFile,
    setHasMinutaFoto,
    setMinutaFotoNome,
    loadEventos,
    eventos,
    eventosLoading,
  };

  return (
    <div className="relative min-h-[420px]">
      <PageLoadingOverlay
        active={loading}
        title="Carregando embarques…"
        description="Buscando lista de carregamentos"
      />
      <div className={cn(loading && "pointer-events-none opacity-50")}>
    <CrudPageLayout
      title="Carregamentos"
      subtitle="Embarque, trânsito e desembarque de gado"
      tab={tab}
      onTabChange={setTab}
      tabs={CARREGAMENTO_TABS}
      error={error}
      summary={
        !loading && items.items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              compact
              label="Embarques ativos"
              value={String(resumoOperacao.ativos)}
              hint={`${resumoOperacao.total} no total (exc. cancelados)`}
              icon={Truck}
            />
            <StatCard
              compact
              tone="warning"
              label="Em trânsito"
              value={String(resumoOperacao.emTransito)}
              hint="Embarcado + em trânsito"
              icon={Route}
            />
            <StatCard
              compact
              tone={resumoOperacao.incompletos > 0 ? "warning" : "positive"}
              label="Pendências operacionais"
              value={String(resumoOperacao.incompletos)}
              hint="Sem motorista, veículo ou KM"
              icon={ClipboardList}
            />
            <StatCard
              compact
              tone={resumoOperacao.resultadoSoma >= 0 ? "positive" : "negative"}
              label="Resultado acumulado"
              value={fmtBRL(resumoOperacao.resultadoSoma)}
              hint="Soma do resultado operacional apurado"
              icon={TrendingUp}
            />
          </div>
        ) : undefined
      }
      actions={
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportNfe(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={importingNfe}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="mr-2 h-4 w-4" />
            {importingNfe ? "Importando…" : editing ? "Adicionar NF-e" : "Importar NF-e"}
          </Button>
          <Button
            onClick={() => {
              startNew(resetForm);
              setTab("programacao");
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo carregamento
          </Button>
        </>
      }
      panels={{
        filtro: (
        <CrudFilterPanel onApply={applyAndGoToList} onClear={clearFilters}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-10"
                  placeholder="Minuta, código, cidade, motorista ou placa"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-status">Status</Label>
              <select
                id="filter-status"
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as typeof filters.status }))
                }
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CrudFilterPanel>
        ),
        lista: (
        <CrudListPanel
          title="Lista de carregamentos"
          icon={Truck}
          filteredCount={filteredItems.length}
          totalCount={items.items.length}
          loading={loading}
          emptyMessage="Nenhum carregamento — crie o primeiro na aba Programação"
          emptyFilterMessage="Nenhum carregamento corresponde ao filtro"
        >
          <CarregamentosPendenciasResumo items={listaPendencias} />
          <CrudTable>
            <CrudTableHead>
              <CrudTh>Minuta</CrudTh>
              <CrudTh>Código</CrudTh>
              <CrudTh>Status</CrudTh>
              <CrudTh>Origem → Destino</CrudTh>
              <CrudTh>Animais</CrudTh>
              <CrudTh>Motorista / Placa</CrudTh>
              <CrudTh align="right">Frete</CrudTh>
              <CrudTh align="right">Resultado</CrudTh>
              <CrudTh align="right">Ações</CrudTh>
            </CrudTableHead>
            <tbody>
              {filteredItems.map((c) => (
                <CrudTableRow key={c.id}>
                  <td className="py-3 font-medium tabular-nums">{c.numeroMinuta || "—"}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      {c.numero}
                      {isCarregamentoOperacaoIncompleta({
                        status: c.status,
                        motoristaId: c.motoristas?.[0]?.motoristaId,
                        veiculoTracionadorId:
                          c.veiculos?.find((v) => v.principal)?.veiculoId ??
                          c.veiculos?.[0]?.veiculoId,
                        kmRota: c.kmRota,
                        rota: resolveRota(c.rotaId, c.rota) as Rota | null,
                      }) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          Pendente
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3">
                    <Badge className={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="py-3">
                    {c.clienteOrigem?.cidade || "—"} → {c.clienteDestino?.cidade || "—"}
                  </td>
                  <td className="py-3">{c.quantidadeAnimais}</td>
                  <td className="py-3">
                    {(() => {
                      const mot = c.motoristas?.[0]?.motorista?.nome;
                      const placas = c.veiculos?.map((v) => v.veiculo.placa).join(" + ");
                      if (!mot && !placas) {
                        return (
                          <span className="text-amber-700 dark:text-amber-400">
                            Sem motorista / placa
                          </span>
                        );
                      }
                      return (
                        <>
                          {mot || (
                            <span className="text-amber-700 dark:text-amber-400">
                              — sem motorista
                            </span>
                          )}
                          {" / "}
                          {placas || (
                            <span className="text-amber-700 dark:text-amber-400">— sem placa</span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="py-3 text-right">{fmtBRL(freteExibir(c))}</td>
                  <td className="py-3 text-right">{fmtBRL(margemExibir(c))}</td>
                  <CrudRowActions
                    onEdit={() => handleEdit(c)}
                    onDelete={() => handleDelete(c.id)}
                    deleteTitle="Cancelar"
                    extra={
                      (() => {
                        const proximo = proximoStatus(c.status);
                        const anterior = statusAnterior(c.status);
                        if (!proximo && !anterior) return undefined;
                        return (
                          <>
                            {anterior && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => voltarStatus(c)}
                                title={`Voltar para ${STATUS_LABEL[anterior]}`}
                                aria-label={`Voltar minuta ${c.numero} para ${STATUS_LABEL[anterior]}`}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            )}
                            {proximo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => avancarStatus(c)}
                                title={`Avançar para ${STATUS_LABEL[proximo]}`}
                                aria-label={`Avançar minuta ${c.numero} para ${STATUS_LABEL[proximo]}`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        );
                      })()
                    }
                  />
                </CrudTableRow>
              ))}
            </tbody>
          </CrudTable>
        </CrudListPanel>
        ),
        programacao: renderDetailPanel("programacao", tab, detailPanelProps),
        resultado: renderDetailPanel("resultado", tab, detailPanelProps),
        notas: renderDetailPanel("notas", tab, detailPanelProps),
        minuta: renderDetailPanel("minuta", tab, detailPanelProps),
        gta: renderDetailPanel("gta", tab, detailPanelProps),
        timeline: renderDetailPanel("timeline", tab, detailPanelProps),
      }}
    />
      </div>
    </div>
  );
}
