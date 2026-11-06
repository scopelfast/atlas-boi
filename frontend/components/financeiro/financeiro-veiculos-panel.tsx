"use client";

import { useState } from "react";
import { ChevronRight, Truck } from "lucide-react";
import { financeiroApi, type LancamentoFinanceiro, type LancamentoTipo } from "@/services/api";
import {
  CrudListPanel,
  CrudTable,
  CrudTableHead,
  CrudTableRow,
  CrudTh,
} from "@/components/crud/crud-panels";

const TIPO_LABEL: Partial<Record<LancamentoTipo, string>> = {
  COMBUSTIVEL: "Combustível",
  MANUTENCAO: "Manutenção",
  PNEU: "Pneu",
  SEGURO: "Seguro",
  IPVA_LICENCIAMENTO: "IPVA",
  MULTA: "Multa",
  DEPRECIACAO: "Depreciação",
  OUTROS_VEICULO: "Outros",
};

function fmtBRL(v?: string | number | null) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function FinanceiroVeiculosPanel({
  veiculos,
  loading,
  onError,
}: {
  veiculos: {
    id: string;
    placa: string;
    codigoCentroCusto: string | null;
    custoTotal: number;
  }[];
  loading: boolean;
  onError: (msg: string | null) => void;
}) {
  const [extratoVeiculoId, setExtratoVeiculoId] = useState<string | null>(null);
  const [extrato, setExtrato] = useState<LancamentoFinanceiro[]>([]);
  const [extratoLoading, setExtratoLoading] = useState(false);

  const abrirExtrato = async (veiculoId: string) => {
    if (extratoVeiculoId === veiculoId) {
      setExtratoVeiculoId(null);
      setExtrato([]);
      return;
    }
    setExtratoVeiculoId(veiculoId);
    setExtratoLoading(true);
    try {
      const res = await financeiroApi.extratoVeiculo(veiculoId, { limit: 100 });
      setExtrato(res.items);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao carregar extrato");
    } finally {
      setExtratoLoading(false);
    }
  };

  const veiculoAtual = veiculos.find((v) => v.id === extratoVeiculoId);
  const totalFrota = veiculos.reduce((s, v) => s + v.custoTotal, 0);

  return (
    <CrudListPanel
      title="Centro de custo — veículos"
      icon={Truck}
      filteredCount={veiculos.length}
      totalCount={veiculos.length}
      loading={loading}
      emptyMessage="Nenhum veículo cadastrado"
      emptyFilterMessage="—"
    >
      {veiculos.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Custo acumulado da frota:{" "}
          <span className="font-bold tabular-nums text-foreground">{fmtBRL(totalFrota)}</span>
        </p>
      )}

      <CrudTable>
        <CrudTableHead>
          <CrudTh>Placa</CrudTh>
          <CrudTh>Centro de custo</CrudTh>
          <CrudTh align="right">Custo acumulado</CrudTh>
        </CrudTableHead>
        <tbody>
          {veiculos.map((v) => (
            <CrudTableRow key={v.id}>
              <td className="py-3">
                <button
                  type="button"
                  className="flex items-center gap-2 font-mono font-medium hover:text-primary"
                  onClick={() => abrirExtrato(v.id)}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      extratoVeiculoId === v.id ? "rotate-90" : ""
                    }`}
                  />
                  {v.placa}
                </button>
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {v.codigoCentroCusto || "—"}
              </td>
              <td className="py-3 text-right text-lg font-bold tabular-nums text-red-600/90">
                {fmtBRL(v.custoTotal)}
              </td>
            </CrudTableRow>
          ))}
        </tbody>
      </CrudTable>

      {extratoVeiculoId && (
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <h4 className="mb-3 text-sm font-semibold">
            Extrato de custos — {veiculoAtual?.placa}
          </h4>
          {extratoLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : extrato.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento de custo — registre na aba Novo (combustível, manutenção, etc.).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.map((l) => (
                    <tr key={l.id} className="border-b border-border/30 last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.dataLancamento)}</td>
                      <td className="px-3 py-2">{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                      <td className="px-3 py-2 max-w-[240px] truncate">{l.descricao}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        −{fmtBRL(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Alimenta o DRE por veículo (Fase 4). Registre combustível, manutenção, pneus e demais custos
        vinculados à placa.
      </p>
    </CrudListPanel>
  );
}
