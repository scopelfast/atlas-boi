import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const rows = await p.$queryRaw<
    { placa: string; competencia: Date; receita: unknown; custo: unknown; resultado: unknown }[]
  >`SELECT placa, competencia, receita, custo, resultado FROM mv_dre_veiculo`;
  console.log("mv_dre_veiculo:", JSON.stringify(rows, null, 2));

  const c = await p.carregamento.findFirst({
    where: { numero: "CAR-2026-00001" },
    include: { veiculos: { include: { veiculo: true } } },
  });
  if (c) {
    console.log("carregamento:", {
      numero: c.numero,
      status: c.status,
      dataEmbarque: c.dataEmbarque,
      valorReceitaLiquida: c.valorReceitaLiquida?.toString(),
      margemOperacional: c.margemOperacional?.toString(),
      veiculos: c.veiculos.map((v) => ({ placa: v.veiculo.placa, principal: v.principal })),
    });
  }
}

main()
  .finally(() => p.$disconnect());
