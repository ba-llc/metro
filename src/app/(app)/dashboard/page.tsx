import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  FileUp,
  History,
  LayoutGrid,
  Map,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/server/auth";
import { requireOrg } from "@/server/auth/context";
import { getOrganization } from "@/server/services/organization.service";
import { listProperties } from "@/server/services/property.service";
import { listOrgActivity } from "@/server/services/activity.service";
import { getDashboardCounts } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyCard } from "@/features/properties/components/property-card";
import { formatNumber, timeAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const [session, ctx] = await Promise.all([auth(), requireOrg()]);
  const [organization, properties, activity, counts] = await Promise.all([
    getOrganization(ctx),
    listProperties(ctx, {}, { take: 6 }),
    listOrgActivity(ctx, 8),
    getDashboardCounts(ctx),
  ]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const recent = properties[0];
  const steps = [
    {
      label: "Create a property record",
      done: counts.properties > 0,
      href: "/properties?new=1",
    },
    {
      label: "Upload a site plan",
      done: counts.sitePlans > 0,
      href: recent ? `/properties/${recent.id}/site-plans` : "/properties",
    },
    {
      label: "Generate marketing materials",
      done: counts.documents > 0,
      href: recent ? `/properties/${recent.id}/marketing` : "/properties",
    },
  ];
  const onboarding = steps.some((s) => !s.done);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium text-slate-600">
              {organization.name}
            </span>
            <span className="text-slate-300">·</span>
            <span>Metro Studio</span>
            {counts.properties > 0 ? (
              <>
                <span className="text-slate-300">·</span>
                <span>
                  {portfolioSummary(counts)}
                </span>
              </>
            ) : null}
          </span>
        }
        actions={
          <Link href="/properties?new=1">
            <Button>
              <Plus className="size-4" />
              New Property
            </Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/properties?new=1"
          icon={Plus}
          title="New Property"
          caption="Start a property record"
        />
        <QuickAction
          href={recent ? `/properties/${recent.id}/site-plans` : undefined}
          icon={FileUp}
          title="Upload Site Plan"
          caption={recent ? `in ${recent.name}` : "Add a property first"}
        />
        <QuickAction
          href={recent ? `/properties/${recent.id}/marketing` : undefined}
          icon={FileText}
          title="Generate Marketing Package"
          caption={recent ? `for ${recent.name}` : "Add a property first"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Recent properties
            </h2>
            {properties.length > 0 ? (
              <Link
                href="/properties"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>

          {properties.length === 0 ? (
            <EmptyState
              title="No properties yet"
              description="Create your first property record — every flyer, map, and marketing package will be generated from it."
              action={
                <Link href="/properties?new=1">
                  <Button>
                    <Plus className="size-4" />
                    New Property
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-4">
          {onboarding ? (
            <Card>
              <CardHeader
                title="Getting started"
                action={
                  <span className="text-xs font-medium text-slate-400">
                    {steps.filter((s) => s.done).length}/{steps.length}
                  </span>
                }
              />
              <CardContent className="p-2">
                {steps.map((step) =>
                  step.done ? (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 rounded-md px-3 py-2"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-400">
                        {step.label}
                      </span>
                    </div>
                  ) : (
                    <Link
                      key={step.label}
                      href={step.href}
                      className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <Circle className="size-4 shrink-0 text-slate-300" />
                      <span className="text-sm text-slate-700">
                        {step.label}
                      </span>
                      <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ),
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Recent activity" />
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  Activity will appear here as your team works.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.map((item) => {
                    const Icon = entityIcons[item.entityType] ?? History;
                    return (
                      <li key={item.id} className="flex gap-3 px-5 py-3">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium text-slate-900">
                              {entityLabels[item.entityType] ?? item.entityType}
                            </span>{" "}
                            {item.action}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {item.property ? (
                              <>
                                <Link
                                  href={`/properties/${item.property.id}`}
                                  className="hover:text-slate-600"
                                >
                                  {item.property.name}
                                </Link>
                                {" · "}
                              </>
                            ) : null}
                            {timeAgo(item.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function portfolioSummary(counts: {
  properties: number;
  sitePlans: number;
  documents: number;
}): string {
  const parts = [
    `${formatNumber(counts.properties)} ${counts.properties === 1 ? "property" : "properties"}`,
  ];
  if (counts.sitePlans > 0) {
    parts.push(
      `${formatNumber(counts.sitePlans)} site ${counts.sitePlans === 1 ? "plan" : "plans"}`,
    );
  }
  if (counts.documents > 0) {
    parts.push(
      `${formatNumber(counts.documents)} ${counts.documents === 1 ? "document" : "documents"}`,
    );
  }
  return parts.join(" · ");
}

function QuickAction({
  href,
  icon: Icon,
  title,
  caption,
}: {
  href?: string;
  icon: LucideIcon;
  title: string;
  caption: string;
}) {
  const body = (
    <Card
      className={
        href
          ? "h-full transition-shadow group-hover:shadow-md"
          : "h-full opacity-60"
      }
    >
      <div className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          <p className="truncate text-xs text-slate-500">{caption}</p>
        </div>
        {href ? (
          <ArrowRight className="ml-auto size-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
        ) : null}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="group block">
      {body}
    </Link>
  ) : (
    body
  );
}

const entityLabels: Record<string, string> = {
  property: "Property",
  space: "Space",
  sitePlan: "Site plan",
  sitePlanPage: "Site plan page",
  document: "Marketing document",
  mapAsset: "Map",
  tenant: "Tenant",
  contact: "Contact",
  photo: "Photo",
};

const entityIcons: Record<string, LucideIcon> = {
  property: Building2,
  space: LayoutGrid,
  sitePlan: Map,
  sitePlanPage: Map,
  document: FileText,
  mapAsset: Map,
};
