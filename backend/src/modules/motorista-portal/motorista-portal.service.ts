import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CarregamentoStatus, CarregamentoEventoTipo, CarregamentoFotoMomento, LancamentoStatus, LancamentoTipo } from "@prisma/client";
import { createReadStream } from "fs";
import { PrismaService } from "../../prisma/prisma.service";
import { FinanceiroService } from "../financeiro/financeiro.service";
import { calcularSaldoCcMotorista } from "../financeiro/financeiro-liquidos";
import { ComprovanteBrainService } from "../intelligence/comprovante-brain.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CarregamentosService } from "../carregamentos/carregamentos.service";
import {
  mimeFromPath,
  resolveUploadPath,
  saveCarregamentoCargaFoto,
} from "../../common/utils/carregamento-uploads";

const CATEGORIAS = [
  LancamentoTipo.COMBUSTIVEL,
  LancamentoTipo.MANUTENCAO,
  LancamentoTipo.PNEU,
  LancamentoTipo.MULTA,
] as const;

const TIPOS_MOTORISTA_DESPESA = [
  LancamentoTipo.DESPESA_MOTORISTA,
  LancamentoTipo.REEMBOLSO_MOTORISTA,
] as const;

/** Custos de viagem no CC veículo (lançados no financeiro web sem passar pelo motorista). */
const TIPOS_CC_VIAGEM = [
  LancamentoTipo.COMBUSTIVEL,
  LancamentoTipo.MANUTENCAO,
  LancamentoTipo.PNEU,
  LancamentoTipo.MULTA,
] as const;

const DESPESA_SELECT = {
  id: true,
  tipo: true,
  valor: true,
  descricao: true,
  observacoes: true,
  status: true,
  dataLancamento: true,
  comprovanteNome: true,
  motoristaId: true,
  carregamento: { select: { id: true, numero: true } },
  veiculo: { select: { id: true, placa: true } },
} as const;

const VIAGENS_ABERTAS: CarregamentoStatus[] = [
  CarregamentoStatus.PLANEJADO,
  CarregamentoStatus.EMBARCADO,
  CarregamentoStatus.EM_TRANSITO,
  CarregamentoStatus.DESEMBARCADO,
];

const STATUS_PRIORIDADE: Record<string, number> = {
  EM_TRANSITO: 0,
  EMBARCADO: 1,
  PLANEJADO: 2,
  DESEMBARCADO: 3,
};

const CLIENTE_LOCAL_SELECT = {
  id: true,
  nome: true,
  nomeFantasia: true,
  cidade: true,
  uf: true,
  logradouro: true,
  numero: true,
  bairro: true,
  cep: true,
  latitude: true,
  longitude: true,
} as const;

type ClienteLocalRow = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  cidade: string;
  uf: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  latitude: unknown;
  longitude: unknown;
};

@Injectable()
export class MotoristaPortalService {
  constructor(
    private prisma: PrismaService,
    private financeiro: FinanceiroService,
    private ocr: ComprovanteBrainService,
    private notifications: NotificationsService,
    private carregamentos: CarregamentosService
  ) {}

  async pushPublicKey() {
    return {
      enabled: this.notifications.isEnabled(),
      publicKey: this.notifications.getPublicKey(),
    };
  }

  async pushSubscribe(
    companyId: string,
    motoristaId: string,
    body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
  ) {
    return this.notifications.subscribe(companyId, motoristaId, body);
  }

  async pushUnsubscribe(motoristaId: string, endpoint: string) {
    return this.notifications.unsubscribe(motoristaId, endpoint);
  }

  async pushTest(motoristaId: string) {
    return this.notifications.notifyMotorista(motoristaId, {
      title: "Atlas Boi",
      body: "Notificações ativas — você receberá avisos de viagem aqui.",
      url: "/motorista/viagens",
      tag: "push-test",
    });
  }

