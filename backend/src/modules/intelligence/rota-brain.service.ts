import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type RankingRow = {
  rotaId: string;
  codigo: string;
  descricao: string;
  distanciaKm: unknown;
  valorKmCobranca: unknown;
  valorKmComissao: unknown;
  viagens: unknown;
  margemMedia: unknown;
  receitaTotal: unknown;
};

@Injectable()
export class RotaBrainService {
  constructor(private prisma: PrismaService) {}

  /**
   * Sugere tarifa mínima de frete (R$/km) com base no histórico da rota
   * e no ranking consolidado — sem LLM.
   */
  async sugerir(companyId: string, rotaId: string) {
    const rota = await this.prisma.rota.findFirst({
      where: { id: rotaId, companyId },
      select: {
        id: true,
        codigo: true,
        descricao: true,
        distanciaKm: true,
        valorKmCobrancaCliente: true,
        valorKmComissaoMotorista: true,
        valorPedagio: true,
        valorBalanca: true,
        percentualComissao: true,
      },
    });
    if (!rota) return null;

    const ranking = await this.prisma.$queryRaw<RankingRow[]>`
      SELECT
        r.id AS "rotaId",
        r.codigo,
        r.descricao,
        r."distanciaKm",
        r."valorKmCobrancaCliente" AS "valorKmCobranca",
        r."valorKmComissaoMotorista" AS "valorKmComissao",
        COALESCE(vr.viagens, 0) AS viagens,
        vr."margemMedia" AS "margemMedia",
        vr."receitaTotal" AS "receitaTotal"
      FROM "Rota" r
      LEFT JOIN vw_ranking_rotas vr ON vr."rotaId" = r.id AND vr."companyId" = r."companyId"
      WHERE r.id = ${rotaId} AND r."companyId" = ${companyId}
      LIMIT 1
    `;

    const row = ranking[0];
    const km = Number(rota.distanciaKm) || 0;
    const kmAtual = Number(rota.valorKmCobrancaCliente) || 0;
    const kmComissao = Number(rota.valorKmComissaoMotorista) || 0;
    const ped = Number(rota.valorPedagio) || 0;
    const bal = Number(rota.valorBalanca) || 0;
    const viagens = Number(row?.viagens ?? 0);
    const margemMedia = row?.margemMedia != null ? Number(row.margemMedia) : null;

    // Custo variável estimado por km: comissão + rateio pedágio/balança
    const custoFixoPorKm = km > 0 ? (ped + bal) / km : 0;
    const custoVarPorKm = kmComissao + custoFixoPorKm;

    // Meta de margem 15% sobre o frete
    const margemAlvo = 0.15;
    const tarifaMinima = custoVarPorKm > 0 ? custoVarPorKm / (1 - margemAlvo) : null;

    // Se houver histórico, usa 70% da média de margem implícita da view
    let tarifaSugerida = tarifaMinima;
    if (margemMedia != null && kmAtual > 0 && margemMedia < 0.12) {
      tarifaSugerida = Math.max(tarifaMinima ?? 0, kmAtual * 1.08);
    } else if (tarifaMinima != null && kmAtual > 0 && kmAtual < tarifaMinima) {
      tarifaSugerida = tarifaMinima;
    } else if (kmAtual > 0) {
      tarifaSugerida = kmAtual;
    }

    const abaixoDaMinima =
      tarifaMinima != null && kmAtual > 0 && kmAtual < tarifaMinima * 0.98;

    return {
      rotaId: rota.id,
      codigo: rota.codigo,
      descricao: rota.descricao,
      distanciaKm: km,
      tarifaAtualKm: kmAtual,
      comissaoKm: kmComissao,
      custoEstimadoKm: Number(custoVarPorKm.toFixed(4)),
      tarifaMinimaKm: tarifaMinima != null ? Number(tarifaMinima.toFixed(4)) : null,
      tarifaSugeridaKm: tarifaSugerida != null ? Number(tarifaSugerida.toFixed(4)) : null,
      margemAlvoPct: margemAlvo * 100,
      margemMediaHistoricoPct: margemMedia != null ? Number((margemMedia * 100).toFixed(1)) : null,
      viagensHistorico: viagens,
      abaixoDaMinima,
      mensagem: abaixoDaMinima
        ? `Tarifa atual (R$ ${kmAtual.toFixed(2)}/km) está abaixo do mínimo sugerido para margem de 15%.`
        : viagens === 0
          ? "Sem histórico nesta rota — sugestão baseada em comissão + pedágio/balança."
          : "Tarifa dentro da faixa sugerida com base no custo e histórico.",
    };
  }

  async listarSubprecificadas(companyId: string, limit = 10) {
    const rotas = await this.prisma.rota.findMany({
      where: { companyId, ativa: true },
      select: { id: true },
      take: 80,
    });
    const out = [];
    for (const r of rotas) {
      const s = await this.sugerir(companyId, r.id);
      if (s?.abaixoDaMinima) out.push(s);
      if (out.length >= limit) break;
    }
    return out;
  }
}
