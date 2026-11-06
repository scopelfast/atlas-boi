import { PrismaClient, Prisma } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const v = await p.veiculo.findFirst({ where: { placa: "BDU1G61" } });
  if (!v) {
    console.log("veiculo not found");
    return;
  }
  console.log("veiculoId", v.id, "companyId", v.companyId);

  for (const competencia of ["2026-05", "2026-06"]) {
    const [y, m] = competencia.split("-").map(Number);
    const inicio = new Date(Date.UTC(y, m - 1, 1));
    const fim = new Date(Date.UTC(y, m, 1));
    console.log(`\n--- ${competencia} ---`);
    console.log("intervalo", inicio.toISOString(), "->", fim.toISOString());

    const rows = await p.$queryRaw<
      Array<{ placa: string; competencia: Date; receita: unknown; resultado: unknown }>
    >(Prisma.sql`
      SELECT placa, competencia, receita, resultado
        FROM mv_dre_veiculo
       WHERE "companyId" = ${v.companyId}
         AND "veiculoId" = ${v.id}
         AND competencia >= ${inicio}
         AND competencia < ${fim}
    `);
    console.log("rows", rows);
  }

  const all = await p.$queryRaw`SELECT placa, competencia, receita FROM mv_dre_veiculo WHERE "companyId" = ${v.companyId}`;
  console.log("\nall for company", all);
}

main().finally(() => p.$disconnect());
