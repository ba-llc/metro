-- Property slug (unique per organization) + document version numbers for PDF history.

ALTER TABLE "Property" ADD COLUMN "slug" TEXT;

UPDATE "Property" p
SET "slug" = lower(regexp_replace(regexp_replace(trim(p."name"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "slug" IS NULL;

UPDATE "Property" p
SET "slug" = p."slug" || '-' || substr(p."id", 1, 6)
WHERE p."slug" IN (
  SELECT "slug" FROM "Property"
  GROUP BY "organizationId", "slug"
  HAVING COUNT(*) > 1
);

ALTER TABLE "Property" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Property_organizationId_slug_key" ON "Property"("organizationId", "slug");

ALTER TABLE "GeneratedDocument" ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- Backfill version numbers per property + channel by creation order.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "propertyId", channel
      ORDER BY "createdAt" ASC
    ) AS version_num
  FROM "GeneratedDocument"
)
UPDATE "GeneratedDocument" d
SET "versionNumber" = ranked.version_num
FROM ranked
WHERE d.id = ranked.id;
