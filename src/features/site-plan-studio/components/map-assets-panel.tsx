"use client";

import { FileImage, Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assetUrl } from "@/lib/api";
import { cn, labelize } from "@/lib/utils";
import type { MapAssetRecord } from "@/features/maps/hooks";
import { formatMapParamsSummary } from "@/features/maps/format-params";
import { StudioPanel } from "./studio-shell";

export function MapAssetsPanel({
  maps,
  importedPageIndexForAsset,
  importingMapId,
  onImportMap,
  onOpenPage,
}: {
  maps: MapAssetRecord[];
  importedPageIndexForAsset: (assetId: string) => number;
  importingMapId: string | null;
  onImportMap: (map: MapAssetRecord) => void;
  onOpenPage: (pageIndex: number) => void;
}) {
  return (
    <StudioPanel
      title="Generated Maps"
      description="Add a generated map as a Studio page, then annotate it like the site plan."
    >
      {maps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No maps have been generated for this property yet.
        </div>
      ) : (
        <div className="space-y-3">
          {maps.map((map) => {
            const ready = map.status === "READY" && Boolean(map.imageAssetId);
            const importedIndex = map.imageAssetId
              ? importedPageIndexForAsset(map.imageAssetId)
              : -1;
            const imported = importedIndex >= 0;
            return (
              <div
                key={map.id}
                className={cn(
                  "rounded-2xl border bg-white p-3 shadow-sm",
                  imported ? "border-brand-200" : "border-slate-200",
                )}
              >
                <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                  <div className="flex h-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {map.imageAssetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assetUrl(map.imageAssetId)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Map className="size-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {labelize(map.kind)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {formatMapParamsSummary(map.kind, map.params)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          imported
                            ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                            : ready
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : map.status === "FAILED"
                                ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                        )}
                      >
                        {imported ? "Page" : labelize(map.status)}
                      </span>
                    </div>
                    {map.error ? (
                      <p className="mt-2 text-xs text-red-600">{map.error}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  {imported ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenPage(importedIndex)}
                    >
                      <FileImage className="size-3.5" />
                      Open page
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!ready}
                      loading={importingMapId === map.id}
                      onClick={() => onImportMap(map)}
                    >
                      <Plus className="size-3.5" />
                      Add as page
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudioPanel>
  );
}
