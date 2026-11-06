-- Índice antigo foi criado como UNIQUE INDEX, não CONSTRAINT — migration anterior não removeu.
DROP INDEX IF EXISTS "Cliente_companyId_documento_key";
