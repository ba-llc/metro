"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SitePlanCardGridSkeleton } from "@/components/ui/skeleton";
import {
  PropertyTabSection,
  PropertyWorkspaceShell,
} from "@/features/properties/components/property-workspace-shell";
import { useSitePlans } from "@/features/site-plan-studio/hooks";

export default function StudioIndexPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const router = useRouter();
  const { data: sitePlans, isLoading } = useSitePlans(propertyId);

  // The list is ordered createdAt desc, so this is the most recent ready plan.
  const readyPlan = sitePlans?.find((plan) => plan.status === "READY");

  useEffect(() => {
    if (readyPlan) {
      router.replace(`/properties/${propertyId}/studio/${readyPlan.id}`);
    }
  }, [readyPlan, propertyId, router]);

  return (
    <PropertyWorkspaceShell propertyId={propertyId}>
      <PropertyTabSection
        title="Studio"
        subtitle="Annotate site plans with spaces, tenant logos, and callouts."
      />
      {isLoading || readyPlan ? (
        <SitePlanCardGridSkeleton count={3} />
      ) : !sitePlans || sitePlans.length === 0 ? (
        <EmptyState
          title="No site plans to edit"
          description="Upload a site plan PDF to the property library first — the Studio opens it for annotation once processing completes."
          action={
            <Link href={`/properties/${propertyId}/site-plans`}>
              <Button>Go to Site Plans</Button>
            </Link>
          }
        />
      ) : (
        <EmptyState
          title="No site plans are ready yet"
          description="The Studio opens a site plan once processing completes. Check status on the Site Plans tab."
          action={
            <Link href={`/properties/${propertyId}/site-plans`}>
              <Button variant="secondary">View Site Plans</Button>
            </Link>
          }
        />
      )}
    </PropertyWorkspaceShell>
  );
}
