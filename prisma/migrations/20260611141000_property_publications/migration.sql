-- Adds explicit publish/unpublish state for public-facing property websites.

CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

CREATE TABLE "PropertyPublication" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedWebsiteDocumentId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "lastPublishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyPublication_propertyId_key" ON "PropertyPublication"("propertyId");
CREATE INDEX "PropertyPublication_status_idx" ON "PropertyPublication"("status");
CREATE INDEX "PropertyPublication_publishedWebsiteDocumentId_idx" ON "PropertyPublication"("publishedWebsiteDocumentId");

ALTER TABLE "PropertyPublication" ADD CONSTRAINT "PropertyPublication_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyPublication" ADD CONSTRAINT "PropertyPublication_publishedWebsiteDocumentId_fkey"
FOREIGN KEY ("publishedWebsiteDocumentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PropertyPublication" ADD CONSTRAINT "PropertyPublication_lastPublishedById_fkey"
FOREIGN KEY ("lastPublishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
