/**
 * The render context is the fully-resolved projection of a Property Record
 * used by the Marketing Engine. It is stored on GeneratedDocument.dataSnapshot
 * (minus binary image data) so every document is auditable and reproducible.
 */
export type RenderContext = {
  property: {
    id: string;
    name: string;
    propertyType: string;
    description: string | null;
    totalGla: number | null;
    yearBuilt: number | null;
    parkingRatio: number | null;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  spaces: {
    suiteNumber: string;
    squareFootage: number | null;
    spaceType: string;
    status: string;
    askingRate: string | null;
    rateType: string | null;
  }[];
  tenants: {
    name: string;
    suiteNumber: string | null;
    squareFootage: number | null;
    isAnchor: boolean;
    logoAssetId: string | null;
  }[];
  contacts: {
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    license: string | null;
  }[];
  trafficCounts: { roadName: string; count: number; year: number | null }[];
  demographics: {
    label: string;
    metrics: Record<string, number | undefined>;
  }[];
  imageAssets: {
    hero: string | null; // asset ids — hydrated to data URIs at render time
    aerial: string | null;
    tradeArea: string | null;
    radius: string | null;
    sitePlan: string | null;
  };
  /** Reserved for the future AI layer (descriptions, summaries, captions). */
  generatedContent: Record<string, string>;
};

/** Image asset ids resolved to data URIs for embedding in rendered HTML. */
export type RenderImages = Record<string, string>;
