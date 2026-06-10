import type { MapProvider } from "./MapProvider";
import { GoogleMapsProvider } from "./googleMapsProvider";

let instance: MapProvider | null = null;

export function getMapProvider(): MapProvider {
  if (!instance) instance = new GoogleMapsProvider();
  return instance;
}

export * from "./MapProvider";