  async viagens(companyId: string, motoristaId: string) {
    const rows = await this.prisma.carregamento.findMany({
      where: {
        companyId,
        motoristas: { some: { motoristaId } },
        status: { in: VIAGENS_ABERTAS },
      },
      take: 30,
      select: {
        id: true,
        numero: true,
        status: true,
        quantidadeAnimais: true,
        dataEmbarque: true,
        dataDesembarque: true,
        dataPrevisaoDesembarque: true,
        kmRota: true,
        kmReal: true,
        clienteOrigem: { select: CLIENTE_LOCAL_SELECT },
        clienteDestino: { select: CLIENTE_LOCAL_SELECT },
        motoristas: {
          where: { motoristaId },
          select: { principal: true, percentualComissao: true },
        },
        veiculos: {
          orderBy: { principal: "desc" },
          select: { veiculoId: true, principal: true, veiculo: { select: { id: true, placa: true } } },
        },
      },
    });

    const ids = rows.map((r) => r.id);
    const finMap = await this.resumoFinanceiroPorViagens(companyId, motoristaId, ids);

    const sorted = [...rows].sort((a, b) => {
      const pa = STATUS_PRIORIDADE[a.status] ?? 9;
      const pb = STATUS_PRIORIDADE[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = a.dataEmbarque?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = b.dataEmbarque?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    return sorted.map((r, index) => {
      const origem = this.mapClienteLocal(r.clienteOrigem);
      const destino = this.mapClienteLocal(r.clienteDestino);
      const vinculo = r.motoristas[0];
      return {
        id: r.id,
        numero: r.numero,
        status: r.status,
        quantidadeAnimais: r.quantidadeAnimais,
        dataEmbarque: r.dataEmbarque,
        dataDesembarque: r.dataDesembarque,
        dataPrevisaoDesembarque: r.dataPrevisaoDesembarque,
        km: r.kmReal != null ? Number(r.kmReal) : r.kmRota != null ? Number(r.kmRota) : null,
        clienteOrigem: origem,
        clienteDestino: destino,
        veiculos: r.veiculos,
        principal: vinculo?.principal ?? false,
        percentualComissao:
          vinculo?.percentualComissao != null ? Number(vinculo.percentualComissao) : null,
        financeira: finMap.get(r.id) ?? this.emptyFinanceiroViagem(),
        /** Quando há várias abertas: a de maior prioridade (em trânsito > embarcado > …). */
        destaque: index === 0,
        ordem: index + 1,
      };
    });
  }

  async viagemDetalhe(companyId: string, motoristaId: string, id: string) {
    const row = await this.prisma.carregamento.findFirst({
      where: {
        id,
        companyId,
        motoristas: { some: { motoristaId } },
      },
      select: {
        id: true,
        numero: true,
        status: true,
        quantidadeAnimais: true,
        dataEmbarque: true,
        dataDesembarque: true,
        dataPrevisaoDesembarque: true,
        kmRota: true,
        kmReal: true,
        observacoes: true,
        numeroMinuta: true,
        numeroGta: true,
        gtaUf: true,
        clienteOrigem: { select: CLIENTE_LOCAL_SELECT },
        clienteDestino: { select: CLIENTE_LOCAL_SELECT },
        motoristas: {
          where: { motoristaId },
          select: {
            principal: true,
            percentualComissao: true,
            descontoComissao: true,
          },
        },
        veiculos: {
          orderBy: { principal: "desc" },
          select: {
            veiculoId: true,
            principal: true,
            veiculo: { select: { id: true, placa: true, tipo: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException("Viagem não encontrada");

    const finMap = await this.resumoFinanceiroPorViagens(companyId, motoristaId, [id]);
    const financeira = finMap.get(id) ?? this.emptyFinanceiroViagem();
    const origem = this.mapClienteLocal(row.clienteOrigem);
    const destino = this.mapClienteLocal(row.clienteDestino);
    const vinculo = row.motoristas[0];

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        carregamentoId: id,
        motoristaId,
        status: { not: LancamentoStatus.ESTORNADO },
        tipo: {
          in: [
            LancamentoTipo.ADIANTAMENTO,
            LancamentoTipo.DESPESA_MOTORISTA,
            LancamentoTipo.REEMBOLSO_MOTORISTA,
            LancamentoTipo.COMISSAO_MOTORISTA,
            LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
            LancamentoTipo.ACERTO_MOTORISTA,
            LancamentoTipo.PRESTACAO_CONTAS,
          ],
        },
      },
      orderBy: { dataLancamento: "desc" },
      take: 40,
      select: {
        id: true,
        tipo: true,
        valor: true,
        descricao: true,
        status: true,
        dataLancamento: true,
      },
    });

    return {
      id: row.id,
      numero: row.numero,
      status: row.status,
      quantidadeAnimais: row.quantidadeAnimais,
      dataEmbarque: row.dataEmbarque,
      dataDesembarque: row.dataDesembarque,
      dataPrevisaoDesembarque: row.dataPrevisaoDesembarque,
      kmRota: row.kmRota != null ? Number(row.kmRota) : null,
      kmReal: row.kmReal != null ? Number(row.kmReal) : null,
      observacoes: row.observacoes,
      numeroMinuta: row.numeroMinuta,
      numeroGta: row.numeroGta,
      gtaUf: row.gtaUf,
      clienteOrigem: origem,
      clienteDestino: destino,
      mapaRotaUrl: this.mapsDirectionsUrl(origem, destino),
      mapaEmbedUrl: this.mapsEmbedUrl(origem, destino),
      veiculos: row.veiculos,
      principal: vinculo?.principal ?? false,
      percentualComissao:
        vinculo?.percentualComissao != null ? Number(vinculo.percentualComissao) : null,
      descontoComissao:
        vinculo?.descontoComissao != null ? Number(vinculo.descontoComissao) : null,
      financeira,
      lancamentos: lancamentos.map((l) => ({
        ...l,
        valor: Number(l.valor),
      })),
      fotos: await this.listarFotos(companyId, motoristaId, id),
      etapa: this.etapaOperacionalApp(row.status),
    };
  }

  private etapaOperacionalApp(status: CarregamentoStatus) {
    const proximo = this.carregamentos.proximoStatusMotorista(status);
    const acoes: Record<string, { botao: string; dica: string }> = {
      PLANEJADO: {
        botao: "Confirmar embarque",
        dica: "Animais embarcados e pronto para seguir viagem.",
      },
      EMBARCADO: {
        botao: "Saiu em trânsito",
        dica: "Saiu da fazenda / início da viagem na estrada.",
      },
      EM_TRANSITO: {
        botao: "Confirmar descarga",
        dica: "Chegou no destino e descarregou a carga.",
      },
    };
    const a = acoes[status];
    return {
      atual: status,
      atualLabel: this.carregamentos.labelStatus(status),
      proximo,
      proximoLabel: proximo ? this.carregamentos.labelStatus(proximo) : null,
      podeAvancar: !!proximo && !!a,
      botao: a?.botao ?? null,
      dica: a?.dica ?? (status === "DESEMBARCADO" || status === "FINALIZADO"
        ? "Descarga registrada. A finalização fica com o escritório."
        : null),
    };
  }

  /** Motorista avança uma etapa operacional (não finaliza / não cancela). */
  async avancarStatus(companyId: string, motoristaId: string, id: string) {
    await this.assertViagemDoMotorista(companyId, motoristaId, id);
    const row = await this.prisma.carregamento.findFirst({
      where: { id, companyId },
      select: { id: true, status: true, dataEmbarque: true, dataDesembarque: true, numero: true },
    });
    if (!row) throw new NotFoundException("Viagem não encontrada");

    const proximo = this.carregamentos.proximoStatusMotorista(row.status);
    if (!proximo) {
      throw new BadRequestException(
        "Não há próxima etapa no app nesta viagem. A finalização é feita pelo escritório."
      );
    }

    const patch: { status: CarregamentoStatus; dataEmbarque?: string; dataDesembarque?: string } = {
      status: proximo,
    };
    const agora = new Date().toISOString();
    if (proximo === CarregamentoStatus.EMBARCADO && !row.dataEmbarque) {
      patch.dataEmbarque = agora;
    }
    if (proximo === CarregamentoStatus.DESEMBARCADO && !row.dataDesembarque) {
      patch.dataDesembarque = agora;
    }

    await this.carregamentos.update(id, companyId, undefined, patch);
    return this.viagemDetalhe(companyId, motoristaId, id);
  }

  async listarFotos(companyId: string, motoristaId: string, carregamentoId: string) {
    await this.assertViagemDoMotorista(companyId, motoristaId, carregamentoId);
    const rows = await this.prisma.carregamentoFoto.findMany({
      where: { companyId, carregamentoId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        momento: true,
        nome: true,
        observacao: true,
        createdAt: true,
        motoristaId: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      propria: r.motoristaId === motoristaId,
    }));
  }

  async enviarFotoCarga(
    companyId: string,
    motoristaId: string,
    carregamentoId: string,
    input: {
      momento?: string;
      observacao?: string;
      foto: Buffer;
      fotoNome?: string;
    }
  ) {
    if (!input.foto?.length) {
      throw new BadRequestException("Envie uma foto da carga");
    }
    await this.assertViagemDoMotorista(companyId, motoristaId, carregamentoId);

    const momentos = [
      CarregamentoFotoMomento.EMBARQUE,
      CarregamentoFotoMomento.TRANSITO,
      CarregamentoFotoMomento.DESCARGA,
      CarregamentoFotoMomento.OUTROS,
    ] as const;
    const raw = (input.momento || "EMBARQUE").toUpperCase();
    const momento = momentos.includes(raw as CarregamentoFotoMomento)
      ? (raw as CarregamentoFotoMomento)
      : CarregamentoFotoMomento.EMBARQUE;

    const saved = await saveCarregamentoCargaFoto(
      companyId,
      carregamentoId,
      input.foto,
      input.fotoNome || "carga.jpg"
    );

    const row = await this.prisma.carregamentoFoto.create({
      data: {
        companyId,
        carregamentoId,
        motoristaId,
        momento,
        path: saved.path,
        nome: saved.nome,
        observacao: input.observacao?.trim() || null,
      },
      select: {
        id: true,
        momento: true,
        nome: true,
        observacao: true,
        createdAt: true,
        motoristaId: true,
      },
    });

    await this.prisma.carregamentoEvento.create({
      data: {
        carregamentoId,
        tipo: CarregamentoEventoTipo.EDITADO,
        titulo: `Foto da carga (${momento.toLowerCase()})`,
        descricao: input.observacao?.trim() || "Registro pelo app do motorista",
        metadata: { fotoId: row.id, momento, motoristaId },
      },
    });

    return { ...row, propria: true };
  }

  async obterArquivoFoto(
    companyId: string,
    motoristaId: string,
    carregamentoId: string,
    fotoId: string
  ) {
    await this.assertViagemDoMotorista(companyId, motoristaId, carregamentoId);
    const foto = await this.prisma.carregamentoFoto.findFirst({
      where: { id: fotoId, companyId, carregamentoId },
    });
    if (!foto) throw new NotFoundException("Foto não encontrada");
    return {
      stream: createReadStream(resolveUploadPath(foto.path)),
      mime: mimeFromPath(foto.path),
      nome: foto.nome,
    };
  }

  private async assertViagemDoMotorista(
    companyId: string,
    motoristaId: string,
    carregamentoId: string
  ) {
    const ok = await this.prisma.carregamento.findFirst({
      where: {
        id: carregamentoId,
        companyId,
        motoristas: { some: { motoristaId } },
      },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException("Viagem não encontrada");
  }

  async prestacaoContas(companyId: string, motoristaId: string, carregamentoId: string) {
    await this.assertViagemDoMotorista(companyId, motoristaId, carregamentoId);
    const preview = await this.financeiro.previewPrestacaoContas(
      carregamentoId,
      motoristaId,
      companyId
    );

    const mensagem =
      preview.jaFechado
        ? "Acerto desta viagem já foi conferido."
        : preview.saldoViagem > 0
          ? "Após conferir, a empresa registra o valor a pagar a você (comissões / reembolsos)."
          : preview.saldoViagem < 0
            ? "Há saldo a devolver / abater do seu CC (adiantamento não usado)."
            : "Viagem bateu zero — conferência só registra a quitação.";

    return {
      carregamentoId: preview.carregamentoId,
      motoristaId: preview.motoristaId,
      motoristaNome: preview.motoristaNome,
      carregamentoNumero: preview.carregamentoNumero,
      adiantamentos: preview.adiantamentos,
      despesas: preview.despesas,
      reembolsos: preview.reembolsos,
      comissoes: preview.comissoes,
      descontosComissao: preview.descontosComissao,
      acertos: preview.acertos,
      prestacoes: preview.prestacoes,
      reembolsoDespesas: preview.reembolsoDespesas,
      devolucaoAdiantamento: preview.devolucaoAdiantamento,
      saldoViagem: preview.saldoViagem,
      jaFechado: preview.jaFechado,
      mensagem,
      podeFechar: !preview.jaFechado && preview.lancamentos.length > 0,
      lancamentos: preview.lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        valor: Number(l.valor),
        descricao: l.descricao,
        dataLancamento: l.dataLancamento,
      })),
    };
  }

  async fecharPrestacaoContas(companyId: string, motoristaId: string, carregamentoId: string) {
    await this.assertViagemDoMotorista(companyId, motoristaId, carregamentoId);
    const result = await this.financeiro.fecharPrestacaoContas(
      carregamentoId,
      motoristaId,
      companyId,
      undefined
    );

    await this.prisma.carregamentoEvento.create({
      data: {
        carregamentoId,
        tipo: CarregamentoEventoTipo.EDITADO,
        titulo: "Prestação de contas conferida (app motorista)",
        descricao: `Saldo da viagem: ${result.saldoViagem}`,
        metadata: { motoristaId, saldoViagem: result.saldoViagem },
      },
    });

    return this.prestacaoContas(companyId, motoristaId, carregamentoId);
  }

  async saldo(companyId: string, motoristaId: string) {
    const base = await this.financeiro.saldoMotorista(companyId, motoristaId);

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        motoristaId,
        status: LancamentoStatus.CONFIRMADO,
        tipo: {
          in: [
            LancamentoTipo.ADIANTAMENTO,
            LancamentoTipo.DESPESA_MOTORISTA,
            LancamentoTipo.REEMBOLSO_MOTORISTA,
            LancamentoTipo.COMISSAO_MOTORISTA,
            LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
            LancamentoTipo.ACERTO_MOTORISTA,
            LancamentoTipo.PRESTACAO_CONTAS,
          ],
        },
        apenasLancamento: false,
      },
      select: { tipo: true, valor: true },
    });

    const totais = {
      adiantamentos: 0,
      despesas: 0,
      reembolsos: 0,
      comissoes: 0,
      descontosComissao: 0,
      acertos: 0,
    };
    for (const l of lancamentos) {
      const v = Number(l.valor);
      if (l.tipo === LancamentoTipo.ADIANTAMENTO) totais.adiantamentos += v;
      else if (l.tipo === LancamentoTipo.DESPESA_MOTORISTA) totais.despesas += v;
      else if (l.tipo === LancamentoTipo.REEMBOLSO_MOTORISTA) totais.reembolsos += v;
      else if (l.tipo === LancamentoTipo.COMISSAO_MOTORISTA) totais.comissoes += v;
      else if (l.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA) totais.descontosComissao += v;
      else if (l.tipo === LancamentoTipo.ACERTO_MOTORISTA) totais.acertos += v;
    }

    const viagensAbertas = await this.viagens(companyId, motoristaId);

    return {
      ...base,
      totais,
      viagensAbertas: viagensAbertas.map((v) => ({
        id: v.id,
        numero: v.numero,
        status: v.status,
        destaque: v.destaque,
        origem: `${v.clienteOrigem.cidade}/${v.clienteOrigem.uf}`,
        destino: `${v.clienteDestino.cidade}/${v.clienteDestino.uf}`,
        financeira: v.financeira,
      })),
    };
  }

  private emptyFinanceiroViagem() {
    return {
      adiantamentos: 0,
      despesas: 0,
      reembolsos: 0,
      comissoes: 0,
      descontosComissao: 0,
      saldoViagem: 0,
    };
  }

  private async resumoFinanceiroPorViagens(
    companyId: string,
    motoristaId: string,
    carregamentoIds: string[]
  ) {
    const map = new Map<string, ReturnType<MotoristaPortalService["emptyFinanceiroViagem"]>>();
    for (const id of carregamentoIds) map.set(id, this.emptyFinanceiroViagem());
    if (!carregamentoIds.length) return map;

    const rows = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        motoristaId,
        carregamentoId: { in: carregamentoIds },
        status: LancamentoStatus.CONFIRMADO,
        apenasLancamento: false,
        tipo: {
          in: [
            LancamentoTipo.ADIANTAMENTO,
            LancamentoTipo.DESPESA_MOTORISTA,
            LancamentoTipo.REEMBOLSO_MOTORISTA,
            LancamentoTipo.COMISSAO_MOTORISTA,
            LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA,
          ],
        },
      },
      select: { carregamentoId: true, tipo: true, valor: true },
    });

    for (const r of rows) {
      if (!r.carregamentoId) continue;
      const bucket = map.get(r.carregamentoId) ?? this.emptyFinanceiroViagem();
      const v = Number(r.valor);
      if (r.tipo === LancamentoTipo.ADIANTAMENTO) bucket.adiantamentos += v;
      else if (r.tipo === LancamentoTipo.DESPESA_MOTORISTA) bucket.despesas += v;
      else if (r.tipo === LancamentoTipo.REEMBOLSO_MOTORISTA) bucket.reembolsos += v;
      else if (r.tipo === LancamentoTipo.COMISSAO_MOTORISTA) bucket.comissoes += v;
      else if (r.tipo === LancamentoTipo.DESCONTO_COMISSAO_MOTORISTA) bucket.descontosComissao += v;
      map.set(r.carregamentoId, bucket);
    }

    for (const [id, b] of map) {
      const { saldo } = calcularSaldoCcMotorista({
        adiantamentos: b.adiantamentos,
        despesas: b.despesas,
        reembolsos: b.reembolsos,
        comissoes: b.comissoes,
        acertos: 0,
        descontosComissao: b.descontosComissao,
        prestacoes: 0,
      });
      b.saldoViagem = saldo;
      map.set(id, b);
    }
    return map;
  }

