/*
  Warnings:

  - You are about to drop the `InvoiceLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceUpload` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FaturaStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDO', 'ERRO_PROCESSAMENTO', 'MANUAL');

-- DropForeignKey
ALTER TABLE "InvoiceUpload" DROP CONSTRAINT "InvoiceUpload_linkId_fkey";

-- DropTable
DROP TABLE "InvoiceLink";

-- DropTable
DROP TABLE "InvoiceUpload";

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkColeta" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "filial" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkColeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fatura" (
    "id" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "emitente" TEXT,
    "local" TEXT,
    "faturaNumber" TEXT,
    "valorFatura" DOUBLE PRECISION NOT NULL,
    "consumoKwh" DOUBLE PRECISION,
    "dataEmissao" TEXT,
    "xmlFileName" TEXT,
    "filePath" TEXT,
    "status" "FaturaStatus" NOT NULL DEFAULT 'MANUAL',
    "linkId" TEXT NOT NULL,
    "originalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "LinkColeta_token_key" ON "LinkColeta"("token");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "LinkColeta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
