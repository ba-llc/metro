-- AlterEnum: expand TenantLogoSource with website-scrape strategies
ALTER TYPE "TenantLogoSource" ADD VALUE 'WEBSITE_OG';
ALTER TYPE "TenantLogoSource" ADD VALUE 'FAVICON';
ALTER TYPE "TenantLogoSource" ADD VALUE 'GOOGLE_FAVICON';
