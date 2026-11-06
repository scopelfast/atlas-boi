import { PrismaClient } from "@prisma/client";
import { FinanceiroService } from "../src/modules/financeiro/financeiro.service";
import { PrismaService } from "../src/prisma/prisma.service";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("no company");
    return;
  }
  console.log("company", company.id, company.name);

  const svc = new FinanceiroService(prisma as unknown as PrismaService);
  try {
    const pos = await svc.getPosicaoFinanceira(company.id);
    console.log("posicao OK", JSON.stringify(pos, null, 2));
  } catch (e) {
    console.error("posicao ERRO", e);
  }
}

main().finally(() => prisma.$disconnect());
