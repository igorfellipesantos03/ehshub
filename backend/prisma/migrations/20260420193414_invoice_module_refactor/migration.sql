/*
  Warnings:

  - You are about to drop the column `branchId` on the `InvoiceUpload` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `InvoiceUpload` table. All the data in the column will be lost.
  - You are about to drop the column `tokenId` on the `InvoiceUpload` table. All the data in the column will be lost.
  - You are about to drop the column `totalValue` on the `InvoiceUpload` table. All the data in the column will be lost.
  - You are about to drop the `Branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormToken` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `linkId` to the `InvoiceUpload` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `InvoiceUpload` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_companyId_fkey";

-- DropForeignKey
ALTER TABLE "FormToken" DROP CONSTRAINT "FormToken_branchId_fkey";

-- DropForeignKey
ALTER TABLE "FormToken" DROP CONSTRAINT "FormToken_createdById_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceUpload" DROP CONSTRAINT "InvoiceUpload_branchId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceUpload" DROP CONSTRAINT "InvoiceUpload_tokenId_fkey";

-- AlterTable
ALTER TABLE "InvoiceUpload" DROP COLUMN "branchId",
DROP COLUMN "fileName",
DROP COLUMN "tokenId",
DROP COLUMN "totalValue",
ADD COLUMN     "linkId" TEXT NOT NULL,
ADD COLUMN     "nfeNumber" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "xFant" TEXT,
ADD COLUMN     "xmlFileName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "Branch";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "FormToken";

-- CreateTable
CREATE TABLE "InvoiceLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "filial" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLink_token_key" ON "InvoiceLink"("token");

-- AddForeignKey
ALTER TABLE "InvoiceUpload" ADD CONSTRAINT "InvoiceUpload_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "InvoiceLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
