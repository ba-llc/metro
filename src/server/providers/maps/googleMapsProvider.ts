import type {
  LatLng,
  MapProvider,
  Place,
  PlaceSearchRequest,
  StaticMapSpec,
} from "./MapProvider";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const STATIC_URL = "https://maps.googleapis.com/maps/api/staticmap";
const PLACES_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

type GoogleApiStatus = {
  status: string;
  error_message?: string;
};

/** User-facing guidance for common Google Maps Platform failures. */
function googleMapsError(
  operation: string,
  { status, error_message }: GoogleApiStatus,
): Error {
  if (status === "REQUEST_DENIED") {
    return new Error(
      "Google Maps API request denied. Enable Geocoding API, Maps Static API, and Places API on the Google Cloud project, then confirm the API key restrictions include those APIs.",
    );
  }
  if (status === "OVER_QUERY_LIMIT") {
    return new Error(
      "Google Maps API quota exceeded. Check billing and usage limits in Google Cloud Console.",
    );
  }
  const detail = error_message ? ` ${error_message}` : "";
  return new Error(`${operation} failed (${status}).${detail}`);
}

export class GoogleMapsProvider implements MapProvider {
  readonly name = "google";

  private get apiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (!key) {
      throw new Error(
        "GOOGLE_MAPS_API_KEY is not configured. Add it to your environment variables.",
      );
    }
    return key;
  }

  async geocode(address: string): Promise<LatLng | null> {
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding request failed: HTTP ${res.status}`);
    const json = (await res.json()) as GoogleApiStatus & {
      results: { geometry: { location: LatLng } }[];
    };
    if (json.status === "ZERO_RESULTS") return null;
    if (json.status !== "OK") {
      throw googleMapsError("Geocoding", json);
    }
    const location = json.results[0]?.geometry.location;
    return location ?? null;
  }

  staticMapUrl(spec: StaticMapSpec): string {
    const params = new URLSearchParams({
      center: `${spec.center.lat},${spec.center.lng}`,
      zoom: String(spec.zoom),
      size: `${spec.width}x${spec.height}`,
      maptype: spec.mapType,
      scale: String(spec.scale ?? 2),
      key: this.apiKey,
    });

    for (const m of spec.markers ?? []) {
      const parts = [
        m.color ? `color:${m.color}` : null,
        m.label ? `label:${m.label}` : null,
        m.size ? `size:${m.size}` : null,
        `${m.position.lat},${m.position.lng}`,
      ].filter(Boolean);
      params.append("markers", parts.join("|"));
    }

    for (const p of spec.paths ?? []) {
      const parts = [
        p.strokeColor ? `color:${p.strokeColor}` : null,
        p.strokeWeight ? `weight:${p.strokeWeight}` : null,
        p.fillColor ? `fillcolor:${p.fillColor}` : null,
        ...p.points.map((pt) => `${pt.lat.toFixed(5)},${pt.lng.toFixed(5)}`),
      ].filter(Boolean);
      params.append("path", parts.join("|"));
    }

    return `${STATIC_URL}?${params.toString()}`;
  }

  async searchPlaces(req: PlaceSearchRequest): Promise<Place[]> {
    const params = new URLSearchParams({
      location: `${req.center.lat},${req.center.lng}`,
      radius: String(req.radiusMeters),
      key: this.apiKey,
    });
    if (req.type) params.set("type", req.type);
    if (req.keyword) params.set("keyword", req.keyword);

    const res = await fetch(`${PLACES_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Places search failed: ${res.status}`);
    const json = (await res.json()) as {
      status: string;
      results: {
        name: string;
        geometry: { location: LatLng };
        vicinity?: string;
      }[];
    };
    if (json.status === "ZERO_RESULTS") return [];
    if (json.status !== "OK") {
      throw googleMapsError("Places search", json);
    }
    return json.results.slice(0, req.maxResults ?? 15).map((r) => ({
      name: r.name,
      position: r.geometry.location,
      category: req.type ?? req.keyword ?? "place",
      address: r.vicinity,
    }));
  }
}
