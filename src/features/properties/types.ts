/** API response shapes consumed by the properties feature. */

export type AddressRecord = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
};

export type PropertyListItem = {
  id: string;
  name: string;
  propertyType: string;
  status: string;
  totalGla: number | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
  address: AddressRecord | null;
  _count: { spaces: number; sitePlans: number; documents: number };
};

export type SpaceRecord = {
  id: string;
  suiteNumber: string;
  squareFootage: number | null;
  spaceType: string;
  status: string;
  askingRate: string | null;
  rateType: string | null;
  notes: string | null;
};

export type TenantRecord = {
  id: string;
  name: string;
  category: string | null;
  website: string | null;
  logoAssetId: string | null;
};

export type OccupancyRecord = {
  id: string;
  suiteNumber: string | null;
  squareFootage: number | null;
  isAnchor: boolean;
  tenant: TenantRecord;
};

export type ContactRecord = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  license: string | null;
};

export type PropertyContactRecord = {
  id: string;
  sortOrder: number;
  contact: ContactRecord;
};

export type PhotoRecord = {
  id: string;
  assetId: string;
  category: string | null;
  caption: string | null;
  asset: { id: string; filename: string };
};

export type DemographicRecord = {
  id: string;
  provider: string;
  geographyType: string;
  geographyParams: { radiusMiles?: number };
  metrics: {
    population?: number;
    households?: number;
    avgHouseholdIncome?: number;
    daytimePopulation?: number;
    medianHousingValue?: number;
    medianAge?: number;
  };
  createdAt: string;
};

export type SitePlanListItem = {
  id: string;
  title: string;
  status: string;
  pageCount: number;
  createdAt: string;
};

export type ActivityRecord = {
  id: string;
  entityType: string;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type PropertyDetail = {
  id: string;
  name: string;
  propertyType: string;
  status: string;
  description: string | null;
  totalGla: number | null;
  yearBuilt: number | null;
  parkingRatio: number | null;
  latitude: number | null;
  longitude: number | null;
  address: AddressRecord | null;
  spaces: SpaceRecord[];
  occupancies: OccupancyRecord[];
  contacts: PropertyContactRecord[];
  photos: PhotoRecord[];
  trafficCounts: { id: string; roadName: string; count: number; year: number | null }[];
  demographics: DemographicRecord[];
  sitePlans: SitePlanListItem[];
  _count: { mapAssets: number; documents: number };
};
