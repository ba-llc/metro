/**
 * Tenant discovery provider. Discovers nearby businesses for a property.
 *
 * Architectural rule: discovery providers are the *source of truth for
 * location intelligence only* — place_id, name, address, lat/lng, types,
 * website. They are never the source of truth for logo images. Logos are
 * resolved separately via the LogoResolver chain and stored as our own
 * Assets.
 */

export type LatLng = { lat: number; lng: number };

export type DiscoveredPlace = {
  /** Stable provider place id, e.g. Google Places place_id. */
  placeId: string;
  name: string;
  formattedAddress?: string;
  location?: LatLng;
  /** Provider-specific types/categories, raw. */
  types: string[];
  /** Best-guess single category derived from `types`. */
  primaryType?: string;
  website?: string;
  phoneNumber?: string;
  /** Optional, only when the provider returns it cheaply. */
  rating?: number;
  userRatingCount?: number;
};

export type DiscoverNearbyRequest = {
  center: LatLng;
  radiusMeters: number;
  /** Cap on results. Providers may return fewer. */
  maxResults?: number;
  /** Optional filter for primary types (e.g. ['restaurant','store']). */
  includedTypes?: string[];
};

export type DiscoverTextRequest = {
  query: string;
  /** Optional location bias to weight results near a property. */
  bias?: { center: LatLng; radiusMeters: number };
  maxResults?: number;
};

export interface TenantDiscoveryProvider {
  readonly name: string;
  searchNearby(req: DiscoverNearbyRequest): Promise<DiscoveredPlace[]>;
  searchText(req: DiscoverTextRequest): Promise<DiscoveredPlace[]>;
  /** Get full details (mainly for website + phone) by place id. */
  getPlace(placeId: string): Promise<DiscoveredPlace | null>;
}
