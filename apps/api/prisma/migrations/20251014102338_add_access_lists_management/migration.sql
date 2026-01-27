-- CreateEnum
CREATE TYPE "AccessListType" AS ENUM ('ip_whitelist', 'http_basic_auth', 'combined');

-- CreateTable
CREATE TABLE "access_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AccessListType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_list_auth_users" (
    "id" TEXT NOT NULL,
    "accessListId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_list_auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_list_domains" (
    "id" TEXT NOT NULL,
    "accessListId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_list_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_lists_name_key" ON "access_lists"("name");

-- CreateIndex
CREATE INDEX "access_lists_type_idx" ON "access_lists"("type");

-- CreateIndex
CREATE INDEX "access_lists_enabled_idx" ON "access_lists"("enabled");

-- CreateIndex
CREATE INDEX "access_list_auth_users_accessListId_idx" ON "access_list_auth_users"("accessListId");

-- CreateIndex
CREATE UNIQUE INDEX "access_list_auth_users_accessListId_username_key" ON "access_list_auth_users"("accessListId", "username");

-- CreateIndex
CREATE INDEX "access_list_domains_accessListId_idx" ON "access_list_domains"("accessListId");

-- CreateIndex
CREATE INDEX "access_list_domains_domainId_idx" ON "access_list_domains"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "access_list_domains_accessListId_domainId_key" ON "access_list_domains"("accessListId", "domainId");

-- AddForeignKey
ALTER TABLE "access_list_auth_users" ADD CONSTRAINT "access_list_auth_users_accessListId_fkey" FOREIGN KEY ("accessListId") REFERENCES "access_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_list_domains" ADD CONSTRAINT "access_list_domains_accessListId_fkey" FOREIGN KEY ("accessListId") REFERENCES "access_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_list_domains" ADD CONSTRAINT "access_list_domains_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
