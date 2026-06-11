"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/empty-state";

const Studio = dynamic(
  () =>
    import("@/features/site-plan-studio/components/studio").then(
      (m) => m.Studio,
    ),
  { ssr: false, loading: () => <Spinner label="Loading studio..." /> },
);

export default function PropertyStudioPage({
  params,
}: {
  params: Promise<{ propertyId: string; sitePlanId: string }>;
}) {
  const { propertyId, sitePlanId } = use(params);
  return <Studio propertyId={propertyId} sitePlanId={sitePlanId} />;
}
