ALTER TABLE "Carregamento" ADD COLUMN "valorReceitaLiquida" DECIMAL(14,2);

COMMENT ON COLUMN "Carregamento"."valorReceitaLiquida" IS 'Cobrança líquida total ao cliente (frete + pedágio + balança + outros − abatimentos)';
