# Maps Engine

Generates print-quality map artifacts from a property's address/coordinates, behind a
provider-agnostic adapter.

## Architecture

```mermaid
flowchart LR
    Addr[Property Address + LatLng] --> Svc[Map Service]
    Svc -->|MapProvider interface| Google[GoogleMapsProvider]
    Svc --> Kinds{Map Kind}
    Kinds --> Aerial[Satellite Aerial]
    Kinds --> Trade[Trade Area Map]
    Kinds --> Radius[Radius Maps - 1/3/5 mile rings]
    Kinds --> Retail[Retail Map - POI categories]
    Aerial & Trade & Radius & Retail --> Compose[Server-side composition -> PNG]
    Compose --> S3[(MapAsset + image Asset)]
    S3 --> Out[Studio / Flyers / OMs / Websites]
```

## MapProvider Interface

```ts
interface MapProvider {
  geocode(address: string): Promise<{ lat: number; lng: number } | null>;
  staticMapUrl(spec: StaticMapSpec): string;     // basemap imagery
  searchPlaces(req: PlaceSearchRequest): Promise<Place[]>;  // POIs by category
}
```

First implementation: `GoogleMapsProvider` (Geocoding API, Static Maps API, Places
API). Mapbox/ESRI become alternate implementations later — callers never see the
provider.

## Map Kinds (declarative specs)

Every generated map is a `MapAsset` whose `params` JSON is the complete generation
spec. Regeneration replays the spec; maps are never hand-made one-offs.

| Kind | Spec | Composition |
|---|---|---|
| `SATELLITE_AERIAL` | center, zoom (~18), size | Static satellite imagery + property marker |
| `TRADE_AREA` | center, zoom (~12), style | Wider road-map basemap + property marker |
| `RADIUS` | center, radii `[1, 3, 5]` mi | Basemap + ring overlays (geodesic circle paths encoded into the static map request) + property marker |
| `RETAIL` | center, radiusMeters, categories | Basemap + POI markers from Places search (grocery, fitness, restaurants, retailers, competitors) |

Generation runs as a `Job`: the service builds the request via the provider, fetches
the image server-side, stores it as an `Asset`, and marks the `MapAsset` ready.

## Radius Ring Construction

Rings are generated as geodesic circle polygons (computed point-by-point from the
center using the haversine offset) and encoded as `path` parameters on the Static Maps
request — output is a consistent print-quality image, not a screenshot.

## Retail / POI Mapping

`searchPlaces` queries Places Nearby Search per category within the trade radius.
Results are deduplicated, capped, and rendered as labeled markers. Categories:

- Shopping centers
- Grocery stores
- Fitness centers
- Restaurants
- Retailers
- Competitors (configurable keyword set)

POI results are persisted in `MapAsset.params.resolvedPlaces` so the artifact is
reproducible and the data is reusable (e.g., in flyer "area retail" lists).

## Interactive vs. Generated Maps

- **In-app interactive maps** use the Google Maps JS SDK (property location picker,
  map preview) — same provider key.
- **Marketing artifacts** always go through the static generation pipeline so output
  is deterministic and print-ready.

## Future Support (architected, not implemented)

The `DemographicDataset.geographyType` and `MapAsset.params` schemas already model:

- **Drive-time polygons** (`geographyType: DRIVE_TIME`, polygon path overlays)
- **Retail clustering** (cluster annotations in params)
- **Traffic data overlays** (TrafficCount markers on any map kind)
- **Placer.ai / ESRI layers** (alternate `MapProvider` / data providers)

None of these require schema or interface changes — only new provider implementations
and spec fields.

## Configuration

```
GOOGLE_MAPS_API_KEY=   # server-side only — never expose to the browser
```

### Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services →
   **Library** and enable:
   - **Geocoding API** (property address → lat/lng)
   - **Maps Static API** (print-quality map images)
   - **Places API** (retail POI search on `RETAIL` maps)
2. APIs & Services → **Credentials** → create or edit the API key used by Metro.
3. Under **API restrictions**, allow at minimum Geocoding API, Maps Static API, and
   Places API (or choose "Don't restrict key" while testing).
4. Under **Application restrictions**, server-side calls from Vercel have no browser
   referrer — use IP restrictions for known egress IPs, or "None" during initial setup.
5. Set `GOOGLE_MAPS_API_KEY` in local `.env` and in Vercel project environment
   variables (Production + Preview).

If geocoding fails with `REQUEST_DENIED`, the key is present but the Geocoding API is
not enabled or is blocked by key restrictions.
