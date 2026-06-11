import { redirect } from "next/navigation";

/** Legacy studio URL — editor now lives under /studio/[sitePlanId]. */
export default async function LegacySitePlanStudioRedirect({
  params,
}: {
  params: Promise<{ propertyId: string; sitePlanId: string }>;
}) {
  const { propertyId, sitePlanId } = await params;
  redirect(`/properties/${propertyId}/studio/${sitePlanId}`);
}
