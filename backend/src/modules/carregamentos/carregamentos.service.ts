import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { CarregamentoEventoTipo, CarregamentoStatus, ClienteTipo, DocumentoTipo, NotaFiscalPapel, Prisma } from "@prisma/client";
import { createReadStream } from "fs";
import { PrismaService } from "../../prisma/prisma.service";
import { ClientesService } from "../clientes/clientes.service";
import { FinanceiroService } from "../financeiro/financeiro.service";
import { calcularValoresLiquidos, somaDescontosComissaoMotoristas } from "../financeiro/financeiro-liquidos";
import { calcComissaoPorKm } from "../financeiro/comissao-km";
import { RotasService } from "../rotas/rotas.service";
import {
  deleteStoredFile,
  mimeFromPath,
  resolveUploadPath,
  saveCarregamentoMinutaFoto,
} from "../../common/utils/carregamento-uploads";
import { agregarNotasFiscais, notasParaContabilizacao } from "../../common/utils/nota-fiscal-aggregate";
import { normalizeDocumento, parseNfeXml, type NfeParsedData, type NfeEndereco } from "./nfe-parser";
import { buildLocalChave } from "../../common/utils/cliente-local";
import { NfeBrainService } from "../intelligence/nfe-brain.service";
import type { NfeBrainInsight } from "../intelligence/intelligence.types";
import { DashboardEventsService } from "../../common/notify/dashboard-events.service";
import { NotificationsService } from "../notifications/notifications.service";

export type MotoristaVinculoDto = { motoristaId: string; principal?: boolean; percentualComissao?: number };
export type VeiculoVinculoDto = { veiculoId: string; principal?: boolean };

export type CreateCarregamentoDto = {
  clienteOrigemId: string;
  clienteDestinoId: string;
  rotaId?: string;
  status?: CarregamentoStatus;
  quantidadeAnimais: number;
  pesoMedioEstimado?: number;
  pesoTotal?: number;
  kmRota?: number;
  kmReal?: number;
  valorCarga?: number;
  dataEmbarque?: string;
  dataDesembarque?: string;
  dataPrevisaoDesembarque?: string;
  observacoes?: string;
  numeroMinuta?: string;
  numeroGta?: string;
  gtaUf?: string;
  motoristas?: MotoristaVinculoDto[];
  veiculos?: VeiculoVinculoDto[];
  nfeChave?: string;
  nfeNumero?: string;
  nfeSerie?: string;
  nfeValor?: number;
  nfeEmitenteCnpj?: string;
  nfeDestinatarioCnpj?: string;
  nfeXmlHash?: string;
  nfeDataEmissao?: string;
  nfeProdutoDescricao?: string;
};

export type UpdateCarregamentoDto = Partial<CreateCarregamentoDto> & {
  clearNfe?: boolean;
  clearMinutaFoto?: boolean;
};

export type NfeClienteParaCadastrar = {
  papel: "origem" | "destino";
  tipoDocumento: DocumentoTipo;
  documento: string;
  nome: string;
  nomeFantasia?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  uf: string;
  codigoIbge?: string | null;
  tipo: ClienteTipo;
};

export type NfeImportPreview = {
  parsed: NfeParsedData;
  clienteOrigem: { id: string; nome: string; documento: string } | null;
  clienteDestino: { id: string; nome: string; documento: string } | null;
  clientesParaCadastrar: {
    origem: NfeClienteParaCadastrar | null;
    destino: NfeClienteParaCadastrar | null;
  };
  rotaSugerida: { id: string; codigo: string; descricao: string } | null;
  rotaCriada?: boolean;
  duplicateCarregamento: { id: string; numero: string } | null;
  sugestao: {
    clienteOrigemId?: string;
    clienteDestinoId?: string;
    rotaId?: string;
    quantidadeAnimais?: number;
    valorCarga?: number;
    dataEmbarque?: string;
    observacoes?: string;
    numeroGta?: string;
    gtaUf?: string;
  };
  inteligencia?: NfeBrainInsight;
};

const STATUS_LABEL: Record<CarregamentoStatus, string> = {
  RASCUNHO: "Rascunho",
  PLANEJADO: "Planejado",
  EMBARCADO: "Embarcado",
  EM_TRANSITO: "Em trânsito",
  DESEMBARCADO: "Desembarcado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const STATUS_TRANSITIONS: Record<CarregamentoStatus, CarregamentoStatus[]> = {
  RASCUNHO: [CarregamentoStatus.PLANEJADO, CarregamentoStatus.CANCELADO],
  PLANEJADO: [CarregamentoStatus.EMBARCADO, CarregamentoStatus.CANCELADO],
  EMBARCADO: [CarregamentoStatus.EM_TRANSITO, CarregamentoStatus.CANCELADO],
  EM_TRANSITO: [CarregamentoStatus.DESEMBARCADO],
  DESEMBARCADO: [CarregamentoStatus.FINALIZADO],
  FINALIZADO: [],
  CANCELADO: [],
};

/** Retrocesso (correção operacional no web — ex.: motorista avançou errado). */
const STATUS_ROLLBACK: Partial<Record<CarregamentoStatus, CarregamentoStatus>> = {
  PLANEJADO: CarregamentoStatus.RASCUNHO,
  EMBARCADO: CarregamentoStatus.PLANEJADO,
  EM_TRANSITO: CarregamentoStatus.EMBARCADO,
  DESEMBARCADO: CarregamentoStatus.EM_TRANSITO,
  FINALIZADO: CarregamentoStatus.DESEMBARCADO,
};

/** Etapas que o motorista pode avançar no app (escritório finaliza). */
const STATUS_AVANCE_MOTORISTA: Partial<Record<CarregamentoStatus, CarregamentoStatus>> = {
  PLANEJADO: CarregamentoStatus.EMBARCADO,
  EMBARCADO: CarregamentoStatus.EM_TRANSITO,
  EM_TRANSITO: CarregamentoStatus.DESEMBARCADO,
};

const includeList = {
  clienteOrigem: { select: { id: true, nome: true, documento: true, cidade: true, uf: true } },
  clienteDestino: { select: { id: true, nome: true, documento: true, cidade: true, uf: true } },
  rota: {
    select: {
      id: true,
      codigo: true,
      descricao: true,
      distanciaKm: true,
      clienteOrigemId: true,
      clienteDestinoId: true,
      valorKmCobrancaCliente: true,
      valorKmComissaoMotorista: true,
      valorPedagio: true,
      valorBalanca: true,
    },
  },
  motoristas: {
    include: { motorista: { select: { id: true, nome: true } } },
  },
  veiculos: {
    include: { veiculo: { select: { id: true, placa: true, tipo: true } } },
  },
} satisfies Prisma.CarregamentoInclude;

