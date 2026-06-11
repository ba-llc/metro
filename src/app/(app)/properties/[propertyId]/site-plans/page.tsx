"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SitePlanCardGridSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  PropertyTabSection,
  PropertyWorkspaceShell,
} from "@/features/properties/components/property-workspace-shell";
import {
  useDeleteSitePlan,
  useSitePlans,
  useUploadSitePlan,
} from "@/features/site-plan-studio/hooks";

export default function SitePlansPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const { data: sitePlans, isLoading } = useSitePlans(propertyId);
  const upload = useUploadSitePlan(propertyId);
  const deletePlan = useDeleteSitePlan(propertyId);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    upload.mutate(
      {
        file,
        title: file.name.replace(/\.pdf$/i, ""),
        onProgress: setProgress,
      },
      {
        onSettled: () => {
          setProgress(null);
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  }

  return (
    <PropertyWorkspaceShell propertyId={propertyId}>
      <PropertyTabSection
        title="Site Plans"
        subtitle="Property document library — store originals here and open Site Plan Studio to annotate."
        actions={
          <Button
            loading={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            Upload PDF
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => void onFile(e.target.files)}
      />

      {progress ? (
        <p className="mb-4 text-sm font-medium text-brand-700">{progress}</p>
      ) : null}
      {upload.error ? (
        <p className="mb-4 text-sm text-red-600">{upload.error.message}</p>
      ) : null}

      {isLoading ? (
        <SitePlanCardGridSkeleton count={3} />
      ) : !sitePlans || sitePlans.length === 0 ? (
        <EmptyState
          title="No site plans yet"
          description="Upload engineering site plan PDFs to the property library. When a plan is ready, open it in Site Plan Studio to annotate spaces."
          action={
            <Button
              loading={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              Upload PDF
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sitePlans.map((plan) => (
            <Card key={plan.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Site plan
                  </p>
                  <StatusBadge status={plan.status} />
                </div>
                <h3 className="mt-2 wrap-break-word text-lg font-semibold leading-6 text-slate-950">
                  {plan.title}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                  <span>
                    {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>Uploaded {formatDate(plan.createdAt)}</span>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                  {plan.status === "READY" ? (
                    <Link href={`/properties/${propertyId}/studio/${plan.id}`}>
                      <Button size="sm" variant="secondary">
                        Edit in Studio
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      title="Site Plan Studio is available once processing completes."
                    >
                      Edit in Studio
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => {
                      if (confirm("Delete this site plan and its annotations?")) {
                        deletePlan.mutate(plan.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PropertyWorkspaceShell>
  );
}
