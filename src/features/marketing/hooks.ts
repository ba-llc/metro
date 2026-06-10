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

export type DocumentRecord = {
  id: string;
  channel: string;
  status: string;
  outputAssetId: string | null;
  error: string | null;
  createdAt: string;
  template: { name: string };
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
      apiFetch<DocumentRecord[]>(`/api/properties/${propertyId}/documents`),
    // Poll while any document is rendering.
    refetchInterval: (query) =>
      query.state.data?.some(
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
      apiFetch<DocumentRecord>(`/api/properties/${propertyId}/documents`, {
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
