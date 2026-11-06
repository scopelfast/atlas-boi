-- Fase 4: views analíticas (DRE veículo, rankings)

DROP MATERIALIZED VIEW IF EXISTS mv_dre_veiculo;

CREATE MATERIALIZED VIEW mv_dre_veiculo AS
SELECT
  v."companyId",
  v.id AS "veiculoId",
  v.placa,
  date_trunc('month', l."dataCompetencia" AT TIME ZONE 'UTC') AS competencia,
  SUM(
    CASE
      WHEN l.tipo IN (
        'FRETE_CLIENTE', 'PEDAGIO_CLIENTE', 'BALANCA_CLIENTE', 'OUTROS_CLIENTE', 'RECEITA'
      ) AND l.natureza = 'CREDITO'
      THEN l.valor
      ELSE 0
    END
  ) AS receita,
  SUM(
    CASE
      WHEN l.tipo IN (
        'COMBUSTIVEL', 'MANUTENCAO', 'PNEU', 'SEGURO', 'IPVA_LICENCIAMENTO',
        'MULTA', 'DEPRECIACAO', 'OUTROS_VEICULO', 'DESPESA'
      ) AND l.natureza = 'DEBITO'
      THEN l.valor
      WHEN l.tipo = 'COMISSAO_MOTORISTA' AND l.natureza = 'DEBITO'
      THEN l.valor
      ELSE 0
    END
  ) AS custo,
  SUM(CASE WHEN l.natureza = 'CREDITO' THEN l.valor ELSE -l.valor END) AS resultado
FROM "Veiculo" v
JOIN "LancamentoFinanceiro" l
  ON l."veiculoId" = v.id
 AND l.status = 'CONFIRMADO'
GROUP BY v."companyId", v.id, v.placa, date_trunc('month', l."dataCompetencia" AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX mv_dre_veiculo_unique
  ON mv_dre_veiculo ("companyId", "veiculoId", competencia);

CREATE OR REPLACE VIEW vw_ranking_rotas AS
SELECT
  r."companyId",
  r.id AS "rotaId",
  r.codigo,
  r.descricao,
  COUNT(c.id)::integer AS "totalViagens",
  AVG(c."margemBruta") AS "margemMedia",
  SUM(COALESCE(c."kmReal", c."kmRota", 0)) AS "kmTotal",
  RANK() OVER (
    PARTITION BY r."companyId"
    ORDER BY AVG(c."margemBruta") DESC NULLS LAST
  )::integer AS posicao
FROM "Rota" r
JOIN "Carregamento" c
  ON c."rotaId" = r.id
 AND c.status = 'FINALIZADO'
GROUP BY r."companyId", r.id, r.codigo, r.descricao;

CREATE OR REPLACE VIEW vw_ranking_motoristas AS
SELECT
  m."companyId",
  m.id AS "motoristaId",
  m.nome,
  COUNT(DISTINCT cm."carregamentoId")::integer AS "totalViagens",
  COALESCE(
    SUM(
      CASE
        WHEN l.tipo = 'COMISSAO_MOTORISTA' AND l.status = 'CONFIRMADO'
        THEN l.valor
        ELSE 0
      END
    ),
    0
  ) AS "totalComissao",
  RANK() OVER (
    PARTITION BY m."companyId"
    ORDER BY COALESCE(
      SUM(
        CASE
          WHEN l.tipo = 'COMISSAO_MOTORISTA' AND l.status = 'CONFIRMADO'
          THEN l.valor
          ELSE 0
        END
      ),
      0
    ) DESC
  )::integer AS posicao
FROM "Motorista" m
LEFT JOIN "CarregamentoMotorista" cm ON cm."motoristaId" = m.id
LEFT JOIN "LancamentoFinanceiro" l
  ON l."motoristaId" = m.id
 AND l.tipo = 'COMISSAO_MOTORISTA'
 AND l.status = 'CONFIRMADO'
GROUP BY m."companyId", m.id, m.nome;

CREATE OR REPLACE FUNCTION refresh_mv_dre_veiculo()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_veiculo;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW mv_dre_veiculo;
END;
$$;
