-- Mesmo CPF/CNPJ pode ter vários locais (fazendas / endereços distintos)

ALTER TABLE "Cliente" ADD COLUMN "localChave" TEXT;

UPDATE "Cliente"
SET "localChave" = CASE
  WHEN "codigoIbge" IS NOT NULL AND TRIM("codigoIbge") <> '' THEN 'IBGE:' || TRIM("codigoIbge")
  ELSE 'LOC:' || "uf" || '-' ||
    UPPER(REGEXP_REPLACE(COALESCE("cidade", ''), '[^A-Za-z0-9]', '', 'g')) || '-' ||
    COALESCE(
      NULLIF(
        UPPER(REGEXP_REPLACE(LEFT(COALESCE(NULLIF(TRIM("logradouro"), ''), 'GERAL'), 40), '[^A-Za-z0-9]', '', 'g')),
        ''
      ),
      'GERAL'
    )
END
WHERE "localChave" IS NULL;

ALTER TABLE "Cliente" ALTER COLUMN "localChave" SET NOT NULL;

ALTER TABLE "Cliente" DROP CONSTRAINT IF EXISTS "Cliente_companyId_documento_key";
DROP INDEX IF EXISTS "Cliente_companyId_documento_key";

CREATE UNIQUE INDEX "Cliente_companyId_documento_localChave_key"
  ON "Cliente"("companyId", "documento", "localChave");
