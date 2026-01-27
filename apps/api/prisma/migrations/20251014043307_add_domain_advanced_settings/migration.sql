-- AlterTable
ALTER TABLE "domains" ADD COLUMN     "customLocations" JSONB,
ADD COLUMN     "grpcEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hstsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "http2Enabled" BOOLEAN NOT NULL DEFAULT true;
