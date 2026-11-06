import { jsPDF } from "jspdf";
import type { TermoQuitacao } from "@/services/api";
import { formatMoneyBRL } from "@/lib/documents";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function linha(doc: jsPDF, y: number, label: string, value: string, margin = 14) {
  doc.setFont("helvetica", "bold");
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, margin + 52, y);
  return y + 6;
}

function blocoAssinatura(doc: jsPDF, y: number, titulo: string, nome: string) {
  const margin = 14;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(nome, margin, y);
  y += 18;
  doc.line(margin, y, margin + 80, y);
  doc.setFontSize(8);
  doc.text("Assinatura", margin, y + 4);
  doc.line(margin + 95, y, margin + 175, y);
  doc.text("Data", margin + 95, y + 4);
  return y + 14;
}

export function exportTermoQuitacaoPdf(dados: TermoQuitacao) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Termo de quitação — transporte de gado", margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`${dados.transportadora.nome}${dados.transportadora.cnpj ? ` · CNPJ ${dados.transportadora.cnpj}` : ""}`, margin, y);
  doc.text(`Emitido em ${fmtDate(dados.emitidoEm)}`, margin, y + 5);
  doc.setTextColor(0);
  y += 14;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Embarque #${dados.carregamento.numero}`, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  y = linha(doc, y, "Rota:", dados.carregamento.rota ?? "—");
  y = linha(doc, y, "Placa:", dados.carregamento.placa ?? "—");
  y = linha(doc, y, "Embarque:", fmtDate(dados.carregamento.dataEmbarque));
  y = linha(doc, y, "Desembarque:", fmtDate(dados.carregamento.dataDesembarque));
  y = linha(doc, y, "Animais:", String(dados.carregamento.quantidadeAnimais));
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("1. Quitação do cliente (frete / cobrança)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = linha(doc, y, "Cliente:", dados.cliente.nome);
  y = linha(doc, y, "Documento:", dados.cliente.documento);
  y = linha(doc, y, "Cobrado:", formatMoneyBRL(dados.cliente.cobrado));
  y = linha(doc, y, "Recebido:", formatMoneyBRL(dados.cliente.recebido));
  y = linha(doc, y, "Saldo:", formatMoneyBRL(dados.cliente.saldoAReceber));
  y += 3;
  doc.setFontSize(8);
  const textoCliente = dados.cliente.quitado
    ? `Declaro, ${dados.cliente.nome}, ter recebido e conferido os serviços de transporte referentes ao embarque #${dados.carregamento.numero}, dando plena, geral e irrevogável quitação quanto ao frete e demais valores cobrados (${formatMoneyBRL(dados.cliente.cobrado)}).`
    : `Reconheço o valor de ${formatMoneyBRL(dados.cliente.cobrado)} referente ao embarque #${dados.carregamento.numero}, restando saldo de ${formatMoneyBRL(dados.cliente.saldoAReceber)} a receber/pagar conforme acordado.`;
  const linhasCliente = doc.splitTextToSize(textoCliente, 182);
  doc.text(linhasCliente, margin, y);
  y += linhasCliente.length * 4 + 6;
  y = blocoAssinatura(doc, y, "Cliente", dados.cliente.nome);

  doc.setFontSize(9);
  for (const m of dados.motoristas) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`2. Quitação do motorista — ${m.nome}`, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = linha(doc, y, "Comissão viagem:", formatMoneyBRL(m.comissao));
    y = linha(doc, y, "Saldo acerto:", formatMoneyBRL(m.saldoViagem));
    y = linha(doc, y, "Pagamentos reg.:", formatMoneyBRL(m.pagamentosRegistrados));
    y = linha(doc, y, "Prestação:", m.prestacaoFechada ? "Conferida" : "Em aberto");
    y += 3;
    doc.setFontSize(8);
    const textoMotorista = m.prestacaoFechada
      ? `Declaro, ${m.nome}, ter recebido e prestado contas dos valores referentes ao embarque #${dados.carregamento.numero}, incluindo comissão, adiantamentos e despesas, dando plena quitação à transportadora.`
      : `Reconheço os valores apurados nesta viagem (saldo ${formatMoneyBRL(m.saldoViagem)}). A quitação definitiva ocorrerá após o pagamento registrado em CC Motoristas.`;
    const linhasMot = doc.splitTextToSize(textoMotorista, 182);
    doc.text(linhasMot, margin, y);
    y += linhasMot.length * 4 + 6;
    y = blocoAssinatura(doc, y, "Motorista", m.nome);
    y += 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(
    "Documento gerado pelo Atlas Boi — transporte de gado. Imprima em duas vias para assinatura.",
    margin,
    288
  );

  doc.save(`termo-quitacao-${dados.carregamento.numero}.pdf`);
}
