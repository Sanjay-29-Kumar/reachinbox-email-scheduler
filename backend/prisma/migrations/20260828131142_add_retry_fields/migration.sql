-- AlterEnum
ALTER TYPE "EmailJobStatus" ADD VALUE 'RETRYING';

-- AlterTable
ALTER TABLE "EmailJob" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT;
