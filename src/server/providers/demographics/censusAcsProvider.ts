import type { GeographyType } from "@prisma/client";
import type { LatLng } from "@/server/providers/maps/MapProvider";
import type {
  DemographicMetrics,
  DemographicsProvider,
  DemographicsRequest,
  DemographicsFetchResult,
} from "./DemographicsProvider";

const ACS_YEAR = 2022;
const TIGERWEB_TRACTS_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/6/query";
const METERS_PER_MILE = 1609.34;
const EARTH_RADIUS_MI = 3958.8;
const ACS_VARS = [
  "B01003_001E",
  "B11001_001E",
  "B19013_001E",
  "B19025_001E",
  "B25077_001E",
  "B01002_001E",
].join(",");

type CensusGeography =
  | { level: "zcta"; zcta: string; label: string }
  | { level: "tract"; state: string; county: string; tract: string; label: string }
  | { level: "place"; state: string; place: string; label: string }
  | { level: "county"; state: string; county: string; label: string };

type GeographiesResponse = {
  result?: {
    geographies?: GeographiesResult;
  };
};

type GeographiesResult = {
  "Census Tracts"?: Array<{ STATE: string; COUNTY: string; TRACT: string; NAME: string }>;
  Counties?: Array<{ STATE: string; COUNTY: string; NAME: string }>;
  "Incorporated Places"?: Array<{ STATE: string; PLACE: string; NAME: string }>;
};

type TigerwebTractFeature = {
  attributes: {
    GEOID: string;
    STATE: string;
    COUNTY: string;
    TRACT: string;
    NAME: string;
    BASENAME?: string;
    INTPTLAT?: string;
    INTPTLON?: string;
    CENTLAT?: string;
    CENTLON?: string;
  };
};

type TigerwebTractsResponse = {
  error?: { message?: string; details?: string[] };
  features?: TigerwebTractFeature[];
};

type AcsMetricsWithRaw = DemographicMetrics & {
  aggregateHouseholdIncome?: number;
};

function normalizeTract(tract: string): string {
  return tract.replace(".", "").padStart(6, "0");
}

function parseMetric(value: string | null | undefined): number | undefined {
  if (value == null || value === "" || value === "-666666666" || value === "-") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function metricsFromAcsRow(headers: string[], row: string[]): AcsMetricsWithRaw {
  const idx = (name: string) => headers.indexOf(name);
  const get = (name: string) => parseMetric(row[idx(name)]);

  const households = get("B11001_001E");
  const aggregateIncome = get("B19025_001E");
  const medianIncome = get("B19013_001E");

  let avgHouseholdIncome: number | undefined;
  if (aggregateIncome != null && households != null && households > 0) {
    avgHouseholdIncome = Math.round(aggregateIncome / households);
  } else if (medianIncome != null) {
    avgHouseholdIncome = medianIncome;
  }

  return {
    population: get("B01003_001E"),
    households,
    avgHouseholdIncome,
    aggregateHouseholdIncome: aggregateIncome,
    medianHousingValue: get("B25077_001E"),
    medianAge: get("B01002_001E"),
  };
}

async function censusAcsFetch(url: string): Promise<{ headers: string[]; row: string[] }> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Census ACS request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as string[][];
  if (!Array.isArray(data) || data.length < 2 || !data[0] || !data[1]) {
    throw new Error("Census ACS returned no data for this geography");
  }
  return { headers: data[0], row: data[1] };
}

async function censusAcsFetchRows(url: string): Promise<{ headers: string[]; rows: string[][] }> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Census ACS request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as string[][];
  if (!Array.isArray(data) || data.length < 2 || !data[0]) {
    throw new Error("Census ACS returned no data for this geography");
  }
  return { headers: data[0], rows: data.slice(1) };
}

function censusUrl(path: string, apiKey?: string): string {
  const base = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,${ACS_VARS}&${path}`;
  return apiKey ? `${base}&key=${apiKey}` : base;
}

async function resolveGeographies(center: LatLng): Promise<NonNullable<GeographiesResult>> {
  const url = new URL(
    "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
  );
  url.searchParams.set("x", String(center.lng));
  url.searchParams.set("y", String(center.lat));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census geocoder failed (${res.status})`);
  }
  const payload = (await res.json()) as GeographiesResponse;
  const geographies = payload.result?.geographies;
  if (!geographies) {
    throw new Error("Census geocoder returned no geographies");
  }
  return geographies;
}

