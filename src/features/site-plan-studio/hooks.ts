"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch, uploadAsset } from "@/lib/api";
import { rasterizePdf } from "./pdf/convert";
import type { PageAnnotations } from "@/types/annotations";
import type { SitePlanDetail, SitePlanListItem, SnapshotListItem } from "./types";

export function useSitePlans(propertyId: string) {
  return useQuery({
    queryKey: ["site-plans", propertyId],
    queryFn: () =>
      apiFetch<SitePlanListItem[]>(`/api/properties/${propertyId}/site-plans`),
  });
}

export function useSitePlanDetail(sitePlanId: string) {
  return useQuery({
    queryKey: ["site-plan", sitePlanId],
    queryFn: () => apiFetch<SitePlanDetail>(`/api/site-plans/${sitePlanId}`),
  });
}

/**
 * Full upload pipeline: store the immutable original PDF, rasterize each page
 * client-side with pdf.js, upload page rasters, and register them.
 */
export function useUploadSitePlan(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      title,
      onProgress,
    }: {
      file: File;
      title: string;
      onProgress?: (message: string) => void;
    }) => {
      onProgress?.("Uploading original PDF...");
      const form = new FormData();
      form.set("file", file);
      form.set("title", title);
      const sitePlan = await apiFetch<{ id: string }>(
        `/api/properties/${propertyId}/site-plans`,
        { method: "POST", body: form },
      );

      onProgress?.("Converting pages...");
      const pages = await rasterizePdf(file, (done, total) =>
        onProgress?.(`Converting page ${done} of ${total}...`),
      );

      for (const page of pages) {
        onProgress?.(`Uploading page ${page.pageNumber} of ${pages.length}...`);
        const asset = await uploadAsset({
          file: page.blob,
          filename: `page-${page.pageNumber}.png`,
          folder: `properties/${propertyId}/site-plans/${sitePlan.id}/pages`,
          width: page.width,
          height: page.height,
        });
        await apiFetch(`/api/site-plans/${sitePlan.id}/pages`, {
          method: "POST",
          json: {
            pageNumber: page.pageNumber,
            assetId: asset.id,
            width: page.width,
            height: page.height,
          },
        });
      }

      return sitePlan;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["site-plans", propertyId] });
      void qc.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });
}

export function useDeleteSitePlan(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sitePlanId: string) =>
      apiFetch(`/api/site-plans/${sitePlanId}`, { method: "DELETE" }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["site-plans", propertyId] }),
  });
}

export function useSaveAnnotations(sitePlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      payload,
    }: {
      pageId: string;
      payload: PageAnnotations;
    }) =>
      apiFetch(`/api/site-plan-pages/${pageId}/annotations`, {
        method: "PUT",
        json: payload,
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["site-plan", sitePlanId] }),
  });
}

export function useSnapshots(sitePlanId: string) {
  return useQuery({
    queryKey: ["snapshots", sitePlanId],
    queryFn: () =>
      apiFetch<SnapshotListItem[]>(`/api/site-plans/${sitePlanId}/snapshots`),
  });
}

export function useCreateSnapshot(sitePlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/site-plans/${sitePlanId}/snapshots`, {
        method: "POST",
        json: { name },
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["snapshots", sitePlanId] }),
  });
}

export function useRestoreSnapshot(sitePlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) =>
      apiFetch(`/api/site-plans/${sitePlanId}/snapshots/${snapshotId}/restore`, {
        method: "POST",
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["site-plan", sitePlanId] }),
  });
}

/** Registers a flattened export as the plan's latest marketing asset. */
export function useRegisterExport(sitePlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) =>
      apiFetch(`/api/site-plans/${sitePlanId}`, {
        method: "PATCH",
        json: { latestExportAssetId: assetId },
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["site-plan", sitePlanId] }),
  });
}
