-- Fase 1: Clientes, Rotas, Motoristas, Veículos

CREATE TYPE "ClienteTipo" AS ENUM ('EMBARQUE', 'DESEMBARQUE', 'AMBOS');
CREATE TYPE "DocumentoTipo" AS ENUM ('CPF', 'CNPJ');
CREATE TYPE "TipoVeiculo" AS ENUM ('CAMINHAO', 'CARRETA', 'JULIETA', 'TOCO', 'OUTRO');
CREATE TYPE "TipoComissao" AS ENUM ('POR_KM', 'PERCENTUAL_CARGA', 'VALOR_FIXO', 'MISTO');

CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipoDocumento" "DocumentoTipo" NOT NULL,
    "documento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "codigoIbge" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "tipo" "ClienteTipo" NOT NULL DEFAULT 'AMBOS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rota" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "clienteOrigemId" TEXT,
    "clienteDestinoId" TEXT,
    "origemTexto" TEXT,
    "destinoTexto" TEXT,
    "distanciaKm" DECIMAL(10,2) NOT NULL,
    "valorPedagio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorBalanca" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorKmCobrancaCliente" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "valorKmComissaoMotorista" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "percentualComissao" DECIMAL(5,2),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Motorista" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "cnh" TEXT,
    "cnhCategoria" TEXT,
    "cnhValidade" TIMESTAMP(3),
    "telefone" TEXT,
    "email" TEXT,
    "tipoComissao" "TipoComissao" NOT NULL DEFAULT 'POR_KM',
    "valorComissaoKm" DECIMAL(12,4),
    "percentualComissao" DECIMAL(5,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "renavam" TEXT,
    "modelo" TEXT,
    "marca" TEXT,
    "ano" INTEGER,
    "tipo" "TipoVeiculo" NOT NULL DEFAULT 'CAMINHAO',
    "codigoCentroCusto" TEXT,
    "descricaoCentroCusto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cliente_companyId_documento_key" ON "Cliente"("companyId", "documento");
CREATE INDEX "Cliente_companyId_tipo_idx" ON "Cliente"("companyId", "tipo");
CREATE INDEX "Cliente_companyId_cidade_uf_idx" ON "Cliente"("companyId", "cidade", "uf");

CREATE UNIQUE INDEX "Rota_companyId_codigo_key" ON "Rota"("companyId", "codigo");

CREATE UNIQUE INDEX "Motorista_companyId_cpf_key" ON "Motorista"("companyId", "cpf");

CREATE UNIQUE INDEX "Veiculo_companyId_placa_key" ON "Veiculo"("companyId", "placa");

ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_clienteOrigemId_fkey" FOREIGN KEY ("clienteOrigemId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_clienteDestinoId_fkey" FOREIGN KEY ("clienteDestinoId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Motorista" ADD CONSTRAINT "Motorista_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
