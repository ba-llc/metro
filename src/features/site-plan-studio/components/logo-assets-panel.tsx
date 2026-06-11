"use client";

import { Image, MousePointer2 } from "lucide-react";
import { assetUrl } from "@/lib/api";
import type { OccupancyRecord } from "@/features/properties/types";
import { StudioPanel } from "./studio-shell";

export type LogoAssetOption = {
  id: string;
  tenantName: string;
  suiteNumber: string | null;
  assetId: string | null;
  logoStatus: string;
};

export function logoOptionsFromOccupancies(
  occupancies: OccupancyRecord[],
): LogoAssetOption[] {
  return occupancies
    .map((occupancy) => ({
      id: occupancy.id,
      tenantName: occupancy.tenant.name,
      suiteNumber: occupancy.suiteNumber,
      assetId: occupancy.tenant.logoAssetId,
      logoStatus: occupancy.tenant.logoStatus,
    }));
}

export function LogoAssetsPanel({
  logos,
  onPlaceLogo,
}: {
  logos: LogoAssetOption[];
  onPlaceLogo: (assetId: string) => void;
}) {
  const readyCount = logos.filter((logo) => logo.assetId).length;

  return (
    <StudioPanel
      title="Tenant Logos"
      description="Click a logo to place it on the plan, or drag for precise placement."
    >
      {logos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          This property does not have Tenant Roster rows yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logos.map((logo) => (
            <button
              key={logo.id}
              type="button"
              draggable={Boolean(logo.assetId)}
              disabled={!logo.assetId}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-75"
              title={
                logo.assetId
                  ? `Click or drag ${logo.tenantName} onto the canvas`
                  : `${logo.tenantName} has no usable logo yet`
              }
              onClick={() => {
                if (logo.assetId) onPlaceLogo(logo.assetId);
              }}
              onDragStart={(event) => {
                if (!logo.assetId) return;
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("application/x-metro-logo-asset", logo.assetId);
                event.dataTransfer.setData("text/plain", logo.tenantName);
              }}
            >
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {logo.assetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(logo.assetId)}
                    alt=""
                    className="max-h-10 max-w-10 object-contain"
                  />
                ) : (
                  <span className="px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    No logo
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {logo.tenantName}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  {logo.suiteNumber ? <span>Suite {logo.suiteNumber}</span> : null}
                  <span>{logo.assetId ? "Ready" : logo.logoStatus.toLowerCase().replace("_", " ")}</span>
                </span>
              </span>
              {logo.assetId ? (
                <MousePointer2 className="size-4 shrink-0 text-slate-400 transition group-hover:text-brand-700" />
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
          <Image className="size-4" />
          {readyCount}/{logos.length} ready
        </div>
        Missing logos stay visible here so the Studio matches the Tenant Roster.
      </div>
    </StudioPanel>
  );
}
