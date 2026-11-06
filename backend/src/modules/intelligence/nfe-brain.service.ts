import { Injectable } from "@nestjs/common";
import { NotaFiscalPapel } from "@prisma/client";
import { fuzzyScore } from "../../common/utils/fuzzy-match";
import { PrismaService } from "../../prisma/prisma.service";
import type { NfeParsedData } from "../carregamentos/nfe-parser";
import type { NfeBrainInsight } from "./intelligence.types";

@Injectable()
export class NfeBrainService {
  constructor(private prisma: PrismaService) {}

  async analyze(
    companyId: string,
    parsed: NfeParsedData,
    opts?: { carregamentoId?: string }
  ): Promise<NfeBrainInsight> {
    const alertas: NfeBrainInsight["alertas"] = [];
    const sugestoes: NfeBrainInsight["sugestoes"] = [];
    let confianca = 0.5;

    if (parsed.xmlHash) {
      const dup = await this.prisma.carregamentoNotaFiscal.findFirst({
        where: { companyId, xmlHash: parsed.xmlHash },
        select: { carregamento: { select: { numero: true } } },
      });
      if (dup) {
        alertas.push({
          severidade: "critical",
          mensagem: `XML já importado no carregamento ${dup.carregamento.numero}.`,
        });
        confianca = 0.95;
      }
    }

    const clientes = await this.prisma.cliente.findMany({
      where: { companyId, ativo: true },
      select: { id: true, nome: true, documento: true, cidade: true, uf: true },
      take: 500,
    });

    const clientesFuzzy: NfeBrainInsight["clientesFuzzy"] = {};

    const origemFuzzy = this.bestClienteMatch(
      clientes,
      parsed.emitenteNome,
      parsed.emitenteCnpj
    );
    if (origemFuzzy && origemFuzzy.score >= 0.55) {
      clientesFuzzy.origem = origemFuzzy;
      sugestoes.push({
        campo: "clienteOrigemId",
        valor: origemFuzzy.id,
        motivo: `Match fuzzy "${origemFuzzy.nome}" (${Math.round(origemFuzzy.score * 100)}%)`,
      });
      confianca = Math.max(confianca, origemFuzzy.score);
    }

    const destinoFuzzy = this.bestClienteMatch(
      clientes,
      parsed.destinatarioNome,
      parsed.destinatarioCnpj
    );
    if (destinoFuzzy && destinoFuzzy.score >= 0.55) {
      clientesFuzzy.destino = destinoFuzzy;
      sugestoes.push({
        campo: "clienteDestinoId",
        valor: destinoFuzzy.id,
        motivo: `Match fuzzy "${destinoFuzzy.nome}" (${Math.round(destinoFuzzy.score * 100)}%)`,
      });
      confianca = Math.max(confianca, destinoFuzzy.score);
    }

    if (!parsed.numeroGta) {
      alertas.push({
        severidade: "warning",
        mensagem: "GTA não encontrada no XML — confira antes de embarcar.",
      });
    }

    if (parsed.quantidadeAnimais != null && parsed.quantidadeAnimais <= 0) {
      alertas.push({
        severidade: "warning",
        mensagem: "Quantidade de animais zerada ou ausente no XML.",
      });
    }

    let papelNotaSugerido: NotaFiscalPapel | undefined;
    if (opts?.carregamentoId) {
      const notas = await this.prisma.carregamentoNotaFiscal.findMany({
        where: { carregamentoId: opts.carregamentoId, companyId },
        select: { papel: true, quantidadeAnimais: true, valorTotal: true },
      });
      if (notas.length === 0) {
        papelNotaSugerido = NotaFiscalPapel.PRINCIPAL;
      } else {
        const principal = notas.find((n) => n.papel === NotaFiscalPapel.PRINCIPAL);
        const qtd = parsed.quantidadeAnimais ?? 0;
        const val = parsed.valorTotal ?? 0;
        const trocaProvavel =
          principal &&
          Number(principal.quantidadeAnimais) === qtd &&
          Math.abs(Number(principal.valorTotal) - val) < 0.02;

        if (trocaProvavel) {
          papelNotaSugerido = NotaFiscalPapel.TROCA;
          alertas.push({
            severidade: "info",
            mensagem:
              "Qty/valor iguais à nota Principal — padrão de troca de notas detectado.",
          });
          sugestoes.push({
            campo: "papelNota",
            valor: "TROCA",
            motivo: "Evita duplicar animais/valor no total do carregamento.",
          });
          confianca = 0.88;
        } else {
          papelNotaSugerido = NotaFiscalPapel.TROCA;
        }
      }
    }

    if (parsed.valorTotal != null && parsed.quantidadeAnimais != null && parsed.quantidadeAnimais > 0) {
      const precoArroba = parsed.valorTotal / parsed.quantidadeAnimais;
      sugestoes.push({
        campo: "valorCarga",
        valor: String(parsed.valorTotal),
        motivo: `Valor total NF-e · ~${precoArroba.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/cabeça`,
      });
    }

    return {
      alertas,
      sugestoes,
      clientesFuzzy: Object.keys(clientesFuzzy).length ? clientesFuzzy : undefined,
      papelNotaSugerido,
      confianca: Math.min(1, confianca),
    };
  }

  private bestClienteMatch(
    clientes: { id: string; nome: string; documento: string; cidade: string; uf: string }[],
    nomeXml?: string | null,
    docXml?: string | null
  ) {
    if (!nomeXml && !docXml) return null;

    const docNorm = docXml?.replace(/\D/g, "") ?? "";
    let best: { id: string; nome: string; documento: string; score: number } | null = null;

    for (const c of clientes) {
      let score = 0;
      const cDoc = c.documento.replace(/\D/g, "");
      if (docNorm && cDoc) {
        if (cDoc === docNorm) score = 1;
        else if (docNorm.length >= 8 && cDoc.startsWith(docNorm.slice(0, 8))) score = 0.85;
      }
      if (nomeXml) {
        const nameScore = fuzzyScore(nomeXml, c.nome);
        score = Math.max(score, nameScore);
      }
      if (score > (best?.score ?? 0)) {
        best = { id: c.id, nome: c.nome, documento: c.documento, score };
      }
    }
    return best;
  }
}