function geographyForRadius(
  geographies: NonNullable<GeographiesResult>,
  radiusMiles: number,
  zip?: string,
): CensusGeography {
  if (radiusMiles <= 1) {
    const tract = geographies["Census Tracts"]?.[0];
    if (tract) {
      return {
        level: "tract",
        state: tract.STATE,
        county: tract.COUNTY,
        tract: normalizeTract(tract.TRACT),
        label: tract.NAME,
      };
    }
  }

  if (radiusMiles <= 3) {
    const place = geographies["Incorporated Places"]?.[0];
    if (place) {
      return {
        level: "place",
        state: place.STATE,
        place: place.PLACE,
        label: place.NAME,
      };
    }
  }

  const county = geographies.Counties?.[0];
  if (county) {
    return {
      level: "county",
      state: county.STATE,
      county: county.COUNTY,
      label: county.NAME,
    };
  }

  if (zip) {
    return {
      level: "zcta",
      zcta: zip.slice(0, 5),
      label: `ZIP ${zip.slice(0, 5)}`,
    };
  }

  throw new Error("Could not resolve Census geography for this location");
}

function geographyPath(geo: CensusGeography): string {
  switch (geo.level) {
    case "zcta":
      return `for=zip%20code%20tabulation%20area:${geo.zcta}`;
    case "tract":
      return `for=tract:${geo.tract}&in=state:${geo.state}+county:${geo.county}`;
    case "place":
      return `for=place:${geo.place}&in=state:${geo.state}`;
    case "county":
      return `for=county:${geo.county}&in=state:${geo.state}`;
  }
}

