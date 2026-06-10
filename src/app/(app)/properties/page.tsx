"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatSF, labelize } from "@/lib/utils";
import { PropertyForm } from "@/features/properties/components/property-form";
import {
  useCreateProperty,
  usePropertyList,
} from "@/features/properties/hooks";
import { propertyTypes } from "@/features/properties/schemas";

export default function PropertiesPage() {
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: properties, isLoading } = usePropertyList({ q, propertyType });
  const createProperty = useCreateProperty();

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Every marketing asset starts with a property record."
        actions={
          <Button onClick={() => setCreateOpen(true)}>New Property</Button>
        }
      />

      <div className="mb-6 flex gap-3">
        <Input
          placeholder="Search by name or city..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="max-w-48"
        >
          <option value="">All types</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>
              {labelize(t)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner label="Loading properties..." />
      ) : !properties || properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Create your first property record — every flyer, map, and marketing package will be generated from it."
          action={
            <Button onClick={() => setCreateOpen(true)}>New Property</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {p.address
                      ? `${p.address.street}, ${p.address.city}, ${p.address.state}`
                      : "No address"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {labelize(p.propertyType)}
                    {p.totalGla ? ` • ${formatSF(p.totalGla)}` : ""}
                  </p>
                  <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{p._count.spaces} spaces</span>
                    <span>{p._count.sitePlans} site plans</span>
                    <span>{p._count.documents} documents</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Property"
        size="lg"
      >
        <PropertyForm
          submitLabel="Create Property"
          submitting={createProperty.isPending}
          onSubmit={(values) =>
            createProperty.mutate(values, { onSuccess: () => setCreateOpen(false) })
          }
        />
        {createProperty.error ? (
          <p className="mt-3 text-sm text-red-600">
            {createProperty.error.message}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
