import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateRotaDto = {
  codigo: string;
  descricao: string;
  clienteOrigemId?: string;
  clienteDestinoId?: string;
  origemTexto?: string;
  destinoTexto?: string;
  distanciaKm: number;
  valorPedagio?: number;
  valorBalanca?: number;
  valorKmCobrancaCliente?: number;
  valorKmComissaoMotorista?: number;
  percentualComissao?: number;
};

export type UpdateRotaDto = Partial<CreateRotaDto> & { ativa?: boolean };

@Injectable()
export class RotasService {
  constructor(private prisma: PrismaService) {}

  private include = {
    clienteOrigem: { select: { id: true, nome: true, cidade: true, uf: true } },
    clienteDestino: { select: { id: true, nome: true, cidade: true, uf: true } },
  };

  async findAll(companyId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      ativa: true,
      ...(search
        ? {
            OR: [
              { codigo: { contains: search, mode: "insensitive" as const } },
              { descricao: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.rota.findMany({ where, skip, take: limit, orderBy: { codigo: "asc" }, include: this.include }),
      this.prisma.rota.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    return this.prisma.rota.findFirstOrThrow({
      where: { id, companyId },
      include: this.include,
    });
  }

  private async assertCliente(companyId: string, clienteId: string, label: string) {
    const c = await this.prisma.cliente.findFirst({ where: { id: clienteId, companyId, ativo: true } });
    if (!c) throw new NotFoundException(`${label} não encontrado`);
  }

  async create(companyId: string, dto: CreateRotaDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    if (!codigo) throw new BadRequestException("Código obrigatório");
    const exists = await this.prisma.rota.findFirst({ where: { companyId, codigo } });
    if (exists) throw new ConflictException("Código de rota já cadastrado");
    if (dto.clienteOrigemId) await this.assertCliente(companyId, dto.clienteOrigemId, "Cliente origem");
    if (dto.clienteDestinoId) await this.assertCliente(companyId, dto.clienteDestinoId, "Cliente destino");
    return this.prisma.rota.create({
      data: {
        companyId,
        codigo,
        descricao: dto.descricao,
        clienteOrigemId: dto.clienteOrigemId ?? null,
        clienteDestinoId: dto.clienteDestinoId ?? null,
        origemTexto: dto.origemTexto ?? null,
        destinoTexto: dto.destinoTexto ?? null,
        distanciaKm: dto.distanciaKm,
        valorPedagio: dto.valorPedagio ?? 0,
        valorBalanca: dto.valorBalanca ?? 0,
        valorKmCobrancaCliente: dto.valorKmCobrancaCliente ?? 0,
        valorKmComissaoMotorista: dto.valorKmComissaoMotorista ?? 0,
        percentualComissao: dto.percentualComissao ?? null,
      },
      include: this.include,
    });
  }

  async update(id: string, companyId: string, dto: UpdateRotaDto) {
    await this.findOne(id, companyId);
    const data: Record<string, unknown> = {};
    if (dto.codigo !== undefined) {
      const codigo = dto.codigo.trim().toUpperCase();
      const exists = await this.prisma.rota.findFirst({ where: { companyId, codigo, NOT: { id } } });
      if (exists) throw new ConflictException("Código de rota já cadastrado");
      data.codigo = codigo;
    }
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.clienteOrigemId !== undefined) {
      if (dto.clienteOrigemId) await this.assertCliente(companyId, dto.clienteOrigemId, "Cliente origem");
      data.clienteOrigemId = dto.clienteOrigemId || null;
    }
    if (dto.clienteDestinoId !== undefined) {
      if (dto.clienteDestinoId) await this.assertCliente(companyId, dto.clienteDestinoId, "Cliente destino");
      data.clienteDestinoId = dto.clienteDestinoId || null;
    }
    if (dto.origemTexto !== undefined) data.origemTexto = dto.origemTexto || null;
    if (dto.destinoTexto !== undefined) data.destinoTexto = dto.destinoTexto || null;
    if (dto.distanciaKm !== undefined) data.distanciaKm = dto.distanciaKm;
    if (dto.valorPedagio !== undefined) data.valorPedagio = dto.valorPedagio;
    if (dto.valorBalanca !== undefined) data.valorBalanca = dto.valorBalanca;
    if (dto.valorKmCobrancaCliente !== undefined) data.valorKmCobrancaCliente = dto.valorKmCobrancaCliente;
    if (dto.valorKmComissaoMotorista !== undefined) data.valorKmComissaoMotorista = dto.valorKmComissaoMotorista;
    if (dto.percentualComissao !== undefined) data.percentualComissao = dto.percentualComissao ?? null;
    if (dto.ativa !== undefined) data.ativa = dto.ativa;
    return this.prisma.rota.update({ where: { id }, data, include: this.include });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.rota.update({ where: { id }, data: { ativa: false } });
    return { success: true };
  }
}