const includeDetail = {
  ...includeList,
  notasFiscais: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.CarregamentoInclude;

@Injectable()
export class CarregamentosService {
  constructor(
    private prisma: PrismaService,
    private clientesService: ClientesService,
    private rotasService: RotasService,
    private nfeBrain: NfeBrainService,
    private dashboardEvents: DashboardEventsService,
    private notifications: NotificationsService,
    @Inject(forwardRef(() => FinanceiroService))
    private financeiroService: FinanceiroService
  ) {}

  private parseDate(v?: string) {
    if (!v || !String(v).trim()) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Data inválida");
    return d;
  }

  private assertStatusTransition(from: CarregamentoStatus, to: CarregamentoStatus) {
    if (from === to) return;
    const allowed = STATUS_TRANSITIONS[from] ?? [];
    if (allowed.includes(to)) return;
    if (STATUS_ROLLBACK[from] === to) return;
    throw new BadRequestException(
      `Transição inválida: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}`
    );
  }

  /** Próxima etapa operacional (app motorista). Null = sem avanço pelo app. */
  proximoStatusMotorista(atual: CarregamentoStatus): CarregamentoStatus | null {
    return STATUS_AVANCE_MOTORISTA[atual] ?? null;
  }

  labelStatus(status: CarregamentoStatus) {
    return STATUS_LABEL[status] ?? status;
  }

  private async registrarEvento(input: {
    carregamentoId: string;
    tipo: CarregamentoEventoTipo;
    titulo: string;
    descricao?: string;
    statusAnterior?: CarregamentoStatus;
    statusNovo?: CarregamentoStatus;
    userId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.carregamentoEvento.create({ data: input });
  }

  private enrichNotasFiscaisWithMap<
    T extends {
      clienteOrigem?: { nome: string; documento: string; cidade: string; uf: string } | null;
      clienteDestino?: { nome: string; documento: string; cidade: string; uf: string } | null;
      notasFiscais?: Array<{
        emitenteCnpj: string | null;
        emitenteNome: string | null;
        destinatarioCnpj: string | null;
        destinatarioNome: string | null;
      }>;
    },
  >(row: T, byDoc: Map<string, { nome: string; cidade: string; uf: string }>): T {
    if (!row.notasFiscais?.length) return row;

    const origemDoc = row.clienteOrigem
      ? normalizeDocumento(row.clienteOrigem.documento)
      : null;
    const destinoDoc = row.clienteDestino
      ? normalizeDocumento(row.clienteDestino.documento)
      : null;

    const notasFiscais = row.notasFiscais.map((n) => {
      const emitDoc = n.emitenteCnpj ? normalizeDocumento(n.emitenteCnpj) : null;
      const destDoc = n.destinatarioCnpj ? normalizeDocumento(n.destinatarioCnpj) : null;

      let emitenteNome = n.emitenteNome;
      if (!emitenteNome && emitDoc) {
        if (emitDoc === origemDoc && row.clienteOrigem) emitenteNome = row.clienteOrigem.nome;
        else emitenteNome = byDoc.get(emitDoc)?.nome ?? null;
      }

      let destinatarioNome = n.destinatarioNome;
      if (!destinatarioNome && destDoc) {
        if (destDoc === destinoDoc && row.clienteDestino) destinatarioNome = row.clienteDestino.nome;
        else destinatarioNome = byDoc.get(destDoc)?.nome ?? null;
      }

      return { ...n, emitenteNome, destinatarioNome };
    });

    return { ...row, notasFiscais };
  }

  private async enrichNotasFiscais<
    T extends {
      companyId: string;
      clienteOrigem?: { nome: string; documento: string; cidade: string; uf: string } | null;
      clienteDestino?: { nome: string; documento: string; cidade: string; uf: string } | null;
      notasFiscais?: Array<{
        emitenteCnpj: string | null;
        emitenteNome: string | null;
        destinatarioCnpj: string | null;
        destinatarioNome: string | null;
      }>;
    },
  >(row: T): Promise<T> {
    if (!row.notasFiscais?.length) return row;

    const docs = new Set<string>();
    for (const n of row.notasFiscais) {
      if (!n.emitenteNome && n.emitenteCnpj) docs.add(normalizeDocumento(n.emitenteCnpj));
      if (!n.destinatarioNome && n.destinatarioCnpj) docs.add(normalizeDocumento(n.destinatarioCnpj));
    }

    const byDoc = new Map<string, { nome: string; cidade: string; uf: string }>();
    if (docs.size) {
      const clientes = await this.prisma.cliente.findMany({
        where: { companyId: row.companyId, ativo: true, documento: { in: [...docs] } },
        select: { documento: true, nome: true, cidade: true, uf: true },
      });
      for (const c of clientes) {
        byDoc.set(normalizeDocumento(c.documento), c);
      }
    }

    return this.enrichNotasFiscaisWithMap(row, byDoc);
  }

  private async matchClientePorLocal(
    companyId: string,
    documento: string | null | undefined,
    endereco: NfeEndereco | null | undefined
  ) {
    const norm = normalizeDocumento(documento);
    if (!norm || !endereco?.cidade?.trim() || !endereco?.uf?.trim()) return null;
    const localChave = buildLocalChave({
      codigoIbge: endereco.codigoIbge,
      cidade: endereco.cidade,
      uf: endereco.uf,
      logradouro: endereco.logradouro,
    });
    return this.prisma.cliente.findFirst({
      where: { companyId, documento: norm, localChave, ativo: true },
      select: { id: true, nome: true, documento: true, cidade: true, uf: true, logradouro: true },
    });
  }

  private async gerarNumero(companyId: string) {
    const year = new Date().getFullYear();
    const prefix = `CAR-${year}-`;
    const last = await this.prisma.carregamento.findFirst({
      where: { companyId, numero: { startsWith: prefix } },
      orderBy: { numero: "desc" },
    });
    let seq = 1;
    if (last) {
      const n = parseInt(last.numero.slice(prefix.length), 10);
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(5, "0")}`;
  }

  private async assertCliente(companyId: string, id: string, label: string) {
    const c = await this.prisma.cliente.findFirst({ where: { id, companyId, ativo: true } });
    if (!c) throw new BadRequestException(`${label} inválido ou inativo`);
    return c;
  }

  private async assertNfeHashUnico(companyId: string, hash?: string, carregamentoId?: string) {
    if (!hash) return;

    if (carregamentoId) {
      const mesmaNota = await this.prisma.carregamentoNotaFiscal.findFirst({
        where: { companyId, xmlHash: hash, carregamentoId },
        select: { id: true, numero: true, serie: true },
      });
      if (mesmaNota) {
        throw new ConflictException(
          `Esta NF-e já está vinculada a este carregamento (NF ${mesmaNota.numero}${mesmaNota.serie ? `/${mesmaNota.serie}` : ""}).`
        );
      }
    }

    const dup = await this.prisma.carregamentoNotaFiscal.findFirst({
      where: {
        companyId,
        xmlHash: hash,
        ...(carregamentoId ? { carregamentoId: { not: carregamentoId } } : {}),
      },
      select: { id: true, carregamento: { select: { id: true, numero: true } } },
    });
    if (dup) {
      throw new ConflictException(`NF-e já importada no carregamento ${dup.carregamento.numero}`);
    }
  }

  private parsedToNotaCreate(parsed: NfeParsedData) {
    return {
      chave: parsed.chave,
      numero: parsed.numero ?? "S/N",
      serie: parsed.serie,
      valorTotal: parsed.valorTotal ?? 0,
      quantidadeAnimais: parsed.quantidadeAnimais,
      emitenteCnpj: parsed.emitenteCnpj,
      emitenteNome: parsed.emitenteNome,
      destinatarioCnpj: parsed.destinatarioCnpj,
      destinatarioNome: parsed.destinatarioNome,
      produtoDescricao: parsed.produtoDescricao,
      dataEmissao: parsed.dataEmissao ? this.parseDate(parsed.dataEmissao) : null,
      xmlHash: parsed.xmlHash,
    };
  }

  private legacyNfeFromNota(nota: {
    chave: string | null;
    numero: string;
    serie: string | null;
    valorTotal: Prisma.Decimal | number;
    emitenteCnpj: string | null;
    destinatarioCnpj: string | null;
    produtoDescricao: string | null;
    dataEmissao: Date | null;
    xmlHash: string | null;
  }) {
    return {
      nfeChave: nota.chave,
      nfeNumero: nota.numero,
      nfeSerie: nota.serie,
      nfeValor: nota.valorTotal,
      nfeEmitenteCnpj: nota.emitenteCnpj,
      nfeDestinatarioCnpj: nota.destinatarioCnpj,
      nfeXmlHash: nota.xmlHash,
      nfeDataEmissao: nota.dataEmissao,
      nfeProdutoDescricao: nota.produtoDescricao,
    };
  }

  private async syncCarregamentoFromNotas(carregamentoId: string, companyId: string) {
    const notas = await this.prisma.carregamentoNotaFiscal.findMany({
      where: { carregamentoId, companyId },
      orderBy: { createdAt: "asc" },
    });

    if (!notas.length) {
      await this.prisma.carregamento.update({
        where: { id: carregamentoId },
        data: this.nfeFieldsNull(),
      });
      return;
    }

    const { quantidadeAnimais, valorCarga } = agregarNotasFiscais(notas);
    const principais = notasParaContabilizacao(notas);
    const refNota = principais[0] ?? notas[0];

    await this.prisma.carregamento.update({
      where: { id: carregamentoId },
      data: {
        quantidadeAnimais: quantidadeAnimais > 0 ? quantidadeAnimais : undefined,
        valorCarga,
        ...this.legacyNfeFromNota(refNota),
      },
    });
  }

  private async createNotaFromParsed(
    carregamentoId: string,
    companyId: string,
    userId: string | undefined,
    parsed: NfeParsedData
  ) {
    await this.assertNfeHashUnico(companyId, parsed.xmlHash, carregamentoId);

    const existentes = await this.prisma.carregamentoNotaFiscal.count({
      where: { carregamentoId, companyId },
    });
    const papel =
      existentes === 0 ? NotaFiscalPapel.PRINCIPAL : NotaFiscalPapel.TROCA;

    const nota = await this.prisma.carregamentoNotaFiscal.create({
      data: {
        companyId,
        carregamentoId,
        papel,
        ...this.parsedToNotaCreate(parsed),
      },
    });

    await this.syncCarregamentoFromNotas(carregamentoId, companyId);

    await this.registrarEvento({
      carregamentoId,
      tipo: CarregamentoEventoTipo.NFE_IMPORTADA,
      titulo: "NF-e importada",
      descricao: parsed.numero
        ? `NF ${parsed.numero}${parsed.serie ? `/${parsed.serie}` : ""}`
        : "Dados extraídos do XML",
      userId,
      metadata: { chave: parsed.chave, xmlHash: parsed.xmlHash, notaFiscalId: nota.id },
    });

    return nota;
  }

  private nfeFieldsNull() {
    return {
      nfeChave: null,
      nfeNumero: null,
      nfeSerie: null,
      nfeValor: null,
      nfeEmitenteCnpj: null,
      nfeDestinatarioCnpj: null,
      nfeXmlHash: null,
      nfeDataEmissao: null,
      nfeProdutoDescricao: null,
    };
  }

  private buildNfeData(dto: CreateCarregamentoDto | UpdateCarregamentoDto) {
    if (!dto.nfeXmlHash && !dto.nfeChave) return {};
    return {
      nfeChave: dto.nfeChave?.trim() || null,
      nfeNumero: dto.nfeNumero?.trim() || null,
      nfeSerie: dto.nfeSerie?.trim() || null,
      nfeValor: dto.nfeValor ?? null,
      nfeEmitenteCnpj: dto.nfeEmitenteCnpj?.trim() || null,
      nfeDestinatarioCnpj: dto.nfeDestinatarioCnpj?.trim() || null,
      nfeXmlHash: dto.nfeXmlHash?.trim() || null,
      nfeDataEmissao: dto.nfeDataEmissao ? this.parseDate(dto.nfeDataEmissao) : null,
      nfeProdutoDescricao: dto.nfeProdutoDescricao?.trim() || null,
    };
  }

  private buildClienteParaCadastrar(
    parsed: NfeParsedData,
    papel: "origem" | "destino"
  ): NfeClienteParaCadastrar | null {
    const isOrigem = papel === "origem";
    const documento = isOrigem ? parsed.emitenteCnpj : parsed.destinatarioCnpj;
    const nome = isOrigem ? parsed.emitenteNome : parsed.destinatarioNome;
    const endereco = isOrigem ? parsed.emitenteEndereco : parsed.destinatarioEndereco;
    if (!documento || !nome) return null;

    const norm = normalizeDocumento(documento);
    const tipoDocumento = norm.length === 11 ? DocumentoTipo.CPF : DocumentoTipo.CNPJ;
    const cidade = endereco?.cidade?.trim() || "Não informado";
    const uf = (endereco?.uf?.trim() || "NA").toUpperCase().slice(0, 2);
    const localLabel = endereco?.logradouro?.trim() || cidade;
    const nomeBase = nome.trim();
    const nomeExibicao =
      localLabel && !nomeBase.toUpperCase().includes(localLabel.toUpperCase().slice(0, 12))
        ? `${nomeBase} — ${localLabel}`
        : nomeBase;

    return {
      papel,
      tipoDocumento,
      documento: norm,
      nome: nomeExibicao,
      nomeFantasia: (isOrigem ? parsed.emitenteFantasia : parsed.destinatarioFantasia)?.trim() || null,
      cep: endereco?.cep?.replace(/\D/g, "") || null,
      logradouro: endereco?.logradouro?.trim() || null,
      numero: endereco?.numero?.trim() || null,
      complemento: endereco?.complemento?.trim() || null,
      bairro: endereco?.bairro?.trim() || null,
      cidade,
      uf,
      codigoIbge: endereco?.codigoIbge?.trim() || null,
      tipo: isOrigem ? ClienteTipo.EMBARQUE : ClienteTipo.DESEMBARQUE,
    };
  }

  private buildClientesParaCadastrar(
    parsed: NfeParsedData,
    clienteOrigem: { id: string } | null,
    clienteDestino: { id: string } | null
  ): NfeImportPreview["clientesParaCadastrar"] {
    const origem = !clienteOrigem ? this.buildClienteParaCadastrar(parsed, "origem") : null;
    const destino = !clienteDestino ? this.buildClienteParaCadastrar(parsed, "destino") : null;
    return { origem, destino };
  }

  private cidadeCodigo(cidade: string): string {
    const compact = cidade
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (compact.length >= 3) return compact.slice(0, 3);
    return compact.padEnd(3, "X");
  }

  private async ensureRotaFromClientes(
    companyId: string,
    clienteOrigemId: string,
    clienteDestinoId: string
  ): Promise<{ id: string; codigo: string; descricao: string; created: boolean } | null> {
    const existing = await this.prisma.rota.findFirst({
      where: { companyId, ativa: true, clienteOrigemId, clienteDestinoId },
      select: { id: true, codigo: true, descricao: true },
    });
    if (existing) return { ...existing, created: false };

    const [origem, destino] = await Promise.all([
      this.prisma.cliente.findFirst({ where: { id: clienteOrigemId, companyId, ativo: true } }),
      this.prisma.cliente.findFirst({ where: { id: clienteDestinoId, companyId, ativo: true } }),
    ]);
    if (!origem || !destino) return null;

    const baseCodigo = `${this.cidadeCodigo(origem.cidade)}-${this.cidadeCodigo(destino.cidade)}`;
    let codigo = baseCodigo;
    let suffix = 2;
    while (await this.prisma.rota.findFirst({ where: { companyId, codigo } })) {
      codigo = `${baseCodigo}-${suffix}`;
      suffix += 1;
    }

    const descricao = `${origem.cidade}/${origem.uf} → ${destino.cidade}/${destino.uf}`;
    const rota = await this.rotasService.create(companyId, {
      codigo,
      descricao,
      clienteOrigemId,
      clienteDestinoId,
      distanciaKm: 0,
    });

    return { id: rota.id, codigo: rota.codigo, descricao: rota.descricao, created: true };
  }

  async cadastrarClientesFromNfe(
    companyId: string,
    xml: string,
    opts: { cadastrarOrigem?: boolean; cadastrarDestino?: boolean }
  ): Promise<NfeImportPreview> {
    const parsed = parseNfeXml(xml);
    const [clienteOrigem, clienteDestino] = await Promise.all([
      this.matchClientePorLocal(companyId, parsed.emitenteCnpj, parsed.emitenteEndereco),
      this.matchClientePorLocal(companyId, parsed.destinatarioCnpj, parsed.destinatarioEndereco),
    ]);

    const sugeridos = this.buildClientesParaCadastrar(parsed, clienteOrigem, clienteDestino);

    const localKey = (s: NfeClienteParaCadastrar) =>
      `${s.documento}|${buildLocalChave({
        codigoIbge: s.codigoIbge,
        cidade: s.cidade,
        uf: s.uf,
        logradouro: s.logradouro,
      })}`;

    const criarSugerido = async (s: NfeClienteParaCadastrar, tipo?: ClienteTipo) => {
      try {
        await this.clientesService.create(companyId, {
          tipoDocumento: s.tipoDocumento,
          documento: s.documento,
          nome: s.nome,
          nomeFantasia: s.nomeFantasia ?? undefined,
          cep: s.cep ?? undefined,
          logradouro: s.logradouro ?? undefined,
          numero: s.numero ?? undefined,
          complemento: s.complemento ?? undefined,
          bairro: s.bairro ?? undefined,
          cidade: s.cidade,
          uf: s.uf,
          codigoIbge: s.codigoIbge ?? undefined,
          tipo: tipo ?? s.tipo,
        });
      } catch (e) {
        if (!(e instanceof ConflictException)) throw e;
      }
    };

    const mesmoLocal =
      sugeridos.origem &&
      sugeridos.destino &&
      localKey(sugeridos.origem) === localKey(sugeridos.destino);

    if (opts.cadastrarOrigem && !clienteOrigem && sugeridos.origem) {
      const tipo =
        mesmoLocal && opts.cadastrarDestino && !clienteDestino
          ? ClienteTipo.AMBOS
          : undefined;
      await criarSugerido(sugeridos.origem, tipo);
    }

    if (opts.cadastrarDestino && !clienteDestino && sugeridos.destino) {
      if (mesmoLocal && opts.cadastrarOrigem && !clienteOrigem) {
        // Origem já cadastrada como AMBOS no mesmo local.
      } else {
        await criarSugerido(sugeridos.destino);
      }
    }

    return this.importNfePreview(companyId, xml);
  }

  async importNfePreview(
    companyId: string,
    xml: string,
    opts?: { cadastrarClientes?: boolean }
  ): Promise<NfeImportPreview> {
    const parsed = parseNfeXml(xml);

    if (opts?.cadastrarClientes) {
      return this.cadastrarClientesFromNfe(companyId, xml, {
        cadastrarOrigem: true,
        cadastrarDestino: true,
      });
    }

    const [clienteOrigem, clienteDestino, duplicateCarregamento] = await Promise.all([
      this.matchClientePorLocal(companyId, parsed.emitenteCnpj, parsed.emitenteEndereco),
      this.matchClientePorLocal(companyId, parsed.destinatarioCnpj, parsed.destinatarioEndereco),
      parsed.xmlHash
        ? this.prisma.carregamentoNotaFiscal.findFirst({
            where: { companyId, xmlHash: parsed.xmlHash },
            select: { carregamento: { select: { id: true, numero: true } } },
          }).then((r) => r?.carregamento ?? null)
        : Promise.resolve(null),
    ]);

    let rotaSugerida: NfeImportPreview["rotaSugerida"] = null;
    let rotaCriada = false;
    if (clienteOrigem && clienteDestino) {
      const ensured = await this.ensureRotaFromClientes(
        companyId,
        clienteOrigem.id,
        clienteDestino.id
      );
      if (ensured) {
        rotaSugerida = {
          id: ensured.id,
          codigo: ensured.codigo,
          descricao: ensured.descricao,
        };
        rotaCriada = ensured.created;
      }
    }

    const obsParts = [
      parsed.chave ? `NF-e ${parsed.numero ?? ""}/${parsed.serie ?? ""} · chave ${parsed.chave}` : null,
      parsed.produtoDescricao ? `Produto: ${parsed.produtoDescricao}` : null,
      parsed.numeroGta
        ? `GTA ${parsed.numeroGta}${parsed.gtaVencimento ? ` · venc. ${parsed.gtaVencimento}` : ""}`
        : null,
      !clienteOrigem && parsed.emitenteNome ? `Emitente não cadastrado: ${parsed.emitenteNome}` : null,
      !clienteDestino && parsed.destinatarioNome ? `Destinatário não cadastrado: ${parsed.destinatarioNome}` : null,
    ].filter(Boolean);

    const clientesParaCadastrar = this.buildClientesParaCadastrar(
      parsed,
      clienteOrigem,
      clienteDestino
    );

    const inteligencia = await this.nfeBrain.analyze(companyId, parsed);

    return {
      parsed,
      clienteOrigem,
      clienteDestino,
      clientesParaCadastrar,
      rotaSugerida,
      rotaCriada: rotaCriada || undefined,
      duplicateCarregamento,
      sugestao: {
        clienteOrigemId: clienteOrigem?.id,
        clienteDestinoId: clienteDestino?.id,
        rotaId: rotaSugerida?.id,
        quantidadeAnimais: parsed.quantidadeAnimais ?? undefined,
        valorCarga: parsed.valorTotal ?? undefined,
        dataEmbarque: parsed.dataEmissao ? parsed.dataEmissao.slice(0, 10) : undefined,
        observacoes: obsParts.length ? obsParts.join(" | ") : undefined,
        numeroGta: parsed.numeroGta ?? undefined,
        gtaUf: parsed.gtaUf ?? undefined,
      },
      inteligencia,
    };
  }

  async findEventos(carregamentoId: string, companyId: string) {
    await this.findOne(carregamentoId, companyId);
    return this.prisma.carregamentoEvento.findMany({
      where: { carregamentoId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  private async calcularValoresFinanceiros(input: {
    companyId: string;
    rotaId?: string | null;
    kmRota?: number | null;
    kmReal?: number | null;
    valorCarga?: number | null;
    motoristas?: MotoristaVinculoDto[];
  }) {
    const km = input.kmReal ?? input.kmRota ?? 0;
    let valorPedagio = 0;
    let valorBalanca = 0;
    let valorKmCobrancaCliente = 0;
    let valorKmComissaoMotorista = 0;
    let percentualRota: number | null = null;

    if (input.rotaId) {
      const rota = await this.prisma.rota.findFirst({
        where: { id: input.rotaId, companyId: input.companyId },
      });
      if (rota) {
        valorPedagio = Number(rota.valorPedagio);
        valorBalanca = Number(rota.valorBalanca);
        valorKmCobrancaCliente = Number(rota.valorKmCobrancaCliente);
        valorKmComissaoMotorista = Number(rota.valorKmComissaoMotorista);
        percentualRota = rota.percentualComissao != null ? Number(rota.percentualComissao) : null;
      }
    }

    const valorFreteCliente = km * valorKmCobrancaCliente + valorPedagio + valorBalanca;

    let valorComissaoTotal = 0;
    const motoristas = input.motoristas ?? [];
    if (motoristas.length) {
      const splitDefault = 100 / motoristas.length;
      for (const vinculo of motoristas) {
        const motorista = await this.prisma.motorista.findFirst({
          where: { id: vinculo.motoristaId, companyId: input.companyId },
        });
        if (!motorista) continue;

        const split = (vinculo.percentualComissao ?? splitDefault) / 100;
        const kmRate =
          motorista.valorComissaoKm != null
            ? Number(motorista.valorComissaoKm)
            : valorKmComissaoMotorista;
        let comissao = 0;

        if (motorista.tipoComissao === "POR_KM" || motorista.tipoComissao === "MISTO") {
          comissao += calcComissaoPorKm(km, kmRate, percentualRota);
        }
        if (motorista.tipoComissao === "PERCENTUAL_CARGA" || motorista.tipoComissao === "MISTO") {
          const pct =
            motorista.percentualComissao != null
              ? Number(motorista.percentualComissao)
              : 0;
          if (input.valorCarga && pct) comissao += Number(input.valorCarga) * (pct / 100);
        }

        valorComissaoTotal += comissao * split;
      }
    } else if (km > 0 && valorKmComissaoMotorista > 0) {
      valorComissaoTotal = calcComissaoPorKm(km, valorKmComissaoMotorista, percentualRota);
    }

    const margemBruta = valorFreteCliente - valorComissaoTotal - valorPedagio - valorBalanca;

    return {
      valorFreteCliente: valorFreteCliente || null,
      valorComissaoTotal: valorComissaoTotal || null,
      valorPedagio: valorPedagio || null,
      valorBalanca: valorBalanca || null,
      margemBruta: margemBruta || null,
    };
  }

  private mergeFinanceiroComDescontos(
    bruto: Awaited<ReturnType<CarregamentosService["calcularValoresFinanceiros"]>>,
    existing?: {
      descontoFreteCliente?: unknown;
      motoristas?: { descontoComissao?: unknown }[];
    }
  ) {
    const descontoFrete = Number(existing?.descontoFreteCliente ?? 0);
    const descontoComissaoTotal = somaDescontosComissaoMotoristas(existing?.motoristas ?? []);
    const liquidos = calcularValoresLiquidos({
      valorFreteCliente: bruto.valorFreteCliente,
      valorComissaoTotal: bruto.valorComissaoTotal,
      valorPedagio: bruto.valorPedagio,
      valorBalanca: bruto.valorBalanca,
      descontoFreteCliente: descontoFrete,
      descontoComissaoTotal,
    });
    return {
      ...bruto,
      descontoFreteCliente: liquidos.descontoFreteCliente,
      valorFreteLiquido: liquidos.valorFreteLiquido,
      valorComissaoLiquida: liquidos.valorComissaoLiquida,
      margemLiquida: liquidos.margemLiquida,
    };
  }

  private async resolveFinancialInput(
    companyId: string,
    dto: CreateCarregamentoDto | UpdateCarregamentoDto,
    existing?: Awaited<ReturnType<CarregamentosService["findOne"]>>
  ) {
    const rotaId = dto.rotaId !== undefined ? dto.rotaId || null : existing?.rotaId ?? null;
    const kmRota =
      dto.kmRota !== undefined
        ? dto.kmRota
        : dto.rotaId !== undefined
          ? await this.resolveRotaKm(companyId, rotaId ?? undefined, undefined)
          : existing?.kmRota != null
            ? Number(existing.kmRota)
            : null;
    const kmReal = dto.kmReal !== undefined ? dto.kmReal : existing?.kmReal != null ? Number(existing.kmReal) : null;
    const valorCarga =
      dto.valorCarga !== undefined
        ? dto.valorCarga
        : existing?.valorCarga != null
          ? Number(existing.valorCarga)
          : null;
    const motoristas =
      dto.motoristas !== undefined
        ? dto.motoristas
        : existing?.motoristas?.map((m) => ({
            motoristaId: m.motoristaId,
            principal: m.principal,
            percentualComissao: m.percentualComissao != null ? Number(m.percentualComissao) : undefined,
          })) ?? [];

    return this.mergeFinanceiroComDescontos(
      await this.calcularValoresFinanceiros({ companyId, rotaId, kmRota, kmReal, valorCarga, motoristas }),
      existing
    );
  }

  private async resolveRotaKm(companyId: string, rotaId?: string, kmManual?: number) {
    if (kmManual != null && Number.isFinite(kmManual)) return kmManual;
    if (!rotaId) return null;
    const rota = await this.prisma.rota.findFirst({ where: { id: rotaId, companyId, ativa: true } });
    if (!rota) throw new BadRequestException("Rota inválida ou inativa");
    return Number(rota.distanciaKm);
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 20,
    search?: string,
    status?: CarregamentoStatus
  ) {
    if (!companyId) {
      throw new BadRequestException("Empresa não identificada — faça login novamente");
    }
    const skip = (page - 1) * limit;
    const where: Prisma.CarregamentoWhereInput = {
      companyId,
      status: status ?? { not: CarregamentoStatus.CANCELADO },
      ...(search
        ? {
            OR: [
              { numero: { contains: search, mode: "insensitive" } },
              { numeroMinuta: { contains: search, mode: "insensitive" } },
              { clienteOrigem: { nome: { contains: search, mode: "insensitive" } } },
              { clienteDestino: { nome: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.carregamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: includeList,
      }),
      this.prisma.carregamento.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const row = await this.prisma.carregamento.findFirst({
      where: { id, companyId },
      include: includeDetail,
    });
    if (!row) throw new NotFoundException("Carregamento não encontrado");
    return this.enrichNotasFiscais(row);
  }

  async create(companyId: string, userId: string | undefined, dto: CreateCarregamentoDto) {
    if (!dto.quantidadeAnimais || dto.quantidadeAnimais < 1) {
      throw new BadRequestException("Quantidade de animais deve ser maior que zero");
    }
    await this.assertCliente(companyId, dto.clienteOrigemId, "Cliente origem");
    await this.assertCliente(companyId, dto.clienteDestinoId, "Cliente destino");
    if (dto.clienteOrigemId === dto.clienteDestinoId) {
      throw new BadRequestException("Origem e destino não podem ser iguais");
    }
    await this.assertNfeHashUnico(companyId, dto.nfeXmlHash);

    const kmRota = await this.resolveRotaKm(companyId, dto.rotaId, dto.kmRota);
    const numero = await this.gerarNumero(companyId);
    const financeiro = this.mergeFinanceiroComDescontos(
      await this.calcularValoresFinanceiros({
        companyId,
        rotaId: dto.rotaId || null,
        kmRota,
        kmReal: dto.kmReal ?? null,
        valorCarga: dto.valorCarga ?? null,
        motoristas: dto.motoristas,
      })
    );

    const status = dto.status ?? CarregamentoStatus.RASCUNHO;

    const created = await this.prisma.carregamento.create({
      data: {
        companyId,
        numero,
        status,
        clienteOrigemId: dto.clienteOrigemId,
        clienteDestinoId: dto.clienteDestinoId,
        rotaId: dto.rotaId || null,
        quantidadeAnimais: dto.quantidadeAnimais,
        pesoMedioEstimado: dto.pesoMedioEstimado ?? null,
        pesoTotal: dto.pesoTotal ?? null,
        kmRota,
        kmReal: dto.kmReal ?? null,
        valorCarga: dto.valorCarga ?? null,
        valorFreteCliente: financeiro.valorFreteCliente,
        valorComissaoTotal: financeiro.valorComissaoTotal,
        valorPedagio: financeiro.valorPedagio,
        valorBalanca: financeiro.valorBalanca,
        margemBruta: financeiro.margemBruta,
        descontoFreteCliente: financeiro.descontoFreteCliente,
        valorFreteLiquido: financeiro.valorFreteLiquido,
        valorComissaoLiquida: financeiro.valorComissaoLiquida,
        margemLiquida: financeiro.margemLiquida,
        dataEmbarque: this.parseDate(dto.dataEmbarque),
        dataDesembarque: this.parseDate(dto.dataDesembarque),
        dataPrevisaoDesembarque: this.parseDate(dto.dataPrevisaoDesembarque),
        observacoes: dto.observacoes?.trim() || null,
        numeroMinuta: dto.numeroMinuta?.trim() || null,
        numeroGta: dto.numeroGta?.trim() || null,
        gtaUf: dto.gtaUf?.trim().toUpperCase().slice(0, 2) || null,
        motoristas: dto.motoristas?.length
          ? {
              create: dto.motoristas.map((m) => ({
                motoristaId: m.motoristaId,
                principal: m.principal ?? false,
                percentualComissao: m.percentualComissao ?? null,
              })),
            }
          : undefined,
        veiculos: dto.veiculos?.length
          ? {
              create: dto.veiculos.map((v) => ({
                veiculoId: v.veiculoId,
                principal: v.principal ?? true,
              })),
            }
          : undefined,
      },
      include: includeDetail,
    });

    await this.registrarEvento({
      carregamentoId: created.id,
      tipo: CarregamentoEventoTipo.CRIADO,
      titulo: "Carregamento criado",
      descricao: `Número ${created.numero} · status ${STATUS_LABEL[status]}`,
      statusNovo: status,
      userId,
    });

    if (dto.nfeXmlHash) {
      await this.createNotaFromParsed(created.id, companyId, userId, {
        chave: dto.nfeChave ?? null,
        numero: dto.nfeNumero ?? null,
        serie: dto.nfeSerie ?? null,
        valorTotal: dto.nfeValor ?? null,
        emitenteCnpj: dto.nfeEmitenteCnpj ?? null,
        emitenteNome: null,
        emitenteFantasia: null,
        emitenteEndereco: null,
        destinatarioCnpj: dto.nfeDestinatarioCnpj ?? null,
        destinatarioNome: null,
        destinatarioFantasia: null,
        destinatarioEndereco: null,
        dataEmissao: dto.nfeDataEmissao ?? null,
        quantidadeAnimais: dto.quantidadeAnimais,
        produtoDescricao: dto.nfeProdutoDescricao ?? null,
        numeroGta: dto.numeroGta ?? null,
        gtaUf: dto.gtaUf ?? null,
        gtaVencimento: null,
        xmlHash: dto.nfeXmlHash,
      });
    }

    return this.findOne(created.id, companyId);
  }

  async update(id: string, companyId: string, userId: string | undefined, dto: UpdateCarregamentoDto) {
    const existing = await this.findOne(id, companyId);
    if (dto.clienteOrigemId) await this.assertCliente(companyId, dto.clienteOrigemId, "Cliente origem");
    if (dto.clienteDestinoId) await this.assertCliente(companyId, dto.clienteDestinoId, "Cliente destino");
    if (dto.nfeXmlHash) await this.assertNfeHashUnico(companyId, dto.nfeXmlHash, id);

    if (dto.status !== undefined && dto.status !== existing.status) {
      this.assertStatusTransition(existing.status, dto.status);
      if (dto.status === CarregamentoStatus.FINALIZADO && !existing.financeiroFechadoAt) {
        const check = await this.financeiroService.checklistFechamento(id, companyId);
        throw new BadRequestException(
          check.pendencias.length
            ? `Financeiro pendente: ${check.pendencias.join(" · ")}`
            : 'Feche o financeiro na aba Dados (botão "Fechar financeiro") antes de finalizar'
        );
      }
    }

    const financeiro = await this.resolveFinancialInput(companyId, dto, existing);
    const nfeData = this.buildNfeData(dto);

    const data: Prisma.CarregamentoUpdateInput = {
      valorFreteCliente: financeiro.valorFreteCliente,
      valorComissaoTotal: financeiro.valorComissaoTotal,
      valorPedagio: financeiro.valorPedagio,
      valorBalanca: financeiro.valorBalanca,
      margemBruta: financeiro.margemBruta,
      descontoFreteCliente: financeiro.descontoFreteCliente,
      valorFreteLiquido: financeiro.valorFreteLiquido,
      valorComissaoLiquida: financeiro.valorComissaoLiquida,
      margemLiquida: financeiro.margemLiquida,
    };

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.clienteOrigemId !== undefined) data.clienteOrigem = { connect: { id: dto.clienteOrigemId } };
    if (dto.clienteDestinoId !== undefined) data.clienteDestino = { connect: { id: dto.clienteDestinoId } };
    if (dto.rotaId !== undefined) data.rota = dto.rotaId ? { connect: { id: dto.rotaId } } : { disconnect: true };
    if (dto.quantidadeAnimais !== undefined) data.quantidadeAnimais = dto.quantidadeAnimais;
    if (dto.pesoMedioEstimado !== undefined) data.pesoMedioEstimado = dto.pesoMedioEstimado;
    if (dto.pesoTotal !== undefined) data.pesoTotal = dto.pesoTotal;
    if (dto.kmRota !== undefined || dto.rotaId !== undefined) {
      data.kmRota = await this.resolveRotaKm(companyId, dto.rotaId, dto.kmRota);
    }
    if (dto.kmReal !== undefined) data.kmReal = dto.kmReal;
    if (dto.valorCarga !== undefined) data.valorCarga = dto.valorCarga;
    if (dto.dataEmbarque !== undefined) data.dataEmbarque = this.parseDate(dto.dataEmbarque);
    if (dto.dataDesembarque !== undefined) data.dataDesembarque = this.parseDate(dto.dataDesembarque);
    if (dto.dataPrevisaoDesembarque !== undefined) data.dataPrevisaoDesembarque = this.parseDate(dto.dataPrevisaoDesembarque);
    if (dto.observacoes !== undefined) data.observacoes = dto.observacoes?.trim() || null;
    if (dto.numeroMinuta !== undefined) data.numeroMinuta = dto.numeroMinuta?.trim() || null;
    if (dto.numeroGta !== undefined) data.numeroGta = dto.numeroGta?.trim() || null;
    if (dto.gtaUf !== undefined) data.gtaUf = dto.gtaUf?.trim().toUpperCase().slice(0, 2) || null;
    if (dto.clearMinutaFoto) {
      await deleteStoredFile(existing.minutaFotoPath);
      data.minutaFotoPath = null;
      data.minutaFotoNome = null;
    }
    if (dto.clearNfe) {
      await this.prisma.carregamentoNotaFiscal.deleteMany({ where: { carregamentoId: id, companyId } });
      Object.assign(data, this.nfeFieldsNull());
    } else if (Object.keys(nfeData).length) Object.assign(data, nfeData);

    if (dto.motoristas !== undefined) {
      await this.prisma.carregamentoMotorista.deleteMany({ where: { carregamentoId: id } });
      if (dto.motoristas.length) {
        data.motoristas = {
          create: dto.motoristas.map((m) => ({
            motoristaId: m.motoristaId,
            principal: m.principal ?? false,
            percentualComissao: m.percentualComissao ?? null,
          })),
        };
      }
    }
    if (dto.veiculos !== undefined) {
      await this.prisma.carregamentoVeiculo.deleteMany({ where: { carregamentoId: id } });
      if (dto.veiculos.length) {
        data.veiculos = {
          create: dto.veiculos.map((v) => ({
            veiculoId: v.veiculoId,
            principal: v.principal ?? true,
          })),
        };
      }
    }

    const updated = await this.prisma.carregamento.update({
      where: { id },
      data,
      include: includeDetail,
    });

    if (dto.clearNfe && (existing.nfeXmlHash || existing.nfeChave || existing.notasFiscais?.length)) {
      await this.registrarEvento({
        carregamentoId: id,
        tipo: CarregamentoEventoTipo.EDITADO,
        titulo: "Notas fiscais removidas",
        descricao: "Todos os vínculos com NF-e foram removidos deste carregamento",
        userId,
      });
    } else if (dto.status !== undefined && dto.status !== existing.status) {
      const voltou = STATUS_ROLLBACK[existing.status] === dto.status;
      await this.registrarEvento({
        carregamentoId: id,
        tipo: CarregamentoEventoTipo.STATUS_ALTERADO,
        titulo: voltou
          ? `Status corrigido: ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[dto.status]}`
          : `Status: ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[dto.status]}`,
        statusAnterior: existing.status,
        statusNovo: dto.status,
        userId,
      });
      await this.dashboardEvents.emit({
        companyId,
        type: "carregamento_updated",
        carregamentoId: id,
        status: dto.status,
      });
      void this.notifications.notifyMotoristasDoCarregamento(companyId, id, {
        title: "Viagem atualizada",
        body: `${updated.numero}: ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[dto.status]}`,
        url: `/motorista/viagens/${id}`,
        tag: `viagem-${id}`,
      });
    } else if (Object.keys(dto).some((k) => k !== "status" && k !== "clearNfe")) {
      await this.registrarEvento({
        carregamentoId: id,
        tipo: CarregamentoEventoTipo.EDITADO,
        titulo: "Dados atualizados",
        userId,
      });
    }

    await this.financeiroService.recalcularLiquidosCarregamento(id, companyId);
    return this.findOne(id, companyId);
  }

  async uploadMinutaFoto(
    id: string,
    companyId: string,
    userId: string | undefined,
    file: { buffer: Buffer; originalname: string; mimetype?: string }
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Envie uma foto da minuta (JPG ou PNG)");
    }
    const existing = await this.findOne(id, companyId);
    if (existing.minutaFotoPath) {
      await deleteStoredFile(existing.minutaFotoPath);
    }

    const saved = await saveCarregamentoMinutaFoto(
      companyId,
      id,
      file.buffer,
      file.originalname || "minuta.jpg"
    );

    const updated = await this.prisma.carregamento.update({
      where: { id },
      data: { minutaFotoPath: saved.path, minutaFotoNome: saved.nome },
      include: includeDetail,
    });

    await this.registrarEvento({
      carregamentoId: id,
      tipo: CarregamentoEventoTipo.EDITADO,
      titulo: "Foto da minuta anexada",
      descricao: existing.numeroMinuta
        ? `Ordem de coleta nº ${existing.numeroMinuta}`
        : saved.nome,
      userId,
    });

    return updated;
  }

  async getMinutaFotoFile(id: string, companyId: string) {
    const row = await this.findOne(id, companyId);
    if (!row.minutaFotoPath) {
      throw new NotFoundException("Este carregamento não possui foto da minuta");
    }
    const fullPath = resolveUploadPath(row.minutaFotoPath);
    return {
      fullPath,
      mime: mimeFromPath(row.minutaFotoPath),
      nome: row.minutaFotoNome || "minuta.jpg",
      stream: createReadStream(fullPath),
    };
  }

  async removeMinutaFoto(id: string, companyId: string, userId?: string) {
    const existing = await this.findOne(id, companyId);
    if (!existing.minutaFotoPath) return existing;
    await deleteStoredFile(existing.minutaFotoPath);
    const updated = await this.prisma.carregamento.update({
      where: { id },
      data: { minutaFotoPath: null, minutaFotoNome: null },
      include: includeDetail,
    });
    await this.registrarEvento({
      carregamentoId: id,
      tipo: CarregamentoEventoTipo.EDITADO,
      titulo: "Foto da minuta removida",
      userId,
    });
    return updated;
  }

  async listarFotosCarga(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.carregamentoFoto.findMany({
      where: { carregamentoId: id, companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        momento: true,
        nome: true,
        observacao: true,
        createdAt: true,
        motorista: { select: { id: true, nome: true } },
      },
    });
  }

  async getFotoCargaFile(id: string, fotoId: string, companyId: string) {
    await this.findOne(id, companyId);
    const foto = await this.prisma.carregamentoFoto.findFirst({
      where: { id: fotoId, carregamentoId: id, companyId },
    });
    if (!foto) throw new NotFoundException("Foto não encontrada");
    return {
      mime: mimeFromPath(foto.path),
      nome: foto.nome,
      stream: createReadStream(resolveUploadPath(foto.path)),
    };
  }

  async removeFotoCarga(id: string, fotoId: string, companyId: string, userId?: string) {
    await this.findOne(id, companyId);
    const foto = await this.prisma.carregamentoFoto.findFirst({
      where: { id: fotoId, carregamentoId: id, companyId },
    });
    if (!foto) throw new NotFoundException("Foto não encontrada");
    await deleteStoredFile(foto.path);
    await this.prisma.carregamentoFoto.delete({ where: { id: fotoId } });
    await this.registrarEvento({
      carregamentoId: id,
      tipo: CarregamentoEventoTipo.EDITADO,
      titulo: "Foto da carga removida",
      userId,
    });
    return { success: true };
  }

  async removeNfe(id: string, companyId: string, userId?: string) {
    return this.update(id, companyId, userId, { clearNfe: true });
  }

  async addNotaFiscal(id: string, companyId: string, userId: string | undefined, xml: string) {
    await this.findOne(id, companyId);
    const parsed = parseNfeXml(xml);
    await this.createNotaFromParsed(id, companyId, userId, parsed);
    const carregamento = await this.findOne(id, companyId);
    const [clienteOrigem, clienteDestino] = await Promise.all([
      this.matchClientePorLocal(companyId, parsed.emitenteCnpj, parsed.emitenteEndereco),
      this.matchClientePorLocal(companyId, parsed.destinatarioCnpj, parsed.destinatarioEndereco),
    ]);
    const clientesParaCadastrar = this.buildClientesParaCadastrar(
      parsed,
      clienteOrigem,
      clienteDestino
    );
    const inteligencia = await this.nfeBrain.analyze(companyId, parsed, { carregamentoId: id });
    return { carregamento, clientesParaCadastrar, inteligencia };
  }

  async removeNotaFiscal(
    carregamentoId: string,
    notaId: string,
    companyId: string,
    userId?: string
  ) {
    const nota = await this.prisma.carregamentoNotaFiscal.findFirst({
      where: { id: notaId, carregamentoId, companyId },
    });
    if (!nota) throw new NotFoundException("Nota fiscal não encontrada");

    await this.prisma.carregamentoNotaFiscal.delete({ where: { id: notaId } });
    await this.syncCarregamentoFromNotas(carregamentoId, companyId);

    await this.registrarEvento({
      carregamentoId,
      tipo: CarregamentoEventoTipo.EDITADO,
      titulo: "NF-e removida",
      descricao: `NF ${nota.numero}${nota.serie ? `/${nota.serie}` : ""}`,
      userId,
      metadata: { notaFiscalId: notaId, xmlHash: nota.xmlHash },
    });

    return this.findOne(carregamentoId, companyId);
  }

  async updateNotaPapel(
    carregamentoId: string,
    notaId: string,
    companyId: string,
    userId: string | undefined,
    papel: NotaFiscalPapel
  ) {
    const nota = await this.prisma.carregamentoNotaFiscal.findFirst({
      where: { id: notaId, carregamentoId, companyId },
    });
    if (!nota) throw new NotFoundException("Nota fiscal não encontrada");
    if (nota.papel === papel) return this.findOne(carregamentoId, companyId);

    await this.prisma.carregamentoNotaFiscal.update({
      where: { id: notaId },
      data: { papel },
    });
    await this.syncCarregamentoFromNotas(carregamentoId, companyId);

    const label = papel === NotaFiscalPapel.PRINCIPAL ? "Principal" : "Troca";
    await this.registrarEvento({
      carregamentoId,
      tipo: CarregamentoEventoTipo.EDITADO,
      titulo: `NF-e marcada como ${label}`,
      descricao: `NF ${nota.numero}${nota.serie ? `/${nota.serie}` : ""}`,
      userId,
      metadata: { notaFiscalId: notaId, papel },
    });

    return this.findOne(carregamentoId, companyId);
  }

  async remove(id: string, companyId: string, userId?: string) {
    const existing = await this.findOne(id, companyId);
    if (existing.status === CarregamentoStatus.CANCELADO) return existing;

    this.assertStatusTransition(existing.status, CarregamentoStatus.CANCELADO);

    const updated = await this.prisma.carregamento.update({
      where: { id },
      data: { status: CarregamentoStatus.CANCELADO },
      include: includeDetail,
    });

    await this.registrarEvento({
      carregamentoId: id,
      tipo: CarregamentoEventoTipo.STATUS_ALTERADO,
      titulo: "Carregamento cancelado",
      statusAnterior: existing.status,
      statusNovo: CarregamentoStatus.CANCELADO,
      userId,
    });

    return updated;
  }
}