  private mapClienteLocal(c: ClienteLocalRow) {
    const lat = c.latitude != null ? Number(c.latitude) : null;
    const lng = c.longitude != null ? Number(c.longitude) : null;
    const endereco = [c.logradouro, c.numero, c.bairro].filter(Boolean).join(", ");
    const label = c.nomeFantasia?.trim() || c.nome;
    const mapsUrl =
      lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [endereco, c.cidade, c.uf, "Brasil"].filter(Boolean).join(", ")
          )}`;

    return {
      id: c.id,
      nome: label,
      cidade: c.cidade,
      uf: c.uf,
      endereco: endereco || null,
      cep: c.cep,
      latitude: lat,
      longitude: lng,
      mapsUrl,
    };
  }

  private mapsDirectionsUrl(
    origem: { latitude: number | null; longitude: number | null; mapsUrl: string; cidade: string; uf: string; endereco: string | null },
    destino: { latitude: number | null; longitude: number | null; mapsUrl: string; cidade: string; uf: string; endereco: string | null }
  ) {
    const origin =
      origem.latitude != null && origem.longitude != null
        ? `${origem.latitude},${origem.longitude}`
        : [origem.endereco, origem.cidade, origem.uf].filter(Boolean).join(", ");
    const destination =
      destino.latitude != null && destino.longitude != null
        ? `${destino.latitude},${destino.longitude}`
        : [destino.endereco, destino.cidade, destino.uf].filter(Boolean).join(", ");
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  }

  private mapsEmbedUrl(
    origem: { latitude: number | null; longitude: number | null; cidade: string; uf: string; endereco: string | null },
    destino: { latitude: number | null; longitude: number | null; cidade: string; uf: string; endereco: string | null }
  ): string | null {
    const oOk =
      origem.latitude != null &&
      origem.longitude != null &&
      !Number.isNaN(origem.latitude) &&
      !Number.isNaN(origem.longitude);
    const dOk =
      destino.latitude != null &&
      destino.longitude != null &&
      !Number.isNaN(destino.latitude) &&
      !Number.isNaN(destino.longitude);

    // Sem lat/lng o embed do Google cai no "mapa-mundo" vazio — não exibimos.
    // Com coordenadas: OpenStreetMap (sem API key) cobrindo a rota.
    if (oOk && dOk) {
      const pad = 0.4;
      const minLat = Math.min(origem.latitude!, destino.latitude!) - pad;
      const maxLat = Math.max(origem.latitude!, destino.latitude!) + pad;
      const minLng = Math.min(origem.longitude!, destino.longitude!) - pad;
      const maxLng = Math.max(origem.longitude!, destino.longitude!) + pad;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${destino.latitude}%2C${destino.longitude}`;
    }

    if (dOk) {
      const lat = destino.latitude!;
      const lng = destino.longitude!;
      const pad = 0.1;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad}%2C${lat - pad}%2C${lng + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lng}`;
    }

    if (oOk) {
      const lat = origem.latitude!;
      const lng = origem.longitude!;
      const pad = 0.1;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad}%2C${lat - pad}%2C${lng + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lng}`;
    }

    return null;
  }

  async listarDespesas(companyId: string, motoristaId: string) {
    const viagens = await this.prisma.carregamentoMotorista.findMany({
      where: { motoristaId, carregamento: { companyId } },
      select: { carregamentoId: true },
    });
    const carregamentoIds = viagens.map((v) => v.carregamentoId);

    const rows = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        companyId,
        status: { not: LancamentoStatus.ESTORNADO },
        OR: [
          {
            motoristaId,
            tipo: { in: [...TIPOS_MOTORISTA_DESPESA] },
          },
          ...(carregamentoIds.length
            ? [
                {
                  motoristaId: null,
                  carregamentoId: { in: carregamentoIds },
                  tipo: { in: [...TIPOS_CC_VIAGEM] },
                  NOT: {
                    observacoes: { contains: "Espelho CC veículo", mode: "insensitive" as const },
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: { dataLancamento: "desc" },
      take: 80,
      select: DESPESA_SELECT,
    });

    return rows
      .map((r) => ({
        ...r,
        valor: Number(r.valor),
        editavel:
          r.motoristaId === motoristaId &&
          TIPOS_MOTORISTA_DESPESA.includes(r.tipo as (typeof TIPOS_MOTORISTA_DESPESA)[number]),
        origem:
          r.motoristaId === motoristaId ? ("motorista" as const) : ("veiculo" as const),
      }))
      .map(({ motoristaId: _mid, ...rest }) => rest);
  }

  async registrarDespesa(
    companyId: string,
    motoristaId: string,
    input: {
      valor: number;
      descricao?: string;
      observacoes?: string;
      carregamentoId?: string;
      veiculoId?: string;
      categoriaCusto?: (typeof CATEGORIAS)[number];
      formaPagamento?: "ADIANTAMENTO" | "DO_BOLSO";
      foto?: Buffer;
      fotoNome?: string;
    }
  ) {
    if (!input.valor || input.valor <= 0) {
      throw new BadRequestException("Informe o valor da despesa");
    }

    let obs = input.observacoes?.trim() || "";
    if (input.foto?.length) {
      const ocr = await this.ocr.analyzeImage(input.foto);
      if (ocr.valor && Math.abs(ocr.valor - input.valor) > 1) {
        obs += (obs ? " | " : "") + `OCR sugeriu ${ocr.valor}`;
      }
      if (ocr.estabelecimento) obs += (obs ? " | " : "") + ocr.estabelecimento;
    }

    const categoria = input.categoriaCusto ?? LancamentoTipo.COMBUSTIVEL;
    const descricao =
      input.descricao?.trim() ||
      CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])
        ? `${this.categoriaNome(categoria)} — app motorista`
        : "Despesa app motorista";

    let lanc: { id: string };

    if (input.carregamentoId && input.veiculoId && CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
      lanc = await this.financeiro.create(companyId, undefined, {
        tipo: LancamentoTipo.DESPESA_MOTORISTA,
        descricao,
        valor: input.valor,
        motoristaId,
        carregamentoId: input.carregamentoId,
        veiculoId: input.veiculoId,
        categoriaCustoVeiculo: categoria,
        formaPagamentoMotorista: input.formaPagamento ?? "ADIANTAMENTO",
        observacoes: obs || undefined,
        dataCompetencia: new Date().toISOString().slice(0, 10),
      });
    } else {
      lanc = await this.financeiro.create(companyId, undefined, {
        tipo: LancamentoTipo.DESPESA_MOTORISTA,
        descricao,
        valor: input.valor,
        motoristaId,
        carregamentoId: input.carregamentoId || undefined,
        observacoes: obs || "Despesa via app motorista",
        dataCompetencia: new Date().toISOString().slice(0, 10),
      });
    }

    if (input.foto?.length) {
      await this.financeiro.uploadComprovante(lanc.id, companyId, {
        buffer: input.foto,
        originalname: input.fotoNome || "comprovante.jpg",
      });
    }

    return lanc;
  }

  async atualizarDespesa(
    companyId: string,
    motoristaId: string,
    id: string,
    input: { valor?: number; descricao?: string; observacoes?: string }
  ) {
    const row = await this.assertDespesaEditavel(companyId, motoristaId, id);

    if (input.valor != null && input.valor <= 0) {
      throw new BadRequestException("Valor inválido");
    }

    const updated = await this.prisma.lancamentoFinanceiro.update({
      where: { id: row.id },
      data: {
        valor: input.valor ?? undefined,
        descricao: input.descricao?.trim() || undefined,
        observacoes: input.observacoes?.trim() || undefined,
      },
      select: {
        id: true,
        tipo: true,
        valor: true,
        descricao: true,
        observacoes: true,
        status: true,
        dataLancamento: true,
        carregamento: { select: { numero: true } },
        veiculo: { select: { placa: true } },
      },
    });

    if (row.carregamentoId) {
      await this.financeiro.recalcularLiquidosCarregamento(row.carregamentoId, companyId);
    }

    return { ...updated, valor: Number(updated.valor) };
  }

  async excluirDespesa(companyId: string, motoristaId: string, id: string) {
    const row = await this.assertDespesaEditavel(companyId, motoristaId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.lancamentoFinanceiro.update({
        where: { id: row.id },
        data: { status: LancamentoStatus.ESTORNADO },
      });

      if (row.carregamentoId) {
        await tx.lancamentoFinanceiro.updateMany({
          where: {
            companyId,
            carregamentoId: row.carregamentoId,
            motoristaId: null,
            tipo: { in: [...CATEGORIAS] },
            status: LancamentoStatus.CONFIRMADO,
            observacoes: { contains: row.id.slice(-6) },
          },
          data: { status: LancamentoStatus.ESTORNADO },
        });
      }
    });

    if (row.carregamentoId) {
      await this.financeiro.recalcularLiquidosCarregamento(row.carregamentoId, companyId);
    }

    return { success: true };
  }

  private async assertDespesaEditavel(companyId: string, motoristaId: string, id: string) {
    const row = await this.prisma.lancamentoFinanceiro.findFirst({
      where: { id, companyId, motoristaId },
    });
    if (!row) throw new NotFoundException("Despesa não encontrada");
    if (!TIPOS_MOTORISTA_DESPESA.includes(row.tipo as (typeof TIPOS_MOTORISTA_DESPESA)[number])) {
      throw new ForbiddenException("Lançamento não editável pelo app");
    }
    if (row.status === LancamentoStatus.ESTORNADO) {
      throw new BadRequestException("Despesa já estornada");
    }
    return row;
  }

  private categoriaNome(tipo: LancamentoTipo) {
    const map: Partial<Record<LancamentoTipo, string>> = {
      COMBUSTIVEL: "Combustível",
      MANUTENCAO: "Manutenção",
      PNEU: "Pneu / borracharia",
      MULTA: "Multa",
    };
    return map[tipo] ?? "Despesa";
  }
}
