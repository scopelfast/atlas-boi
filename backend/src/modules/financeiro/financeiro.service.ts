import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CarregamentoEventoTipo,
  CarregamentoStatus,
  LancamentoNatureza,
  LancamentoStatus,
  LancamentoTipo,
  Prisma,
} from "@prisma/client";
import { createReadStream } from "fs";
import { PrismaService } from "../../prisma/prisma.service";
import { deleteStoredFile, resolveUploadPath } from "../../common/utils/carregamento-uploads";
import { mimeComprovante, saveLancamentoComprovante } from "../../common/utils/financeiro-uploads";
import {
  agregarCcMotorista,
  calcularSaldoCcMotorista,
  calcularValoresLiquidos,
  somaDescontosComissaoMotoristas,
  calcularMargemOperacional,
  somaComissaoLancamentos,
  classificarCustosVeiculo,
  calcularReceitaOperacional,
  cobrancaLiquidaCliente,
} from "./financeiro-liquidos";
import { buildDetalheComissaoMotorista, buildDetalheFrete } from "./financeiro-detalhe";

const TIPOS_CC_MOTORISTA: LancamentoTipo[] = [
  LancamentoTipo.ADIANTAMENTO,
  LancamentoTipo.DESPESA_MOTORISTA,
  LancamentoTipo.REEMBOLSO_MOTORISTA,
  LancamentoTipo.PRESTACAO_CONTAS,
  LancamentoTipo.COMISSAO_MOTORISTA,
  LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
  LancamentoTipo.ACERTO_MOTORISTA,
];

const TIPOS_CLIENTE: LancamentoTipo[] = [
  LancamentoTipo.FRETE_CLIENTE,
  LancamentoTipo.ABATIMENTO_FRETE_CLIENTE,
  LancamentoTipo.PEDAGIO_CLIENTE,
  LancamentoTipo.BALANCA_CLIENTE,
  LancamentoTipo.OUTROS_CLIENTE,
];

const TIPOS_VEICULO: LancamentoTipo[] = [
  LancamentoTipo.COMBUSTIVEL,
  LancamentoTipo.MANUTENCAO,
  LancamentoTipo.PNEU,
  LancamentoTipo.SEGURO,
  LancamentoTipo.IPVA_LICENCIAMENTO,
  LancamentoTipo.MULTA,
  LancamentoTipo.DEPRECIACAO,
  LancamentoTipo.OUTROS_VEICULO,
];

export type FinanceiroEntidadeFiltro = "motorista" | "cliente" | "veiculo";

function tiposPorEntidade(entidade: FinanceiroEntidadeFiltro): LancamentoTipo[] {
  if (entidade === "motorista") return TIPOS_CC_MOTORISTA;
  if (entidade === "cliente") return TIPOS_CLIENTE;
  return TIPOS_VEICULO;
}

const NATUREZA_POR_TIPO: Record<LancamentoTipo, LancamentoNatureza> = {
  ADIANTAMENTO: LancamentoNatureza.CREDITO,
  REEMBOLSO_MOTORISTA: LancamentoNatureza.CREDITO,
  COMISSAO_MOTORISTA: LancamentoNatureza.CREDITO,
  DESCONTO_COMISSAO_MOTORISTA: LancamentoNatureza.DEBITO,
  DESPESA_MOTORISTA: LancamentoNatureza.DEBITO,
  PRESTACAO_CONTAS: LancamentoNatureza.DEBITO,
  ACERTO_MOTORISTA: LancamentoNatureza.DEBITO,
  FRETE_CLIENTE: LancamentoNatureza.DEBITO,
  ABATIMENTO_FRETE_CLIENTE: LancamentoNatureza.CREDITO,
  PEDAGIO_CLIENTE: LancamentoNatureza.DEBITO,
  BALANCA_CLIENTE: LancamentoNatureza.DEBITO,
  OUTROS_CLIENTE: LancamentoNatureza.DEBITO,
  COMBUSTIVEL: LancamentoNatureza.DEBITO,
  MANUTENCAO: LancamentoNatureza.DEBITO,
  PNEU: LancamentoNatureza.DEBITO,
  SEGURO: LancamentoNatureza.DEBITO,
  IPVA_LICENCIAMENTO: LancamentoNatureza.DEBITO,
  MULTA: LancamentoNatureza.DEBITO,
  DEPRECIACAO: LancamentoNatureza.DEBITO,
  OUTROS_VEICULO: LancamentoNatureza.DEBITO,
  RECEITA: LancamentoNatureza.CREDITO,
  DESPESA: LancamentoNatureza.DEBITO,
  TRANSFERENCIA: LancamentoNatureza.DEBITO,
};

export type CreateLancamentoDto = {
  tipo: LancamentoTipo;
  valor: number;
  descricao: string;
  dataLancamento?: string;
  dataCompetencia?: string;
  carregamentoId?: string;
  motoristaId?: string;
  clienteId?: string;
  veiculoId?: string;
  observacoes?: string;
  apenasLancamento?: boolean;
  status?: LancamentoStatus;
  categoriaCustoVeiculo?: LancamentoTipo;
  formaPagamentoMotorista?: "ADIANTAMENTO" | "DO_BOLSO";
};

const CATEGORIAS_CUSTO_VIAGEM: LancamentoTipo[] = [
  LancamentoTipo.COMBUSTIVEL,
  LancamentoTipo.MANUTENCAO,
  LancamentoTipo.PNEU,
  LancamentoTipo.MULTA,
];

const includeList = {
  motorista: { select: { id: true, nome: true } },
  cliente: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true } },
  carregamento: { select: { id: true, numero: true } },
  criadoPor: { select: { id: true, name: true } },
} satisfies Prisma.LancamentoFinanceiroInclude;

const TIPOS_PRESTACAO_VIAGEM: LancamentoTipo[] = [
  LancamentoTipo.ADIANTAMENTO,
  LancamentoTipo.DESPESA_MOTORISTA,
  LancamentoTipo.REEMBOLSO_MOTORISTA,
  LancamentoTipo.COMISSAO_MOTORISTA,
  LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
  LancamentoTipo.PRESTACAO_CONTAS,
  LancamentoTipo.ACERTO_MOTORISTA,
];

const TIPOS_COBRANCA_CLIENTE: LancamentoTipo[] = [
  LancamentoTipo.FRETE_CLIENTE,
  LancamentoTipo.PEDAGIO_CLIENTE,
  LancamentoTipo.BALANCA_CLIENTE,
  LancamentoTipo.OUTROS_CLIENTE,
];

const TIPOS_ABATIMENTO_CLIENTE: LancamentoTipo[] = [LancamentoTipo.ABATIMENTO_FRETE_CLIENTE];

const TIPOS_LANCAMENTO_CLIENTE: LancamentoTipo[] = [
  ...TIPOS_COBRANCA_CLIENTE,
  ...TIPOS_ABATIMENTO_CLIENTE,
  LancamentoTipo.RECEITA,
];

const TIPOS_CC_VEICULO: LancamentoTipo[] = [
  LancamentoTipo.COMBUSTIVEL,
  LancamentoTipo.MANUTENCAO,
  LancamentoTipo.PNEU,
  LancamentoTipo.SEGURO,
  LancamentoTipo.IPVA_LICENCIAMENTO,
  LancamentoTipo.MULTA,
  LancamentoTipo.DEPRECIACAO,
  LancamentoTipo.OUTROS_VEICULO,
];

