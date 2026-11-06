import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TipoVeiculo } from "@prisma/client";

export type CreateVeiculoDto = {
  placa: string;
  renavam?: string;
  modelo?: string;
  marca?: string;
  ano?: number;
  tipo?: TipoVeiculo;
  codigoCentroCusto?: string;
  descricaoCentroCusto?: string;
};

export type UpdateVeiculoDto = Partial<CreateVeiculoDto> & { ativo?: boolean };

function normalizePlaca(placa: string): string {
  return placa.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      ativo: true,
      ...(search
        ? {
            OR: [
              { placa: { contains: search, mode: "insensitive" as const } },
              { modelo: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.veiculo.findMany({ where, skip, take: limit, orderBy: { placa: "asc" } }),
      this.prisma.veiculo.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    return this.prisma.veiculo.findFirstOrThrow({ where: { id, companyId } });
  }

  async create(companyId: string, dto: CreateVeiculoDto) {
    const placa = normalizePlaca(dto.placa);
    if (placa.length < 7) throw new BadRequestException("Placa inválida");
    const exists = await this.prisma.veiculo.findFirst({ where: { companyId, placa } });
    if (exists) throw new ConflictException("Placa já cadastrada");
    return this.prisma.veiculo.create({
      data: {
        companyId,
        placa,
        renavam: dto.renavam ?? null,
        modelo: dto.modelo ?? null,
        marca: dto.marca ?? null,
        ano: dto.ano ?? null,
        tipo: dto.tipo ?? TipoVeiculo.CAMINHAO,
        codigoCentroCusto: dto.codigoCentroCusto ?? null,
        descricaoCentroCusto: dto.descricaoCentroCusto ?? null,
      },
    });
  }

  async update(id: string, companyId: string, dto: UpdateVeiculoDto) {
    await this.findOne(id, companyId);
    const data: Record<string, unknown> = {};
    if (dto.placa !== undefined) {
      const placa = normalizePlaca(dto.placa);
      if (placa.length < 7) throw new BadRequestException("Placa inválida");
      const exists = await this.prisma.veiculo.findFirst({ where: { companyId, placa, NOT: { id } } });
      if (exists) throw new ConflictException("Placa já cadastrada");
      data.placa = placa;
    }
    if (dto.renavam !== undefined) data.renavam = dto.renavam || null;
    if (dto.modelo !== undefined) data.modelo = dto.modelo || null;
    if (dto.marca !== undefined) data.marca = dto.marca || null;
    if (dto.ano !== undefined) data.ano = dto.ano ?? null;
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.codigoCentroCusto !== undefined) data.codigoCentroCusto = dto.codigoCentroCusto || null;
    if (dto.descricaoCentroCusto !== undefined) data.descricaoCentroCusto = dto.descricaoCentroCusto || null;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    return this.prisma.veiculo.update({ where: { id }, data });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.veiculo.update({ where: { id }, data: { ativo: false } });
    return { success: true };
  }
}
