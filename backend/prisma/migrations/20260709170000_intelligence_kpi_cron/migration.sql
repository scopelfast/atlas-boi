-- KPI snapshots + refresh noturno (pg_cron opcional)

CREATE TABLE IF NOT EXISTS kpi_snapshot (
  id TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  competencia DATE NOT NULL,
  payload JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kpi_snapshot_company_competencia UNIQUE ("companyId", competencia)
);

CREATE INDEX IF NOT EXISTS kpi_snapshot_company_idx ON kpi_snapshot ("companyId", competencia DESC);

CREATE OR REPLACE FUNCTION snapshot_kpis_all_tenants()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  comp DATE;
  payload JSONB;
BEGIN
  comp := date_trunc('month', CURRENT_DATE)::date;

  FOR r IN SELECT id FROM "Company" LOOP
    SELECT jsonb_build_object(
      'receita', COALESCE(SUM(receita), 0),
      'custo', COALESCE(SUM(custo), 0),
      'resultado', COALESCE(SUM(resultado), 0),
      'capturadoEm', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
    INTO payload
    FROM mv_dre_veiculo
    WHERE "companyId" = r.id AND competencia = comp;

    INSERT INTO kpi_snapshot (id, "companyId", competencia, payload, "createdAt")
    VALUES (
      'kpi_' || r.id || '_' || to_char(comp, 'YYYY-MM'),
      r.id,
      comp,
      payload,
      NOW()
    )
    ON CONFLICT ("companyId", competencia)
    DO UPDATE SET payload = EXCLUDED.payload, "createdAt" = NOW();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_intelligence_nightly()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_mv_dre_veiculo();
  PERFORM snapshot_kpis_all_tenants();
END;
$$;

-- pg_cron: agenda 03:00 UTC (meia-noite BRT) se a extensão existir
DO $body$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron: sem privilégio para CREATE EXTENSION — configure manualmente no Postgres gerenciado.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponível: %', SQLERRM;
END;
$body$;

DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'atlas-intelligence-nightly';

    PERFORM cron.schedule(
      'atlas-intelligence-nightly',
      '0 3 * * *',
      $$SELECT refresh_intelligence_nightly()$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Não foi possível agendar pg_cron: %', SQLERRM;
END;
$body$;