type ComissaoSqlRow = { motorista_id: string; valor: Prisma.Decimal | number };

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService) {}

  private parseDate(v?: string, fallback = new Date()) {
    if (!v?.trim()) return fallback;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Data inválida");
    return d;
  }

  private validateVinculos(tipo: LancamentoTipo, dto: CreateLancamentoDto) {
    const motoristaTipos: LancamentoTipo[] = [
      LancamentoTipo.ADIANTAMENTO,
      LancamentoTipo.DESPESA_MOTORISTA,
      LancamentoTipo.REEMBOLSO_MOTORISTA,
      LancamentoTipo.PRESTACAO_CONTAS,
      LancamentoTipo.COMISSAO_MOTORISTA,
      LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
      LancamentoTipo.ACERTO_MOTORISTA,
    ];
    const clienteTipos: LancamentoTipo[] = [
      LancamentoTipo.FRETE_CLIENTE,
      LancamentoTipo.ABATIMENTO_FRETE_CLIENTE,
      LancamentoTipo.PEDAGIO_CLIENTE,
      LancamentoTipo.BALANCA_CLIENTE,
      LancamentoTipo.OUTROS_CLIENTE,
    ];
    const veiculoTipos: LancamentoTipo[] = [
      LancamentoTipo.COMBUSTIVEL,
      LancamentoTipo.MANUTENCAO,
      LancamentoTipo.PNEU,
      LancamentoTipo.SEGURO,
      LancamentoTipo.IPVA_LICENCIAMENTO,
      LancamentoTipo.MULTA,
      LancamentoTipo.DEPRECIACAO,
      LancamentoTipo.OUTROS_VEICULO,
    ];

    if (motoristaTipos.includes(tipo) && !dto.motoristaId) {
      throw new BadRequestException("Motorista é obrigatório para este tipo de lançamento");
    }
    if (clienteTipos.includes(tipo) && !dto.clienteId) {
      throw new BadRequestException("Cliente é obrigatório para este tipo de lançamento");
    }
    if (veiculoTipos.includes(tipo) && !dto.veiculoId) {
      throw new BadRequestException("Veículo é obrigatório para este tipo de lançamento");
    }
    if (!dto.valor || dto.valor <= 0) {
      throw new BadRequestException("Valor deve ser maior que zero");
    }
    if (!dto.descricao?.trim()) {
      throw new BadRequestException("Descrição é obrigatória");
    }
    if (!dto.apenasLancamento && !dto.carregamentoId) {
      throw new BadRequestException(
        "Carregamento (embarque) é obrigatório — todo lançamento deve referenciar um embarque."
      );
    }
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      tipo?: LancamentoTipo;
      status?: LancamentoStatus;
      motoristaId?: string;
      carregamentoId?: string;
      clienteId?: string;
      veiculoId?: string;
      entidade?: FinanceiroEntidadeFiltro;
    }
  ) {
    const skip = (page - 1) * limit;
    const tiposEntidade =
      filters?.entidade && !filters?.tipo ? tiposPorEntidade(filters.entidade) : null;
    const where: Prisma.LancamentoFinanceiroWhereInput = {
      companyId,
      ...(filters?.tipo ? { tipo: filters.tipo } : tiposEntidade ? { tipo: { in: tiposEntidade } } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.motoristaId ? { motoristaId: filters.motoristaId } : {}),
      ...(filters?.carregamentoId ? { carregamentoId: filters.carregamentoId } : {}),
      ...(filters?.clienteId ? { clienteId: filters.clienteId } : {}),
      ...(filters?.veiculoId ? { veiculoId: filters.veiculoId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { descricao: { contains: filters.search, mode: "insensitive" } },
              { motorista: { nome: { contains: filters.search, mode: "insensitive" } } },
              { cliente: { nome: { contains: filters.search, mode: "insensitive" } } },
              { carregamento: { numero: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.lancamentoFinanceiro.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataLancamento: "desc" },
        include: includeList,
      }),
      this.prisma.lancamentoFinanceiro.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const row = await this.prisma.lancamentoFinanceiro.findFirst({
      where: { id, companyId },
      include: includeList,
    });
    if (!row) throw new NotFoundException("Lançamento não encontrado");
    return row;
  }

  async create(companyId: string, userId: string | undefined, dto: CreateLancamentoDto) {
    if (
      dto.tipo === LancamentoTipo.DESPESA_MOTORISTA &&
      dto.categoriaCustoVeiculo &&
      CATEGORIAS_CUSTO_VIAGEM.includes(dto.categoriaCustoVeiculo)
    ) {
      return this.createDespesaViagemMotorista(companyId, userId, dto);
    }

    this.validateVinculos(dto.tipo, dto);
    const natureza = NATUREZA_POR_TIPO[dto.tipo];
    const dataLancamento = this.parseDate(dto.dataLancamento);
    const dataCompetencia = this.parseDate(dto.dataCompetencia, dataLancamento);

    if (dto.motoristaId) {
      await this.prisma.motorista.findFirstOrThrow({
        where: { id: dto.motoristaId, companyId, ativo: true },
      });
    }
    if (dto.clienteId) {
      await this.prisma.cliente.findFirstOrThrow({
        where: { id: dto.clienteId, companyId, ativo: true },
      });
    }
    if (dto.veiculoId) {
      await this.prisma.veiculo.findFirstOrThrow({
        where: { id: dto.veiculoId, companyId, ativo: true },
      });
    }
    if (dto.carregamentoId) {
      const car = await this.prisma.carregamento.findFirstOrThrow({
        where: { id: dto.carregamentoId, companyId },
      });
      if (car.financeiroFechadoAt && (dto.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE || dto.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA)) {
        throw new BadRequestException("Financeiro fechado — não é possível registrar descontos");
      }
    }

    const row = await this.prisma.lancamentoFinanceiro.create({
      data: {
        companyId,
        tipo: dto.tipo,
        natureza,
        status: dto.status ?? LancamentoStatus.CONFIRMADO,
        valor: dto.valor,
        dataLancamento,
        dataCompetencia,
        descricao: dto.descricao.trim(),
        carregamentoId: dto.carregamentoId ?? null,
        motoristaId: dto.motoristaId ?? null,
        clienteId: dto.clienteId ?? null,
        veiculoId: dto.veiculoId ?? null,
        observacoes: dto.observacoes?.trim() || null,
        apenasLancamento: dto.apenasLancamento ?? false,
        criadoPorId: userId ?? null,
      },
      include: includeList,
    });

    if (
      dto.carregamentoId &&
      (dto.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE ||
        dto.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA ||
        this.lancamentoAlteraMargemCarregamento(dto.tipo))
    ) {
      if (
        dto.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE ||
        dto.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA
      ) {
        await this.syncDescontosFromLancamentos(dto.carregamentoId, companyId);
      } else {
        await this.recalcularLiquidosCarregamento(dto.carregamentoId, companyId);
      }
    }

    return row;
  }

  /** Sincroniza campos de desconto do carregamento a partir dos lançamentos confirmados. */
  private async syncDescontosFromLancamentos(carregamentoId: string, companyId: string) {
    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: {
          in: [LancamentoTipo.ABATIMENTO_FRETE_CLIENTE, LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA],
        },
      },
      select: { tipo: true, valor: true, motoristaId: true, descricao: true, observacoes: true },
    });

    const descontoFrete = lancamentos
      .filter((l) => l.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE)
      .reduce((s, l) => s + Number(l.valor), 0);

    const abatimento = lancamentos.find((l) => l.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE);

    await this.prisma.carregamento.update({
      where: { id: carregamentoId },
      data: {
        descontoFreteCliente: descontoFrete || null,
        motivoDescontoFrete: abatimento?.observacoes || abatimento?.descricao || null,
      },
    });

    const motoristas = await this.prisma.carregamentoMotorista.findMany({
      where: { carregamentoId },
    });

    for (const v of motoristas) {
      const descontos = lancamentos.filter(
        (l) =>
          l.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA && l.motoristaId === v.motoristaId
      );
      const total = descontos.reduce((s, l) => s + Number(l.valor), 0);
      const ultimo = descontos[descontos.length - 1];
      await this.prisma.carregamentoMotorista.update({
        where: { id: v.id },
        data: {
          descontoComissao: total || null,
          motivoDescontoComissao: ultimo?.observacoes || ultimo?.descricao || null,
        },
      });
    }

    await this.recalcularLiquidosCarregamento(carregamentoId, companyId);
  }

  /**
   * Despesa de viagem paga pelo motorista:
   * - CC motorista: DESPESA (abatido do adiantamento) ou REEMBOLSO (pago do bolso)
   * - Centro de custo veículo: lançamento espelhado (COMBUSTIVEL, PNEU, etc.) para DRE
   */
  private async createDespesaViagemMotorista(
    companyId: string,
    userId: string | undefined,
    dto: CreateLancamentoDto
  ) {
    const categoria = dto.categoriaCustoVeiculo!;
    if (!CATEGORIAS_CUSTO_VIAGEM.includes(categoria)) {
      throw new BadRequestException("Categoria de custo inválida para despesa de viagem");
    }
    if (!dto.motoristaId) {
      throw new BadRequestException("Motorista é obrigatório");
    }
    if (!dto.veiculoId) {
      throw new BadRequestException("Placa (centro de custo) é obrigatória — selecione tracionador ou carreta");
    }
    if (!dto.carregamentoId) {
      throw new BadRequestException("Carregamento (embarque) é obrigatório");
    }
    if (!dto.valor || dto.valor <= 0) {
      throw new BadRequestException("Valor deve ser maior que zero");
    }
    if (!dto.descricao?.trim()) {
      throw new BadRequestException("Descrição é obrigatória");
    }

    const forma = dto.formaPagamentoMotorista ?? "ADIANTAMENTO";
    const tipoMotorista =
      forma === "DO_BOLSO" ? LancamentoTipo.REEMBOLSO_MOTORISTA : LancamentoTipo.DESPESA_MOTORISTA;

    await this.prisma.motorista.findFirstOrThrow({
      where: { id: dto.motoristaId, companyId, ativo: true },
    });
    await this.prisma.veiculo.findFirstOrThrow({
      where: { id: dto.veiculoId, companyId, ativo: true },
    });
    await this.prisma.carregamento.findFirstOrThrow({
      where: { id: dto.carregamentoId, companyId },
    });

    const vinculoVeiculo = await this.prisma.carregamentoVeiculo.findFirst({
      where: { carregamentoId: dto.carregamentoId, veiculoId: dto.veiculoId },
    });
    if (!vinculoVeiculo) {
      throw new BadRequestException(
        "A placa selecionada não está vinculada a este embarque — escolha uma placa do conjunto do carregamento."
      );
    }

    const dataLancamento = this.parseDate(dto.dataLancamento);
    const dataCompetencia = this.parseDate(dto.dataCompetencia, dataLancamento);
    const obsBase = dto.observacoes?.trim() || null;

    const motoristaRow = await this.prisma.$transaction(async (tx) => {
      const row = await tx.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: tipoMotorista,
          natureza: NATUREZA_POR_TIPO[tipoMotorista],
          status: dto.status ?? LancamentoStatus.CONFIRMADO,
          valor: dto.valor,
          dataLancamento,
          dataCompetencia,
          descricao: dto.descricao.trim(),
          carregamentoId: dto.carregamentoId,
          motoristaId: dto.motoristaId,
          veiculoId: dto.veiculoId,
          observacoes: obsBase,
          apenasLancamento: false,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });

      await tx.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: categoria,
          natureza: LancamentoNatureza.DEBITO,
          status: dto.status ?? LancamentoStatus.CONFIRMADO,
          valor: dto.valor,
          dataLancamento,
          dataCompetencia,
          descricao: dto.descricao.trim(),
          carregamentoId: dto.carregamentoId,
          veiculoId: dto.veiculoId,
          motoristaId: null,
          observacoes: obsBase
            ? `${obsBase} · Espelho CC veículo (viagem motorista ${row.id.slice(-6)})`
            : `Espelho CC veículo — viagem motorista`,
          apenasLancamento: false,
          criadoPorId: userId ?? null,
        },
      });

      return row;
    });

    if (dto.carregamentoId) {
      await this.recalcularLiquidosCarregamento(dto.carregamentoId, companyId);
    }

    return motoristaRow;
  }

  async updateStatus(
    id: string,
    companyId: string,
    status: LancamentoStatus
  ) {
    const row = await this.findOne(id, companyId);
    const updated = await this.prisma.lancamentoFinanceiro.update({
      where: { id },
      data: { status },
      include: includeList,
    });

    if (
      row.carregamentoId &&
      (row.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE ||
        row.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA ||
        this.lancamentoAlteraMargemCarregamento(row.tipo))
    ) {
      if (
        row.tipo === LancamentoTipo.ABATIMENTO_FRETE_CLIENTE ||
        row.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA
      ) {
        await this.syncDescontosFromLancamentos(row.carregamentoId, companyId);
      } else {
        await this.recalcularLiquidosCarregamento(row.carregamentoId, companyId);
      }
    }

    return updated;
  }

  async saldoMotorista(companyId: string, motoristaId: string) {
    await this.prisma.motorista.findFirstOrThrow({
      where: { id: motoristaId, companyId },
    });

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        motoristaId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: { in: TIPOS_CC_MOTORISTA },
        apenasLancamento: false,
      },
      select: { tipo: true, valor: true },
    });

    const { saldo } = calcularSaldoCcMotorista(agregarCcMotorista(lancamentos));

    return { motoristaId, saldo };
  }

  async saldosMotoristas(companyId: string) {
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
      ORDER BY m.nome ASC
    `;

    return rows.map((r) => {
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
    });
  }

  async extratoMotorista(companyId: string, motoristaId: string, page = 1, limit = 50) {
    return this.findAll(companyId, page, limit, { motoristaId });
  }

  private cobrancaLiquidaCliente(lancamentos: { tipo: LancamentoTipo; valor: unknown }[]) {
    return cobrancaLiquidaCliente(lancamentos);
  }

  private async receitaLiquidaCarregamento(companyId: string, carregamentoId: string) {
    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: {
          in: [...TIPOS_COBRANCA_CLIENTE, ...TIPOS_ABATIMENTO_CLIENTE],
        },
      },
      select: { tipo: true, valor: true },
    });
    return cobrancaLiquidaCliente(lancamentos);
  }

  private lancamentoAlteraMargemCarregamento(tipo: LancamentoTipo) {
    return (
      TIPOS_COBRANCA_CLIENTE.includes(tipo) ||
      TIPOS_ABATIMENTO_CLIENTE.includes(tipo) ||
      tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA ||
      tipo === LancamentoTipo.DESPESA_MOTORISTA ||
      tipo === LancamentoTipo.COMISSAO_MOTORISTA ||
      TIPOS_CC_VEICULO.includes(tipo)
    );
  }

  private async custoVeiculoDiretoCarregamento(companyId: string, carregamentoId: string) {
    const veiculoLancRows = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        motoristaId: null,
        veiculoId: { not: null },
        tipo: { in: TIPOS_CC_VEICULO },
      },
      select: { valor: true, observacoes: true },
    });
    return classificarCustosVeiculo(veiculoLancRows).direto;
  }

  async recalcularLiquidosCarregamento(carregamentoId: string, companyId: string) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: { motoristas: true },
    });
    if (!c) return;

    const descontoComissaoTotal = somaDescontosComissaoMotoristas(c.motoristas);
    const liquidos = calcularValoresLiquidos({
      valorFreteCliente: c.valorFreteCliente != null ? Number(c.valorFreteCliente) : null,
      valorComissaoTotal: c.valorComissaoTotal != null ? Number(c.valorComissaoTotal) : null,
      valorPedagio: c.valorPedagio != null ? Number(c.valorPedagio) : null,
      valorBalanca: c.valorBalanca != null ? Number(c.valorBalanca) : null,
      descontoFreteCliente: c.descontoFreteCliente != null ? Number(c.descontoFreteCliente) : null,
      descontoComissaoTotal,
    });

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: {
          in: [
            LancamentoTipo.DESPESA_MOTORISTA,
            LancamentoTipo.COMISSAO_MOTORISTA,
            LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
          ],
        },
      },
      select: { tipo: true, valor: true },
    });

    let custoDespesasViagem = 0;
    let comissaoLancamentos = 0;
    for (const l of lancamentos) {
      const v = Number(l.valor);
      if (l.tipo === LancamentoTipo.DESPESA_MOTORISTA) custoDespesasViagem += v;
      else if (l.tipo === LancamentoTipo.COMISSAO_MOTORISTA) comissaoLancamentos += v;
      else if (l.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA) comissaoLancamentos -= v;
    }

    const comissaoParaMargem =
      comissaoLancamentos > 0
        ? comissaoLancamentos
        : liquidos.valorComissaoLiquida ??
          (c.valorComissaoTotal != null ? Number(c.valorComissaoTotal) : 0);

    const custoVeiculoDireto = await this.custoVeiculoDiretoCarregamento(companyId, carregamentoId);

    const lancamentosCliente = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: { in: [...TIPOS_COBRANCA_CLIENTE, ...TIPOS_ABATIMENTO_CLIENTE] },
      },
      select: { tipo: true, valor: true },
    });

    const valorReceitaLiquida = calcularReceitaOperacional({
      valorFreteLiquido:
        liquidos.valorFreteLiquido ??
        (c.valorFreteCliente != null ? Number(c.valorFreteCliente) : null),
      lancamentos: lancamentosCliente,
    });

    const operacional = calcularMargemOperacional({
      valorReceitaLiquida,
      valorFreteLiquido: liquidos.valorFreteLiquido,
      valorFreteCliente: c.valorFreteCliente != null ? Number(c.valorFreteCliente) : null,
      valorComissaoLiquida: comissaoParaMargem,
      custoDespesasViagem,
      custoVeiculoDireto,
    });

    const valorComissaoPersistida =
      comissaoLancamentos > 0 ? comissaoParaMargem : liquidos.valorComissaoLiquida;

    await this.prisma.carregamento.update({
      where: { id: carregamentoId },
      data: {
        descontoFreteCliente: liquidos.descontoFreteCliente,
        valorFreteLiquido: liquidos.valorFreteLiquido,
        valorReceitaLiquida,
        valorComissaoLiquida: valorComissaoPersistida,
        margemLiquida: liquidos.margemLiquida,
        custoDespesasViagem: operacional.custoDespesasViagem,
        custoVeiculoDireto: operacional.custoVeiculoDireto,
        margemOperacional: operacional.margemOperacional,
      },
    });
  }

  async previewApuracao(carregamentoId: string, companyId: string) {
    await this.recalcularLiquidosCarregamento(carregamentoId, companyId);

    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: {
        rota: true,
        motoristas: { include: { motorista: true } },
        clienteDestino: { select: { id: true, nome: true } },
      },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    const km = Number(c.kmReal ?? c.kmRota ?? 0);
    const valorKmCliente = Number(c.rota?.valorKmCobrancaCliente ?? 0);
    const valorKmRota = Number(c.rota?.valorKmComissaoMotorista ?? 0);
    const pctRota = c.rota?.percentualComissao != null ? Number(c.rota.percentualComissao) : null;
    const valorCarga = Number(c.valorCarga ?? 0);
    const pedagio = Number(c.valorPedagio ?? 0);
    const balanca = Number(c.valorBalanca ?? 0);

    const freteDetalhe = buildDetalheFrete({
      km,
      valorKmCobrancaCliente: valorKmCliente,
      pedagio,
      balanca,
    });

    const motoristaCount = c.motoristas.length;
    const splitDefault = motoristaCount > 0 ? 100 / motoristaCount : 100;

    const comissaoDetalhes = c.motoristas.map((v) => {
      const m = v.motorista;
      const split = Number(v.percentualComissao ?? splitDefault);
      const motKm = m.valorComissaoKm != null ? Number(m.valorComissaoKm) : null;
      const pctMot = m.percentualComissao != null ? Number(m.percentualComissao) : null;
      return buildDetalheComissaoMotorista({
        motoristaId: m.id,
        motoristaNome: m.nome,
        tipoComissao: m.tipoComissao,
        km,
        valorKmMotorista: motKm,
        valorKmRota,
        valorCarga,
        percentualMotorista: pctMot,
        percentualRota: pctRota,
        splitPercent: split,
        descontoComissao: Number(v.descontoComissao ?? 0),
      });
    });

    const descontoFrete = Number(c.descontoFreteCliente ?? 0);
    const descontoComissaoTotal = somaDescontosComissaoMotoristas(c.motoristas);
    const valorFreteBruto = Number(c.valorFreteCliente ?? 0);
    const valorComissaoBruta = Number(c.valorComissaoTotal ?? 0);
    const liquidos = calcularValoresLiquidos({
      valorFreteCliente: valorFreteBruto,
      valorComissaoTotal: valorComissaoBruta,
      valorPedagio: pedagio,
      valorBalanca: balanca,
      descontoFreteCliente: descontoFrete,
      descontoComissaoTotal,
    });

    const splits = await this.prisma.$queryRaw<ComissaoSqlRow[]>`
      SELECT motorista_id, valor FROM apurar_comissao(${carregamentoId})
    `;

    const splitRows =
      splits.length > 0
        ? splits.map((row) => ({
            motoristaId: row.motorista_id,
            bruta: Number(row.valor),
          }))
        : comissaoDetalhes.map((d) => ({
            motoristaId: d.motoristaId,
            bruta: Math.round(d.comissaoCalculada * 100) / 100,
          }));

    const comissoesMotoristas = splitRows.map((row) => {
      const vinculo = c.motoristas.find((m) => m.motoristaId === row.motoristaId);
      const desconto = Number(vinculo?.descontoComissao ?? 0);
      const detalhe = comissaoDetalhes.find((d) => d.motoristaId === row.motoristaId);
      return {
        motoristaId: row.motoristaId,
        motoristaNome: vinculo?.motorista.nome ?? "Motorista",
        comissaoBruta: row.bruta,
        descontoComissao: desconto,
        comissaoLiquida: Math.max(0, row.bruta - desconto),
        motivoDescontoComissao: vinculo?.motivoDescontoComissao ?? null,
        detalhe,
      };
    });

    const jaApurado = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        companyId,
        carregamentoId,
        tipo: LancamentoTipo.FRETE_CLIENTE,
        status: { not: LancamentoStatus.CANCELADO },
      },
    });

    const tarifaDiverge = comissaoDetalhes.some((d) => d.tarifaDivergeDaRota);

    const [despesasAgg, comissaoLancRows, veiculoLancRows] = await Promise.all([
      this.prisma.lancamentoFinanceiro.aggregate({
        where: {
          companyId,
          carregamentoId,
          status: LancamentoStatus.CONFIRMADO,
          tipo: LancamentoTipo.DESPESA_MOTORISTA,
        },
        _sum: { valor: true },
      }),
      this.prisma.lancamentoFinanceiro.findMany({
        where: {
          companyId,
          carregamentoId,
          status: LancamentoStatus.CONFIRMADO,
          tipo: {
            in: [LancamentoTipo.COMISSAO_MOTORISTA, LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA],
          },
        },
        select: { tipo: true, valor: true },
      }),
      this.prisma.lancamentoFinanceiro.findMany({
        where: {
          companyId,
          carregamentoId,
          status: LancamentoStatus.CONFIRMADO,
          motoristaId: null,
          veiculoId: { not: null },
          tipo: { in: TIPOS_CC_VEICULO },
        },
        select: { valor: true, observacoes: true },
      }),
    ]);

    const custoDespesasViagem = Number(despesasAgg._sum.valor ?? 0);
    const valorComissaoApurada =
      comissoesMotoristas.reduce((s, m) => s + m.comissaoLiquida, 0) ||
      Number(liquidos.valorComissaoLiquida ?? 0);
    const comissaoLancada = somaComissaoLancamentos(comissaoLancRows);
    const valorComissaoLiquidaExibida =
      comissaoLancada > 0 ? comissaoLancada : valorComissaoApurada;
    const comissaoExtra =
      comissaoLancada > valorComissaoApurada + 0.009
        ? Math.round((comissaoLancada - valorComissaoApurada) * 100) / 100
        : 0;

    const { espelho: custoVeiculoEspelho, direto: custoVeiculoDireto } =
      classificarCustosVeiculo(veiculoLancRows);

    const valorReceitaLiquida =
      c.valorReceitaLiquida != null
        ? Number(c.valorReceitaLiquida)
        : liquidos.valorFreteLiquido ?? 0;
    const cobrancaAdicional = Math.max(
      0,
      Math.round((valorReceitaLiquida - (liquidos.valorFreteLiquido ?? 0)) * 100) / 100
    );

    const operacional = calcularMargemOperacional({
      valorReceitaLiquida,
      valorFreteLiquido: liquidos.valorFreteLiquido,
      valorFreteCliente: valorFreteBruto,
      valorComissaoLiquida: valorComissaoLiquidaExibida,
      custoDespesasViagem,
      custoVeiculoDireto,
    });

    return {
      carregamentoId,
      carregamentoNumero: c.numero,
      clienteNome: c.clienteDestino.nome,
      jaApurado: !!jaApurado,
      kmUsado: km,
      freteDetalhe,
      comissaoDetalhes,
      tarifaComissaoDivergeDaRota: tarifaDiverge,
      valorFreteBruto,
      descontoFreteCliente: descontoFrete,
      valorFreteLiquido: liquidos.valorFreteLiquido ?? 0,
      valorReceitaLiquida,
      cobrancaAdicional,
      motivoDescontoFrete: c.motivoDescontoFrete,
      valorComissaoBruta,
      descontoComissaoTotal,
      valorComissaoApurada,
      valorComissaoLiquida: valorComissaoLiquidaExibida,
      comissaoExtra,
      valorPedagio: pedagio,
      valorBalanca: balanca,
      margemBruta: Number(c.margemBruta ?? 0),
      margemLiquida: liquidos.margemLiquida ?? 0,
      margemContratual: liquidos.margemLiquida ?? 0,
      custoDespesasViagem: operacional.custoDespesasViagem ?? custoDespesasViagem,
      custoVeiculoEspelho,
      custoVeiculoDireto,
      margemOperacional: operacional.margemOperacional ?? 0,
      margemAposVeiculo: operacional.margemOperacional ?? null,
      comissoesMotoristas,
    };
  }

  async atualizarDescontos(
    carregamentoId: string,
    companyId: string,
    dto: {
      descontoFreteCliente?: number;
      motivoDescontoFrete?: string;
      motoristas?: {
        motoristaId: string;
        descontoComissao?: number;
        motivoDescontoComissao?: string;
      }[];
    }
  ) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: { motoristas: true },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");
    if (c.financeiroFechadoAt) {
      throw new BadRequestException("Financeiro fechado — descontos não podem ser alterados");
    }

    const jaApurado = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        companyId,
        carregamentoId,
        tipo: LancamentoTipo.FRETE_CLIENTE,
        status: { not: LancamentoStatus.CANCELADO },
      },
    });
    if (jaApurado) {
      throw new BadRequestException(
        "Carregamento já apurado — cancele a apuração ou registre abatimento/desconto manualmente no Financeiro"
      );
    }

    const valorFreteBruto = Number(c.valorFreteCliente ?? 0);
    const descontoFrete = Math.max(0, dto.descontoFreteCliente ?? Number(c.descontoFreteCliente ?? 0));
    if (descontoFrete > valorFreteBruto + 0.001) {
      throw new BadRequestException("Desconto de frete não pode ser maior que o frete bruto");
    }

    if (dto.motoristas?.length) {
      for (const m of dto.motoristas) {
        const vinculo = c.motoristas.find((v) => v.motoristaId === m.motoristaId);
        if (!vinculo) {
          throw new BadRequestException("Motorista não vinculado ao carregamento");
        }
        const desconto = Math.max(0, m.descontoComissao ?? 0);
        await this.prisma.carregamentoMotorista.update({
          where: { id: vinculo.id },
          data: {
            descontoComissao: desconto || null,
            motivoDescontoComissao: m.motivoDescontoComissao?.trim() || null,
          },
        });
      }
    }

    await this.prisma.carregamento.update({
      where: { id: carregamentoId },
      data: {
        descontoFreteCliente: descontoFrete || null,
        motivoDescontoFrete: dto.motivoDescontoFrete?.trim() || null,
      },
    });

    await this.recalcularLiquidosCarregamento(carregamentoId, companyId);
    return this.previewApuracao(carregamentoId, companyId);
  }

  async apurarCarregamento(carregamentoId: string, companyId: string, userId?: string) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: {
        motoristas: { include: { motorista: { select: { id: true, nome: true } } } },
        clienteDestino: { select: { id: true, nome: true } },
      },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    if (c.status === CarregamentoStatus.CANCELADO || c.status === CarregamentoStatus.RASCUNHO) {
      throw new BadRequestException("Carregamento não pode ser apurado neste status");
    }

    const jaApurado = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        companyId,
        carregamentoId,
        tipo: LancamentoTipo.FRETE_CLIENTE,
        status: { not: LancamentoStatus.CANCELADO },
      },
    });
    if (jaApurado) {
      throw new BadRequestException("Financeiro deste carregamento já foi apurado");
    }

    const valorFrete = Number(c.valorFreteCliente ?? 0);
    const descontoFrete = Number(c.descontoFreteCliente ?? 0);
    const competencia = c.dataEmbarque ?? c.dataDesembarque ?? new Date();
    const created: Prisma.LancamentoFinanceiroGetPayload<{ include: typeof includeList }>[] = [];

    if (valorFrete > 0) {
      const frete = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.FRETE_CLIENTE,
          natureza: LancamentoNatureza.DEBITO,
          status: LancamentoStatus.CONFIRMADO,
          valor: valorFrete,
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao: `Frete carregamento ${c.numero}`,
          carregamentoId: c.id,
          clienteId: c.clienteDestinoId,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(frete);
    }

    if (descontoFrete > 0) {
      const abatimento = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.ABATIMENTO_FRETE_CLIENTE,
          natureza: LancamentoNatureza.CREDITO,
          status: LancamentoStatus.CONFIRMADO,
          valor: descontoFrete,
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao:
            c.motivoDescontoFrete?.trim() ||
            `Abatimento frete ${c.numero}`,
          carregamentoId: c.id,
          clienteId: c.clienteDestinoId,
          observacoes: c.motivoDescontoFrete?.trim() || null,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(abatimento);
    }

    const splits = await this.prisma.$queryRaw<ComissaoSqlRow[]>`
      SELECT motorista_id, valor FROM apurar_comissao(${carregamentoId})
    `;

    for (const row of splits) {
      const valor = Number(row.valor);
      if (valor <= 0) continue;

      const vinculo = c.motoristas.find((m) => m.motoristaId === row.motorista_id);
      const nomeMotorista = vinculo?.motorista.nome ?? "Motorista";
      const descontoComissao = Number(vinculo?.descontoComissao ?? 0);

      const comissao = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.COMISSAO_MOTORISTA,
          natureza: LancamentoNatureza.CREDITO,
          status: LancamentoStatus.CONFIRMADO,
          valor,
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao: `Comissão ${nomeMotorista} — ${c.numero}`,
          carregamentoId: c.id,
          motoristaId: row.motorista_id,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(comissao);

      if (descontoComissao > 0) {
        if (descontoComissao > valor + 0.001) {
          throw new BadRequestException(
            `Desconto de comissão de ${nomeMotorista} excede a comissão apurada`
          );
        }
        const desconto = await this.prisma.lancamentoFinanceiro.create({
          data: {
            companyId,
            tipo: LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
            natureza: LancamentoNatureza.DEBITO,
            status: LancamentoStatus.CONFIRMADO,
            valor: descontoComissao,
            dataLancamento: new Date(),
            dataCompetencia: competencia,
            descricao:
              vinculo?.motivoDescontoComissao?.trim() ||
              `Desconto comissão ${nomeMotorista} — ${c.numero}`,
            carregamentoId: c.id,
            motoristaId: row.motorista_id,
            observacoes: vinculo?.motivoDescontoComissao?.trim() || null,
            criadoPorId: userId ?? null,
          },
          include: includeList,
        });
        created.push(desconto);
      }
    }

    if (!created.length) {
      throw new BadRequestException(
        "Nenhum valor financeiro para apurar — verifique rota, KM e motorista no carregamento"
      );
    }

    await this.recalcularLiquidosCarregamento(carregamentoId, companyId);

    return { carregamentoId, lancamentos: created };
  }

  async lancamentosCarregamento(carregamentoId: string, companyId: string) {
    await this.prisma.carregamento.findFirstOrThrow({
      where: { id: carregamentoId, companyId },
    });

    const items = await this.prisma.lancamentoFinanceiro.findMany({
      where: { companyId, carregamentoId, status: { not: LancamentoStatus.CANCELADO } },
      orderBy: { dataLancamento: "desc" },
      include: includeList,
    });

    const apurado = items.some((l) => l.tipo === LancamentoTipo.FRETE_CLIENTE);
    const TIPOS_VIAGEM = new Set<LancamentoTipo>([
      ...TIPOS_CC_MOTORISTA,
      LancamentoTipo.FRETE_CLIENTE,
      LancamentoTipo.ABATIMENTO_FRETE_CLIENTE,
      LancamentoTipo.PEDAGIO_CLIENTE,
      LancamentoTipo.BALANCA_CLIENTE,
      LancamentoTipo.OUTROS_CLIENTE,
      LancamentoTipo.RECEITA,
    ]);

    const viagem = items.filter((l) => TIPOS_VIAGEM.has(l.tipo));
    const veiculo = items.filter((l) => !TIPOS_VIAGEM.has(l.tipo));

    return { carregamentoId, apurado, items, viagem, veiculo };
  }

  async previewPrestacaoContas(
    carregamentoId: string,
    motoristaId: string,
    companyId: string
  ) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: {
        motoristas: { include: { motorista: { select: { id: true, nome: true } } } },
      },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    const vinculo = c.motoristas.find((m) => m.motoristaId === motoristaId);
    if (!vinculo) {
      throw new BadRequestException("Motorista não vinculado a este carregamento");
    }

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        motoristaId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: { in: TIPOS_PRESTACAO_VIAGEM },
      },
      orderBy: { dataLancamento: "asc" },
      select: { id: true, tipo: true, natureza: true, valor: true, descricao: true, dataLancamento: true },
    });

    const totais = agregarCcMotorista(lancamentos);
    const { saldo: saldoViagem, reembolsoDespesas, devolucaoAdiantamento } =
      calcularSaldoCcMotorista(totais);
    const jaFechado = totais.acertos > 0 || totais.prestacoes > 0;

    return {
      carregamentoId,
      motoristaId,
      motoristaNome: vinculo.motorista.nome,
      carregamentoNumero: c.numero,
      ...totais,
      reembolsoDespesas,
      devolucaoAdiantamento,
      saldoViagem,
      jaFechado,
      lancamentos,
    };
  }

  async fecharPrestacaoContas(
    carregamentoId: string,
    motoristaId: string,
    companyId: string,
    userId?: string
  ) {
    const preview = await this.previewPrestacaoContas(carregamentoId, motoristaId, companyId);

    if (preview.jaFechado) {
      throw new BadRequestException("Prestação de contas desta viagem já foi fechada");
    }

    if (preview.lancamentos.length === 0) {
      throw new BadRequestException("Nenhum lançamento na viagem para fechar");
    }

    const competencia = new Date();
    const created: Prisma.LancamentoFinanceiroGetPayload<{ include: typeof includeList }>[] = [];

    if (preview.saldoViagem > 0) {
      const acerto = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.ACERTO_MOTORISTA,
          natureza: LancamentoNatureza.DEBITO,
          status: LancamentoStatus.CONFIRMADO,
          valor: preview.saldoViagem,
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao: `Acerto ${preview.motoristaNome} — ${preview.carregamentoNumero}`,
          carregamentoId,
          motoristaId,
          observacoes: `Adiant.: ${preview.adiantamentos} | Desp.: ${preview.despesas} | Comissão: ${preview.comissoes}`,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(acerto);
    } else if (preview.saldoViagem < 0) {
      const prestacao = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.PRESTACAO_CONTAS,
          natureza: LancamentoNatureza.DEBITO,
          status: LancamentoStatus.CONFIRMADO,
          valor: Math.abs(preview.saldoViagem),
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao: `Prestação ${preview.motoristaNome} — ${preview.carregamentoNumero}`,
          carregamentoId,
          motoristaId,
          observacoes: `Saldo a devolver à empresa. Adiant.: ${preview.adiantamentos} | Desp.: ${preview.despesas} | Comissão: ${preview.comissoes}`,
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(prestacao);
    } else {
      const prestacao = await this.prisma.lancamentoFinanceiro.create({
        data: {
          companyId,
          tipo: LancamentoTipo.PRESTACAO_CONTAS,
          natureza: LancamentoNatureza.DEBITO,
          status: LancamentoStatus.CONFIRMADO,
          valor: 0,
          apenasLancamento: true,
          dataLancamento: new Date(),
          dataCompetencia: competencia,
          descricao: `Prestação zerada ${preview.motoristaNome} — ${preview.carregamentoNumero}`,
          carregamentoId,
          motoristaId,
          observacoes: "Viagem quitada sem saldo pendente",
          criadoPorId: userId ?? null,
        },
        include: includeList,
      });
      created.push(prestacao);
    }

    return { ...preview, lancamentosGerados: created };
  }

  async saldoCliente(companyId: string, clienteId: string) {
    await this.prisma.cliente.findFirstOrThrow({
      where: { id: clienteId, companyId },
    });

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        clienteId,
        status: LancamentoStatus.CONFIRMADO,
        apenasLancamento: false,
        tipo: { in: TIPOS_LANCAMENTO_CLIENTE },
      },
      select: { tipo: true, valor: true },
    });

    let recebido = 0;
    for (const l of lancamentos) {
      if (l.tipo === LancamentoTipo.RECEITA) recebido += Number(l.valor);
    }

    const { liquido: cobrado } = this.cobrancaLiquidaCliente(lancamentos);

    return { clienteId, saldoAReceber: cobrado - recebido, cobrado, recebido };
  }

  async saldosClientes(companyId: string) {
    type Row = {
      id: string;
      nome: string;
      cobrado_bruto: number;
      abatimento: number;
      recebido: number;
    };

    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        c.id,
        c.nome,
        COALESCE(SUM(CASE WHEN l.tipo IN ('FRETE_CLIENTE', 'PEDAGIO_CLIENTE', 'BALANCA_CLIENTE', 'OUTROS_CLIENTE') THEN l.valor::numeric ELSE 0 END), 0) AS cobrado_bruto,
        COALESCE(SUM(CASE WHEN l.tipo = 'ABATIMENTO_FRETE_CLIENTE' THEN l.valor::numeric ELSE 0 END), 0) AS abatimento,
        COALESCE(SUM(CASE WHEN l.tipo = 'RECEITA' THEN l.valor::numeric ELSE 0 END), 0) AS recebido
      FROM "Cliente" c
      LEFT JOIN "LancamentoFinanceiro" l
        ON l."clienteId" = c.id
        AND l."companyId" = ${companyId}
        AND l.status = 'CONFIRMADO'
        AND l."apenasLancamento" = false
        AND l.tipo IN (
          'FRETE_CLIENTE', 'PEDAGIO_CLIENTE', 'BALANCA_CLIENTE', 'OUTROS_CLIENTE',
          'ABATIMENTO_FRETE_CLIENTE', 'RECEITA'
        )
      WHERE c."companyId" = ${companyId} AND c.ativo = true
      GROUP BY c.id, c.nome
      ORDER BY c.nome ASC
    `;

    return rows
      .map((r) => {
        const cobrado = Math.max(0, Number(r.cobrado_bruto) - Number(r.abatimento));
        const recebido = Number(r.recebido);
        return {
          id: r.id,
          nome: r.nome,
          cobrado,
          recebido,
          saldoAReceber: cobrado - recebido,
        };
      })
      .filter((c) => Math.abs(c.saldoAReceber) > 0.001 || c.cobrado > 0);
  }

  /** Faturamento (clientes) vs. pagamentos (motoristas) — contas em aberto para quitação. */
  async getPosicaoFinanceira(companyId: string) {
    const [clientes, motoristas] = await Promise.all([
      this.saldosClientes(companyId),
      this.saldosMotoristas(companyId),
    ]);

    const clientesAbertos = clientes.filter((c) => c.saldoAReceber > 0.01);
    const motoristasAbertos = motoristas.filter((m) => Math.abs(m.saldo) > 0.01);

    const totalCobrado = clientes.reduce((s, c) => s + c.cobrado, 0);
    const totalRecebido = clientes.reduce((s, c) => s + c.recebido, 0);
    const totalAReceber = clientesAbertos.reduce((s, c) => s + c.saldoAReceber, 0);
    const totalAPagarMotoristas = motoristasAbertos
      .filter((m) => m.saldo > 0.01)
      .reduce((s, m) => s + m.saldo, 0);
    const totalDevolucaoMotoristas = motoristasAbertos
      .filter((m) => m.saldo < -0.01)
      .reduce((s, m) => s + Math.abs(m.saldo), 0);

    return {
      totais: {
        faturado: totalCobrado,
        recebido: totalRecebido,
        aReceber: totalAReceber,
        aPagarMotoristas: totalAPagarMotoristas,
        aReceberDeMotoristas: totalDevolucaoMotoristas,
        saldoLiquido: totalAReceber - totalAPagarMotoristas + totalDevolucaoMotoristas,
      },
      clientes: clientesAbertos.map((c) => ({
        id: c.id,
        nome: c.nome,
        cobrado: c.cobrado,
        recebido: c.recebido,
        saldoAReceber: c.saldoAReceber,
      })),
      motoristas: motoristasAbertos.map((m) => ({
        id: m.id,
        nome: m.nome,
        saldo: m.saldo,
        aPagar: m.saldo > 0.01 ? m.saldo : 0,
        aReceber: m.saldo < -0.01 ? Math.abs(m.saldo) : 0,
      })),
    };
  }

  async extratoCliente(companyId: string, clienteId: string, page = 1, limit = 50) {
    return this.findAll(companyId, page, limit, { clienteId });
  }

  async registrarRecebimento(
    companyId: string,
    userId: string | undefined,
    dto: {
      clienteId: string;
      valor: number;
      descricao?: string;
      dataLancamento?: string;
      carregamentoId?: string;
      observacoes?: string;
    }
  ) {
    if (!dto.valor || dto.valor < 0.01) {
      throw new BadRequestException("Valor do recebimento deve ser maior que zero");
    }
    if (!dto.carregamentoId) {
      throw new BadRequestException("Informe o embarque vinculado ao recebimento");
    }

    const cliente = await this.prisma.cliente.findFirstOrThrow({
      where: { id: dto.clienteId, companyId, ativo: true },
    });

    const carregamento = await this.prisma.carregamento.findFirstOrThrow({
      where: { id: dto.carregamentoId, companyId },
    });
    if (carregamento.clienteDestinoId !== dto.clienteId) {
      throw new BadRequestException("O embarque selecionado não pertence a este cliente");
    }

    const { saldoAReceber } = await this.saldoCliente(companyId, dto.clienteId);
    if (saldoAReceber < 0.01) {
      throw new BadRequestException("Cliente sem saldo a receber — cobrança já quitada");
    }
    if (dto.valor > saldoAReceber + 0.009) {
      throw new BadRequestException(
        `Valor excede o saldo a receber (${saldoAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
      );
    }

    return this.create(companyId, userId, {
      tipo: LancamentoTipo.RECEITA,
      valor: dto.valor,
      descricao: dto.descricao?.trim() || `Recebimento — ${cliente.nome}`,
      clienteId: dto.clienteId,
      carregamentoId: dto.carregamentoId,
      dataLancamento: dto.dataLancamento,
      observacoes: dto.observacoes,
    });
  }

  async custoVeiculo(companyId: string, veiculoId: string) {
    await this.prisma.veiculo.findFirstOrThrow({
      where: { id: veiculoId, companyId },
    });

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        veiculoId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: { in: TIPOS_CC_VEICULO },
        apenasLancamento: false,
      },
      select: { valor: true },
    });

    const custoTotal = lancamentos.reduce((s, l) => s + Number(l.valor), 0);
    return { veiculoId, custoTotal };
  }

  async custosVeiculos(companyId: string) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { companyId, ativo: true },
      select: { id: true, placa: true, codigoCentroCusto: true },
      orderBy: { placa: "asc" },
    });

    return Promise.all(
      veiculos.map(async (v) => {
        const { custoTotal } = await this.custoVeiculo(companyId, v.id);
        return { ...v, custoTotal };
      })
    );
  }

  async extratoVeiculo(companyId: string, veiculoId: string, page = 1, limit = 50) {
    const result = await this.findAll(companyId, page, limit, { veiculoId });
    return {
      ...result,
      items: result.items.filter((l) => TIPOS_CC_VEICULO.includes(l.tipo)),
    };
  }

  async uploadComprovante(
    id: string,
    companyId: string,
    file: { buffer: Buffer; originalname: string }
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Envie um arquivo de comprovante");
    }

    const row = await this.findOne(id, companyId);
    if (row.comprovantePath) {
      await deleteStoredFile(row.comprovantePath);
    }

    const saved = await saveLancamentoComprovante(
      companyId,
      id,
      file.buffer,
      file.originalname || "comprovante.jpg"
    );

    return this.prisma.lancamentoFinanceiro.update({
      where: { id },
      data: { comprovantePath: saved.path, comprovanteNome: saved.nome },
      include: includeList,
    });
  }

  async getComprovanteFile(id: string, companyId: string) {
    const row = await this.findOne(id, companyId);
    if (!row.comprovantePath) {
      throw new NotFoundException("Este lançamento não possui comprovante");
    }
    const fullPath = resolveUploadPath(row.comprovantePath);
    return {
      mime: mimeComprovante(row.comprovantePath),
      nome: row.comprovanteNome || "comprovante",
      stream: createReadStream(fullPath),
    };
  }

  async getTermoQuitacao(carregamentoId: string, companyId: string) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: {
        company: { select: { name: true, cnpj: true } },
        clienteDestino: { select: { id: true, nome: true, cidade: true, uf: true, documento: true } },
        rota: { select: { codigo: true, descricao: true } },
        motoristas: {
          include: { motorista: { select: { id: true, nome: true, cpf: true } } },
        },
        veiculos: {
          where: { principal: true },
          include: { veiculo: { select: { placa: true } } },
          take: 1,
        },
      },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        apenasLancamento: false,
      },
      select: { tipo: true, valor: true, motoristaId: true, dataLancamento: true, descricao: true },
    });

    const { liquido: cobrado } = this.cobrancaLiquidaCliente(lancamentos);
    const recebido = lancamentos
      .filter((l) => l.tipo === LancamentoTipo.RECEITA)
      .reduce((s, l) => s + Number(l.valor), 0);

    const motoristas = await Promise.all(
      c.motoristas.map(async (v) => {
        let preview: {
          saldoViagem?: number;
          jaFechado?: boolean;
        } | null = null;
        try {
          preview = await this.previewPrestacaoContas(carregamentoId, v.motoristaId, companyId);
        } catch {
          preview = null;
        }
        const pagamentos = lancamentos
          .filter(
            (l) =>
              l.motoristaId === v.motoristaId &&
              (l.tipo === LancamentoTipo.ACERTO_MOTORISTA ||
                l.tipo === LancamentoTipo.PRESTACAO_CONTAS ||
                l.tipo === LancamentoTipo.ADIANTAMENTO)
          )
          .reduce((s, l) => s + Number(l.valor), 0);

        return {
          motoristaId: v.motoristaId,
          nome: v.motorista.nome,
          cpf: v.motorista.cpf,
          comissao: Number(c.valorComissaoLiquida ?? c.valorComissaoTotal ?? 0),
          saldoViagem: preview?.saldoViagem ?? 0,
          prestacaoFechada: preview?.jaFechado ?? false,
          pagamentosRegistrados: pagamentos,
        };
      })
    );

    return {
      emitidoEm: new Date().toISOString(),
      transportadora: {
        nome: c.company.name,
        cnpj: c.company.cnpj,
      },
      carregamento: {
        id: c.id,
        numero: c.numero,
        dataEmbarque: c.dataEmbarque,
        dataDesembarque: c.dataDesembarque,
        quantidadeAnimais: c.quantidadeAnimais,
        placa: c.veiculos[0]?.veiculo.placa ?? null,
        rota: c.rota ? `${c.rota.codigo} — ${c.rota.descricao}` : null,
        valorReceitaLiquida: Number(c.valorReceitaLiquida ?? c.valorFreteLiquido ?? 0),
        margemOperacional: Number(c.margemOperacional ?? 0),
      },
      cliente: {
        id: c.clienteDestino.id,
        nome: c.clienteDestino.nome,
        documento: c.clienteDestino.documento,
        cidade: c.clienteDestino.cidade,
        uf: c.clienteDestino.uf,
        cobrado,
        recebido,
        saldoAReceber: Math.max(0, cobrado - recebido),
        quitado: cobrado <= 0.01 || recebido >= cobrado - 0.01,
      },
      motoristas,
    };
  }

  async checklistFechamento(carregamentoId: string, companyId: string) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
      include: {
        motoristas: { include: { motorista: { select: { id: true, nome: true } } } },
        clienteDestino: { select: { id: true, nome: true } },
      },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId,
        status: LancamentoStatus.CONFIRMADO,
        apenasLancamento: false,
      },
      select: { tipo: true, valor: true, motoristaId: true },
    });

    const apurado = lancamentos.some((l) => l.tipo === LancamentoTipo.FRETE_CLIENTE);
    const { bruto: valorFreteBrutoApurado, liquido: valorFreteApurado } =
      this.cobrancaLiquidaCliente(lancamentos);
    const valorRecebido = lancamentos
      .filter((l) => l.tipo === LancamentoTipo.RECEITA)
      .reduce((s, l) => s + Number(l.valor), 0);

    const valorFreteEsperado = Number(c.valorFreteLiquido ?? c.valorFreteCliente ?? 0);
    const valorComissaoEsperado = Number(c.valorComissaoTotal ?? 0);
    const precisaApurar = valorFreteEsperado > 0 || (valorComissaoEsperado > 0 && c.motoristas.length > 0);

    const cobrancaQuitada =
      valorFreteApurado <= 0.001 || valorRecebido >= valorFreteApurado - 0.01;

    const motoristas = await Promise.all(
      c.motoristas.map(async (v) => {
        const temComissao = lancamentos.some(
          (l) =>
            l.tipo === LancamentoTipo.COMISSAO_MOTORISTA && l.motoristaId === v.motoristaId
        );
        let prestacaoFechada = true;
        let requerPrestacao = temComissao;

        if (temComissao || lancamentos.some((l) => l.motoristaId === v.motoristaId)) {
          try {
            const preview = await this.previewPrestacaoContas(
              carregamentoId,
              v.motoristaId,
              companyId
            );
            requerPrestacao = preview.lancamentos.length > 0 || temComissao;
            prestacaoFechada = preview.jaFechado || !requerPrestacao;
          } catch {
            prestacaoFechada = !temComissao;
            requerPrestacao = temComissao;
          }
        }

        return {
          motoristaId: v.motoristaId,
          motoristaNome: v.motorista.nome,
          temComissao,
          requerPrestacao,
          prestacaoFechada,
        };
      })
    );

    const pendencias: string[] = [];
    const avisos: string[] = [];

    if (precisaApurar && !apurado) {
      pendencias.push("Apurar financeiro (frete e comissões)");
    }

    if (valorFreteApurado > 0 && !cobrancaQuitada) {
      avisos.push(
        `A receber do cliente: ${valorRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de ${valorFreteApurado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — veja Financeiro → A receber`
      );
    }

    for (const m of motoristas) {
      if (m.requerPrestacao && !m.prestacaoFechada) {
        avisos.push(
          `Acerto com motorista pendente — ${m.motoristaNome} (veja Financeiro → CC Motoristas)`
        );
      }
    }

    const pronto = pendencias.length === 0 && (!precisaApurar || apurado);

    return {
      carregamentoId,
      carregamentoNumero: c.numero,
      clienteNome: c.clienteDestino.nome,
      financeiroFechadoAt: c.financeiroFechadoAt?.toISOString() ?? null,
      apurado,
      precisaApurar,
      valorFreteBrutoApurado,
      valorFreteApurado,
      valorRecebido,
      cobrancaQuitada,
      motoristas,
      pendencias,
      avisos,
      pronto,
    };
  }

  async fecharCarregamentoFinanceiro(
    carregamentoId: string,
    companyId: string,
    userId?: string
  ) {
    const c = await this.prisma.carregamento.findFirst({
      where: { id: carregamentoId, companyId },
    });
    if (!c) throw new NotFoundException("Carregamento não encontrado");

    if (c.financeiroFechadoAt) {
      throw new BadRequestException("Financeiro deste carregamento já foi fechado");
    }

    if (
      c.status === CarregamentoStatus.CANCELADO ||
      c.status === CarregamentoStatus.RASCUNHO
    ) {
      throw new BadRequestException("Carregamento não pode ter financeiro fechado neste status");
    }

    let checklist = await this.checklistFechamento(carregamentoId, companyId);

    if (checklist.precisaApurar && !checklist.apurado) {
      try {
        await this.apurarCarregamento(carregamentoId, companyId, userId);
      } catch (e) {
        if (
          !(e instanceof BadRequestException) ||
          !String(e.message).includes("já foi apurado")
        ) {
          throw e;
        }
      }
      checklist = await this.checklistFechamento(carregamentoId, companyId);
    }

    if (!checklist.pronto) {
      throw new BadRequestException(
        `Não foi possível fechar: ${checklist.pendencias.join(" · ")}`
      );
    }

    const updated = await this.prisma.carregamento.update({
      where: { id: carregamentoId },
      data: { financeiroFechadoAt: new Date() },
      select: {
        id: true,
        numero: true,
        status: true,
        financeiroFechadoAt: true,
      },
    });

    await this.prisma.carregamentoEvento.create({
      data: {
        carregamentoId,
        tipo: CarregamentoEventoTipo.EDITADO,
        titulo: "Financeiro fechado",
        descricao: "Apuração concluída — valores da viagem registrados",
        userId: userId ?? null,
      },
    });

    try {
      await this.prisma.$executeRaw`SELECT refresh_mv_dre_veiculo()`;
    } catch {
      /* view analítica opcional */
    }

    return { ...checklist, ...updated, financeiroFechadoAt: updated.financeiroFechadoAt?.toISOString() };
  }
}
