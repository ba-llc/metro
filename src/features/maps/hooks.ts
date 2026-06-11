"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { MapCreateInput, MapParams } from "./schemas";

export type MapAssetRecord = {
  id: string;
  kind: string;
  status: string;
  imageAssetId: string | null;
  provider: string;
  error: string | null;
  params: MapParams & { center?: unknown; resolvedPlaces?: unknown };
  createdAt: string;
};

export function useMaps(propertyId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["maps", propertyId],
    queryFn: () => apiFetch<MapAssetRecord[]>(`/api/properties/${propertyId}/maps`),
    enabled: options?.enabled ?? true,
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

export function useRegenerateMap(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, input }: { mapId: string; input: MapCreateInput }) =>
      apiFetch<MapAssetRecord>(`/api/maps/${mapId}`, {
        method: "PATCH",
        json: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["maps", propertyId] }),
  });
}

/** Fetches a server-rendered preview PNG (not the JSON envelope). */
export async function fetchMapPreviewBlob(
  propertyId: string,
  input: MapCreateInput,
  signal?: AbortSignal,
): Promise<Blob> {
  const cacheBust = encodeURIComponent(JSON.stringify(input));
  const res = await fetch(`/api/properties/${propertyId}/maps/preview?v=${cacheBust}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message ?? `Preview failed (${res.status})`);
  }

  return res.blob();
}

export function useDeleteMap(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) =>
      apiFetch(`/api/maps/${mapId}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["maps", propertyId] }),
  });
}
