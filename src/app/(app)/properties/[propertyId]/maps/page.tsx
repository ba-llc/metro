"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { assetUrl } from "@/lib/api";
import { formatDate, labelize } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
import {
  useGeocodeProperty,
  usePropertyDetail,
} from "@/features/properties/hooks";
import { MapGenerateForm } from "@/features/maps/components/map-generate-form";
import { formatMapParamsSummary } from "@/features/maps/format-params";
import { mapAssetToInput } from "@/features/maps/map-input";
import {
  useDeleteMap,
  useGenerateMap,
  useMaps,
  useRegenerateMap,
  type MapAssetRecord,
} from "@/features/maps/hooks";
import type { MapCreateInput } from "@/features/maps/schemas";

type ModalMode =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; map: MapAssetRecord };

export default function MapsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const [modal, setModal] = useState<ModalMode>({ type: "closed" });

  const { data: property } = usePropertyDetail(propertyId);
  const { data: maps, isLoading } = useMaps(propertyId);
  const generateMap = useGenerateMap(propertyId);
  const regenerateMap = useRegenerateMap(propertyId);
  const deleteMap = useDeleteMap(propertyId);
  const geocode = useGeocodeProperty(propertyId);

  const geocoded = property?.latitude != null;
  const editing = modal.type === "edit" ? modal.map : null;

  function closeModal() {
    setModal({ type: "closed" });
  }

  function handleSubmit(input: MapCreateInput) {
    if (modal.type === "edit") {
      regenerateMap.mutate(
        { mapId: modal.map.id, input },
        { onSuccess: closeModal },
      );
      return;
    }
    generateMap.mutate(input, { onSuccess: closeModal });
  }

  const formLoading =
    modal.type === "edit" ? regenerateMap.isPending : generateMap.isPending;
  const formError =
    (modal.type === "edit" ? regenerateMap.error : generateMap.error)?.message ??
    null;

  return (
    <div>
      <PageHeader
        title="Maps"
        subtitle="Declarative map specs — every artifact is regenerable from its parameters."
        actions={
          <Button
            onClick={() => setModal({ type: "create" })}
            disabled={!geocoded}
          >
            Generate Map
          </Button>
        }
      />
      <PropertyNav propertyId={propertyId} />

      {!geocoded && property ? (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Geocode the property address before generating maps.
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={geocode.isPending}
            onClick={() => geocode.mutate()}
          >
            Geocode Address
          </Button>
        </div>
      ) : null}
      {geocode.error ? (
        <p className="mb-4 text-sm text-red-600">{geocode.error.message}</p>
      ) : null}

      {isLoading ? (
        <Spinner label="Loading maps..." />
      ) : !maps || maps.length === 0 ? (
        <EmptyState
          title="No maps generated yet"
          description="Generate satellite aerials, trade area maps, radius rings, and retail POI maps — with full control over zoom, framing, and output size."
          action={
            <Button
              onClick={() => setModal({ type: "create" })}
              disabled={!geocoded}
            >
              Generate Map
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <Card key={map.id} className="overflow-hidden">
              <div className="relative">
                <div className="absolute right-2 top-2 z-10">
                  <StatusBadge status={map.status} />
                </div>
                {map.imageAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(map.imageAssetId)}
                    alt={labelize(map.kind)}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                    {map.status === "FAILED" ? (
                      <p className="px-4 text-center text-xs text-red-600">
                        {map.error ?? "Generation failed"}
                      </p>
                    ) : (
                      <Spinner label="Generating..." />
                    )}
                  </div>
                )}
              </div>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {labelize(map.kind)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatMapParamsSummary(map.kind, map.params)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(map.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setModal({ type: "edit", map })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteMap.mutate(map.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modal.type !== "closed"}
        onClose={closeModal}
        title={editing ? "Edit Map" : "Generate Map"}
        size="xl"
      >
        <MapGenerateForm
          propertyId={propertyId}
          loading={formLoading}
          error={formError}
          initialInput={editing ? mapAssetToInput(editing) : undefined}
          submitLabel={editing ? "Regenerate" : "Generate"}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
}
