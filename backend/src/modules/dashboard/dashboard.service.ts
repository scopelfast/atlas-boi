import { Injectable } from "@nestjs/common";
import { CarregamentoStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const ATIVOS: CarregamentoStatus[] = [
  CarregamentoStatus.PLANEJADO,
  CarregamentoStatus.EMBARCADO,
  CarregamentoStatus.EM_TRANSITO,
];

const EM_TRANSITO: CarregamentoStatus[] = [
  CarregamentoStatus.EMBARCADO,
  CarregamentoStatus.EM_TRANSITO,
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpis(companyId: string) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const baseWhere = { companyId, status: { not: CarregamentoStatus.CANCELADO } };

    const [carregamentosAtivos, animaisAgg, margemAgg, carregamentosMes, recentes] = await Promise.all([
      this.prisma.carregamento.count({
        where: { ...baseWhere, status: { in: ATIVOS } },
      }),
      this.prisma.carregamento.aggregate({
        where: { ...baseWhere, status: { in: EM_TRANSITO } },
        _sum: { quantidadeAnimais: true },
      }),
      this.prisma.carregamento.aggregate({
        where: { ...baseWhere, margemOperacional: { not: null } },
        _avg: { margemOperacional: true },
        _sum: { margemOperacional: true },
      }),
      this.prisma.carregamento.count({
        where: { ...baseWhere, createdAt: { gte: inicioMes } },
      }),
      this.prisma.carregamento.findMany({
        where: baseWhere,
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          numero: true,
          status: true,
          quantidadeAnimais: true,
          margemBruta: true,
          margemLiquida: true,
          margemOperacional: true,
          valorFreteCliente: true,
          valorFreteLiquido: true,
          clienteOrigem: { select: { cidade: true, uf: true } },
          clienteDestino: { select: { cidade: true, uf: true } },
          motoristas: {
            take: 1,
            orderBy: { principal: "desc" },
            select: { motorista: { select: { id: true, nome: true } } },
          },
          veiculos: {
            take: 1,
            orderBy: { principal: "desc" },
            select: { veiculo: { select: { id: true, placa: true } } },
          },
        },
      }),
    ]);

    const porStatus = await this.prisma.carregamento.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { id: true },
    });

    return {
      carregamentosAtivos,
      animaisEmTransito: animaisAgg._sum.quantidadeAnimais ?? 0,
      margemMedia:
        margemAgg._avg.margemOperacional != null ? Number(margemAgg._avg.margemOperacional) : null,
      margemTotal:
        margemAgg._sum.margemOperacional != null ? Number(margemAgg._sum.margemOperacional) : null,
      carregamentosMes,
      porStatus: porStatus.map((r) => ({ status: r.status, total: r._count.id })),
      recentes: recentes.map((r) => ({
        ...r,
        margemBruta:
          r.margemOperacional != null
            ? Number(r.margemOperacional)
            : r.margemLiquida != null
              ? Number(r.margemLiquida)
              : r.margemBruta != null
                ? Number(r.margemBruta)
                : null,
        margemOperacional: r.margemOperacional != null ? Number(r.margemOperacional) : null,
        valorFreteCliente:
          r.valorFreteLiquido != null
            ? Number(r.valorFreteLiquido)
            : r.valorFreteCliente != null
              ? Number(r.valorFreteCliente)
              : null,
      })),
    };
  }
}
