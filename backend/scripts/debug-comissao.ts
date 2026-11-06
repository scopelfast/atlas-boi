import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const c = await p.carregamento.findFirst({
    where: { numero: "CAR-2026-00001" },
    include: { rota: true, motoristas: { include: { motorista: true } } },
  });
  if (!c) {
    console.log("Carregamento não encontrado");
    return;
  }
  const km = Number(c.kmReal ?? c.kmRota ?? 0);
  console.log(JSON.stringify({
    kmRota: c.kmRota,
    kmReal: c.kmReal,
    kmUsado: km,
    valorComissaoTotal: c.valorComissaoTotal,
    valorFreteCliente: c.valorFreteCliente,
    valorCarga: c.valorCarga,
    rota: c.rota
      ? {
          codigo: c.rota.codigo,
          valorKmCobrancaCliente: c.rota.valorKmCobrancaCliente,
          valorKmComissaoMotorista: c.rota.valorKmComissaoMotorista,
          percentualComissao: c.rota.percentualComissao,
        }
      : null,
    motoristas: c.motoristas.map((m) => ({
      nome: m.motorista.nome,
      tipoComissao: m.motorista.tipoComissao,
      valorComissaoKm: m.motorista.valorComissaoKm,
      percentualComissao: m.motorista.percentualComissao,
    })),
  }, null, 2));

  const mot = c.motoristas[0]?.motorista;
  const rotaRate = Number(c.rota?.valorKmComissaoMotorista ?? 0);
  const motRate = mot?.valorComissaoKm != null ? Number(mot.valorComissaoKm) : rotaRate;
  console.log("\nRates:", { rotaRate, motRate, km_x_motRate: km * motRate, km_x_rotaRate: km * rotaRate });
}

main()
  .finally(() => p.$disconnect());
