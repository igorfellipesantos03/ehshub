-- CreateEnum
CREATE TYPE "OrigemFatura" AS ENUM ('LINK', 'PROTHEUS');

-- DropForeignKey
ALTER TABLE "Fatura" DROP CONSTRAINT "Fatura_linkId_fkey";

-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "chaveProtheus" TEXT,
ADD COLUMN     "emissaoProtheus" TEXT,
ADD COLUMN     "origem" "OrigemFatura" NOT NULL DEFAULT 'LINK',
ADD COLUMN     "usuarioProtheus" TEXT,
ADD COLUMN     "valorBrutoProtheus" DOUBLE PRECISION,
ALTER COLUMN "linkId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_chaveProtheus_key" ON "Fatura"("chaveProtheus");

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "LinkColeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

