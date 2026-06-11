import type {
  DiscoverNearbyRequest,
  DiscoverTextRequest,
  DiscoveredPlace,
  TenantDiscoveryProvider,
} from "./TenantDiscoveryProvider";

const PLACES_V1 = "https://places.googleapis.com/v1";

/**
 * Subset of the Places API (New) v1 response we care about. We keep this
 * tight and request only these fields via X-Goog-FieldMask to control cost.
 */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
].join(",");

const PLACE_DETAIL_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "types",
  "primaryType",
  "websiteUri",
  "internationalPhoneNumber",
  "rating",
  "userRatingCount",
].join(",");

type PlaceV1 = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
};

function normalize(p: PlaceV1): DiscoveredPlace {
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Unknown",
    formattedAddress: p.formattedAddress,
    addressComponents: p.addressComponents?.map((component) => ({
      longText: component.longText ?? "",
      shortText: component.shortText ?? "",
      types: component.types ?? [],
    })),
    location: p.location
      ? { lat: p.location.latitude, lng: p.location.longitude }
      : undefined,
    types: p.types ?? [],
    primaryType: p.primaryType,
    website: p.websiteUri,
    phoneNumber: p.internationalPhoneNumber,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
  };
}

/** Map providers we serve from these endpoints differ from Geocoding. Keep
 *  a separate API key var so users can scope a Places-only key if desired,
 *  but fall back to the shared GOOGLE_MAPS_API_KEY. */
function apiKey(): string {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Google Places API key is not configured. Set GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY, and enable 'Places API (New)' on the Google Cloud project.",
    );
  }
  return key;
}

async function placesRequest<T>(
  path: string,
  body: unknown,
  fieldMask: string,
): Promise<T> {
  const res = await fetch(`${PLACES_V1}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new Error(
        `Google Places (New) returned 403. Enable "Places API (New)" on the Google Cloud project, and confirm the API key restrictions allow it. ${detail}`,
      );
    }
    throw new Error(
      `Google Places (New) request failed (${res.status}): ${detail || res.statusText}`,
    );
  }
  return (await res.json()) as T;
}

export class GooglePlacesProvider implements TenantDiscoveryProvider {
  readonly name = "google-places-v1";

  async searchNearby(req: DiscoverNearbyRequest): Promise<DiscoveredPlace[]> {
    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: { latitude: req.center.lat, longitude: req.center.lng },
          radius: Math.min(req.radiusMeters, 50000), // API caps at 50km
        },
      },
      maxResultCount: Math.min(req.maxResults ?? 20, 20), // API max is 20
      rankPreference: "DISTANCE",
    };
    if (req.includedTypes?.length) {
      body.includedTypes = req.includedTypes;
    }
    const json = await placesRequest<{ places?: PlaceV1[] }>(
      "/places:searchNearby",
      body,
      FIELD_MASK,
    );
    return (json.places ?? []).map(normalize);
  }

  async searchText(req: DiscoverTextRequest): Promise<DiscoveredPlace[]> {
    const body: Record<string, unknown> = {
      textQuery: req.query,
      maxResultCount: Math.min(req.maxResults ?? 10, 20),
    };
    if (req.bias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: req.bias.center.lat,
            longitude: req.bias.center.lng,
          },
          radius: Math.min(req.bias.radiusMeters, 50000),
        },
      };
    }
    const json = await placesRequest<{ places?: PlaceV1[] }>(
      "/places:searchText",
      body,
      FIELD_MASK,
    );
    return (json.places ?? []).map(normalize);
  }

  async getPlace(placeId: string): Promise<DiscoveredPlace | null> {
    const res = await fetch(`${PLACES_V1}/places/${encodeURIComponent(placeId)}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": PLACE_DETAIL_MASK,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Google Places (New) details failed (${res.status}): ${detail || res.statusText}`,
      );
    }
    const json = (await res.json()) as PlaceV1;
    return normalize(json);
  }
}
