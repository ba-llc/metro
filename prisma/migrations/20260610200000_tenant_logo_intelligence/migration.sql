-- CreateEnum
CREATE TYPE "TenantLogoStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TenantLogoSource" AS ENUM ('LIBRARY', 'BRANDFETCH', 'MANUAL');

-- AlterTable
ALTER TABLE "Tenant"
    ADD COLUMN "logoStatus"       "TenantLogoStatus" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "logoSource"       "TenantLogoSource",
    ADD COLUMN "googlePlaceId"    TEXT,
    ADD COLUMN "formattedAddress" TEXT,
    ADD COLUMN "latitude"         DOUBLE PRECISION,
    ADD COLUMN "longitude"        DOUBLE PRECISION,
    ADD COLUMN "phoneNumber"      TEXT,
    ADD COLUMN "placeTypes"       JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "discoveredAt"     TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_googlePlaceId_key" ON "Tenant"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Tenant_organizationId_logoStatus_idx" ON "Tenant"("organizationId", "logoStatus");
