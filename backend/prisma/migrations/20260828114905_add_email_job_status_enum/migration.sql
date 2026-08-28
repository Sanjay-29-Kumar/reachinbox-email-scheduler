/*
  Warnings:

  - The `status` column on the `EmailJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "EmailJob" DROP COLUMN "status",
ADD COLUMN     "status" "EmailJobStatus" NOT NULL DEFAULT 'SCHEDULED';
