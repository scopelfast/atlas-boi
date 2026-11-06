-- CreateEnum
CREATE TYPE "CarregamentoStatus" AS ENUM ('RASCUNHO', 'PLANEJADO', 'EMBARCADO', 'EM_TRANSITO', 'DESEMBARCADO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Carregamento" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "status" "CarregamentoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "clienteOrigemId" TEXT NOT NULL,
    "clienteDestinoId" TEXT NOT NULL,
    "rotaId" TEXT,
    "dataEmbarque" TIMESTAMP(3),
    "dataDesembarque" TIMESTAMP(3),
    "dataPrevisaoDesembarque" TIMESTAMP(3),
    "quantidadeAnimais" INTEGER NOT NULL,
    "pesoMedioEstimado" DECIMAL(10,2),
    "pesoTotal" DECIMAL(12,2),
    "kmRota" DECIMAL(10,2),
    "kmReal" DECIMAL(10,2),
    "valorCarga" DECIMAL(14,2),
    "valorFreteCliente" DECIMAL(14,2),
    "valorComissaoTotal" DECIMAL(14,2),
    "valorPedagio" DECIMAL(12,2),
    "valorBalanca" DECIMAL(12,2),
    "margemBruta" DECIMAL(14,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carregamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarregamentoMotorista" (
    "id" TEXT NOT NULL,
    "carregamentoId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "percentualComissao" DECIMAL(5,2),

    CONSTRAINT "CarregamentoMotorista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarregamentoVeiculo" (
    "id" TEXT NOT NULL,
    "carregamentoId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CarregamentoVeiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carregamento_companyId_numero_key" ON "Carregamento"("companyId", "numero");

-- CreateIndex
CREATE INDEX "Carregamento_companyId_status_idx" ON "Carregamento"("companyId", "status");

-- CreateIndex
CREATE INDEX "Carregamento_companyId_dataEmbarque_idx" ON "Carregamento"("companyId", "dataEmbarque");

-- CreateIndex
CREATE UNIQUE INDEX "CarregamentoMotorista_carregamentoId_motoristaId_key" ON "CarregamentoMotorista"("carregamentoId", "motoristaId");

-- CreateIndex
CREATE UNIQUE INDEX "CarregamentoVeiculo_carregamentoId_veiculoId_key" ON "CarregamentoVeiculo"("carregamentoId", "veiculoId");

-- AddForeignKey
ALTER TABLE "Carregamento" ADD CONSTRAINT "Carregamento_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carregamento" ADD CONSTRAINT "Carregamento_clienteOrigemId_fkey" FOREIGN KEY ("clienteOrigemId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carregamento" ADD CONSTRAINT "Carregamento_clienteDestinoId_fkey" FOREIGN KEY ("clienteDestinoId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carregamento" ADD CONSTRAINT "Carregamento_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "Rota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoMotorista" ADD CONSTRAINT "CarregamentoMotorista_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoMotorista" ADD CONSTRAINT "CarregamentoMotorista_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Motorista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoVeiculo" ADD CONSTRAINT "CarregamentoVeiculo_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoVeiculo" ADD CONSTRAINT "CarregamentoVeiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
