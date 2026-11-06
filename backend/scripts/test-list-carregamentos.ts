import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const includeList = {
  clienteOrigem: { select: { id: true, nome: true, documento: true, cidade: true, uf: true } },
  clienteDestino: { select: { id: true, nome: true, documento: true, cidade: true, uf: true } },
  rota: {
    select: {
      id: true,
      codigo: true,
      descricao: true,
      distanciaKm: true,
      clienteOrigemId: true,
      clienteDestinoId: true,
      valorKmCobrancaCliente: true,
      valorKmComissaoMotorista: true,
      valorPedagio: true,
      valorBalanca: true,
    },
  },
  motoristas: {
    include: { motorista: { select: { id: true, nome: true } } },
  },
  veiculos: {
    include: { veiculo: { select: { id: true, placa: true, tipo: true } } },
  },
};

async function main() {
  const company = await prisma.company.findFirst({ where: { slug: "atlas-boi-demo" } });
  if (!company) throw new Error("company not found");
  const items = await prisma.carregamento.findMany({
    where: { companyId: company.id, status: { not: "CANCELADO" } },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: includeList,
  });
  console.log("OK", items.length, "items");
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
