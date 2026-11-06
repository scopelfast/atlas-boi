import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");
import { PrismaService } from "../../prisma/prisma.service";

import { toCpfRaw } from "../../common/utils/documents";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException("E-mail e senha são obrigatórios");
    }
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), active: true },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                module: true,
                function: true,
              },
            },
          },
        },
        company: { include: { plan: true } },
      },
    });
    if (!user) throw new UnauthorizedException("Credenciais inválidas");

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) throw new UnauthorizedException("Credenciais inválidas");

    const permissions = user.role.rolePermissions.map((rp) => ({
      module: rp.module.slug,
      function: rp.function.slug,
    }));

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roleId: user.roleId,
      role: user.role.slug,
    };
    const token = this.jwt.sign(payload);
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.slug,
        roleId: user.roleId,
        companyId: user.companyId,
        companyName: user.company.name,
        permissions,
      },
    };
  }

  async loginMotorista(cpf: string, password: string) {
    if (!cpf || !password) {
      throw new UnauthorizedException("CPF e senha são obrigatórios");
    }
    const cpfNorm = toCpfRaw(cpf);
    const motorista = await this.prisma.motorista.findFirst({
      where: { cpf: cpfNorm, ativo: true },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!motorista?.portalSenha) {
      throw new UnauthorizedException("Portal do motorista não configurado");
    }
    const ok = await bcrypt.compare(String(password), motorista.portalSenha);
    if (!ok) throw new UnauthorizedException("Credenciais inválidas");

    const payload = {
      sub: motorista.id,
      motoristaId: motorista.id,
      companyId: motorista.companyId,
      type: "motorista" as const,
      nome: motorista.nome,
    };
    const token = this.jwt.sign(payload);
    return {
      access_token: token,
      motorista: {
        id: motorista.id,
        nome: motorista.nome,
        companyId: motorista.companyId,
        companyName: motorista.company.name,
      },
    };
  }

  async validateUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { module: true, function: true },
            },
          },
        },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.slug,
      roleId: user.roleId,
      companyId: user.companyId,
      permissions: user.role.rolePermissions.map((rp) => ({
        module: rp.module.slug,
        function: rp.function.slug,
      })),
    };
  }
}
