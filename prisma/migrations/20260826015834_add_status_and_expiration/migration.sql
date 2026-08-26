/*
  Warnings:

  - A unique constraint covering the columns `[hostToken]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "hostToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_hostToken_key" ON "Event"("hostToken");
