-- AlterTable
ALTER TABLE "SitePlan" ADD COLUMN     "latestExportAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "SitePlan" ADD CONSTRAINT "SitePlan_latestExportAssetId_fkey" FOREIGN KEY ("latestExportAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
