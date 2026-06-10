import type { GeographyType } from "@prisma/client";
import type { LatLng } from "@/server/providers/maps/MapProvider";
import { CensusAcsDemographicsProvider } from "./censusAcsProvider";

export type DemographicMetrics = {
  population?: number;
  households?: number;
  avgHouseholdIncome?: number;
  daytimePopulation?: number;
  medianHousingValue?: number;
  medianAge?: number;
};

export type DemographicsRequest = {
  center?: LatLng;
  zip?: string;
  geographyType: GeographyType;
  /** e.g. { radiusMiles: 3 } or { driveTimeMinutes: 10 } */
  geographyParams: Record<string, unknown>;
};

export type DemographicsFetchResult = {
  metrics: DemographicMetrics;
  /** Stored alongside geographyParams (provider notes, census geography label, etc.) */
  meta?: Record<string, unknown>;
};

/**
 * Provider-agnostic demographics interface. Implementations: Census ACS (default),
 * ESRI, Placer.ai, Buxton, AlphaMap, CoStar (future).
 */
export interface DemographicsProvider {
  readonly name: string;
  fetchMetrics(req: DemographicsRequest): Promise<DemographicsFetchResult>;
}

/** Manual entry path — never called for live fetch in production. */
export class ManualDemographicsProvider implements DemographicsProvider {
  readonly name = "manual";

  async fetchMetrics(): Promise<DemographicsFetchResult> {
    return { metrics: {} };
  }
}

export function getDemographicsProvider(): DemographicsProvider {
  const provider = process.env.DEMOGRAPHICS_PROVIDER ?? "census-acs";
  if (provider === "manual") {
    return new ManualDemographicsProvider();
  }
  return new CensusAcsDemographicsProvider(process.env.CENSUS_API_KEY);
}

export { CensusAcsDemographicsProvider } from "./censusAcsProvider";
