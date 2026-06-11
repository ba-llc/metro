"use client";

import { useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assetUrl, uploadAsset } from "@/lib/api";
import {
  useApproveTenantLogo,
  useRejectTenantLogo,
  useResolveTenantLogo,
  useSetManualTenantLogo,
} from "../hooks";
import type { TenantLogoStatus, TenantRecord } from "../types";

const statusTone: Record<TenantLogoStatus, "slate" | "green" | "amber" | "red"> = {
  NONE: "slate",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const statusLabel: Record<TenantLogoStatus, string> = {
  NONE: "No logo",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function faviconPreviewUrl(website?: string | null) {
  if (!website) return null;
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    website,
  )}&sz=64`;
}

export function TenantLogoCell({
  tenant,
  meta,
}: {
  tenant: TenantRecord;
  meta?: ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const resolve = useResolveTenantLogo();
  const approve = useApproveTenantLogo();
  const reject = useRejectTenantLogo();
  const setManual = useSetManualTenantLogo();

  const isBusy =
    resolve.isPending ||
    approve.isPending ||
    reject.isPending ||
    setManual.isPending;

  const previewUrl =
    !tenant.logoAssetId && tenant.logoStatus !== "REJECTED" && !previewFailed
      ? faviconPreviewUrl(tenant.website)
      : null;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    const asset = await uploadAsset({
      file,
      filename: file.name,
      folder: `tenants/${tenant.id}/logos`,
    });
    await setManual.mutateAsync({ tenantId: tenant.id, assetId: asset.id });
  }

  return (
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {tenant.logoAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(tenant.logoAssetId)}
            alt={`${tenant.name} logo`}
            className="size-full object-contain p-1"
          />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="size-full object-contain p-2"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-slate-50 px-2 text-center text-[10px] uppercase tracking-wider text-slate-400">
            No&nbsp;logo
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 text-base font-semibold leading-6 text-slate-950">
              {tenant.name}
            </h4>
            {meta}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge tone={statusTone[tenant.logoStatus]} className="whitespace-nowrap">
              {statusLabel[tenant.logoStatus]}
            </Badge>
            {tenant.logoSource ? (
              <span className="whitespace-nowrap">
                Source: {tenant.logoSource.toLowerCase()}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {!tenant.logoAssetId || tenant.logoStatus === "REJECTED" ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2.5"
                loading={resolve.isPending}
                disabled={isBusy}
                onClick={() => resolve.mutate(tenant.id)}
              >
                Auto-find
              </Button>
            ) : null}
            {tenant.logoStatus === "PENDING" ? (
              <Button
                size="sm"
                className="h-7 px-2.5"
                loading={approve.isPending}
                disabled={isBusy}
                onClick={() => approve.mutate(tenant.id)}
              >
                Approve
              </Button>
            ) : null}
            {tenant.logoAssetId && tenant.logoStatus !== "REJECTED" ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-red-600 hover:bg-red-50"
                loading={reject.isPending}
                disabled={isBusy}
                onClick={() => reject.mutate(tenant.id)}
              >
                Reject
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5"
              disabled={isBusy}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
        {resolve.data && !resolve.data.logoAssetId ? (
          <p className="mt-1 text-xs text-amber-700">
            No logo found. Upload one manually or try again later.
          </p>
        ) : null}
        {resolve.error ? (
          <p className="mt-1 text-xs text-red-600">{resolve.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
