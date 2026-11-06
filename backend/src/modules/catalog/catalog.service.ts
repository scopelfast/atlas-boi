import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getModules() {
    return this.prisma.module.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });
  }

  async getFunctions() {
    return this.prisma.function.findMany({
      orderBy: { slug: "asc" },
    });
  }
}
