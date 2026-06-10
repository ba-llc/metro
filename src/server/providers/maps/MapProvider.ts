export type LatLng = { lat: number; lng: number };

export type StaticMapMarker = {
  position: LatLng;
  color?: string;
  label?: string; // single character A-Z / 0-9
  size?: "tiny" | "small" | "mid";
};

export type StaticMapPath = {
  points: LatLng[];
  strokeColor?: string; // hex with optional alpha, e.g. "0x1d4ed8ff"
  strokeWeight?: number;
  fillColor?: string;
};

export type StaticMapSpec = {
  center: LatLng;
  zoom: number;
  width: number;
  height: number;
  mapType: "roadmap" | "satellite" | "hybrid" | "terrain";
  scale?: 1 | 2;
  markers?: StaticMapMarker[];
  paths?: StaticMapPath[];
};

export type PlaceSearchRequest = {
  center: LatLng;
  radiusMeters: number;
  /** Provider place type, e.g. "grocery_or_supermarket", "restaurant", "gym" */
  type?: string;
  keyword?: string;
  maxResults?: number;
};

export type Place = {
  name: string;
  position: LatLng;
  category: string;
  address?: string;
};

export interface MapProvider {
  readonly name: string;
  geocode(address: string): Promise<LatLng | null>;
  /** Build the static-map image request URL for a declarative spec. */
  staticMapUrl(spec: StaticMapSpec): string;
  searchPlaces(req: PlaceSearchRequest): Promise<Place[]>;
}
