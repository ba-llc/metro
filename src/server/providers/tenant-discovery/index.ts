import { GooglePlacesProvider } from "./googlePlacesProvider";
import type { TenantDiscoveryProvider } from "./TenantDiscoveryProvider";

let instance: TenantDiscoveryProvider | null = null;

export function getTenantDiscoveryProvider(): TenantDiscoveryProvider {
  if (!instance) instance = new GooglePlacesProvider();
  return instance;
}

export * from "./TenantDiscoveryProvider";
