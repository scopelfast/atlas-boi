-- CreateEnum
CREATE TYPE "LancamentoTipo" AS ENUM (
  'ADIANTAMENTO',
  'DESPESA_MOTORISTA',
  'REEMBOLSO_MOTORISTA',
  'PRESTACAO_CONTAS',
  'COMISSAO_MOTORISTA',
  'ACERTO_MOTORISTA',
  'FRETE_CLIENTE',
  'PEDAGIO_CLIENTE',
  'BALANCA_CLIENTE',
  'OUTROS_CLIENTE',
  'COMBUSTIVEL',
  'MANUTENCAO',
  'PNEU',
  'SEGURO',
  'IPVA_LICENCIAMENTO',
  'MULTA',
  'DEPRECIACAO',
  'OUTROS_VEICULO',
  'RECEITA',
  'DESPESA',
  'TRANSFERENCIA'
);

CREATE TYPE "LancamentoNatureza" AS ENUM ('CREDITO', 'DEBITO');

CREATE TYPE "LancamentoStatus" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ESTORNADO');

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" "LancamentoTipo" NOT NULL,
    "natureza" "LancamentoNatureza" NOT NULL,
    "status" "LancamentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "valor" DECIMAL(14,2) NOT NULL,
    "dataLancamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "carregamentoId" TEXT,
    "motoristaId" TEXT,
    "clienteId" TEXT,
    "veiculoId" TEXT,
    "comprovantePath" TEXT,
    "comprovanteNome" TEXT,
    "apenasLancamento" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LancamentoFinanceiro_companyId_tipo_idx" ON "LancamentoFinanceiro"("companyId", "tipo");
CREATE INDEX "LancamentoFinanceiro_companyId_motoristaId_idx" ON "LancamentoFinanceiro"("companyId", "motoristaId");
CREATE INDEX "LancamentoFinanceiro_companyId_veiculoId_idx" ON "LancamentoFinanceiro"("companyId", "veiculoId");
CREATE INDEX "LancamentoFinanceiro_companyId_clienteId_idx" ON "LancamentoFinanceiro"("companyId", "clienteId");
CREATE INDEX "LancamentoFinanceiro_companyId_carregamentoId_idx" ON "LancamentoFinanceiro"("companyId", "carregamentoId");
CREATE INDEX "LancamentoFinanceiro_companyId_dataCompetencia_idx" ON "LancamentoFinanceiro"("companyId", "dataCompetencia");
CREATE INDEX "LancamentoFinanceiro_companyId_status_idx" ON "LancamentoFinanceiro"("companyId", "status");

ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_carregamentoId_fkey" FOREIGN KEY ("carregamentoId") REFERENCES "Carregamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Motorista"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
