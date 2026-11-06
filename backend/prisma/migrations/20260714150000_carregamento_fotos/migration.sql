-- CreateEnum
CREATE TYPE "CarregamentoFotoMomento" AS ENUM ('EMBARQUE', 'TRANSITO', 'DESCARGA', 'OUTROS');

-- CreateTable
CREATE TABLE "CarregamentoFoto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "carregamentoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "momento" "CarregamentoFotoMomento" NOT NULL DEFAULT 'EMBARQUE',
    "path" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarregamentoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarregamentoFoto_carregamentoId_createdAt_idx" ON "CarregamentoFoto"("carregamentoId", "createdAt");

-- CreateIndex
CREATE INDEX "CarregamentoFoto_companyId_carregamentoId_idx" ON "CarregamentoFoto"("companyId", "carregamentoId");

-- AddForeignKey
ALTER TABLE "CarregamentoFoto" ADD CONSTRAINT "CarregamentoFoto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CarregamentoFoto" ADD CONSTRAINT "CarregamentoFoto_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CarregamentoFoto" ADD CONSTRAINT "CarregamentoFoto_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Motorista"("id") ON DELETE SET NULL ON UPDATE CASCADE;
