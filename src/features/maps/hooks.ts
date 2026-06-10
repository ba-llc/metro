"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { MapCreateInput } from "./schemas";

export type MapAssetRecord = {
  id: string;
  kind: string;
  status: string;
  imageAssetId: string | null;
  provider: string;
  error: string | null;
  params: { radiusMiles?: number[]; categories?: string[] };
  createdAt: string;
};

export function useMaps(propertyId: string) {
  return useQuery({
    queryKey: ["maps", propertyId],
    queryFn: () => apiFetch<MapAssetRecord[]>(`/api/properties/${propertyId}/maps`),
    // Poll while any map is generating.
    refetchInterval: (query) =>
      query.state.data?.some(
        (m) => m.status === "QUEUED" || m.status === "RENDERING",
      )
        ? 2000
        : false,
  });
}

export function useGenerateMap(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MapCreateInput) =>
      apiFetch<MapAssetRecord>(`/api/properties/${propertyId}/maps`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["maps", propertyId] }),
  });
}

export function useDeleteMap(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) =>
      apiFetch(`/api/maps/${mapId}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["maps", propertyId] }),
  });
}
