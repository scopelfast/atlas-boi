SELECT c.numero, c.status, c."dataEmbarque", c."valorReceitaLiquida", c."margemOperacional", v.placa, cv.principal
FROM "Carregamento" c
LEFT JOIN "CarregamentoVeiculo" cv ON cv."carregamentoId" = c.id
LEFT JOIN "Veiculo" v ON v.id = cv."veiculoId"
ORDER BY c."createdAt" DESC LIMIT 3;
