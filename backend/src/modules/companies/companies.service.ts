import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { validateCnpj, toCnpjRaw } from "../../common/utils/documents";

export type CreateCompanyDto = {
  name: string;
  slug: string;
  cnpj?: string;
  planId: string;
};

export type UpdateCompanyDto = {
  name?: string;
  slug?: string;
  cnpj?: string | null;
  planId?: string;
  active?: boolean;
};

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { plan: true, _count: { select: { users: true } } },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        plan: true,
        users: { include: { role: true } },
        _count: { select: { users: true } },
      },
    });
    if (!company) throw new NotFoundException("Empresa não encontrada");
    return company;
  }

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException("Slug já utilizado");
    let cnpjValue = dto.cnpj;
    if (cnpjValue) {
      if (!validateCnpj(cnpjValue)) throw new BadRequestException("CNPJ inválido");
      cnpjValue = toCnpjRaw(cnpjValue);
      const cnpjExists = await this.prisma.company.findUnique({ where: { cnpj: cnpjValue } });
      if (cnpjExists) throw new ConflictException("CNPJ já cadastrado");
    }
    await this.prisma.plan.findUniqueOrThrow({ where: { id: dto.planId } });
    return this.prisma.company.create({
      data: { ...dto, cnpj: cnpjValue ?? undefined },
      include: { plan: true },
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.prisma.company.findUniqueOrThrow({ where: { id } });
    if (dto.slug) {
      const existing = await this.prisma.company.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (existing) throw new ConflictException("Slug já utilizado");
    }
    const updateData: UpdateCompanyDto = { ...dto };
    if (dto.cnpj !== undefined) {
      if (dto.cnpj) {
        if (!validateCnpj(dto.cnpj)) throw new BadRequestException("CNPJ inválido");
        const cnpjRaw = toCnpjRaw(dto.cnpj);
        const cnpjExists = await this.prisma.company.findFirst({ where: { cnpj: cnpjRaw, NOT: { id } } });
        if (cnpjExists) throw new ConflictException("CNPJ já cadastrado");
        updateData.cnpj = cnpjRaw;
      } else {
        updateData.cnpj = null;
      }
    }
    if (dto.planId) {
      await this.prisma.plan.findUniqueOrThrow({ where: { id: dto.planId } });
    }
    return this.prisma.company.update({
      where: { id },
      data: updateData,
      include: { plan: true },
    });
  }

  async remove(id: string) {
    await this.prisma.company.findUniqueOrThrow({ where: { id } });
    await this.prisma.company.update({
      where: { id },
      data: { active: false },
    });
    return { success: true };
  }
}
