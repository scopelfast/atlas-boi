import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateRoleDto = {
  name: string;
  slug: string;
  companyId?: string | null;
  permissions?: { moduleId: string; functionId: string }[];
};

export type UpdateRoleDto = {
  name?: string;
  slug?: string;
  permissions?: { moduleId: string; functionId: string }[];
};

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: string | null) {
    const where = companyId !== undefined ? { OR: [{ companyId: null }, { companyId }] } : {};
    return this.prisma.role.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, rolePermissions: true } } },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        company: true,
        rolePermissions: { include: { module: true, function: true } },
      },
    });
    if (!role) throw new NotFoundException("Perfil não encontrado");
    return role;
  }

  async create(dto: CreateRoleDto) {
    const { permissions, ...data } = dto;
    const role = await this.prisma.role.create({ data });
    if (permissions?.length) {
      for (const { moduleId, functionId } of permissions) {
        await this.prisma.rolePermission.create({
          data: { roleId: role.id, moduleId, functionId },
        });
      }
    }
    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.prisma.role.findUniqueOrThrow({ where: { id } });
    const { permissions, ...data } = dto;
    if (data.name !== undefined || data.slug !== undefined) {
      await this.prisma.role.update({ where: { id }, data });
    }
    if (permissions !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      for (const { moduleId, functionId } of permissions) {
        await this.prisma.rolePermission.create({
          data: { roleId: id, moduleId, functionId },
        });
      }
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.role.findUniqueOrThrow({ where: { id } });
    const usersCount = await this.prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new Error("Não é possível excluir perfil com usuários vinculados");
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
