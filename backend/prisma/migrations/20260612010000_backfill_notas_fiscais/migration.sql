-- Preenche nomes e data de emissão em notas migradas sem esses campos

UPDATE "CarregamentoNotaFiscal" n
SET "emitenteNome" = cl.nome
FROM "Cliente" cl
WHERE n."emitenteNome" IS NULL
  AND n."emitenteCnpj" IS NOT NULL
  AND cl."companyId" = n."companyId"
  AND cl.ativo = true
  AND regexp_replace(cl.documento, '\D', '', 'g') = regexp_replace(n."emitenteCnpj", '\D', '', 'g');

UPDATE "CarregamentoNotaFiscal" n
SET "destinatarioNome" = cl.nome
FROM "Cliente" cl
WHERE n."destinatarioNome" IS NULL
  AND n."destinatarioCnpj" IS NOT NULL
  AND cl."companyId" = n."companyId"
  AND cl.ativo = true
  AND regexp_replace(cl.documento, '\D', '', 'g') = regexp_replace(n."destinatarioCnpj", '\D', '', 'g');

UPDATE "CarregamentoNotaFiscal" n
SET "emitenteNome" = co.nome
FROM "Carregamento" c
JOIN "Cliente" co ON co.id = c."clienteOrigemId"
WHERE n."carregamentoId" = c.id
  AND n."emitenteNome" IS NULL
  AND n."emitenteCnpj" IS NOT NULL
  AND regexp_replace(co.documento, '\D', '', 'g') = regexp_replace(n."emitenteCnpj", '\D', '', 'g');

UPDATE "CarregamentoNotaFiscal" n
SET "destinatarioNome" = cd.nome
FROM "Carregamento" c
JOIN "Cliente" cd ON cd.id = c."clienteDestinoId"
WHERE n."carregamentoId" = c.id
  AND n."destinatarioNome" IS NULL
  AND n."destinatarioCnpj" IS NOT NULL
  AND regexp_replace(cd.documento, '\D', '', 'g') = regexp_replace(n."destinatarioCnpj", '\D', '', 'g');

UPDATE "CarregamentoNotaFiscal" n
SET "dataEmissao" = c."nfeDataEmissao"
FROM "Carregamento" c
WHERE n."carregamentoId" = c.id
  AND n."dataEmissao" IS NULL
  AND c."nfeDataEmissao" IS NOT NULL;
