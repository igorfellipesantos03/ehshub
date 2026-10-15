-- AlterTable
ALTER TABLE "User" ADD COLUMN "protheusUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_protheusUsername_key" ON "User"("protheusUsername");
