-- AlterTable
ALTER TABLE "Carregamento" ADD COLUMN "numeroMinuta" TEXT,
ADD COLUMN "minutaFotoPath" TEXT,
ADD COLUMN "minutaFotoNome" TEXT;

-- CreateIndex
CREATE INDEX "Carregamento_companyId_numeroMinuta_idx" ON "Carregamento"("companyId", "numeroMinuta");
