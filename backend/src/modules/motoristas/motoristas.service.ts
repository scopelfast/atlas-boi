import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { validateCpf, toCpfRaw } from "../../common/utils/documents";
import { TipoComissao } from "@prisma/client";

const bcrypt = require("bcryptjs");

export type CreateMotoristaDto = {
  nome: string;
  cpf?: string;
  cnh?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  telefone?: string;
  email?: string;
  tipoComissao?: TipoComissao;
  valorComissaoKm?: number;
  percentualComissao?: number;
  portalSenha?: string;
};

export type UpdateMotoristaDto = Partial<CreateMotoristaDto> & { ativo?: boolean };

type MotoristaRow = {
  id: string;
  companyId: string;
  nome: string;
  cpf: string | null;
  cnh: string | null;
  cnhCategoria: string | null;
  cnhValidade: Date | null;
  telefone: string | null;
  email: string | null;
  tipoComissao: TipoComissao;
  valorComissaoKm: unknown;
  percentualComissao: unknown;
  ativo: boolean;
  portalSenha: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function sanitizeMotorista(m: MotoristaRow) {
  const { portalSenha, ...rest } = m;
  return {
    ...rest,
    portalConfigurado: Boolean(portalSenha),
  };
}

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  private async hashPortalSenha(senha: string) {
    const trimmed = senha.trim();
    if (trimmed.length < 6) {
      throw new BadRequestException("Senha do portal deve ter no mínimo 6 caracteres");
    }
    return bcrypt.hash(trimmed, 10);
  }

  async findAll(companyId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      companyId,
      ativo: true,
      ...(search
        ? { nome: { contains: search, mode: "insensitive" as const } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.motorista.findMany({ where, skip, take: limit, orderBy: { nome: "asc" } }),
      this.prisma.motorista.count({ where }),
    ]);
    return { items: items.map(sanitizeMotorista), total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const row = await this.prisma.motorista.findFirstOrThrow({ where: { id, companyId } });
    return sanitizeMotorista(row);
  }

  async create(companyId: string, dto: CreateMotoristaDto) {
    let cpf: string | null = null;
    if (dto.cpf) {
      cpf = toCpfRaw(dto.cpf);
      if (!validateCpf(cpf)) throw new BadRequestException("CPF inválido");
      const exists = await this.prisma.motorista.findFirst({ where: { companyId, cpf } });
      if (exists) throw new ConflictException("CPF já cadastrado");
    }
    if (dto.portalSenha?.trim() && !cpf) {
      throw new BadRequestException("Informe o CPF para habilitar o portal do motorista");
    }
    const portalSenha = dto.portalSenha?.trim()
      ? await this.hashPortalSenha(dto.portalSenha)
      : undefined;
    const row = await this.prisma.motorista.create({
      data: {
        companyId,
        nome: dto.nome,
        cpf,
        cnh: dto.cnh ?? null,
        cnhCategoria: dto.cnhCategoria ?? null,
        cnhValidade: dto.cnhValidade ? new Date(dto.cnhValidade) : null,
        telefone: dto.telefone ?? null,
        email: dto.email ?? null,
        tipoComissao: dto.tipoComissao ?? TipoComissao.POR_KM,
        valorComissaoKm: dto.valorComissaoKm ?? null,
        percentualComissao: dto.percentualComissao ?? null,
        portalSenha,
      },
    });
    return sanitizeMotorista(row);
  }

  async update(id: string, companyId: string, dto: UpdateMotoristaDto) {
    const atual = await this.prisma.motorista.findFirstOrThrow({ where: { id, companyId } });
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.cnh !== undefined) data.cnh = dto.cnh || null;
    if (dto.cnhCategoria !== undefined) data.cnhCategoria = dto.cnhCategoria || null;
    if (dto.cnhValidade !== undefined) data.cnhValidade = dto.cnhValidade ? new Date(dto.cnhValidade) : null;
    if (dto.telefone !== undefined) data.telefone = dto.telefone || null;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.tipoComissao !== undefined) data.tipoComissao = dto.tipoComissao;
    if (dto.valorComissaoKm !== undefined) data.valorComissaoKm = dto.valorComissaoKm;
    if (dto.percentualComissao !== undefined) data.percentualComissao = dto.percentualComissao;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.cpf !== undefined) {
      if (dto.cpf) {
        const raw = toCpfRaw(dto.cpf);
        if (!validateCpf(raw)) throw new BadRequestException("CPF inválido");
        const exists = await this.prisma.motorista.findFirst({ where: { companyId, cpf: raw, NOT: { id } } });
        if (exists) throw new ConflictException("CPF já cadastrado");
        data.cpf = raw;
      } else {
        data.cpf = null;
      }
    }
    if (dto.portalSenha !== undefined) {
      if (!dto.portalSenha.trim()) {
        data.portalSenha = null;
      } else {
        const cpfDestino = (data.cpf as string | null | undefined) ?? atual.cpf;
        if (!cpfDestino) {
          throw new BadRequestException("Informe o CPF para habilitar o portal do motorista");
        }
        data.portalSenha = await this.hashPortalSenha(dto.portalSenha);
      }
    }
    const row = await this.prisma.motorista.update({ where: { id }, data });
    return sanitizeMotorista(row);
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.motorista.update({ where: { id }, data: { ativo: false } });
    return { success: true };
  }
}
