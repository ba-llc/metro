"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyGridSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { labelize } from "@/lib/utils";
import { PropertyForm } from "@/features/properties/components/property-form";
import { PropertyCard } from "@/features/properties/components/property-card";
import {
  useCreateProperty,
  usePropertyList,
} from "@/features/properties/hooks";
import { propertyTypes } from "@/features/properties/schemas";

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PropertyGridSkeleton count={6} />}>
      <PropertiesPageInner />
    </Suspense>
  );
}

function PropertiesPageInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [createOpen, setCreateOpen] = useState(
    searchParams.get("new") === "1",
  );
  const { data: properties, isLoading } = usePropertyList({ q, propertyType });
  const createProperty = useCreateProperty();

  return (
    <div className="mx-auto max-w-6xl">
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
        <CustomSelect
          value={propertyType}
          onValueChange={setPropertyType}
          className="max-w-48"
          options={[
            { value: "", label: "All types" },
            ...propertyTypes.map((t) => ({ value: t, label: labelize(t) })),
          ]}
        />
      </div>

      {isLoading ? (
        <PropertyGridSkeleton count={6} />
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
            <PropertyCard key={p.id} property={p} />
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
