-- CreateEnum
CREATE TYPE "CarregamentoEventoTipo" AS ENUM ('CRIADO', 'STATUS_ALTERADO', 'NFE_IMPORTADA', 'EDITADO');

-- AlterTable
ALTER TABLE "Carregamento" ADD COLUMN "nfeChave" TEXT,
ADD COLUMN "nfeNumero" TEXT,
ADD COLUMN "nfeSerie" TEXT,
ADD COLUMN "nfeValor" DECIMAL(14,2),
ADD COLUMN "nfeEmitenteCnpj" TEXT,
ADD COLUMN "nfeDestinatarioCnpj" TEXT,
ADD COLUMN "nfeXmlHash" TEXT,
ADD COLUMN "nfeDataEmissao" TIMESTAMP(3),
ADD COLUMN "nfeProdutoDescricao" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Carregamento_companyId_nfeXmlHash_key" ON "Carregamento"("companyId", "nfeXmlHash");

-- CreateTable
CREATE TABLE "CarregamentoEvento" (
    "id" TEXT NOT NULL,
    "carregamentoId" TEXT NOT NULL,
    "tipo" "CarregamentoEventoTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "statusAnterior" "CarregamentoStatus",
    "statusNovo" "CarregamentoStatus",
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarregamentoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarregamentoEvento_carregamentoId_createdAt_idx" ON "CarregamentoEvento"("carregamentoId", "createdAt");

-- AddForeignKey
ALTER TABLE "CarregamentoEvento" ADD CONSTRAINT "CarregamentoEvento_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoEvento" ADD CONSTRAINT "CarregamentoEvento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
