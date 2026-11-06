/**
 * Limpa dados operacionais (clientes, rotas, frota, carregamentos, financeiro)
 * mantendo SaaS core: empresa, usuário, planos, módulos, permissões.
 *
 * Uso: npm run prisma:reset-operacional
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companySlug = process.env.RESET_COMPANY_SLUG || "atlas-boi-demo";

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    console.error(`Empresa "${companySlug}" não encontrada.`);
    process.exit(1);
  }

  console.log(`\n🧹 Limpando dados operacionais — ${company.name} (${company.slug})\n`);

  const counts = await prisma.$transaction(async (tx) => {
    const lanc = await tx.lancamentoFinanceiro.deleteMany({ where: { companyId: company.id } });
    const notas = await tx.carregamentoNotaFiscal.deleteMany({ where: { companyId: company.id } });
    const eventos = await tx.carregamentoEvento.deleteMany({
      where: { carregamento: { companyId: company.id } },
    });
    const cm = await tx.carregamentoMotorista.deleteMany({
      where: { carregamento: { companyId: company.id } },
    });
    const cv = await tx.carregamentoVeiculo.deleteMany({
      where: { carregamento: { companyId: company.id } },
    });
    const car = await tx.carregamento.deleteMany({ where: { companyId: company.id } });
    const rot = await tx.rota.deleteMany({ where: { companyId: company.id } });
    const cli = await tx.cliente.deleteMany({ where: { companyId: company.id } });
    const mot = await tx.motorista.deleteMany({ where: { companyId: company.id } });
    const vei = await tx.veiculo.deleteMany({ where: { companyId: company.id } });
    const logs = await tx.log.deleteMany({
      where: { user: { companyId: company.id } },
    });

    return { lanc, notas, eventos, cm, cv, car, rot, cli, mot, vei, logs };
  });

  try {
    await prisma.$executeRaw`SELECT refresh_mv_dre_veiculo()`;
    console.log("   View materializada mv_dre_veiculo atualizada.");
  } catch {
    console.log("   (refresh_mv_dre_veiculo ignorado — view pode não existir ainda)");
  }

  console.log("Removido:");
  console.log(`  • ${counts.lanc.count} lançamento(s) financeiro(s)`);
  console.log(`  • ${counts.car.count} carregamento(s)`);
  console.log(`  • ${counts.notas.count} NF-e vinculada(s)`);
  console.log(`  • ${counts.eventos.count} evento(s) de carregamento`);
  console.log(`  • ${counts.rot.count} rota(s)`);
  console.log(`  • ${counts.cli.count} cliente(s)`);
  console.log(`  • ${counts.mot.count} motorista(s)`);
  console.log(`  • ${counts.vei.count} veículo(s)`);
  console.log(`  • ${counts.logs.count} log(s) de auditoria`);

  console.log("\n✅ Base operacional limpa.");
  console.log("   Mantido: login, empresa, planos, módulos, permissões.");
  console.log("   Login: admin@atlas.local / admin123\n");
  console.log("   Próximo passo: importe sua NF-e em Carregamentos → + Novo.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
