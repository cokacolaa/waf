-- AlterTable
ALTER TABLE "domains" ADD COLUMN     "realIpCloudflare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "realIpCustomCidrs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "realIpEnabled" BOOLEAN NOT NULL DEFAULT false;
