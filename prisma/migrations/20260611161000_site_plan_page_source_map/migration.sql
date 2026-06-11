-- Link imported Studio pages back to generated map assets so edited exports
-- can return to the correct public-site section instead of overwriting the
-- primary site plan export.
ALTER TABLE "SitePlanPage" ADD COLUMN "sourceMapAssetId" TEXT;

ALTER TABLE "SitePlanPage"
  ADD CONSTRAINT "SitePlanPage_sourceMapAssetId_fkey"
  FOREIGN KEY ("sourceMapAssetId") REFERENCES "MapAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SitePlanPage_sourceMapAssetId_idx"
  ON "SitePlanPage"("sourceMapAssetId");
