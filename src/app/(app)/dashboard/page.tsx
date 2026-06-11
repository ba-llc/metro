import Link from "next/link";
import { auth } from "@/server/auth";
import { requireOrg } from "@/server/auth/context";
import { getOrganization } from "@/server/services/organization.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function DashboardPage() {
  const [session, ctx] = await Promise.all([auth(), requireOrg()]);
  const organization = await getOrganization(ctx);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={`${organization.name} · Metro Studio`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Property records" />
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Every marketing asset starts with a property record. Add addresses,
              spaces, tenants, and photos in one place.
            </p>
            <Link
              href="/properties"
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-900 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              View properties
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Getting started" />
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-600">
              <li>Create or open a property record</li>
              <li>Upload site plans and annotate spaces</li>
              <li>Generate maps and marketing materials</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
