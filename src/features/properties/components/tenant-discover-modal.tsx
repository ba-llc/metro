"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { labelize } from "@/lib/utils";
import {
  useDiscoverNearbyTenants,
  useImportDiscoveredTenants,
} from "../hooks";
import type { DiscoveredPlaceRecord } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  geocoded: boolean;
};

const RADIUS_PRESETS = [
  { label: "250m", value: 250 },
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "2km", value: 2000 },
];

export function TenantDiscoverModal({ open, onClose, propertyId, geocoded }: Props) {
  const [radius, setRadius] = useState(500);
  const [results, setResults] = useState<DiscoveredPlaceRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attachToProperty, setAttachToProperty] = useState(false);

  const discover = useDiscoverNearbyTenants(propertyId);
  const importTenants = useImportDiscoveredTenants(propertyId);

  function reset() {
    setResults([]);
    setSelected(new Set());
    discover.reset();
    importTenants.reset();
  }

  async function runDiscover() {
    const r = await discover.mutateAsync({ radiusMeters: radius, maxResults: 20 });
    setResults(r);
    // Pre-select places that aren't already imported.
    setSelected(new Set(r.filter((p) => !p.existingTenantId).map((p) => p.placeId)));
  }

  function toggle(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  async function runImport() {
    const places = results.filter((p) => selected.has(p.placeId));
    await importTenants.mutateAsync({ places, attachToProperty });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Discover nearby tenants"
      size="lg"
    >
      {!geocoded ? (
        <EmptyState
          title="Geocode the property first"
          description="Tenant discovery uses the property's lat/lng. Run 'Geocode Address' from the property header, then try again."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Search radius</p>
              <div className="mt-2 flex gap-1">
                {RADIUS_PRESETS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRadius(r.value)}
                    className={`rounded-md border px-2.5 py-1 text-xs ${
                      radius === r.value
                        ? "border-brand-800 bg-brand-50 text-brand-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={runDiscover} loading={discover.isPending}>
              {results.length ? "Re-run search" : "Find nearby tenants"}
            </Button>
          </div>

          {discover.error ? (
            <p className="text-sm text-red-600">{discover.error.message}</p>
          ) : null}

          {discover.isPending ? (
            <Spinner label="Searching Google Places..." />
          ) : results.length === 0 ? (
            <EmptyState
              title="No results yet"
              description="Pick a radius and run the search. Discovered places use the Google Places place_id for stable de-duplication on re-import."
            />
          ) : (
            <>
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-100">
                {results.map((p) => {
                  const isExisting = Boolean(p.existingTenantId);
                  const isSelected = selected.has(p.placeId);
                  return (
                    <li
                      key={p.placeId}
                      className={`flex items-start gap-3 px-3 py-2.5 text-sm ${
                        isExisting ? "bg-slate-50/50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={isSelected}
                        onChange={() => toggle(p.placeId)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 truncate">
                            {p.name}
                          </span>
                          {p.primaryType ? (
                            <span className="text-xs text-slate-500">
                              {labelize(p.primaryType)}
                            </span>
                          ) : null}
                          {isExisting ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                              already in library
                            </span>
                          ) : null}
                        </div>
                        {p.formattedAddress ? (
                          <p className="text-xs text-slate-500 truncate">
                            {p.formattedAddress}
                          </p>
                        ) : null}
                        {p.website ? (
                          <a
                            href={p.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-700 hover:underline"
                          >
                            {p.website}
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={attachToProperty}
                  onChange={(e) => setAttachToProperty(e.target.checked)}
                />
                Also add selected tenants to this property's roster
              </label>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  {selected.size} selected of {results.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={runImport}
                    loading={importTenants.isPending}
                    disabled={selected.size === 0}
                  >
                    Import {selected.size || ""}
                  </Button>
                </div>
              </div>
              {importTenants.error ? (
                <p className="text-sm text-red-600">{importTenants.error.message}</p>
              ) : null}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
