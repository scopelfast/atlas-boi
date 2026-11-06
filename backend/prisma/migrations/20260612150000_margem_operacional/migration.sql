-- Resultado operacional real: frete líquido − comissão − despesas de viagem

ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "custoDespesasViagem" DECIMAL(14,2);
ALTER TABLE "Carregamento" ADD COLUMN IF NOT EXISTS "margemOperacional" DECIMAL(14,2);

-- Backfill despesas de viagem por embarque
UPDATE "Carregamento" c
SET "custoDespesasViagem" = sub.total
FROM (
  SELECT "carregamentoId", SUM(valor) AS total
  FROM "LancamentoFinanceiro"
  WHERE tipo = 'DESPESA_MOTORISTA'
    AND status = 'CONFIRMADO'
    AND "carregamentoId" IS NOT NULL
  GROUP BY "carregamentoId"
) sub
WHERE c.id = sub."carregamentoId";

-- Backfill margem operacional
UPDATE "Carregamento"
SET "margemOperacional" =
  COALESCE("valorFreteLiquido", "valorFreteCliente", 0)
  - COALESCE("valorComissaoLiquida", "valorComissaoTotal", 0)
  - COALESCE("custoDespesasViagem", 0)
WHERE COALESCE("valorFreteCliente", 0) > 0
   OR COALESCE("custoDespesasViagem", 0) > 0;
