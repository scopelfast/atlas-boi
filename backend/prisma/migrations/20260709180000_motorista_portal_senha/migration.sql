-- Senha do portal do motorista (PWA)
ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS "portalSenha" TEXT;
