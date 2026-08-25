-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "PhotoStatus" NOT NULL DEFAULT 'APPROVED';
