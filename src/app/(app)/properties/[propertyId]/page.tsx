"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/empty-state";
import { formatSF, labelize } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
import { PropertyForm } from "@/features/properties/components/property-form";
import { SpacesPanel } from "@/features/properties/components/spaces-panel";
import { TenantsPanel } from "@/features/properties/components/tenants-panel";
import { ContactsPanel } from "@/features/properties/components/contacts-panel";
import { PhotosPanel } from "@/features/properties/components/photos-panel";
import { DemographicsPanel } from "@/features/properties/components/demographics-panel";
import {
  useDeleteProperty,
  useGeocodeProperty,
  usePropertyDetail,
  useUpdateProperty,
} from "@/features/properties/hooks";
import type { PropertyCreateInput } from "@/features/properties/schemas";

export default function PropertyWorkspacePage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const { data: property, isLoading } = usePropertyDetail(propertyId);
  const updateProperty = useUpdateProperty(propertyId);
  const deleteProperty = useDeleteProperty();
  const geocode = useGeocodeProperty(propertyId);

  if (isLoading || !property) {
    return <Spinner label="Loading property..." />;
  }

  const address = property.address
    ? `${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zip}`
    : "No address";

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {property.name}
            <StatusBadge status={property.status} />
          </span>
        }
        subtitle={
          <>
            {address} • {labelize(property.propertyType)}
            {property.totalGla ? ` • ${formatSF(property.totalGla)}` : ""}
            {property.latitude != null ? (
              <span className="ml-2 text-emerald-600">Geocoded</span>
            ) : (
              <span className="ml-2 text-amber-600">Not geocoded</span>
            )}
          </>
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
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
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
      {geocode.error ? (
        <p className="mb-4 text-sm text-red-600">{geocode.error.message}</p>
      ) : null}

      <PropertyNav propertyId={propertyId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SpacesPanel propertyId={propertyId} spaces={property.spaces} />
          <DemographicsPanel
            propertyId={propertyId}
            demographics={property.demographics}
          />
        </div>
        <div className="space-y-6">
          <PhotosPanel propertyId={propertyId} photos={property.photos} />
          <TenantsPanel propertyId={propertyId} occupancies={property.occupancies} />
          <ContactsPanel propertyId={propertyId} propertyContacts={property.contacts} />
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Property"
        size="lg"
      >
        <PropertyForm
          submitLabel="Save Changes"
          submitting={updateProperty.isPending}
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
