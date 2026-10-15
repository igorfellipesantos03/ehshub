-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "numeroUc" TEXT,
ADD COLUMN     "mesReferencia" TEXT,
ADD COLUMN     "diasFaturados" INTEGER,
ADD COLUMN     "consumoPontaKwh" DOUBLE PRECISION,
ADD COLUMN     "consumoForaPontaKwh" DOUBLE PRECISION,
ADD COLUMN     "demandaContratadaKw" DOUBLE PRECISION,
ADD COLUMN     "demandaPontaKw" DOUBLE PRECISION,
ADD COLUMN     "demandaForaPontaKw" DOUBLE PRECISION,
ADD COLUMN     "demandaFaturadaKw" DOUBLE PRECISION,
ADD COLUMN     "multaUltrapassagem" DOUBLE PRECISION,
ADD COLUMN     "reativoExcedente" DOUBLE PRECISION;
