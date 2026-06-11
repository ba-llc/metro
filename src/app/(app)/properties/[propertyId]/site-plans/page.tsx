"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
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
    <div>
      <PageHeader
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
      <PropertyNav propertyId={propertyId} />

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
        <Spinner label="Loading site plans..." />
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
            <Card key={plan.id}>
              <CardContent>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{plan.title}</h3>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {plan.pageCount} page{plan.pageCount === 1 ? "" : "s"} •{" "}
                  {formatDate(plan.createdAt)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/properties/${propertyId}/studio/${plan.id}`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={plan.status !== "READY"}
                    >
                      Edit in Studio
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
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
    </div>
  );
}
