import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/api";
import { formatSF, labelize, timeAgo } from "@/lib/utils";

/** Structural subset of PropertyListItem so both server and client callers fit. */
export type PropertyCardData = {
  id: string;
  name: string;
  propertyType: string;
  status: string;
  totalGla: number | null;
  updatedAt: string | Date;
  address: { street: string; city: string; state: string } | null;
  photos?: { assetId: string }[];
  coverAssetId?: string | null;
  coverSource?: "sitePlan" | "photo" | null;
  _count: { spaces: number; sitePlans: number; documents: number };
};

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const coverAssetId =
    property.coverAssetId ?? property.photos?.[0]?.assetId ?? null;
  const coverSource =
    property.coverSource ??
    (property.photos?.[0] ? "photo" : null);
  const isSitePlanCover = coverSource === "sitePlan";

  return (
    <Link href={`/properties/${property.id}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        {coverAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(coverAssetId)}
            alt={property.name}
            className={
              isSitePlanCover
                ? "h-28 w-full border-b border-slate-100 bg-slate-50 object-contain p-2"
                : "h-28 w-full border-b border-slate-100 object-cover"
            }
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center border-b border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100">
            <Building2 className="size-6 text-slate-300" />
          </div>
        )}
        <CardContent className="flex flex-1 flex-col">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 group-hover:text-brand-800">
              {property.name}
            </h3>
            <StatusBadge status={property.status} />
          </div>
          <p className="text-sm text-slate-500">
            {property.address
              ? `${property.address.street}, ${property.address.city}, ${property.address.state}`
              : "No address"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
            {labelize(property.propertyType)}
            {property.totalGla ? ` • ${formatSF(property.totalGla)}` : ""}
          </p>
          <div className="flex-1" />
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{property._count.spaces} spaces</span>
            <span>{property._count.sitePlans} site plans</span>
            <span>{property._count.documents} documents</span>
            <span className="ml-auto text-slate-400">
              {timeAgo(property.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
