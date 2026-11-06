-- DRE por veículo: usar carregamentos (mesma base do Resultado financeiro)
-- Ranking rotas: incluir viagens desembarcadas, margem operacional

DROP MATERIALIZED VIEW IF EXISTS mv_dre_veiculo;

CREATE MATERIALIZED VIEW mv_dre_veiculo AS
SELECT
  v."companyId",
  v.id AS "veiculoId",
  v.placa,
  date_trunc(
    'month',
    (COALESCE(c."dataEmbarque", c."createdAt") AT TIME ZONE 'UTC')
  ) AS competencia,
  SUM(
    COALESCE(c."valorReceitaLiquida", c."valorFreteLiquido", c."valorFreteCliente", 0)
  ) AS receita,
  SUM(
    COALESCE(c."valorComissaoLiquida", c."valorComissaoTotal", 0)
    + COALESCE(c."custoDespesasViagem", 0)
    + COALESCE(c."custoVeiculoDireto", 0)
  ) AS custo,
  SUM(
    COALESCE(c."margemOperacional", c."margemLiquida", c."margemBruta", 0)
  ) AS resultado
FROM "Veiculo" v
JOIN "CarregamentoVeiculo" cv
  ON cv."veiculoId" = v.id
 AND cv.principal = true
JOIN "Carregamento" c
  ON c.id = cv."carregamentoId"
 AND c."companyId" = v."companyId"
WHERE c.status NOT IN ('RASCUNHO', 'CANCELADO')
GROUP BY
  v."companyId",
  v.id,
  v.placa,
  date_trunc('month', (COALESCE(c."dataEmbarque", c."createdAt") AT TIME ZONE 'UTC'));

CREATE UNIQUE INDEX mv_dre_veiculo_unique
  ON mv_dre_veiculo ("companyId", "veiculoId", competencia);

CREATE OR REPLACE VIEW vw_ranking_rotas AS
SELECT
  r."companyId",
  r.id AS "rotaId",
  r.codigo,
  r.descricao,
  COUNT(c.id)::integer AS "totalViagens",
  AVG(COALESCE(c."margemOperacional", c."margemLiquida", c."margemBruta")) AS "margemMedia",
  SUM(COALESCE(c."kmReal", c."kmRota", 0)) AS "kmTotal",
  RANK() OVER (
    PARTITION BY r."companyId"
    ORDER BY AVG(COALESCE(c."margemOperacional", c."margemLiquida", c."margemBruta")) DESC NULLS LAST
  )::integer AS posicao
FROM "Rota" r
JOIN "Carregamento" c
  ON c."rotaId" = r.id
 AND c.status IN ('DESEMBARCADO', 'FINALIZADO')
GROUP BY r."companyId", r.id, r.codigo, r.descricao;

SELECT refresh_mv_dre_veiculo();
