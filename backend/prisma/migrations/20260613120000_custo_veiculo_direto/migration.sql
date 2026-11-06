ALTER TABLE "Carregamento" ADD COLUMN "custoVeiculoDireto" DECIMAL(14,2);

COMMENT ON COLUMN "Carregamento"."custoVeiculoDireto" IS 'CC veículo — custos pagos direto pela empresa neste embarque (exclui espelho motorista)';
