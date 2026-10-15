-- Colunas que entraram no banco via `prisma db push`, sem migration.
-- IF NOT EXISTS: no banco atual já existem; em um banco novo são criadas.
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "errorReason" TEXT;
