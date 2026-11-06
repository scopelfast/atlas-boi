import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import type {
  DreConsolidadoRow,
  DreVeiculoRow,
  PosicaoFinanceira,
  RankingMotoristaRow,
  RankingRotaRow,
} from "@/services/api";
import { formatMoneyBRL } from "@/lib/documents";

type SheetDef = { name: string; rows: Record<string, string | number>[] };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSheets(filename: string, sheets: SheetDef[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}

function fmtCompetencia(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function pdfTable(
  doc: jsPDF,
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  filename: string
) {
  const margin = 14;
  let y = 18;
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(subtitle, margin, y);
  doc.setTextColor(0);
  y += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, margin + i * 42, y));
  y += 5;
  doc.setFont("helvetica", "normal");

  for (const row of rows) {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    row.forEach((cell, i) => doc.text(String(cell).slice(0, 22), margin + i * 42, y));
    y += 5;
  }

  doc.save(filename);
}

export function exportDreExcel(
  dre: DreVeiculoRow[],
  consolidado: DreConsolidadoRow | undefined,
  competencia: string
) {
  const compLabel = competencia || "todas";
  exportSheets(`dre-veiculo-${compLabel}.xlsx`, [
    {
      name: "DRE veículos",
      rows: dre.map((r) => ({
        Placa: r.placa,
        Competência: fmtCompetencia(r.competencia),
        Receita: r.receita,
        Custo: r.custo,
        Resultado: r.resultado,
      })),
    },
    ...(consolidado
      ? [
          {
            name: "Consolidado",
            rows: [
              {
                Competência: fmtCompetencia(consolidado.competencia),
                Receita: consolidado.receita,
                Custo: consolidado.custo,
                Resultado: consolidado.resultado,
                Veículos: consolidado.qtdVeiculos,
              },
            ],
          },
        ]
      : []),
  ]);
}

export function exportDrePdf(
  dre: DreVeiculoRow[],
  consolidado: DreConsolidadoRow | undefined,
  competencia: string
) {
  const subtitle = consolidado
    ? `${fmtCompetencia(consolidado.competencia)} · Receita ${formatMoneyBRL(consolidado.receita)} · Resultado ${formatMoneyBRL(consolidado.resultado)}`
    : `Competência ${competencia || "—"}`;
  pdfTable(
    new jsPDF(),
    "Atlas Boi — DRE por veículo",
    subtitle,
    ["Placa", "Competência", "Receita", "Custo", "Resultado"],
    dre.map((r) => [
      r.placa,
      fmtCompetencia(r.competencia),
      formatMoneyBRL(r.receita),
      formatMoneyBRL(r.custo),
      formatMoneyBRL(r.resultado),
    ]),
    `dre-veiculo-${competencia || "geral"}.pdf`
  );
}

export function exportRankingRotasExcel(rows: RankingRotaRow[]) {
  exportSheets("ranking-rotas.xlsx", [
    {
      name: "Ranking rotas",
      rows: rows.map((r) => ({
        Posição: r.posicao,
        Código: r.codigo,
        Descrição: r.descricao,
        Viagens: r.totalViagens,
        "Margem média": r.margemMedia ?? "",
        "KM total": r.kmTotal ?? "",
      })),
    },
  ]);
}

export function exportRankingRotasPdf(rows: RankingRotaRow[]) {
  pdfTable(
    new jsPDF(),
    "Atlas Boi — Ranking de rotas",
    `${rows.length} rotas ranqueadas`,
    ["#", "Rota", "Viagens", "Margem média", "KM"],
    rows.map((r) => [
      String(r.posicao),
      `${r.codigo} ${r.descricao}`.slice(0, 30),
      String(r.totalViagens),
      r.margemMedia != null ? formatMoneyBRL(r.margemMedia) : "—",
      r.kmTotal != null ? Number(r.kmTotal).toLocaleString("pt-BR") : "—",
    ]),
    "ranking-rotas.pdf"
  );
}

export function exportRankingMotoristasExcel(rows: RankingMotoristaRow[]) {
  exportSheets("ranking-motoristas.xlsx", [
    {
      name: "Ranking motoristas",
      rows: rows.map((m) => ({
        Posição: m.posicao,
        Motorista: m.nome,
        Viagens: m.totalViagens,
        Comissões: m.totalComissao,
      })),
    },
  ]);
}

export function exportRankingMotoristasPdf(rows: RankingMotoristaRow[]) {
  pdfTable(
    new jsPDF(),
    "Atlas Boi — Ranking de motoristas",
    `${rows.length} motoristas`,
    ["#", "Motorista", "Viagens", "Comissões"],
    rows.map((m) => [
      String(m.posicao),
      m.nome,
      String(m.totalViagens),
      formatMoneyBRL(m.totalComissao),
    ]),
    "ranking-motoristas.pdf"
  );
}

