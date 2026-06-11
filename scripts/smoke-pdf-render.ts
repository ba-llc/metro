/**
 * Smoke test: HTML → PDF via ChromiumPdfRenderer (no database required).
 * Run: npx tsx scripts/smoke-pdf-render.ts
 */
import { getPdfRenderer } from "../src/server/providers/pdf/chromiumPdfRenderer";
import { renderDocumentHtml } from "../src/server/rendering/renderHtml";
import { metroCommercialTheme } from "../src/features/marketing/schemas";
import type { RenderContext } from "../src/server/rendering/types";

const mockContext: RenderContext = {
  property: {
    id: "smoke",
    name: "Lawrence Park Shopping Center",
    propertyType: "SHOPPING_CENTER",
    description: "Demo property",
    totalGla: 364000,
    yearBuilt: 1972,
    parkingRatio: 5.2,
  },
  address: {
    street: "1991 Sproul Road",
    city: "Broomall",
    state: "PA",
    zip: "19008",
  },
  spaces: [
    {
      suiteNumber: "101",
      squareFootage: 2400,
      spaceType: "INLINE",
      status: "AVAILABLE",
      askingRate: "28",
      rateType: "NNN",
    },
  ],
  tenants: [
    {
      name: "Giant Food Stores",
      suiteNumber: "100",
      squareFootage: 62000,
      isAnchor: true,
      logoAssetId: null,
    },
  ],
  contacts: [
    {
      name: "Demo Broker",
      title: "Senior Vice President",
      email: "demo@metrocommercial.com",
      phone: "(610) 555-0142",
      license: "PA-RB068000",
    },
  ],
  trafficCounts: [
    { roadName: "Sproul Road", count: 24500, year: 2025 },
  ],
  demographics: [
    {
      label: "1 Mile",
      metrics: {
        population: 14820,
        households: 5630,
        avgHouseholdIncome: 128400,
      },
    },
  ],
  imageAssets: {
    hero: null,
    aerial: null,
    tradeArea: null,
    radius: null,
    retail: null,
    sitePlan: null,
  },
  generatedContent: {},
};

const pages = [
  { block: "cover" as const },
  { block: "availability-table" as const, title: "Availability" },
  { block: "contacts" as const, title: "Leasing Contacts" },
];

async function main() {
  const html = await renderDocumentHtml({
    theme: metroCommercialTheme,
    pages,
    context: mockContext,
    images: {},
  });

  const pdf = await getPdfRenderer().render(html, {
    pageSize: "letter-landscape",
  });

  const header = pdf.subarray(0, 5).toString();
  if (header !== "%PDF-") {
    throw new Error(`Invalid PDF header: ${header}`);
  }

  console.log(`OK — rendered ${pages.length} pages → ${pdf.length} byte PDF`);
}

main().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exit(1);
});
