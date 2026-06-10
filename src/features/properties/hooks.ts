"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ContactCreateInput,
  OccupancyCreateInput,
  PhotoCreateInput,
  PropertyCreateInput,
  PropertyUpdateInput,
  SpaceCreateInput,
  SpaceUpdateInput,
} from "./schemas";
import type {
  PropertyDetail,
  PropertyListItem,
  SpaceRecord,
  OccupancyRecord,
  ContactRecord,
  PropertyContactRecord,
  PhotoRecord,
  DemographicRecord,
  ActivityRecord,
} from "./types";

export function usePropertyList(filter: { q?: string; status?: string; propertyType?: string }) {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("status", filter.status);
  if (filter.propertyType) params.set("propertyType", filter.propertyType);
  return useQuery({
    queryKey: ["properties", filter],
    queryFn: () => apiFetch<PropertyListItem[]>(`/api/properties?${params}`),
  });
}

export function usePropertyDetail(propertyId: string) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => apiFetch<PropertyDetail>(`/api/properties/${propertyId}`),
  });
}

function useInvalidateProperty(propertyId?: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["properties"] });
    if (propertyId) {
      void qc.invalidateQueries({ queryKey: ["property", propertyId] });
    }
  };
}

export function useCreateProperty() {
  const invalidate = useInvalidateProperty();
  return useMutation({
    mutationFn: (input: PropertyCreateInput) =>
      apiFetch<PropertyListItem>("/api/properties", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProperty(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (input: PropertyUpdateInput) =>
      apiFetch(`/api/properties/${propertyId}`, { method: "PATCH", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteProperty() {
  const invalidate = useInvalidateProperty();
  return useMutation({
    mutationFn: (propertyId: string) =>
      apiFetch(`/api/properties/${propertyId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useGeocodeProperty(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/properties/${propertyId}/geocode`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

// --- Spaces ---

export function useCreateSpace(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (input: SpaceCreateInput) =>
      apiFetch<SpaceRecord>(`/api/properties/${propertyId}/spaces`, {
        method: "POST",
        json: input,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateSpace(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: ({ spaceId, input }: { spaceId: string; input: SpaceUpdateInput }) =>
      apiFetch<SpaceRecord>(`/api/spaces/${spaceId}`, { method: "PATCH", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteSpace(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (spaceId: string) =>
      apiFetch(`/api/spaces/${spaceId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// --- Tenants / occupancies ---

export function useOccupancies(propertyId: string) {
  return useQuery({
    queryKey: ["occupancies", propertyId],
    queryFn: () =>
      apiFetch<OccupancyRecord[]>(`/api/properties/${propertyId}/tenants`),
  });
}

export function useCreateOccupancy(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OccupancyCreateInput) =>
      apiFetch<OccupancyRecord>(`/api/properties/${propertyId}/tenants`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["occupancies", propertyId] });
      void qc.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}

export function useDeleteOccupancy(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (occupancyId: string) =>
      apiFetch(`/api/occupancies/${occupancyId}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["occupancies", propertyId] });
      void qc.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}

// --- Contacts ---

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiFetch<ContactRecord[]>("/api/contacts"),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactCreateInput) =>
      apiFetch<ContactRecord>("/api/contacts", { method: "POST", json: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useAssignContact(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (contactId: string) =>
      apiFetch<PropertyContactRecord>(`/api/properties/${propertyId}/contacts`, {
        method: "POST",
        json: { contactId },
      }),
    onSuccess: invalidate,
  });
}

export function useUnassignContact(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (contactId: string) =>
      apiFetch(`/api/properties/${propertyId}/contacts/${contactId}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });
}

// --- Photos ---

export function usePhotos(propertyId: string) {
  return useQuery({
    queryKey: ["photos", propertyId],
    queryFn: () => apiFetch<PhotoRecord[]>(`/api/properties/${propertyId}/photos`),
  });
}

export function useCreatePhoto(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PhotoCreateInput) =>
      apiFetch<PhotoRecord>(`/api/properties/${propertyId}/photos`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["photos", propertyId] });
      void qc.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}

export function useDeletePhoto(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      apiFetch(`/api/photos/${photoId}`, { method: "DELETE" }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["photos", propertyId] }),
  });
}

// --- Demographics ---

export function useAutoFetchDemographics(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: () =>
      apiFetch<DemographicRecord[]>(
        `/api/properties/${propertyId}/demographics/auto-fetch`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });
}

export function useAddDemographics(propertyId: string) {
  const invalidate = useInvalidateProperty(propertyId);
  return useMutation({
    mutationFn: (input: {
      geographyType: "RADIUS";
      geographyParams: { radiusMiles: number };
      metrics: Record<string, number | undefined>;
    }) =>
      apiFetch<DemographicRecord>(`/api/properties/${propertyId}/demographics`, {
        method: "POST",
        json: input,
      }),
    onSuccess: invalidate,
  });
}

// --- Activity ---

export function useActivity(propertyId: string) {
  return useQuery({
    queryKey: ["activity", propertyId],
    queryFn: () =>
      apiFetch<ActivityRecord[]>(`/api/properties/${propertyId}/activity`),
  });
}