function posicaoFilename(ext: "pdf" | "xlsx") {
  const hoje = new Date().toISOString().slice(0, 10);
  return `faturamento-pagamentos-${hoje}.${ext}`;
}

export function exportPosicaoExcel(posicao: PosicaoFinanceira) {
  const { totais, clientes, motoristas } = posicao;
  exportSheets(posicaoFilename("xlsx"), [
    {
      name: "Resumo",
      rows: [
        { Indicador: "Faturado (clientes)", Valor: totais.faturado },
        { Indicador: "Recebido", Valor: totais.recebido },
        { Indicador: "A receber", Valor: totais.aReceber },
        { Indicador: "A pagar (motoristas)", Valor: totais.aPagarMotoristas },
        { Indicador: "A receber de motoristas (devol.)", Valor: totais.aReceberDeMotoristas },
        { Indicador: "Saldo líquido", Valor: totais.saldoLiquido },
      ],
    },
    {
      name: "Clientes",
      rows:
        clientes.length > 0
          ? clientes.map((c) => ({
              Cliente: c.nome,
              Cobrado: c.cobrado,
              Recebido: c.recebido,
              "Saldo a receber": c.saldoAReceber,
            }))
          : [{ Cliente: "—", Cobrado: 0, Recebido: 0, "Saldo a receber": 0 }],
    },
    {
      name: "Motoristas",
      rows:
        motoristas.length > 0
          ? motoristas.map((m) => ({
              Motorista: m.nome,
              "A pagar": m.aPagar,
              "A receber (devol.)": m.aReceber,
              Saldo: m.saldo,
            }))
          : [{ Motorista: "—", "A pagar": 0, "A receber (devol.)": 0, Saldo: 0 }],
    },
  ]);
}

function buildPosicaoPdf(posicao: PosicaoFinanceira): jsPDF {
  const doc = new jsPDF();
  const margin = 14;
  const colW = 46;
  let y = 18;
  const hoje = new Date().toLocaleDateString("pt-BR");

  const ensureSpace = (need: number) => {
    if (y + need > 280) {
      doc.addPage();
      y = 18;
    }
  };

  const drawTable = (title: string, headers: string[], rows: string[][]) => {
    ensureSpace(16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 8;
    doc.setFontSize(8);
    headers.forEach((h, i) => doc.text(h, margin + i * colW, y));
    y += 5;
    doc.setFont("helvetica", "normal");
    if (rows.length === 0) {
      ensureSpace(6);
      doc.text("Nenhum registro em aberto.", margin, y);
      y += 10;
      return;
    }
    for (const row of rows) {
      ensureSpace(6);
      row.forEach((cell, i) => doc.text(String(cell).slice(0, 24), margin + i * colW, y));
      y += 5;
    }
    y += 6;
  };

  doc.setFontSize(14);
  doc.text("Atlas Boi — Faturamento e pagamentos", margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Posição em ${hoje} · Contas em aberto (independente do embarque)`, margin, y);
  doc.setTextColor(0);
  y += 12;

  const { totais, clientes, motoristas } = posicao;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const resumo: [string, string][] = [
    ["Faturado (clientes)", formatMoneyBRL(totais.faturado)],
    ["Recebido", formatMoneyBRL(totais.recebido)],
    ["A receber", formatMoneyBRL(totais.aReceber)],
    ["A pagar (motoristas)", formatMoneyBRL(totais.aPagarMotoristas)],
    ["A receber de motoristas", formatMoneyBRL(totais.aReceberDeMotoristas)],
    ["Saldo líquido", formatMoneyBRL(totais.saldoLiquido)],
  ];
  for (const [label, value] of resumo) {
    ensureSpace(6);
    doc.text(`${label}: ${value}`, margin, y);
    y += 6;
  }
  y += 4;

  drawTable(
    "Clientes — a receber",
    ["Cliente", "Cobrado", "Recebido", "Saldo"],
    clientes.map((c) => [
      c.nome,
      formatMoneyBRL(c.cobrado),
      formatMoneyBRL(c.recebido),
      formatMoneyBRL(c.saldoAReceber),
    ])
  );

  drawTable(
    "Motoristas — a pagar / a receber",
    ["Motorista", "A pagar", "A receber (devol.)"],
    motoristas.map((m) => [
      m.nome,
      m.aPagar > 0 ? formatMoneyBRL(m.aPagar) : "—",
      m.aReceber > 0 ? formatMoneyBRL(m.aReceber) : "—",
    ])
  );

  return doc;
}

export function exportPosicaoPdf(posicao: PosicaoFinanceira) {
  buildPosicaoPdf(posicao).save(posicaoFilename("pdf"));
}

export function printPosicao(posicao: PosicaoFinanceira) {
  const doc = buildPosicaoPdf(posicao);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const url = typeof blobUrl === "string" ? blobUrl : blobUrl.toString();
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(posicaoFilename("pdf"));
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
