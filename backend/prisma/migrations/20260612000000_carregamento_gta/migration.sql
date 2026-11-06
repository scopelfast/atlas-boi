-- GTA — Guia de Trânsito Animal (registro manual no carregamento)
ALTER TABLE "Carregamento" ADD COLUMN "numeroGta" TEXT;
ALTER TABLE "Carregamento" ADD COLUMN "gtaUf" CHAR(2);
