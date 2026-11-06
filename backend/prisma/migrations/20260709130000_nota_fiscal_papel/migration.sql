-- Troca de notas: só NF-e PRINCIPAL entra na soma de animais/valor da carga
CREATE TYPE "NotaFiscalPapel" AS ENUM ('PRINCIPAL', 'TROCA');

ALTER TABLE "CarregamentoNotaFiscal"
  ADD COLUMN "papel" "NotaFiscalPapel" NOT NULL DEFAULT 'PRINCIPAL';
