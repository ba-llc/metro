import type { GeographyType } from "@prisma/client";
import type { LatLng } from "@/server/providers/maps/MapProvider";
import type {
  DemographicMetrics,
  DemographicsProvider,
  DemographicsRequest,
  DemographicsFetchResult,
} from "./DemographicsProvider";

const ACS_YEAR = 2022;
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

function metricsFromAcsRow(headers: string[], row: string[]): DemographicMetrics {
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
