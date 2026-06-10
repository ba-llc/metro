"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { assetUrl } from "@/lib/api";
import { formatDate, labelize } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
import {
  useGeocodeProperty,
  usePropertyDetail,
} from "@/features/properties/hooks";
import {
  useDeleteMap,
  useGenerateMap,
  useMaps,
} from "@/features/maps/hooks";
import { mapKinds, retailCategories } from "@/features/maps/schemas";

export default function MapsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [kind, setKind] = useState<(typeof mapKinds)[number]>("SATELLITE_AERIAL");
  const [categories, setCategories] = useState<string[]>([
    "grocery_or_supermarket",
    "restaurant",
    "gym",
  ]);

  const { data: property } = usePropertyDetail(propertyId);
  const { data: maps, isLoading } = useMaps(propertyId);
  const generateMap = useGenerateMap(propertyId);
  const deleteMap = useDeleteMap(propertyId);
  const geocode = useGeocodeProperty(propertyId);

  const geocoded = property?.latitude != null;

  function onGenerate() {
    generateMap.mutate(
      {
        kind,
        params: {
          ...(kind === "RADIUS" ? { radiusMiles: [1, 3, 5] } : {}),
          ...(kind === "RETAIL" ? { radiusMiles: [3], categories } : {}),
        },
      },
      { onSuccess: () => setGenerateOpen(false) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Maps"
        subtitle="Declarative map specs — every artifact is regenerable from its parameters."
        actions={
          <Button onClick={() => setGenerateOpen(true)} disabled={!geocoded}>
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
          description="Generate satellite aerials, trade area maps, 1/3/5-mile radius rings, and retail POI maps from the property address."
          action={
            <Button onClick={() => setGenerateOpen(true)} disabled={!geocoded}>
              Generate Map
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <Card key={map.id}>
              {map.imageAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(map.imageAssetId)}
                  alt={labelize(map.kind)}
                  className="aspect-[4/3] w-full rounded-t-lg object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-t-lg bg-slate-100">
                  {map.status === "FAILED" ? (
                    <p className="px-4 text-center text-xs text-red-600">
                      {map.error ?? "Generation failed"}
                    </p>
                  ) : (
                    <Spinner label="Generating..." />
                  )}
                </div>
              )}
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {labelize(map.kind)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(map.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={map.status} />
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
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate Map"
      >
        <div className="space-y-4">
          <Field label="Map type">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {mapKinds.map((k) => (
                <option key={k} value={k}>
                  {labelize(k)}
                </option>
              ))}
            </Select>
          </Field>

          {kind === "RADIUS" ? (
            <p className="text-sm text-slate-500">
              Generates 1, 3, and 5-mile radius rings centered on the property.
            </p>
          ) : null}

          {kind === "RETAIL" ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                POI categories
              </p>
              <div className="space-y-1.5">
                {retailCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={categories.includes(cat.id)}
                      onChange={(e) =>
                        setCategories((prev) =>
                          e.target.checked
                            ? [...prev, cat.id]
                            : prev.filter((c) => c !== cat.id),
                        )
                      }
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {generateMap.error ? (
            <p className="text-sm text-red-600">{generateMap.error.message}</p>
          ) : null}

          <div className="flex justify-end">
            <Button loading={generateMap.isPending} onClick={onGenerate}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
