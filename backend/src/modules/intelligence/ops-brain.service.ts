import { Injectable } from "@nestjs/common";
import { CarregamentoStatus, Prisma } from "@prisma/client";
import { calcularSaldoCcMotorista } from "../financeiro/financeiro-liquidos";
import { PrismaService } from "../../prisma/prisma.service";
import type { OpsAlerta } from "./intelligence.types";

const LIMITE_SALDO_CC = 10_000;
const HORAS_PARADO = 48;
const DIAS_CNH_ALERTA = 30;

@Injectable()
export class OpsBrainService {
  constructor(private prisma: PrismaService) {}

  async getAlertas(companyId: string): Promise<OpsAlerta[]> {
    const alertas: OpsAlerta[] = [];
    const agora = new Date();
    const limiteParado = new Date(agora.getTime() - HORAS_PARADO * 60 * 60 * 1000);
    const limiteCnh = new Date(agora.getTime() + DIAS_CNH_ALERTA * 24 * 60 * 60 * 1000);

    const [margensAnomalas, motoristasCnh, carregamentosParados, saldosMotoristas, veiculosDeficit, rotasSub] =
      await Promise.all([
        this.margensAnomalas(companyId),
        this.prisma.motorista.findMany({
          where: {
            companyId,
            ativo: true,
            cnhValidade: { lte: limiteCnh, gte: agora },
          },
          select: { id: true, nome: true, cnhValidade: true },
          take: 20,
        }),
        this.prisma.carregamento.findMany({
          where: {
            companyId,
            status: { in: [CarregamentoStatus.EM_TRANSITO, CarregamentoStatus.EMBARCADO] },
            updatedAt: { lt: limiteParado },
          },
          select: { id: true, numero: true, status: true, updatedAt: true },
          take: 20,
        }),
        this.saldosMotoristasCriticos(companyId),
        this.veiculosDeficitarios(companyId),
        this.rotasSubprecificadas(companyId),
      ]);

    for (const m of margensAnomalas) {
      alertas.push({
        id: `margem-${m.id}`,
        tipo: "MARGEM_ANOMALA",
        severidade: "warning",
        titulo: `Margem baixa — ${m.numero}`,
        mensagem: `Resultado ${this.fmt(m.margem)} vs média da rota ${this.fmt(m.mediaRota)} (< 70%).`,
        entidadeTipo: "carregamento",
        entidadeId: m.id,
        link: `/dashboard/carregamentos?id=${m.id}`,
      });
    }

    for (const mot of motoristasCnh) {
      alertas.push({
        id: `cnh-${mot.id}`,
        tipo: "CNH_VENCENDO",
        severidade: "warning",
        titulo: `CNH vencendo — ${mot.nome}`,
        mensagem: `Validade ${mot.cnhValidade?.toLocaleDateString("pt-BR") ?? "—"} (≤ ${DIAS_CNH_ALERTA} dias).`,
        entidadeTipo: "motorista",
        entidadeId: mot.id,
        link: "/dashboard/motoristas",
      });
    }

    for (const c of carregamentosParados) {
      const horas = Math.round((agora.getTime() - c.updatedAt.getTime()) / 3_600_000);
      alertas.push({
        id: `parado-${c.id}`,
        tipo: "CARREGAMENTO_PARADO",
        severidade: horas > 72 ? "critical" : "warning",
        titulo: `Carregamento parado — ${c.numero}`,
        mensagem: `${c.status} há ~${horas}h sem atualização.`,
        entidadeTipo: "carregamento",
        entidadeId: c.id,
        link: `/dashboard/carregamentos?id=${c.id}`,
      });
    }

    for (const m of saldosMotoristas) {
      alertas.push({
        id: `saldo-${m.id}`,
        tipo: "SALDO_MOTORISTA",
        severidade: Math.abs(m.saldo) > LIMITE_SALDO_CC * 2 ? "critical" : "warning",
        titulo: `Saldo CC — ${m.nome}`,
        mensagem:
          m.saldo < 0
            ? `Empresa deve ${this.fmt(Math.abs(m.saldo))} ao motorista.`
            : `Motorista deve ${this.fmt(m.saldo)} à empresa.`,
        entidadeTipo: "motorista",
        entidadeId: m.id,
        link: "/dashboard/financeiro",
      });
    }

    for (const v of veiculosDeficit) {
      alertas.push({
        id: `deficit-${v.veiculoId}`,
        tipo: "VEICULO_DEFICITARIO",
        severidade: "warning",
        titulo: `Veículo deficitário — ${v.placa}`,
        mensagem: `DRE negativo em ${v.mesesNegativos} competências consecutivas.`,
        entidadeTipo: "veiculo",
        entidadeId: v.veiculoId,
        link: "/dashboard/relatorios",
      });
    }

    for (const r of rotasSub) {
      alertas.push({
        id: `rota-${r.rotaId}`,
        tipo: "ROTA_SUBPRECIFICADA",
        severidade: "info",
        titulo: `Tarifa abaixo da média — ${r.codigo}`,
        mensagem: `Última viagem ${this.fmt(r.ultimaMargem)} vs média histórica ${this.fmt(r.margemMedia)}.`,
        entidadeTipo: "rota",
        entidadeId: r.rotaId,
        link: "/dashboard/rotas",
      });
    }

    const ordem = { critical: 0, warning: 1, info: 2 };
    return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
  }

