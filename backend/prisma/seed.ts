import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildLocalChave } from "../src/common/utils/cliente-local";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const funcs = await Promise.all([
    prisma.function.upsert({ where: { slug: "read" }, update: {}, create: { name: "Visualizar", slug: "read" } }),
    prisma.function.upsert({ where: { slug: "create" }, update: {}, create: { name: "Criar", slug: "create" } }),
    prisma.function.upsert({ where: { slug: "update" }, update: {}, create: { name: "Editar", slug: "update" } }),
    prisma.function.upsert({ where: { slug: "delete" }, update: {}, create: { name: "Excluir", slug: "delete" } }),
    prisma.function.upsert({ where: { slug: "approve" }, update: {}, create: { name: "Aprovar", slug: "approve" } }),
    prisma.function.upsert({ where: { slug: "export" }, update: {}, create: { name: "Exportar", slug: "export" } }),
  ]);

  const modulesData = [
    { name: "Dashboard", slug: "dashboard", order: 1 },
    { name: "Carregamentos", slug: "carregamentos", order: 2 },
    { name: "Clientes", slug: "clientes", order: 3 },
    { name: "Rotas", slug: "rotas", order: 4 },
    { name: "Motoristas", slug: "motoristas", order: 5 },
    { name: "Veículos", slug: "veiculos", order: 6 },
    { name: "Financeiro", slug: "financeiro", order: 7 },
    { name: "Relatórios", slug: "relatorios", order: 8 },
    { name: "Inteligência", slug: "inteligencia", order: 9 },
    { name: "Configurações", slug: "configuracoes", order: 10 },
    { name: "Usuários", slug: "usuarios", order: 11 },
    { name: "Planos", slug: "planos", order: 12 },
    { name: "Empresas", slug: "empresas", order: 13 },
    { name: "Catálogo", slug: "catalogo", order: 14 },
  ];
  for (const m of modulesData) {
    await prisma.module.upsert({ where: { slug: m.slug }, update: { name: m.name, order: m.order }, create: m });
  }
  const modules = await prisma.module.findMany();

  const planStarter = await prisma.plan.upsert({
    where: { slug: "starter" },
    update: {},
    create: { name: "Starter", slug: "starter", description: "1–5 veículos — cadastros e carregamentos" },
  });
  const planPro = await prisma.plan.upsert({
    where: { slug: "professional" },
    update: {},
    create: { name: "Professional", slug: "professional", description: "6–30 veículos — financeiro e relatórios" },
  });
  const planEnt = await prisma.plan.upsert({
    where: { slug: "enterprise" },
    update: {},
    create: { name: "Enterprise", slug: "enterprise", description: "30+ veículos — todos os módulos" },
  });

  const starterModules = ["dashboard", "clientes", "rotas", "carregamentos", "relatorios"];
  const proModules = [...starterModules, "motoristas", "veiculos", "financeiro", "inteligencia"];
  const entModules = modules.map((m) => m.slug);

  const readId = funcs.find((f) => f.slug === "read")!.id;
  const createId = funcs.find((f) => f.slug === "create")!.id;
  const updateId = funcs.find((f) => f.slug === "update")!.id;
  const deleteId = funcs.find((f) => f.slug === "delete")!.id;
  const allFuncIds = funcs.map((f) => f.id);

  for (const slug of starterModules) {
    const mod = modules.find((m) => m.slug === slug)!;
    await prisma.planModule.upsert({
      where: { planId_moduleId: { planId: planStarter.id, moduleId: mod.id } },
      update: {},
      create: { planId: planStarter.id, moduleId: mod.id },
    });
    for (const fid of [readId, createId]) {
      await prisma.planModuleFunction.upsert({
        where: { planId_moduleId_functionId: { planId: planStarter.id, moduleId: mod.id, functionId: fid } },
        update: {},
        create: { planId: planStarter.id, moduleId: mod.id, functionId: fid },
      });
    }
  }

  for (const slug of proModules) {
    const mod = modules.find((m) => m.slug === slug)!;
    await prisma.planModule.upsert({
      where: { planId_moduleId: { planId: planPro.id, moduleId: mod.id } },
      update: {},
      create: { planId: planPro.id, moduleId: mod.id },
    });
    for (const fid of [readId, createId, updateId]) {
      await prisma.planModuleFunction.upsert({
        where: { planId_moduleId_functionId: { planId: planPro.id, moduleId: mod.id, functionId: fid } },
        update: {},
        create: { planId: planPro.id, moduleId: mod.id, functionId: fid },
      });
    }
  }

  for (const slug of entModules) {
    const mod = modules.find((m) => m.slug === slug)!;
    await prisma.planModule.upsert({
      where: { planId_moduleId: { planId: planEnt.id, moduleId: mod.id } },
      update: {},
      create: { planId: planEnt.id, moduleId: mod.id },
    });
    for (const fid of allFuncIds) {
      await prisma.planModuleFunction.upsert({
        where: { planId_moduleId_functionId: { planId: planEnt.id, moduleId: mod.id, functionId: fid } },
        update: {},
        create: { planId: planEnt.id, moduleId: mod.id, functionId: fid },
      });
    }
  }

  const roleSuperAdmin =
    (await prisma.role.findFirst({ where: { slug: "SUPER_ADMIN", companyId: null } })) ??
    (await prisma.role.create({
      data: { name: "Super Admin Plataforma", slug: "SUPER_ADMIN", companyId: null },
    }));
  const roleAdmin =
    (await prisma.role.findFirst({ where: { slug: "ADMIN", companyId: null } })) ??
    (await prisma.role.create({ data: { name: "Administrador", slug: "ADMIN", companyId: null } }));
  const roleDir =
    (await prisma.role.findFirst({ where: { slug: "DIRETOR", companyId: null } })) ??
    (await prisma.role.create({ data: { name: "Diretor", slug: "DIRETOR", companyId: null } }));
  const roleOp =
    (await prisma.role.findFirst({ where: { slug: "OPERACIONAL", companyId: null } })) ??
    (await prisma.role.create({ data: { name: "Operacional", slug: "OPERACIONAL", companyId: null } }));
  const roleFin =
    (await prisma.role.findFirst({ where: { slug: "FINANCEIRO", companyId: null } })) ??
    (await prisma.role.create({ data: { name: "Financeiro", slug: "FINANCEIRO", companyId: null } }));

  const platformModuleSlugs = ["empresas", "planos", "catalogo"];
  const tenantModules = modules.filter((m) => !platformModuleSlugs.includes(m.slug));

  for (const mod of modules) {
    for (const func of funcs) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_moduleId_functionId: { roleId: roleSuperAdmin.id, moduleId: mod.id, functionId: func.id },
        },
        update: {},
        create: { roleId: roleSuperAdmin.id, moduleId: mod.id, functionId: func.id },
      });
    }
  }

  for (const mod of tenantModules) {
    for (const func of funcs) {
      await prisma.rolePermission.upsert({
        where: { roleId_moduleId_functionId: { roleId: roleAdmin.id, moduleId: mod.id, functionId: func.id } },
        update: {},
        create: { roleId: roleAdmin.id, moduleId: mod.id, functionId: func.id },
      });
    }
  }

  for (const slug of platformModuleSlugs) {
    const mod = modules.find((m) => m.slug === slug);
    if (mod) {
      await prisma.rolePermission.deleteMany({ where: { roleId: roleAdmin.id, moduleId: mod.id } });
    }
  }

  for (const slug of ["carregamentos", "clientes", "rotas", "motoristas", "veiculos", "dashboard"]) {
    const mod = modules.find((m) => m.slug === slug)!;
    for (const fid of [readId, createId, updateId]) {
      await prisma.rolePermission.upsert({
        where: { roleId_moduleId_functionId: { roleId: roleOp.id, moduleId: mod.id, functionId: fid } },
        update: {},
        create: { roleId: roleOp.id, moduleId: mod.id, functionId: fid },
      });
    }
  }

  for (const slug of ["financeiro", "relatorios", "inteligencia", "dashboard"]) {
    const mod = modules.find((m) => m.slug === slug)!;
    for (const fid of [readId, createId, updateId, funcs.find((f) => f.slug === "export")!.id]) {
      await prisma.rolePermission.upsert({
        where: { roleId_moduleId_functionId: { roleId: roleFin.id, moduleId: mod.id, functionId: fid } },
        update: {},
        create: { roleId: roleFin.id, moduleId: mod.id, functionId: fid },
      });
    }
  }

  const approveId = funcs.find((f) => f.slug === "approve")!.id;
  const exportId = funcs.find((f) => f.slug === "export")!.id;
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: { roleId_moduleId_functionId: { roleId: roleDir.id, moduleId: mod.id, functionId: readId } },
      update: {},
      create: { roleId: roleDir.id, moduleId: mod.id, functionId: readId },
    });
  }
  for (const slug of ["carregamentos", "financeiro", "relatorios"]) {
    const mod = modules.find((m) => m.slug === slug)!;
    await prisma.rolePermission.upsert({
      where: { roleId_moduleId_functionId: { roleId: roleDir.id, moduleId: mod.id, functionId: approveId } },
      update: {},
      create: { roleId: roleDir.id, moduleId: mod.id, functionId: approveId },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_moduleId_functionId: { roleId: roleDir.id, moduleId: mod.id, functionId: exportId } },
      update: {},
      create: { roleId: roleDir.id, moduleId: mod.id, functionId: exportId },
    });
  }

  const company = await prisma.company.upsert({
    where: { slug: "atlas-boi-demo" },
    update: {},
    create: {
      name: "Atlas Boi Demo",
      slug: "atlas-boi-demo",
      planId: planEnt.id,
    },
  });

  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email_companyId: { email: "admin@atlas.local", companyId: company.id } },
    update: { password: hash, roleId: roleSuperAdmin.id },
    create: {
      email: "admin@atlas.local",
      password: hash,
      name: "Admin Atlas Boi",
      companyId: company.id,
      roleId: roleSuperAdmin.id,
    },
  });

  console.log("Atlas Boi — seed concluído!");
  console.log("Login plataforma: admin@atlas.local / admin123 (SUPER_ADMIN)");

  const origemLocal = buildLocalChave({ cidade: "Barretos", uf: "SP" });
  const origem = await prisma.cliente.upsert({
    where: {
      companyId_documento_localChave: {
        companyId: company.id,
        documento: "12345678000199",
        localChave: origemLocal,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      tipoDocumento: "CNPJ",
      documento: "12345678000199",
      localChave: origemLocal,
      nome: "Fazenda São João",
      cidade: "Barretos",
      uf: "SP",
      tipo: "EMBARQUE",
    },
  });

  const destinoLocal = buildLocalChave({ cidade: "Jundiaí", uf: "SP" });
  const destino = await prisma.cliente.upsert({
    where: {
      companyId_documento_localChave: {
        companyId: company.id,
        documento: "98765432000188",
        localChave: destinoLocal,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      tipoDocumento: "CNPJ",
      documento: "98765432000188",
      localChave: destinoLocal,
      nome: "Frigorífico Jundiaí",
      cidade: "Jundiaí",
      uf: "SP",
      tipo: "DESEMBARQUE",
    },
  });

  const rota = await prisma.rota.upsert({
    where: { companyId_codigo: { companyId: company.id, codigo: "BAR-JUN" } },
    update: {},
    create: {
      companyId: company.id,
      codigo: "BAR-JUN",
      descricao: "Barretos → Jundiaí",
      clienteOrigemId: origem.id,
      clienteDestinoId: destino.id,
      distanciaKm: 420,
      valorPedagio: 850,
      valorBalanca: 120,
      valorKmCobrancaCliente: 4.5,
      valorKmComissaoMotorista: 1.2,
      percentualComissao: 2,
    },
  });

  const motoristaSenha = await bcrypt.hash("motor123", 10);
  const motorista = await prisma.motorista.upsert({
    where: { companyId_cpf: { companyId: company.id, cpf: "12345678901" } },
    update: { portalSenha: motoristaSenha },
    create: {
      companyId: company.id,
      nome: "João Silva",
      cpf: "12345678901",
      telefone: "17999990000",
      tipoComissao: "POR_KM",
      valorComissaoKm: 1.2,
      portalSenha: motoristaSenha,
    },
  });

  const veiculo = await prisma.veiculo.upsert({
    where: { companyId_placa: { companyId: company.id, placa: "ABC1D23" } },
    update: {},
    create: {
      companyId: company.id,
      placa: "ABC1D23",
      marca: "Volvo",
      modelo: "FH 540",
      tipo: "CAMINHAO",
      codigoCentroCusto: "CC-001",
      descricaoCentroCusto: "Cavalo 01",
    },
  });

  const carregamentoExistente = await prisma.carregamento.findFirst({
    where: { companyId: company.id, numero: "CAR-2026-00001" },
  });
  if (!carregamentoExistente) {
    const km = 420;
    const valorFrete = km * 4.5 + 850 + 120;
    const valorComissao = km * 1.2;
    await prisma.carregamento.create({
      data: {
        companyId: company.id,
        numero: "CAR-2026-00001",
        status: "EM_TRANSITO",
        clienteOrigemId: origem.id,
        clienteDestinoId: destino.id,
        rotaId: rota.id,
        quantidadeAnimais: 45,
        kmRota: km,
        valorCarga: 180000,
        valorFreteCliente: valorFrete,
        valorComissaoTotal: valorComissao,
        valorPedagio: 850,
        valorBalanca: 120,
        margemBruta: valorFrete - valorComissao - 850 - 120,
        dataEmbarque: new Date(),
        motoristas: { create: [{ motoristaId: motorista.id, principal: true }] },
        veiculos: { create: [{ veiculoId: veiculo.id, principal: true }] },
      },
    });
  }

  console.log("Demo: rota BAR-JUN, motorista João Silva, placa ABC1D23, 1 carregamento em trânsito");
  console.log("App motorista: CPF 12345678901 (ou 123.456.789-01) · senha motor123");

  await prisma.motorista.updateMany({
    where: { companyId: company.id, portalSenha: null },
    data: { portalSenha: motoristaSenha },
  });

  // Demo NF-e real (PA): FVT Comércio de Bovinos → JBS Marabá — XML exemplo do usuário
  const origemPaLocal = buildLocalChave({ cidade: "São Domingos do Araguaia", uf: "PA" });
  const origemPa = await prisma.cliente.upsert({
    where: {
      companyId_documento_localChave: {
        companyId: company.id,
        documento: "12222935000100",
        localChave: origemPaLocal,
      },
    },
    update: { nome: "FVT Comércio de Bovinos", cidade: "São Domingos do Araguaia", uf: "PA" },
    create: {
      companyId: company.id,
      tipoDocumento: "CNPJ",
      documento: "12222935000100",
      localChave: origemPaLocal,
      nome: "FVT Comércio de Bovinos",
      cidade: "São Domingos do Araguaia",
      uf: "PA",
      tipo: "EMBARQUE",
    },
  });

  const destinoPaLocal = buildLocalChave({ cidade: "Marabá", uf: "PA" });
  const destinoPa = await prisma.cliente.upsert({
    where: {
      companyId_documento_localChave: {
        companyId: company.id,
        documento: "02916265014110",
        localChave: destinoPaLocal,
      },
    },
    update: { nome: "JBS S/A Marabá", cidade: "Marabá", uf: "PA" },
    create: {
      companyId: company.id,
      tipoDocumento: "CNPJ",
      documento: "02916265014110",
      localChave: destinoPaLocal,
      nome: "JBS S/A Marabá",
      cidade: "Marabá",
      uf: "PA",
      tipo: "DESEMBARQUE",
    },
  });

  await prisma.rota.upsert({
    where: { companyId_codigo: { companyId: company.id, codigo: "SDA-MAR" } },
    update: {
      clienteOrigemId: origemPa.id,
      clienteDestinoId: destinoPa.id,
    },
    create: {
      companyId: company.id,
      codigo: "SDA-MAR",
      descricao: "São Domingos do Araguaia → Marabá (JBS)",
      clienteOrigemId: origemPa.id,
      clienteDestinoId: destinoPa.id,
      distanciaKm: 95,
      valorPedagio: 0,
      valorBalanca: 80,
      valorKmCobrancaCliente: 5.2,
      valorKmComissaoMotorista: 1.5,
      percentualComissao: 2,
    },
  });

  console.log("Demo PA: clientes FVT + JBS e rota SDA-MAR (para importar NF-e 34740)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
