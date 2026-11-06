-- Descontos de frete (cliente) e comissão (motorista) + tipos de lançamento

ALTER TYPE "LancamentoTipo" ADD VALUE IF NOT EXISTS 'DESCONTO_COMISSAO_MOTORISTA';
ALTER TYPE "LancamentoTipo" ADD VALUE IF NOT EXISTS 'ABATIMENTO_FRETE_CLIENTE';

ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "descontoFreteCliente" DECIMAL(14,2);
ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "motivoDescontoFrete" TEXT;
ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "valorFreteLiquido" DECIMAL(14,2);
ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "valorComissaoLiquida" DECIMAL(14,2);
ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "margemLiquida" DECIMAL(14,2);

ALTER TABLE "CarregamentoMotorista" ADD COLUMN IF NOT EXISTS "descontoComissao" DECIMAL(14,2);
ALTER TABLE "CarregamentoMotorista" ADD COLUMN IF NOT EXISTS "motivoDescontoComissao" TEXT;

-- Backfill líquidos = brutos onde ainda não há desconto
UPDATE "Carregamento"
SET
  "valorFreteLiquido" = COALESCE("valorFreteLiquido", "valorFreteCliente"),
  "valorComissaoLiquida" = COALESCE("valorComissaoLiquida", "valorComissaoTotal"),
  "margemLiquida" = COALESCE("margemLiquida", "margemBruta")
WHERE "valorFreteCliente" IS NOT NULL OR "margemBruta" IS NOT NULL;
