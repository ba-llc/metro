"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
            hasZip={Boolean(property.address?.zip)}
            geocoded={property.latitude != null}
          />
          <PhotosPanel propertyId={propertyId} photos={property.photos} />
        </div>
        <div className="space-y-6">
          <ContactsPanel propertyId={propertyId} propertyContacts={property.contacts} />
          <TenantsPanel
            propertyId={propertyId}
            occupancies={property.occupancies}
            geocoded={property.latitude != null}
          />
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
