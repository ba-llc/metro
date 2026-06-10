import type { GeographyType } from "@prisma/client";
import type { LatLng } from "@/server/providers/maps/MapProvider";

export type DemographicMetrics = {
  population?: number;
  households?: number;
  avgHouseholdIncome?: number;
  daytimePopulation?: number;
  medianHousingValue?: number;
  medianAge?: number;
};

export type DemographicsRequest = {
  center: LatLng;
  geographyType: GeographyType;
  /** e.g. { radiusMiles: 3 } or { driveTimeMinutes: 10 } */
  geographyParams: Record<string, unknown>;
};

/**
 * Provider-agnostic demographics interface. Implementations: ESRI, Placer.ai,
 * Buxton, AlphaMap, CoStar (future). Datasets are stored independently per
 * provider so multiple sources can coexist.
 */
export interface DemographicsProvider {
  readonly name: string;
  fetchMetrics(req: DemographicsRequest): Promise<DemographicMetrics>;
}

/**
 * Placeholder provider until a live integration ships. Keeps the full
 * request -> dataset pipeline exercisable; returns no metrics.
 */
export class ManualDemographicsProvider implements DemographicsProvider {
  readonly name = "manual";

  async fetchMetrics(): Promise<DemographicMetrics> {
    return {};
  }
}

export function getDemographicsProvider(): DemographicsProvider {
  return new ManualDemographicsProvider();
}