function tractCountyPath(state: string, county: string, apiKey?: string): string {
  const base = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,${ACS_VARS}&for=tract:*&in=state:${state}+county:${county}`;
  return apiKey ? `${base}&key=${apiKey}` : base;
}

function distanceMiles(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

function tractPoint(feature: TigerwebTractFeature): LatLng | null {
  const attrs = feature.attributes;
  const lat = Number.parseFloat(attrs.INTPTLAT ?? attrs.CENTLAT ?? "");
  const lng = Number.parseFloat(attrs.INTPTLON ?? attrs.CENTLON ?? "");
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function tractsWithinRadius(
  center: LatLng,
  radiusMiles: number,
): Promise<TigerwebTractFeature[]> {
  const url = new URL(TIGERWEB_TRACTS_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", `${center.lng},${center.lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("distance", String(Math.ceil(radiusMiles * METERS_PER_MILE)));
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set(
    "outFields",
    "GEOID,STATE,COUNTY,TRACT,NAME,BASENAME,CENTLAT,CENTLON,INTPTLAT,INTPTLON",
  );
  url.searchParams.set("returnGeometry", "false");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census TIGERweb tract query failed (${res.status})`);
  const payload = (await res.json()) as TigerwebTractsResponse;
  if (payload.error) {
    throw new Error(
      `Census TIGERweb tract query failed: ${payload.error.message ?? "Unknown error"}`,
    );
  }

  const features = payload.features ?? [];
  const centroidMatches = features.filter((feature) => {
    const point = tractPoint(feature);
    return point ? distanceMiles(center, point) <= radiusMiles : false;
  });

  return centroidMatches.length ? centroidMatches : features;
}

function weightedAverage(
  rows: AcsMetricsWithRaw[],
  valueKey: keyof DemographicMetrics,
  weightKey: keyof DemographicMetrics,
): number | undefined {
  let weightedTotal = 0;
  let weightTotal = 0;
  for (const row of rows) {
    const value = row[valueKey];
    const weight = row[weightKey];
    if (typeof value !== "number" || typeof weight !== "number" || weight <= 0) {
      continue;
    }
    weightedTotal += value * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? Math.round((weightedTotal / weightTotal) * 10) / 10 : undefined;
}

function aggregateTractMetrics(rows: AcsMetricsWithRaw[]): DemographicMetrics {
  const population = rows.reduce((sum, row) => sum + (row.population ?? 0), 0);
  const households = rows.reduce((sum, row) => sum + (row.households ?? 0), 0);
  const aggregateHouseholdIncome = rows.reduce(
    (sum, row) => sum + (row.aggregateHouseholdIncome ?? 0),
    0,
  );

  return {
    population: population || undefined,
    households: households || undefined,
    avgHouseholdIncome:
      households > 0 && aggregateHouseholdIncome > 0
        ? Math.round(aggregateHouseholdIncome / households)
        : weightedAverage(rows, "avgHouseholdIncome", "households"),
    daytimePopulation: undefined,
    medianHousingValue: weightedAverage(rows, "medianHousingValue", "households"),
    medianAge: weightedAverage(rows, "medianAge", "population"),
  };
}

async function fetchRadiusTractMetrics(
  center: LatLng,
  radiusMiles: number,
  apiKey: string,
): Promise<DemographicsFetchResult> {
  const tracts = await tractsWithinRadius(center, radiusMiles);
  if (tracts.length === 0) {
    throw new Error(`No ACS census tracts found within ${radiusMiles} miles`);
  }

  const tractsByCounty = new Map<string, TigerwebTractFeature[]>();
  for (const tract of tracts) {
    const key = `${tract.attributes.STATE}:${tract.attributes.COUNTY}`;
    tractsByCounty.set(key, [...(tractsByCounty.get(key) ?? []), tract]);
  }

  const rows: AcsMetricsWithRaw[] = [];
  for (const countyTracts of tractsByCounty.values()) {
    const first = countyTracts[0]?.attributes;
    if (!first) continue;
    const wanted = new Set(countyTracts.map((tract) => tract.attributes.TRACT));
    const { headers, rows: countyRows } = await censusAcsFetchRows(
      tractCountyPath(first.STATE, first.COUNTY, apiKey),
    );
    const tractIndex = headers.indexOf("tract");
    if (tractIndex < 0) continue;
    for (const row of countyRows) {
      const tract = row[tractIndex];
      if (tract && wanted.has(tract)) {
        rows.push(metricsFromAcsRow(headers, row));
      }
    }
  }

  if (rows.length === 0) {
    throw new Error(`No ACS data found for tracts within ${radiusMiles} miles`);
  }

  return {
    metrics: aggregateTractMetrics(rows),
    meta: {
      censusLevel: "tract-radius",
      censusLabel: `${rows.length} Census tracts within ${radiusMiles} mi`,
      acsVintage: ACS_YEAR,
      tractCount: rows.length,
    },
  };
}

/** US Census ACS 5-year estimates (2022 vintage). */
export class CensusAcsDemographicsProvider implements DemographicsProvider {
  readonly name = "census-acs";

  constructor(private readonly apiKey?: string) {}

  async fetchMetrics(req: DemographicsRequest): Promise<DemographicsFetchResult> {
    if (!this.apiKey) {
      throw new Error(
        "CENSUS_API_KEY is required. Get a free key at https://api.census.gov/data/key_signup.html",
      );
    }

    const radiusMiles = Number(req.geographyParams.radiusMiles ?? 3);
    let geo: CensusGeography;

    if (req.center && req.geographyType === "RADIUS") {
      return fetchRadiusTractMetrics(req.center, radiusMiles, this.apiKey);
    }

    if (req.center) {
      const geographies = await resolveGeographies(req.center);
      geo = geographyForRadius(geographies, radiusMiles, req.zip);
    } else if (req.zip) {
      geo = {
        level: "zcta",
        zcta: req.zip.slice(0, 5),
        label: `ZIP ${req.zip.slice(0, 5)}`,
      };
    } else {
      throw new Error("Demographics fetch requires geocoded coordinates or a zip code");
    }

    const { headers, row } = await censusAcsFetch(
      censusUrl(geographyPath(geo), this.apiKey),
    );

    const metrics = metricsFromAcsRow(headers, row);
    if (metrics.population == null && metrics.households == null) {
      throw new Error(`No ACS data for ${geo.label}`);
    }

    return {
      metrics,
      meta: {
        censusLevel: geo.level,
        censusLabel: geo.label,
        acsVintage: ACS_YEAR,
      },
    };
  }
}
