-- Funções financeiras no Postgres (fonte de verdade para comissão)

CREATE OR REPLACE FUNCTION calcular_financeiro_carregamento(p_carregamento_id TEXT)
RETURNS TABLE (
  valor_frete_cliente NUMERIC,
  valor_comissao_total NUMERIC,
  valor_pedagio NUMERIC,
  valor_balanca NUMERIC,
  margem_bruta NUMERIC
) AS $$
DECLARE
  v_km NUMERIC;
  v_pedagio NUMERIC := 0;
  v_balanca NUMERIC := 0;
  v_km_cobranca NUMERIC := 0;
  v_km_comissao_rota NUMERIC := 0;
  v_pct_rota NUMERIC := 0;
  v_valor_carga NUMERIC := 0;
  v_comissao_total NUMERIC := 0;
  v_frete NUMERIC;
  v_count INT;
  rec RECORD;
  v_split NUMERIC;
  v_km_rate NUMERIC;
  v_comissao NUMERIC;
  v_pct NUMERIC;
BEGIN
  SELECT
    COALESCE(c."kmReal", c."kmRota", 0),
    COALESCE(c."valorCarga", 0)
  INTO v_km, v_valor_carga
  FROM "Carregamento" c
  WHERE c.id = p_carregamento_id;

  SELECT
    COALESCE(r."valorPedagio", 0),
    COALESCE(r."valorBalanca", 0),
    COALESCE(r."valorKmCobrancaCliente", 0),
    COALESCE(r."valorKmComissaoMotorista", 0),
    COALESCE(r."percentualComissao", 0)
  INTO v_pedagio, v_balanca, v_km_cobranca, v_km_comissao_rota, v_pct_rota
  FROM "Carregamento" c
  LEFT JOIN "Rota" r ON r.id = c."rotaId"
  WHERE c.id = p_carregamento_id;

  v_frete := v_km * v_km_cobranca + v_pedagio + v_balanca;

  SELECT COUNT(*)::INT INTO v_count
  FROM "CarregamentoMotorista" cm
  WHERE cm."carregamentoId" = p_carregamento_id;

  IF v_count > 0 THEN
    FOR rec IN
      SELECT
        cm."percentualComissao",
        m."tipoComissao",
        m."valorComissaoKm",
        m."percentualComissao" AS m_pct
      FROM "CarregamentoMotorista" cm
      JOIN "Motorista" m ON m.id = cm."motoristaId"
      WHERE cm."carregamentoId" = p_carregamento_id
    LOOP
      v_split := COALESCE(rec."percentualComissao", 100.0 / v_count) / 100.0;
      v_km_rate := COALESCE(rec."valorComissaoKm", v_km_comissao_rota);
      v_comissao := 0;

      IF rec."tipoComissao" IN ('POR_KM', 'MISTO') THEN
        v_comissao := v_comissao + v_km * v_km_rate;
      END IF;

      IF rec."tipoComissao" IN ('PERCENTUAL_CARGA', 'MISTO') THEN
        v_pct := COALESCE(rec.m_pct, v_pct_rota, 0);
        IF v_valor_carga > 0 AND v_pct > 0 THEN
          v_comissao := v_comissao + v_valor_carga * (v_pct / 100.0);
        END IF;
      END IF;

      IF rec."tipoComissao" = 'VALOR_FIXO' THEN
        v_comissao := COALESCE(rec."valorComissaoKm", 0);
      END IF;

      v_comissao_total := v_comissao_total + v_comissao * v_split;
    END LOOP;
  ELSIF v_km > 0 AND v_km_comissao_rota > 0 THEN
    v_comissao_total := v_km * v_km_comissao_rota;
  END IF;

  RETURN QUERY
  SELECT
    NULLIF(v_frete, 0),
    NULLIF(v_comissao_total, 0),
    NULLIF(v_pedagio, 0),
    NULLIF(v_balanca, 0),
    NULLIF(v_frete - v_comissao_total - v_pedagio - v_balanca, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Split de comissão por motorista (usa valor persistido no carregamento ou recalcula)
CREATE OR REPLACE FUNCTION apurar_comissao(p_carregamento_id TEXT)
RETURNS TABLE(motorista_id TEXT, valor NUMERIC) AS $$
DECLARE
  v_total NUMERIC;
  v_count INT;
  v_peso_total NUMERIC;
BEGIN
  SELECT COALESCE(c."valorComissaoTotal", 0)
  INTO v_total
  FROM "Carregamento" c
  WHERE c.id = p_carregamento_id;

  IF COALESCE(v_total, 0) <= 0 THEN
    SELECT cf.valor_comissao_total
    INTO v_total
    FROM calcular_financeiro_carregamento(p_carregamento_id) cf
    LIMIT 1;
  END IF;

  IF COALESCE(v_total, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_count
  FROM "CarregamentoMotorista" cm
  WHERE cm."carregamentoId" = p_carregamento_id;

  IF v_count = 0 THEN
    RETURN;
  END IF;

  SELECT SUM(COALESCE(cm."percentualComissao", 100.0 / v_count))
  INTO v_peso_total
  FROM "CarregamentoMotorista" cm
  WHERE cm."carregamentoId" = p_carregamento_id;

  IF COALESCE(v_peso_total, 0) <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cm."motoristaId",
    ROUND(
      (v_total * COALESCE(cm."percentualComissao", 100.0 / v_count) / v_peso_total)::NUMERIC,
      2
    )
  FROM "CarregamentoMotorista" cm
  WHERE cm."carregamentoId" = p_carregamento_id
    AND ROUND(
      (v_total * COALESCE(cm."percentualComissao", 100.0 / v_count) / v_peso_total)::NUMERIC,
      2
    ) > 0;
END;
$$ LANGUAGE plpgsql STABLE;
