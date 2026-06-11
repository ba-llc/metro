"use client";

import { useRef } from "react";
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

export function TenantLogoCell({ tenant }: { tenant: TenantRecord }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const resolve = useResolveTenantLogo();
  const approve = useApproveTenantLogo();
  const reject = useRejectTenantLogo();
  const setManual = useSetManualTenantLogo();

  const isBusy =
    resolve.isPending ||
    approve.isPending ||
    reject.isPending ||
    setManual.isPending;

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
    <div className="flex items-center gap-3">
      <div className="size-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
        {tenant.logoAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(tenant.logoAssetId)}
            alt={`${tenant.name} logo`}
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-slate-400">
            No&nbsp;logo
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Badge tone={statusTone[tenant.logoStatus]}>
          {statusLabel[tenant.logoStatus]}
          {tenant.logoSource ? ` • ${tenant.logoSource.toLowerCase()}` : ""}
        </Badge>
        <div className="mt-1 flex flex-wrap gap-1">
          {!tenant.logoAssetId || tenant.logoStatus === "REJECTED" ? (
            <Button
              size="sm"
              variant="secondary"
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
              className="text-red-600"
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
            disabled={isBusy}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
        {resolve.data && !resolve.data.logoAssetId ? (
          <p className="mt-1 text-xs text-amber-600">
            No logo found. Try Upload to set one manually.
          </p>
        ) : null}
        {resolve.error ? (
          <p className="mt-1 text-xs text-red-600">{resolve.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
