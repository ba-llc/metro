"use client";

import { use } from "react";
import {
  PropertyWorkspaceShell,
} from "@/features/properties/components/property-workspace-shell";
import { SpacesPanel } from "@/features/properties/components/spaces-panel";
import { TenantsPanel } from "@/features/properties/components/tenants-panel";
import { ContactsPanel } from "@/features/properties/components/contacts-panel";
import { PhotosPanel } from "@/features/properties/components/photos-panel";
import { DemographicsPanel } from "@/features/properties/components/demographics-panel";
import { usePropertyDetail } from "@/features/properties/hooks";

export default function PropertyWorkspacePage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const { data: property } = usePropertyDetail(propertyId);

  return (
    <PropertyWorkspaceShell propertyId={propertyId}>
      {property ? (
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
      ) : null}
    </PropertyWorkspaceShell>
  );
}
