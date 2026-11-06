import { Injectable, BadRequestException } from "@nestjs/common";
import { CarregamentoStatus, Prisma } from "@prisma/client";
import { calcularSaldoCcMotorista } from "../financeiro/financeiro-liquidos";
import { PrismaService } from "../../prisma/prisma.service";
import type { QueryBrainResult } from "./intelligence.types";

type Template = {
  id: string;
  patterns: RegExp[];
  run: (companyId: string, pergunta: string, prisma: PrismaService) => Promise<QueryBrainResult>;
};

@Injectable()
export class QueryBrainService {
  constructor(private prisma: PrismaService) {}

  private templates: Template[] = [
    {
      id: "carregamentos-ativos",
      patterns: [/carregamento.*ativ/i, /carregamento.*tr[aâ]nsito/i, /quantos.*viagem/i, /viagens.*andamento/i],
      run: async (companyId, pergunta) => {
        const total = await this.prisma.carregamento.count({
          where: {
            companyId,
            status: {
              in: [
                CarregamentoStatus.PLANEJADO,
                CarregamentoStatus.EMBARCADO,
                CarregamentoStatus.EM_TRANSITO,
              ],
            },
          },
        });
        return {
          pergunta,
          intencao: "carregamentos_ativos",
          resposta: `Há ${total} carregamento(s) ativo(s) (planejado → em trânsito).`,
          valor: total,
        };
      },
    },
    {
      id: "animais-transito",
      patterns: [/animais?/i, /cabe[cç]as?/i, /gado/i, /quantos.*em\s+tr[aâ]nsito/i],
      run: async (companyId, pergunta) => {
        const agg = await this.prisma.carregamento.aggregate({
          where: {
            companyId,
            status: { in: [CarregamentoStatus.EMBARCADO, CarregamentoStatus.EM_TRANSITO] },
          },
          _sum: { quantidadeAnimais: true },
        });
        const total = agg._sum.quantidadeAnimais ?? 0;
        return {
          pergunta,
          intencao: "animais_transito",
          resposta: `${total} animais em trânsito ou embarcados agora.`,
          valor: total,
        };
      },
    },
    {
      id: "faturamento-mes",
      patterns: [/fatur/i, /receita/i, /quanto.*faturei/i, /faturamento/i],
      run: async (companyId, pergunta) => {
        const inicio = new Date();
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        const agg = await this.prisma.carregamento.aggregate({
          where: {
            companyId,
            status: { not: CarregamentoStatus.CANCELADO },
            dataEmbarque: { gte: inicio },
          },
          _sum: { valorReceitaLiquida: true, valorFreteCliente: true },
        });
        const total = Number(agg._sum.valorReceitaLiquida ?? agg._sum.valorFreteCliente ?? 0);
        const mes = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return {
          pergunta,
          intencao: "faturamento_mes",
          resposta: `Faturamento (embarques) em ${mes}: ${this.money(total)}.`,
          valor: total,
        };
      },
    },
    {
      id: "motorista-saldo-negativo",
      patterns: [/motorista.*saldo/i, /saldo.*negativ/i, /devo.*motorista/i],
      run: async (companyId, pergunta) => {
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
            m.id, m.nome,
            COALESCE(SUM(CASE WHEN l.tipo = 'ADIANTAMENTO' THEN l.valor::numeric ELSE 0 END), 0) AS adiantamentos,
            COALESCE(SUM(CASE WHEN l.tipo = 'DESPESA_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS despesas,
            COALESCE(SUM(CASE WHEN l.tipo = 'REEMBOLSO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS reembolsos,
            COALESCE(SUM(CASE WHEN l.tipo = 'COMISSAO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS comissoes,
            COALESCE(SUM(CASE WHEN l.tipo = 'ACERTO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS acertos,
            COALESCE(SUM(CASE WHEN l.tipo = 'DESCONTO_COMISSAO_MOTORISTA' THEN l.valor::numeric ELSE 0 END), 0) AS descontos_comissao,
            COALESCE(SUM(CASE WHEN l.tipo = 'PRESTACAO_CONTAS' THEN l.valor::numeric ELSE 0 END), 0) AS prestacoes
          FROM "Motorista" m
          LEFT JOIN "LancamentoFinanceiro" l
            ON l."motoristaId" = m.id AND l."companyId" = ${companyId} AND l.status = 'CONFIRMADO'
          WHERE m."companyId" = ${companyId} AND m.ativo = true
          GROUP BY m.id, m.nome
        `;
        const negativos = rows
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
            return { nome: r.nome, saldo };
          })
          .filter((r) => r.saldo < -100)
          .sort((a, b) => a.saldo - b.saldo)
          .slice(0, 10);
        const itens = negativos.map((r) => ({ label: r.nome, valor: Math.abs(r.saldo) }));
        return {
          pergunta,
          intencao: "motoristas_saldo_negativo",
          resposta:
            negativos.length === 0
              ? "Nenhum motorista com saldo negativo relevante na conta corrente."
              : `${negativos.length} motorista(s) com saldo a pagar: ${negativos.map((r) => `${r.nome} (${this.money(r.saldo)})`).join("; ")}.`,
          dados: negativos,
          grafico:
            itens.length > 0
              ? { tipo: "bar", titulo: "Saldo a pagar (motoristas)", itens }
              : undefined,
        };
      },
    },
    {
      id: "comissao-motorista",
      patterns: [/comiss[aã]o.*motorista/i, /quanto.*(jo[aã]o|silva|motorista)/i],
      run: async (companyId, pergunta, prisma) => {
        const nome = this.extractNome(pergunta);
        if (!nome) {
          throw new BadRequestException("Informe o nome do motorista na pergunta.");
        }
        const mot = await prisma.motorista.findFirst({
          where: { companyId, ativo: true, nome: { contains: nome, mode: "insensitive" } },
        });
        if (!mot) {
          return {
            pergunta,
            intencao: "comissao_motorista",
            resposta: `Motorista "${nome}" não encontrado.`,
          };
        }
        const agg = await prisma.lancamentoFinanceiro.aggregate({
          where: {
            companyId,
            motoristaId: mot.id,
            tipo: "COMISSAO_MOTORISTA",
            status: "CONFIRMADO",
          },
          _sum: { valor: true },
        });
        const total = Number(agg._sum.valor ?? 0);
        return {
          pergunta,
          intencao: "comissao_motorista",
          resposta: `Comissões confirmadas de ${mot.nome}: ${this.money(total)}.`,
          valor: total,
        };
      },
    },
    {
      id: "ranking-rotas",
      patterns: [/rota.*preju/i, /pior.*rota/i, /melhor.*rota/i, /ranking.*rota/i],
      run: async (companyId, pergunta) => {
        const rows = await this.prisma.$queryRaw<
          Array<{ codigo: string; descricao: string; margemMedia: Prisma.Decimal; totalViagens: number }>
        >(Prisma.sql`
          SELECT codigo, descricao, "margemMedia", "totalViagens"
            FROM vw_ranking_rotas
           WHERE "companyId" = ${companyId}
           ORDER BY "margemMedia" ASC NULLS LAST
           LIMIT 5
        `);
        const pior = rows[0];
        const itens = rows.map((r) => ({
          label: r.codigo,
          valor: Number(r.margemMedia ?? 0),
        }));
        return {
          pergunta,
          intencao: "ranking_rotas_margem",
          resposta: pior
            ? `Rota com menor margem média: ${pior.codigo} (${pior.descricao}) — ${this.money(Number(pior.margemMedia ?? 0))} em ${pior.totalViagens} viagens.`
            : "Sem rotas ranqueadas ainda.",
          dados: rows.map((r) => ({
            codigo: r.codigo,
            margemMedia: Number(r.margemMedia),
            viagens: r.totalViagens,
          })),
          grafico: itens.length ? { tipo: "bar", titulo: "Margem média por rota (menores)", itens } : undefined,
        };
      },
    },
    {
      id: "dre-consolidado",
      patterns: [/dre/i, /resultado.*m[eê]s/i, /lucro.*m[eê]s/i],
      run: async (companyId, pergunta) => {
        const rows = await this.prisma.$queryRaw<
          Array<{ competencia: Date; receita: Prisma.Decimal; custo: Prisma.Decimal; resultado: Prisma.Decimal }>
        >(Prisma.sql`
          SELECT competencia,
                 SUM(receita) AS receita,
                 SUM(custo) AS custo,
                 SUM(resultado) AS resultado
            FROM mv_dre_veiculo
           WHERE "companyId" = ${companyId}
           GROUP BY competencia
           ORDER BY competencia DESC
           LIMIT 6
        `);
        const ultimo = rows[0];
        const itens = [...rows].reverse().map((r) => ({
          label: new Date(r.competencia).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          valor: Number(r.resultado),
        }));
        return {
          pergunta,
          intencao: "dre_historico",
          resposta: ultimo
            ? `Última competência DRE: resultado ${this.money(Number(ultimo.resultado))} (receita ${this.money(Number(ultimo.receita))}, custo ${this.money(Number(ultimo.custo))}).`
            : "Sem dados na mv_dre_veiculo — apure carregamentos e recalcule o DRE.",
          grafico: itens.length ? { tipo: "bar", titulo: "Resultado DRE por competência", itens } : undefined,
        };
      },
    },
    {
      id: "a-receber",
      patterns: [/receber/i, /cobran[cç]a/i, /inadimpl/i, /cliente.*deve/i],
      run: async (companyId, pergunta) => {
        const rows = await this.prisma.$queryRaw<
          Array<{ nome: string; saldo: number }>
        >`
          SELECT c.nome,
                 COALESCE(SUM(CASE WHEN l.tipo IN ('FRETE_CLIENTE', 'PEDAGIO_CLIENTE', 'BALANCA_CLIENTE', 'OUTROS_CLIENTE') THEN l.valor::numeric ELSE 0 END), 0)
                 - COALESCE(SUM(CASE WHEN l.tipo = 'ABATIMENTO_FRETE_CLIENTE' THEN l.valor::numeric ELSE 0 END), 0)
                 - COALESCE(SUM(CASE WHEN l.tipo = 'RECEITA' THEN l.valor::numeric ELSE 0 END), 0) AS saldo
            FROM "Cliente" c
            LEFT JOIN "LancamentoFinanceiro" l
              ON l."clienteId" = c.id AND l."companyId" = c."companyId" AND l.status = 'CONFIRMADO'
           WHERE c."companyId" = ${companyId} AND c.ativo = true
           GROUP BY c.id, c.nome
        `;
        const total = rows.reduce((s, r) => s + Math.max(0, Number(r.saldo)), 0);
        return {
          pergunta,
          intencao: "contas_receber",
          resposta: `Total a receber de clientes: ${this.money(total)}.`,
          valor: total,
        };
      },
    },
  ];

  async perguntar(companyId: string, pergunta: string): Promise<QueryBrainResult> {
    const q = pergunta.trim();
    if (q.length < 4) {
      throw new BadRequestException("Pergunta muito curta.");
    }

    for (const tpl of this.templates) {
      if (tpl.patterns.some((p) => p.test(q))) {
        return tpl.run(companyId, q, this.prisma);
      }
    }

    return {
      pergunta: q,
      intencao: "desconhecida",
      resposta:
        "Não entendi a pergunta. Tente: «quantos carregamentos ativos?», «quantos animais em trânsito?», «faturamento do mês», «motoristas com saldo negativo», «qual rota deu mais prejuízo?», «DRE do mês».",
    };
  }

  async runByTemplateId(
    companyId: string,
    pergunta: string,
    templateId: string
  ): Promise<QueryBrainResult | null> {
    const tpl = this.templates.find((t) => t.id === templateId);
    if (!tpl) return null;
    return tpl.run(companyId, pergunta, this.prisma);
  }

  getExemplos(): string[] {
    return [
      "Quantos carregamentos ativos temos?",
      "Quantos animais estão em trânsito?",
      "Qual o faturamento do mês?",
      "Quais motoristas estão com saldo negativo?",
      "Qual rota deu mais prejuízo?",
      "Como está o DRE?",
      "Quanto temos a receber dos clientes?",
    ];
  }

  private money(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  private extractNome(pergunta: string): string | null {
    const m = pergunta.match(
      /(?:jo[aã]o|jos[eé]|maria|silva|santos|oliveira|motorista)\s+[\wà-ú]+|[\wà-ú]{3,}/i
    );
    if (!m) return null;
    const stop = ["quanto", "comissao", "comissão", "faturou", "motorista", "receita"];
    const token = m[0].trim();
    if (stop.includes(token.toLowerCase())) return null;
    return token.length >= 3 ? token : null;
  }
}
