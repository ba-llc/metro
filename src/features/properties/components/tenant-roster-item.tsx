"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { assetUrl, uploadAsset } from "@/lib/api";
import { cn, formatSF } from "@/lib/utils";
import {
  useRejectTenantLogo,
  useResolveTenantLogo,
  useSetManualTenantLogo,
} from "../hooks";
import type { TenantRecord } from "../types";

type LogoDisplayStatus = "approved" | "manual" | "preview" | "none";

function faviconPreviewUrl(website?: string | null) {
  if (!website) return null;
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    website,
  )}&sz=64`;
}

function logoDisplayStatus(
  tenant: TenantRecord,
  previewUrl: string | null,
): LogoDisplayStatus {
  if (tenant.logoAssetId) {
    return tenant.logoSource === "MANUAL" ? "manual" : "approved";
  }
  if (previewUrl) return "preview";
  return "none";
}

const statusBadge: Record<
  LogoDisplayStatus,
  { label: string; tone: "green" | "blue" | "amber" | "slate" }
> = {
  approved: { label: "Approved", tone: "green" },
  manual: { label: "Manual", tone: "blue" },
  preview: { label: "Preview", tone: "amber" },
  none: { label: "None", tone: "slate" },
};

function RosterAction({
  children,
  onClick,
  disabled,
  loading,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors",
        "hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {loading ? (
        <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

function metaLine(
  isAnchor: boolean | undefined,
  suiteNumber: string | null | undefined,
  squareFootage: number | null | undefined,
) {
  const parts: string[] = [];
  if (isAnchor) parts.push("Anchor");
  if (suiteNumber) parts.push(`Suite ${suiteNumber}`);
  if (squareFootage) parts.push(formatSF(squareFootage));
  return parts.join(" · ");
}

export function TenantRosterItem({
  tenant,
  isAnchor,
  suiteNumber,
  squareFootage,
  onRemove,
  removing,
}: {
  tenant: TenantRecord;
  isAnchor?: boolean;
  suiteNumber?: string | null;
  squareFootage?: number | null;
  onRemove: () => void;
  removing?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const resolve = useResolveTenantLogo();
  const reject = useRejectTenantLogo();
  const setManual = useSetManualTenantLogo();

  const isBusy =
    resolve.isPending || reject.isPending || setManual.isPending || removing;

  const previewUrl =
    !tenant.logoAssetId && tenant.logoStatus !== "REJECTED" && !previewFailed
      ? faviconPreviewUrl(tenant.website)
      : null;

  const displayStatus = logoDisplayStatus(tenant, previewUrl);
  const badge = statusBadge[displayStatus];
  const meta = metaLine(isAnchor, suiteNumber, squareFootage);
  const hasSavedLogo = Boolean(tenant.logoAssetId);
  const hasPreview = Boolean(previewUrl);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const asset = await uploadAsset({
      file,
      filename: file.name,
      folder: `tenants/${tenant.id}/logos`,
    });
    await setManual.mutateAsync({ tenantId: tenant.id, assetId: asset.id });
  }

  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "size-10 shrink-0 overflow-hidden rounded-md border bg-white",
            hasPreview && !hasSavedLogo
              ? "border-amber-200/80 ring-1 ring-amber-100"
              : "border-slate-200",
          )}
        >
          {hasSavedLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(tenant.logoAssetId!)}
              alt={`${tenant.name} logo`}
              className="size-full object-contain p-0.5"
            />
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-full object-contain p-1 opacity-90"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-slate-50 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
              —
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <h4 className="truncate text-sm font-medium leading-5 text-slate-900">
              {tenant.name}
            </h4>
            <Badge tone={badge.tone} className="shrink-0 px-1.5 py-0 text-[10px]">
              {badge.label}
            </Badge>
          </div>

          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            {meta ? (
              <span className="text-[11px] leading-4 text-slate-500">{meta}</span>
            ) : null}
            {meta ? (
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                ·
              </span>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {hasSavedLogo ? (
                <>
                  <RosterAction
                    disabled={isBusy}
                    loading={setManual.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3" />
                    Replace logo
                  </RosterAction>
                  <RosterAction
                    disabled={isBusy}
                    loading={reject.isPending}
                    onClick={() => reject.mutate(tenant.id)}
                  >
                    <X className="size-3" />
                    Clear
                  </RosterAction>
                </>
              ) : hasPreview ? (
                <>
                  <RosterAction
                    disabled={isBusy}
                    loading={resolve.isPending}
                    onClick={() => resolve.mutate(tenant.id)}
                  >
                    <Search className="size-3" />
                    Use logo
                  </RosterAction>
                  <RosterAction
                    disabled={isBusy}
                    loading={setManual.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3" />
                    Upload logo
                  </RosterAction>
                </>
              ) : (
                <>
                  <RosterAction
                    disabled={isBusy}
                    loading={resolve.isPending}
                    onClick={() => resolve.mutate(tenant.id)}
                  >
                    <Search className="size-3" />
                    Find logo
                  </RosterAction>
                  <RosterAction
                    disabled={isBusy}
                    loading={setManual.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3" />
                    Upload logo
                  </RosterAction>
                </>
              )}
            </div>
          </div>

          {resolve.data && !resolve.data.logoAssetId ? (
            <p className="mt-1 text-[11px] leading-4 text-amber-700">
              No logo found automatically — upload manually or try again.
            </p>
          ) : null}
          {resolve.error ? (
            <p className="mt-1 text-[11px] leading-4 text-red-600">
              {resolve.error.message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={onRemove}
          aria-label={`Remove ${tenant.name} from tenant roster`}
          className={cn(
            "mt-0.5 shrink-0 text-[11px] font-medium text-slate-400 transition-colors",
            "hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {removing ? "Removing…" : "Remove"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
    </li>
  );
}
