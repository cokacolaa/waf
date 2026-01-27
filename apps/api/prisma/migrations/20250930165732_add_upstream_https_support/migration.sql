-- AlterTable
ALTER TABLE "upstreams" ADD COLUMN     "protocol" TEXT NOT NULL DEFAULT 'http',
ADD COLUMN     "sslVerify" BOOLEAN NOT NULL DEFAULT true;
