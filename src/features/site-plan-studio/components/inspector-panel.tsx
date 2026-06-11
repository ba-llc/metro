"use client";

import { useState, type ReactNode } from "react";
import {
  CircleDot,
  Link2,
  MousePointer2,
  Paintbrush,
  Scissors,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom-select";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { labelize } from "@/lib/utils";
import { assetUrl, uploadAsset } from "@/lib/api";
import type { AnnotationData } from "@/types/annotations";
import type { OccupancyRecord, SpaceRecord } from "@/features/properties/types";
import { useCreateSpace } from "@/features/properties/hooks";
import { spaceBindableTypes, textAnnotationTypes } from "../tools";
import { useStudioStore } from "../store";

export function InspectorPanel({
  propertyId,
  spaces,
  occupancies,
}: {
  propertyId: string;
  spaces: SpaceRecord[];
  occupancies: OccupancyRecord[];
}) {
  const annotations = useStudioStore((s) => s.annotations);
  const selectedId = useStudioStore((s) => s.selectedId);
  const updateAnnotation = useStudioStore((s) => s.updateAnnotation);
  const removeAnnotation = useStudioStore((s) => s.removeAnnotation);
  const addAnnotation = useStudioStore((s) => s.addAnnotation);
  const select = useStudioStore((s) => s.select);
  const createSpace = useCreateSpace(propertyId);

  const [newSuite, setNewSuite] = useState("");
  const [newSf, setNewSf] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const selected = annotations.find((a) => a.id === selectedId);

  if (!selected) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
            <MousePointer2 className="size-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-950">
            Select an overlay
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Click any annotation to edit its style, label, geometry, and Property
            Record binding.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fast start
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Use AI Analyze to create a draft suggestion layer.</li>
            <li>Press V for Select or H for Pan.</li>
            <li>Draw a rectangle, then bind it to a Space.</li>
          </ul>
        </div>
      </div>
    );
  }

  const isText = textAnnotationTypes.includes(selected.type);
  const isBindable = spaceBindableTypes.includes(selected.type);
  const boundSpace = spaces.find((s) => s.id === selected.spaceId);
  const rosterLogoOptions = occupancies
    .filter((occupancy) => occupancy.tenant.logoAssetId)
    .map((occupancy) => {
      const suite = occupancy.suiteNumber
        ? `Suite ${occupancy.suiteNumber}`
        : null;
      return {
        value: occupancy.id,
        label: suite ? `${occupancy.tenant.name} - ${suite}` : occupancy.tenant.name,
        tenantName: occupancy.tenant.name,
        suiteNumber: occupancy.suiteNumber,
        logoAssetId: occupancy.tenant.logoAssetId as string,
      };
    });
  const selectedRosterLogo = rosterLogoOptions.find(
    (option) => option.logoAssetId === selected.assetId,
  );
  const noRosterLogoValue = "__none";
  const customLogoValue = "__custom";
  const rosterLogoSelectOptions: Array<CustomSelectOption<string>> = [
    { value: noRosterLogoValue, label: "No roster logo selected" },
    ...rosterLogoOptions,
    ...(selected.assetId && !selectedRosterLogo
      ? [{ value: customLogoValue, label: "Custom uploaded logo", disabled: true }]
      : []),
  ];
  const rosterLogoValue = selectedRosterLogo
    ? selectedRosterLogo.value
    : selected.assetId
      ? customLogoValue
      : noRosterLogoValue;
  const rosterLogoByValue = new Map(
    rosterLogoOptions.map((option) => [option.value, option]),
  );

  function patchStyle(patch: Partial<AnnotationData["style"]>) {
    if (!selected) return;
    updateAnnotation(selected.id, { style: { ...selected.style, ...patch } });
  }

  function mergeWithOther() {
    if (!selected?.geometry.rect) return;
    // Merge: union of the two shapes' bounding extents, keep this Space.
    const other = annotations.find(
      (a) =>
        a.id !== selected.id &&
        a.geometry.rect &&
        spaceBindableTypes.includes(a.type) &&
        a.layerId === selected.layerId,
    );
    if (!other?.geometry.rect) return;
    const r1 = selected.geometry.rect;
    const r2 = other.geometry.rect;
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    updateAnnotation(selected.id, {
      geometry: {
        rect: {
          x,
          y,
          w: Math.max(r1.x + r1.w, r2.x + r2.w) - x,
          h: Math.max(r1.y + r1.h, r2.y + r2.h) - y,
        },
      },
    });
    removeAnnotation(other.id);
  }

  function splitShape() {
    if (!selected?.geometry.rect) return;
    const r = selected.geometry.rect;
    // Split: shrink to the left half, create the right half unbound.
    updateAnnotation(selected.id, {
      geometry: { rect: { ...r, w: r.w / 2 } },
    });
    const id = addAnnotation({
      type: selected.type,
      geometry: { rect: { x: r.x + r.w / 2, y: r.y, w: r.w / 2, h: r.h } },
      style: selected.style,
      label: null,
      spaceId: null,
    });
    select(id);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-900">
              Selected Overlay
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">
              {labelize(selected.type)}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {selected.spaceId ? "Bound to Property Record" : "Free annotation"}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={() => removeAnnotation(selected.id)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <InspectorSection icon={<CircleDot className="size-4" />} title="Label">
        {!isText ? (
          <p className="text-sm text-slate-500">
            This shape does not display text. Add a suite, SF, or callout label
            from the tool rail.
          </p>
        ) : (
          <Field label="Text">
            <Input
              value={selected.label?.text ?? ""}
              onChange={(e) =>
                updateAnnotation(selected.id, {
                  label: { ...selected.label, text: e.target.value },
                })
              }
            />
          </Field>
        )}

        {isText && selected.type !== "callout" ? (
          <Field label="Bind to space field">
            <Select
              value={
                selected.label?.binding
                  ? `${selected.label.binding.field}:${selected.spaceId ?? ""}`
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  updateAnnotation(selected.id, {
                    label: { text: selected.label?.text ?? "" },
                    spaceId: null,
                  });
                  return;
                }
                const [field, spaceId] = v.split(":");
                updateAnnotation(selected.id, {
                  spaceId: spaceId || null,
                  label: {
                    binding: {
                      entity: "space",
                      field: field as "suiteNumber" | "squareFootage" | "askingRate",
                      format:
                        field === "squareFootage"
                          ? "{value} SF"
                          : field === "suiteNumber"
                            ? "Suite {value}"
                            : "{value}",
                    },
                  },
                });
              }}
            >
              <option value="">Free text</option>
              {spaces.flatMap((s) => [
                <option key={`${s.id}-suite`} value={`suiteNumber:${s.id}`}>
                  Suite {s.suiteNumber} - suite number
                </option>,
                <option key={`${s.id}-sf`} value={`squareFootage:${s.id}`}>
                  Suite {s.suiteNumber} - square footage
                </option>,
              ])}
            </Select>
          </Field>
        ) : null}
      </InspectorSection>

      <InspectorSection icon={<Paintbrush className="size-4" />} title="Style">
        <div className="grid grid-cols-2 gap-3">
          {selected.style.fill !== undefined || isBindable ? (
            <Field label="Fill">
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.fill ?? "#2563eb"}
                onChange={(e) => patchStyle({ fill: e.target.value })}
              />
            </Field>
          ) : null}
          {!isText ? (
            <Field label="Stroke">
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.stroke ?? "#2563eb"}
                onChange={(e) => patchStyle({ stroke: e.target.value })}
              />
            </Field>
          ) : null}
          {!isText ? (
            <Field label="Fill opacity">
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={selected.style.fillOpacity ?? 0.25}
                onChange={(e) => patchStyle({ fillOpacity: Number(e.target.value) })}
              />
            </Field>
          ) : null}
          {!isText ? (
            <Field label="Stroke width">
              <Input
                type="number"
                min={0}
                max={20}
                value={selected.style.strokeWidth ?? 2}
                onChange={(e) => patchStyle({ strokeWidth: Number(e.target.value) })}
              />
            </Field>
          ) : null}
          {isText ? (
            <Field label="Font size">
              <Input
                type="number"
                min={8}
                max={72}
                value={selected.style.fontSize ?? 16}
                onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
              />
            </Field>
          ) : null}
          {isText ? (
            <Field label="Color">
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.color ?? "#0f172a"}
                onChange={(e) => patchStyle({ color: e.target.value })}
              />
            </Field>
          ) : null}
        </div>
      </InspectorSection>

      {selected.type === "tenant-logo" ? (
        <InspectorSection icon={<Paintbrush className="size-4" />} title="Logo Image">
          {rosterLogoOptions.length > 0 ? (
            <CustomSelect
              label="Choose from tenant roster"
              value={rosterLogoValue}
              options={rosterLogoSelectOptions}
              onValueChange={(value) => {
                const rosterLogo = rosterLogoByValue.get(value);
                updateAnnotation(selected.id, {
                  assetId: rosterLogo?.logoAssetId ?? null,
                });
              }}
              triggerClassName="h-12"
              renderValue={(option) =>
                option ? (
                  <RosterLogoSelectRow
                    label={option.label}
                    logoAssetId={rosterLogoByValue.get(option.value)?.logoAssetId}
                  />
                ) : null
              }
              renderOption={(option) => (
                <RosterLogoSelectRow
                  label={option.label}
                  logoAssetId={rosterLogoByValue.get(option.value)?.logoAssetId}
                />
              )}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No Tenant Roster logos are available yet. Add or approve tenant logos
              from the Tenant Roster, or upload a logo below.
            </p>
          )}
          {selected.assetId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(selected.assetId)}
                alt="Selected tenant logo"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          ) : null}
          <Field label="Upload custom logo">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingLogo}
              className="block w-full text-xs text-slate-500"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingLogo(true);
                try {
                  const asset = await uploadAsset({
                    file,
                    filename: file.name,
                    folder: `properties/${propertyId}/logos`,
                  });
                  updateAnnotation(selected.id, { assetId: asset.id });
                } finally {
                  setUploadingLogo(false);
                }
              }}
            />
          </Field>
        </InspectorSection>
      ) : null}

      {isBindable ? (
        <InspectorSection icon={<Link2 className="size-4" />} title="Space Binding">
          {boundSpace ? (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Bound to <strong>Suite {boundSpace.suiteNumber}</strong>
              {boundSpace.squareFootage
                ? ` (${boundSpace.squareFootage.toLocaleString()} SF)`
                : ""}
            </div>
          ) : null}
          <Field label="Link existing space">
            <Select
              value={selected.spaceId ?? ""}
              onChange={(e) =>
                updateAnnotation(selected.id, {
                  spaceId: e.target.value || null,
                })
              }
            >
              <option value="">Not bound</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  Suite {s.suiteNumber}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="New suite #">
              <Input
                value={newSuite}
                onChange={(e) => setNewSuite(e.target.value)}
                placeholder="120"
              />
            </Field>
            <Field label="SF">
              <Input
                value={newSf}
                onChange={(e) => setNewSf(e.target.value)}
                type="number"
              />
            </Field>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={createSpace.isPending}
            disabled={!newSuite.trim()}
            onClick={() =>
              createSpace.mutate(
                {
                  suiteNumber: newSuite.trim(),
                  squareFootage: newSf ? Number(newSf) : undefined,
                  spaceType: selected.type === "pad-site" ? "PAD" : "INLINE",
                  status: "AVAILABLE",
                },
                {
                  onSuccess: (space) => {
                    updateAnnotation(selected.id, { spaceId: space.id });
                    setNewSuite("");
                    setNewSf("");
                  },
                },
              )
            }
          >
            Create and Bind Space
          </Button>
          {selected.geometry.rect ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={mergeWithOther}>
                <Link2 className="size-4" />
                Merge
              </Button>
              <Button size="sm" variant="secondary" onClick={splitShape}>
                <Scissors className="size-4" />
                Split
              </Button>
            </div>
          ) : null}
        </InspectorSection>
      ) : null}
    </div>
  );
}

function RosterLogoSelectRow({
  label,
  logoAssetId,
}: {
  label: string;
  logoAssetId?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {logoAssetId ? (
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(logoAssetId)}
            alt=""
            className="max-h-7 max-w-7 object-contain"
          />
        </span>
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function InspectorSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-brand-900">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}
