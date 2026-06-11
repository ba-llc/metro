"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type TemplateRecord = {
  id: string;
  name: string;
  channel: string;
  isSystem: boolean;
};

export type DocumentShareMeta = {
  id: string;
  channel: string;
  versionNumber: number;
  status: string;
  outputAssetId: string | null;
  error: string | null;
  createdAt: string;
  template: { name: string };
  shareUrl: string | null;
  downloadUrl: string | null;
  isLatest: boolean;
  isLiveChannel: boolean;
  isPublishedWebsite: boolean;
  sitePlanAssetId: string | null;
};

export type ChannelShareGroup = {
  channel: string;
  label: string;
  canonicalShareUrl: string | null;
  latestDocumentId: string | null;
  isLive: boolean;
  versions: DocumentShareMeta[];
};

export type DocumentLibraryResponse = {
  property: { id: string; slug: string; name: string };
  organization: { slug: string; name: string };
  publication: {
    status: "NOT_PUBLISHED" | "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
    publicUrl: string;
    publishedWebsiteDocumentId: string | null;
    publishedAt: string | null;
    unpublishedAt: string | null;
    sitePlanExportAssetId: string | null;
    sitePlanExportedAt: string | null;
  };
  documents: DocumentShareMeta[];
  channels: ChannelShareGroup[];
};

export function useTemplates(channel?: string) {
  return useQuery({
    queryKey: ["templates", channel],
    queryFn: () =>
      apiFetch<TemplateRecord[]>(
        `/api/templates${channel ? `?channel=${channel}` : ""}`,
      ),
  });
}

export function useDocuments(propertyId: string) {
  return useQuery({
    queryKey: ["documents", propertyId],
    queryFn: () =>
      apiFetch<DocumentLibraryResponse>(
        `/api/properties/${propertyId}/documents`,
      ),
    refetchInterval: (query) =>
      query.state.data?.documents.some(
        (d) => d.status === "QUEUED" || d.status === "RENDERING",
      )
        ? 2000
        : false,
  });
}

export function useGenerateDocument(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiFetch<DocumentShareMeta>(`/api/properties/${propertyId}/documents`, {
        method: "POST",
        json: { templateId },
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}

export function useDeleteDocument(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch(`/api/documents/${documentId}`, { method: "DELETE" }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}

export function useRetryDocument(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch<DocumentShareMeta>(`/api/documents/${documentId}/retry`, {
        method: "POST",
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}

export function usePublishWebsite(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch(`/api/documents/${documentId}/publish`, { method: "POST" }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}

export function useUnpublishWebsite(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/properties/${propertyId}/publication`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["documents", propertyId] }),
  });
}