  private fmt(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  private async margensAnomalas(companyId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        numero: string;
        margem: Prisma.Decimal;
        mediaRota: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT c.id, c.numero,
             COALESCE(c."margemOperacional", c."margemLiquida", c."margemBruta", 0) AS margem,
             COALESCE(vr."margemMedia", 0) AS "mediaRota"
        FROM "Carregamento" c
        LEFT JOIN "Rota" r ON r.id = c."rotaId"
        LEFT JOIN vw_ranking_rotas vr ON vr."rotaId" = r.id AND vr."companyId" = c."companyId"
       WHERE c."companyId" = ${companyId}
         AND c.status IN ('DESEMBARCADO', 'FINALIZADO')
         AND c."margemOperacional" IS NOT NULL
         AND vr."margemMedia" IS NOT NULL
         AND vr."margemMedia" > 0
         AND COALESCE(c."margemOperacional", 0) < vr."margemMedia" * 0.7
       ORDER BY c."updatedAt" DESC
       LIMIT 15
    `);
    return rows.map((r) => ({
      id: r.id,
      numero: r.numero,
      margem: Number(r.margem),
      mediaRota: Number(r.mediaRota),
    }));
  }

  private async saldosMotoristasCriticos(companyId: string) {
    type Row = {
      id: string;
      nome: string;
      adiantamentos: number;
      despesas: number;
      reembolsos: number;
      comissoes: number;
      acertos: number;
      descontos_comissao: number;
      prestacoes: number;
    };

    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        m.id,
        m.nome,
        COALESCE(SUM(CASE WHEN l.tipo = 'ADIANTAMENTO' THEN l.valor::numeric ELSE 0 END), 0) AS adiantamentos,
        COALESCE(SUM(CASE WHEN l.tipo = 'DESPESA_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS despesas,
        COALESCE(SUM(CASE WHEN l.tipo = 'REEMBOLSO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS reembolsos,
        COALESCE(SUM(CASE WHEN l.tipo = 'COMISSAO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS comissoes,
        COALESCE(SUM(CASE WHEN l.tipo = 'ACERTO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS acertos,
        COALESCE(SUM(CASE WHEN l.tipo = 'DESCONTO_COMISSAO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS descontos_comissao,
        COALESCE(SUM(CASE WHEN l.tipo = 'PRESTACAO_CONTAS' THEN l.valor::numeric ELSE 0 END), 0) AS prestacoes
      FROM "Motorista" m
      LEFT JOIN "LancamentoFinanceiro" l
        ON l."motoristaId" = m.id
        AND l."companyId" = ${companyId}
        AND l.status = 'CONFIRMADO'
        AND l."apenasLancamento" = false
        AND l.tipo IN (
          'ADIANTAMENTO', 'DESPESA_MOTORISTA', 'REEMBOLSO_MOTORISTA', 'COMISSAO_MOTORISTA',
          'ACERTO_MOTORISTA', 'DESCONTO_COMISSAO_MOTORISTA', 'PRESTACAO_CONTAS'
        )
      WHERE m."companyId" = ${companyId} AND m.ativo = true
      GROUP BY m.id, m.nome
    `;

    return rows
      .map((r) => {
        const { saldo } = calcularSaldoCcMotorista({
          adiantamentos: Number(r.adiantamentos),
          despesas: Number(r.despesas),
          reembolsos: Number(r.reembolsos),
          comissoes: Number(r.comissoes),
          acertos: Number(r.acertos),
          descontosComissao: Number(r.descontos_comissao),
          prestacoes: Number(r.prestacoes),
        });
        return { id: r.id, nome: r.nome, saldo };
      })
      .filter((m) => Math.abs(m.saldo) > LIMITE_SALDO_CC)
      .sort((a, b) => a.saldo - b.saldo)
      .slice(0, 15);
  }

  private async veiculosDeficitarios(companyId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ veiculoId: string; placa: string; mesesNegativos: number }>
    >(Prisma.sql`
      WITH neg AS (
        SELECT "veiculoId", placa, competencia, resultado,
               SUM(CASE WHEN resultado < 0 THEN 1 ELSE 0 END)
                 OVER (PARTITION BY "veiculoId" ORDER BY competencia
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS streak
          FROM mv_dre_veiculo
         WHERE "companyId" = ${companyId}
      )
      SELECT DISTINCT "veiculoId", placa, streak::int AS "mesesNegativos"
        FROM neg
       WHERE streak >= 3
       ORDER BY "mesesNegativos" DESC
       LIMIT 10
    `);
    return rows;
  }

  private async rotasSubprecificadas(companyId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        rotaId: string;
        codigo: string;
        ultimaMargem: Prisma.Decimal;
        margemMedia: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT r.id AS "rotaId", r.codigo,
             COALESCE(c."margemOperacional", 0) AS "ultimaMargem",
             COALESCE(vr."margemMedia", 0) AS "margemMedia"
        FROM "Rota" r
        JOIN LATERAL (
          SELECT "margemOperacional"
            FROM "Carregamento"
           WHERE "rotaId" = r.id AND "companyId" = ${companyId}
             AND status IN ('DESEMBARCADO', 'FINALIZADO')
           ORDER BY "updatedAt" DESC
           LIMIT 1
        ) c ON true
        LEFT JOIN vw_ranking_rotas vr ON vr."rotaId" = r.id
       WHERE r."companyId" = ${companyId}
         AND vr."margemMedia" IS NOT NULL
         AND vr."margemMedia" > 0
         AND c."margemOperacional" < vr."margemMedia" * 0.85
       LIMIT 10
    `);
    return rows.map((r) => ({
      rotaId: r.rotaId,
      codigo: r.codigo,
      ultimaMargem: Number(r.ultimaMargem),
      margemMedia: Number(r.margemMedia),
    }));
  }
}
