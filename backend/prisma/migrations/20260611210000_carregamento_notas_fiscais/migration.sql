-- CreateTable
CREATE TABLE "CarregamentoNotaFiscal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "carregamentoId" TEXT NOT NULL,
    "chave" TEXT,
    "numero" TEXT NOT NULL,
    "serie" TEXT,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "quantidadeAnimais" INTEGER,
    "emitenteCnpj" TEXT,
    "emitenteNome" TEXT,
    "destinatarioCnpj" TEXT,
    "destinatarioNome" TEXT,
    "produtoDescricao" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "xmlHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarregamentoNotaFiscal_pkey" PRIMARY KEY ("id")
);

-- Migrate existing single NF-e rows from Carregamento
INSERT INTO "CarregamentoNotaFiscal" (
    "id",
    "companyId",
    "carregamentoId",
    "chave",
    "numero",
    "serie",
    "valorTotal",
    "quantidadeAnimais",
    "emitenteCnpj",
    "destinatarioCnpj",
    "produtoDescricao",
    "dataEmissao",
    "xmlHash",
    "createdAt"
)
SELECT
    CONCAT("id", '-nf1'),
    "companyId",
    "id",
    "nfeChave",
    COALESCE("nfeNumero", 'S/N'),
    "nfeSerie",
    COALESCE("nfeValor", 0),
    "quantidadeAnimais",
    "nfeEmitenteCnpj",
    "nfeDestinatarioCnpj",
    "nfeProdutoDescricao",
    "nfeDataEmissao",
    "nfeXmlHash",
    "createdAt"
FROM "Carregamento"
WHERE "nfeXmlHash" IS NOT NULL;

-- DropIndex (unique per carregamento — now one carregamento can have many notas)
DROP INDEX IF EXISTS "Carregamento_companyId_nfeXmlHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "CarregamentoNotaFiscal_companyId_xmlHash_key" ON "CarregamentoNotaFiscal"("companyId", "xmlHash");

-- CreateIndex
CREATE INDEX "CarregamentoNotaFiscal_carregamentoId_idx" ON "CarregamentoNotaFiscal"("carregamentoId");

-- AddForeignKey
ALTER TABLE "CarregamentoNotaFiscal" ADD CONSTRAINT "CarregamentoNotaFiscal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarregamentoNotaFiscal" ADD CONSTRAINT "CarregamentoNotaFiscal_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
