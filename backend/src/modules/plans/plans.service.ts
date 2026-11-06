import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

export type CreatePlanDto = {
  name: string;
  slug: string;
  description?: string;
  price?: number;
  moduleIds?: string[];
  moduleFunctions?: { moduleId: string; functionIds: string[] }[];
};

export type UpdatePlanDto = Partial<CreatePlanDto>;

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { companies: true, planModules: true } },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        planModules: { include: { module: true } },
        planModuleFuncs: { include: { module: true, function: true } },
      },
    });
    if (!plan) throw new NotFoundException("Plano não encontrado");
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const { moduleIds, moduleFunctions, ...data } = dto;
    const plan = await this.prisma.plan.create({
      data: {
        ...data,
        price: data.price != null ? new Decimal(data.price) : null,
      },
    });
    if (moduleIds?.length) {
      for (const moduleId of moduleIds) {
        await this.prisma.planModule.create({
          data: { planId: plan.id, moduleId },
        });
      }
    }
    if (moduleFunctions?.length) {
      for (const { moduleId, functionIds } of moduleFunctions) {
        for (const functionId of functionIds) {
          await this.prisma.planModuleFunction.upsert({
            where: {
              planId_moduleId_functionId: { planId: plan.id, moduleId, functionId },
            },
            update: {},
            create: { planId: plan.id, moduleId, functionId },
          });
        }
      }
    }
    return this.findOne(plan.id);
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.prisma.plan.findUniqueOrThrow({ where: { id } });
    const { moduleIds, moduleFunctions, ...data } = dto;
    await this.prisma.plan.update({
      where: { id },
      data: {
        ...data,
        price: data.price != null ? new Decimal(data.price) : undefined,
      },
    });
    if (moduleIds !== undefined) {
      await this.prisma.planModule.deleteMany({ where: { planId: id } });
      for (const moduleId of moduleIds) {
        await this.prisma.planModule.create({
          data: { planId: id, moduleId },
        });
      }
    }
    if (moduleFunctions !== undefined) {
      await this.prisma.planModuleFunction.deleteMany({ where: { planId: id } });
      for (const { moduleId, functionIds } of moduleFunctions) {
        for (const functionId of functionIds) {
          await this.prisma.planModuleFunction.create({
            data: { planId: id, moduleId, functionId },
          });
        }
      }
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.plan.findUniqueOrThrow({ where: { id } });
    await this.prisma.plan.update({
      where: { id },
      data: { active: false },
    });
    return { success: true };
  }
}
