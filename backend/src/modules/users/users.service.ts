import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { isPlatformAdmin } from "../../common/utils/platform-admin";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

export type RequesterUser = {
  id: string;
  companyId: string;
  role: string;
  permissions?: { module: string; function: string }[];
};

export type CreateUserDto = {
  email: string;
  password: string;
  name: string;
  roleId: string;
  companyId?: string;
};

export type UpdateUserDto = {
  email?: string;
  password?: string;
  name?: string;
  roleId?: string;
  active?: boolean;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private canManageOtherCompanies(requester: RequesterUser) {
    return isPlatformAdmin(requester);
  }

  private async assertCompanyAccess(requester: RequesterUser, companyId: string) {
    if (companyId === requester.companyId) return;
    if (!this.canManageOtherCompanies(requester)) {
      throw new ForbiddenException("Sem permissão para gerenciar usuários de outra empresa");
    }
    const company = await this.prisma.company.findFirst({ where: { id: companyId, active: true } });
    if (!company) throw new NotFoundException("Empresa não encontrada");
  }

  private async resolveCompanyId(requester: RequesterUser, companyId?: string) {
    const target = companyId?.trim() || requester.companyId;
    await this.assertCompanyAccess(requester, target);
    return target;
  }

  async findAll(requester: RequesterUser, companyId?: string) {
    const targetCompanyId = await this.resolveCompanyId(requester, companyId);
    return this.prisma.user.findMany({
      where: { companyId: targetCompanyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        roleId: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, slug: true } },
        createdAt: true,
      },
    });
  }

  async findOne(requester: RequesterUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, company: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    await this.assertCompanyAccess(requester, user.companyId);
    const { password: _, ...rest } = user;
    return rest;
  }

  async create(requester: RequesterUser, dto: CreateUserDto) {
    const companyId = await this.resolveCompanyId(requester, dto.companyId);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id: dto.roleId } });
    if (role.slug === "SUPER_ADMIN" && !isPlatformAdmin(requester)) {
      throw new ForbiddenException("Perfil reservado à operadora da plataforma");
    }
    const existing = await this.prisma.user.findUnique({
      where: { email_companyId: { email: dto.email.trim().toLowerCase(), companyId } },
    });
    if (existing) throw new ConflictException("E-mail já cadastrado nesta empresa");
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        password: hash,
        name: dto.name,
        roleId: dto.roleId,
        companyId,
      },
      include: { role: true, company: { select: { id: true, name: true } } },
    });
    const { password: _, ...rest } = user;
    return rest;
  }

  async update(requester: RequesterUser, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Usuário não encontrado");
    await this.assertCompanyAccess(requester, existing.companyId);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.roleId !== undefined) {
      const role = await this.prisma.role.findUniqueOrThrow({ where: { id: dto.roleId } });
      if (role.slug === "SUPER_ADMIN" && !isPlatformAdmin(requester)) {
        throw new ForbiddenException("Perfil reservado à operadora da plataforma");
      }
      data.roleId = dto.roleId;
    }
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
      const dup = await this.prisma.user.findFirst({
        where: { email: data.email as string, companyId: existing.companyId, NOT: { id } },
      });
      if (dup) throw new ConflictException("E-mail já cadastrado nesta empresa");
    }
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, company: { select: { id: true, name: true } } },
    });
    const { password: _, ...rest } = user;
    return rest;
  }

  async remove(requester: RequesterUser, id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Usuário não encontrado");
    await this.assertCompanyAccess(requester, existing.companyId);
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return { success: true };
  }
}
