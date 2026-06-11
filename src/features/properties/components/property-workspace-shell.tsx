"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/empty-state";
import { formatSF, labelize } from "@/lib/utils";
import { PropertyNav } from "./property-nav";
import { PropertyForm } from "./property-form";
import {
  useDeleteProperty,
  useGeocodeProperty,
  usePropertyDetail,
  useUpdateProperty,
} from "../hooks";
import type { PropertyCreateInput } from "../schemas";

export function PropertyTabSection({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PropertyWorkspaceShell({
  propertyId,
  children,
  banner,
}: {
  propertyId: string;
  children: ReactNode;
  banner?: ReactNode;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const { data: property, isLoading } = usePropertyDetail(propertyId);
  const updateProperty = useUpdateProperty(propertyId);
  const deleteProperty = useDeleteProperty();
  const geocode = useGeocodeProperty(propertyId);

  if (isLoading || !property) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Spinner label="Loading property..." />
      </div>
    );
  }

  const address = property.address
    ? `${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zip}`
    : "No address";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {property.name}
            <StatusBadge status={property.status} />
          </span>
        }
        subtitle={
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-slate-600">{address}</span>
            <Badge tone="slate" className="bg-white">
              {labelize(property.propertyType)}
            </Badge>
            {property.totalGla ? (
              <span className="text-xs font-semibold text-slate-500">
                {formatSF(property.totalGla)}
              </span>
            ) : null}
            {property.latitude != null ? (
              <Badge tone="green">Geocoded</Badge>
            ) : (
              <Badge tone="amber">Not geocoded</Badge>
            )}
          </div>
        }
        actions={
          <>
            {property.latitude == null ? (
              <Button
                variant="secondary"
                loading={geocode.isPending}
                onClick={() => geocode.mutate()}
              >
                Geocode Address
              </Button>
            ) : null}
            <Button variant="secondary" className="w-20" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              className="w-20"
              loading={deleteProperty.isPending}
              onClick={() => {
                if (confirm("Delete this property? Marketing assets will be removed.")) {
                  deleteProperty.mutate(propertyId, {
                    onSuccess: () => router.push("/properties"),
                  });
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      />

      <PropertyNav propertyId={propertyId} />

      {banner}
      {geocode.error ? (
        <p className="mb-4 text-sm text-red-600">{geocode.error.message}</p>
      ) : null}

      {children}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Property"
        size="lg"
      >
        <PropertyForm
          submitLabel="Save Changes"
          submitting={updateProperty.isPending}
          enablePlaceSearch={false}
          defaultValues={{
            name: property.name,
            propertyType: property.propertyType as PropertyCreateInput["propertyType"],
            status: property.status as PropertyCreateInput["status"],
            description: property.description ?? undefined,
            totalGla: property.totalGla ?? undefined,
            yearBuilt: property.yearBuilt ?? undefined,
            parkingRatio: property.parkingRatio ?? undefined,
            address: property.address
              ? {
                  street: property.address.street,
                  city: property.address.city,
                  state: property.address.state,
                  zip: property.address.zip,
                  county: property.address.county ?? undefined,
                }
              : { street: "", city: "", state: "", zip: "" },
          }}
          onSubmit={(values) =>
            updateProperty.mutate(values, { onSuccess: () => setEditOpen(false) })
          }
        />
      </Modal>
    </div>
  );
}
