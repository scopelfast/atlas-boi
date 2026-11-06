import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { validateCnpj, validateCpf, toCnpjRaw, toCpfRaw, normalizeDocumento } from "../../common/utils/documents";
import { buildLocalChave } from "../../common/utils/cliente-local";
import { ClienteTipo, DocumentoTipo } from "@prisma/client";

export type CreateClienteDto = {
  tipoDocumento: DocumentoTipo;
  documento: string;
  nome: string;
  nomeFantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  codigoIbge?: string;
  latitude?: number;
  longitude?: number;
  tipo?: ClienteTipo;
};

export type UpdateClienteDto = Partial<CreateClienteDto> & { ativo?: boolean };

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, page = 1, limit = 20, search?: string, tipo?: ClienteTipo) {
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      ativo: true,
      ...(tipo ? { tipo } : {}),
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" as const } },
              { documento: { contains: search, mode: "insensitive" as const } },
              { cidade: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.cliente.findMany({ where, skip, take: limit, orderBy: { nome: "asc" } }),
      this.prisma.cliente.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    return this.prisma.cliente.findFirstOrThrow({ where: { id, companyId } });
  }

  private validateAndNormalizeDocumento(tipo: DocumentoTipo, documento: string): string {
    if (tipo === DocumentoTipo.CPF) {
      const raw = toCpfRaw(documento);
      if (!validateCpf(raw)) throw new BadRequestException("CPF inválido");
      return raw;
    }
    const raw = normalizeDocumento(documento);
    if (raw.length !== 14) throw new BadRequestException("CNPJ deve ter 14 caracteres");
    if (!validateCnpj(raw)) throw new BadRequestException("CNPJ inválido");
    return raw;
  }

  async create(companyId: string, dto: CreateClienteDto) {
    const documento = this.validateAndNormalizeDocumento(dto.tipoDocumento, dto.documento);
    const localChave = buildLocalChave({
      codigoIbge: dto.codigoIbge,
      cidade: dto.cidade,
      uf: dto.uf,
      logradouro: dto.logradouro,
    });
    const exists = await this.prisma.cliente.findFirst({
      where: { companyId, documento, localChave },
    });
    if (exists) {
      throw new ConflictException(
        "Este documento já está cadastrado neste local (mesmo município/endereço)"
      );
    }
    try {
      return await this.prisma.cliente.create({
        data: {
          companyId,
          tipoDocumento: dto.tipoDocumento,
          documento,
          localChave,
          nome: dto.nome,
          nomeFantasia: dto.nomeFantasia ?? null,
          cep: dto.cep ?? null,
          logradouro: dto.logradouro ?? null,
          numero: dto.numero ?? null,
          complemento: dto.complemento ?? null,
          bairro: dto.bairro ?? null,
          cidade: dto.cidade,
          uf: dto.uf.toUpperCase().slice(0, 2),
          codigoIbge: dto.codigoIbge ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          tipo: dto.tipo ?? ClienteTipo.AMBOS,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(
          "Este documento já está cadastrado neste local (mesmo município/endereço)"
        );
      }
      throw e;
    }
  }

  async update(id: string, companyId: string, dto: UpdateClienteDto) {
    await this.findOne(id, companyId);
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.nomeFantasia !== undefined) data.nomeFantasia = dto.nomeFantasia || null;
    if (dto.cep !== undefined) data.cep = dto.cep || null;
    if (dto.logradouro !== undefined) data.logradouro = dto.logradouro || null;
    if (dto.numero !== undefined) data.numero = dto.numero || null;
    if (dto.complemento !== undefined) data.complemento = dto.complemento || null;
    if (dto.bairro !== undefined) data.bairro = dto.bairro || null;
    if (dto.cidade !== undefined) data.cidade = dto.cidade;
    if (dto.uf !== undefined) data.uf = dto.uf.toUpperCase().slice(0, 2);
    if (dto.codigoIbge !== undefined) data.codigoIbge = dto.codigoIbge || null;
    if (
      dto.cidade !== undefined ||
      dto.uf !== undefined ||
      dto.codigoIbge !== undefined ||
      dto.logradouro !== undefined
    ) {
      const current = await this.findOne(id, companyId);
      data.localChave = buildLocalChave({
        codigoIbge: (dto.codigoIbge ?? current.codigoIbge) as string | null,
        cidade: (dto.cidade ?? current.cidade) as string,
        uf: (dto.uf ?? current.uf) as string,
        logradouro: (dto.logradouro ?? current.logradouro) as string | null,
      });
    }
    if (dto.latitude !== undefined) data.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) data.longitude = dto.longitude ?? null;
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.tipoDocumento !== undefined) data.tipoDocumento = dto.tipoDocumento;
    if (dto.documento !== undefined && dto.tipoDocumento) {
      const documento = this.validateAndNormalizeDocumento(dto.tipoDocumento, dto.documento);
      const current = await this.findOne(id, companyId);
      const localChave =
        (data.localChave as string | undefined) ??
        buildLocalChave({
          codigoIbge: current.codigoIbge,
          cidade: current.cidade,
          uf: current.uf,
          logradouro: current.logradouro,
        });
      const exists = await this.prisma.cliente.findFirst({
        where: { companyId, documento, localChave, NOT: { id } },
      });
      if (exists) {
        throw new ConflictException(
          "Este documento já está cadastrado neste local (mesmo município/endereço)"
        );
      }
      data.documento = documento;
      data.localChave = localChave;
    }
    return this.prisma.cliente.update({ where: { id }, data });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.cliente.update({ where: { id }, data: { ativo: false } });
    return { success: true };
  }
}
