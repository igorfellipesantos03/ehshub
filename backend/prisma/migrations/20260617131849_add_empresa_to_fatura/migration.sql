-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "empresa" TEXT;

-- Backpopulate existing faturas from their links
UPDATE "Fatura" f 
SET "empresa" = l."empresa" 
FROM "LinkColeta" l 
WHERE f."linkId" = l."id";

