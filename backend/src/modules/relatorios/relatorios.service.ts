import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type DreVeiculoRow = {
  veiculoId: string;
  placa: string;
  competencia: Date;
  receita: number;
  custo: number;
  resultado: number;
};

export type DreConsolidadoRow = {
  competencia: Date;
  receita: number;
  custo: number;
  resultado: number;
  qtdVeiculos: number;
};

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  private competenciaIntervalo(competencia: string): { inicio: Date; fim: Date } | null {
    const [y, m] = competencia.split("-").map(Number);
    if (!y || !m) return null;
    return {
      inicio: new Date(Date.UTC(y, m - 1, 1)),
      fim: new Date(Date.UTC(y, m, 1)),
    };
  }

  async getDreVeiculo(
    companyId: string,
    opts: { competencia?: string; veiculoId?: string }
  ): Promise<DreVeiculoRow[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"companyId" = ${companyId}`];
    if (opts.veiculoId) {
      conditions.push(Prisma.sql`"veiculoId" = ${opts.veiculoId}`);
    }
    if (opts.competencia) {
      const intervalo = this.competenciaIntervalo(opts.competencia);
      if (intervalo) {
        conditions.push(Prisma.sql`competencia >= ${intervalo.inicio}`);
        conditions.push(Prisma.sql`competencia < ${intervalo.fim}`);
      }
    }
    const where = Prisma.join(conditions, " AND ");
    const rows = await this.prisma.$queryRaw<
      Array<{
        veiculoId: string;
        placa: string;
        competencia: Date;
        receita: Prisma.Decimal;
        custo: Prisma.Decimal;
        resultado: Prisma.Decimal;
      }>
    >(Prisma.sql`
      SELECT "veiculoId", placa, competencia, receita, custo, resultado
        FROM mv_dre_veiculo
       WHERE ${where}
       ORDER BY competencia DESC, placa ASC
    `);
    return rows.map((r) => ({
      veiculoId: r.veiculoId,
      placa: r.placa,
      competencia: r.competencia,
      receita: Number(r.receita),
      custo: Number(r.custo),
      resultado: Number(r.resultado),
    }));
  }

  async getDreConsolidado(companyId: string, competencia?: string): Promise<DreConsolidadoRow[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"companyId" = ${companyId}`];
    if (competencia) {
      const intervalo = this.competenciaIntervalo(competencia);
      if (intervalo) {
        conditions.push(Prisma.sql`competencia >= ${intervalo.inicio}`);
        conditions.push(Prisma.sql`competencia < ${intervalo.fim}`);
      }
    }
    const where = Prisma.join(conditions, " AND ");
    const rows = await this.prisma.$queryRaw<
      Array<{
        competencia: Date;
        receita: Prisma.Decimal;
        custo: Prisma.Decimal;
        resultado: Prisma.Decimal;
        qtdVeiculos: bigint;
      }>
    >(Prisma.sql`
      SELECT
        competencia,
        SUM(receita) AS receita,
        SUM(custo) AS custo,
        SUM(resultado) AS resultado,
        COUNT(DISTINCT "veiculoId") AS "qtdVeiculos"
      FROM mv_dre_veiculo
      WHERE ${where}
      GROUP BY competencia
      ORDER BY competencia DESC
    `);
    return rows.map((r) => ({
      competencia: r.competencia,
      receita: Number(r.receita),
      custo: Number(r.custo),
      resultado: Number(r.resultado),
      qtdVeiculos: Number(r.qtdVeiculos),
    }));
  }

  async getRankingRotas(companyId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        rotaId: string;
        codigo: string;
        descricao: string;
        totalViagens: number;
        margemMedia: Prisma.Decimal | null;
        kmTotal: Prisma.Decimal | null;
        posicao: number;
      }>
    >(Prisma.sql`
      SELECT "rotaId", codigo, descricao, "totalViagens", "margemMedia", "kmTotal", posicao
        FROM vw_ranking_rotas
       WHERE "companyId" = ${companyId}
       ORDER BY posicao ASC
       LIMIT 100
    `);
    return rows.map((r) => ({
      ...r,
      margemMedia: r.margemMedia != null ? Number(r.margemMedia) : null,
      kmTotal: r.kmTotal != null ? Number(r.kmTotal) : null,
    }));
  }

  async getRankingMotoristas(companyId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        motoristaId: string;
        nome: string;
        totalViagens: number;
        totalComissao: Prisma.Decimal;
        posicao: number;
      }>
    >(Prisma.sql`
      SELECT "motoristaId", nome, "totalViagens", "totalComissao", posicao
        FROM vw_ranking_motoristas
       WHERE "companyId" = ${companyId}
       ORDER BY posicao ASC
       LIMIT 100
    `);
    return rows.map((r) => ({
      ...r,
      totalComissao: Number(r.totalComissao),
    }));
  }

  async refreshDreVeiculo() {
    await this.prisma.$executeRaw`SELECT refresh_mv_dre_veiculo()`;
    return { ok: true, refreshedAt: new Date().toISOString() };
  }

  /** Meses com dados na mv_dre_veiculo (para auto-seleção no frontend). */
  async getDreCompetencias(companyId: string, veiculoId?: string) {
    const conditions: Prisma.Sql[] = [Prisma.sql`"companyId" = ${companyId}`];
    if (veiculoId) {
      conditions.push(Prisma.sql`"veiculoId" = ${veiculoId}`);
    }
    const where = Prisma.join(conditions, " AND ");
    const rows = await this.prisma.$queryRaw<Array<{ competencia: Date }>>(Prisma.sql`
      SELECT DISTINCT competencia
        FROM mv_dre_veiculo
       WHERE ${where}
       ORDER BY competencia DESC
       LIMIT 24
    `);
    return rows.map((r) => {
      const d = new Date(r.competencia);
      return {
        competencia: d.toISOString(),
        mes: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      };
    });
  }
}
