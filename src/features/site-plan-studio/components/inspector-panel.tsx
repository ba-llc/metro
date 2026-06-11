"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  CircleDot,
  Link2,
  MousePointer2,
  Paintbrush,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { cn, labelize } from "@/lib/utils";
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
  const logoUploadRef = useRef<HTMLInputElement>(null);

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
  const isDimension = selected.type === "dimension";
  const isBindable = spaceBindableTypes.includes(selected.type);
  const boundSpace = spaces.find((s) => s.id === selected.spaceId);
  const rosterLogoOptions = occupancies
    .map((occupancy) => {
      const suite = occupancy.suiteNumber
        ? `Suite ${occupancy.suiteNumber}`
        : null;
      const hasLogo = Boolean(occupancy.tenant.logoAssetId);
      return {
        value: occupancy.id,
        label: suite
          ? `${occupancy.tenant.name} - ${suite}`
          : occupancy.tenant.name,
        disabled: !hasLogo,
        tenantName: occupancy.tenant.name,
        suiteNumber: occupancy.suiteNumber,
        logoAssetId: occupancy.tenant.logoAssetId,
      };
    });
  const selectedRosterLogo = rosterLogoOptions.find(
    (option) => option.logoAssetId && option.logoAssetId === selected.assetId,
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

  async function logoAspect(assetId: string): Promise<number> {
    const image = new window.Image();
    image.src = assetUrl(assetId);
    await image.decode().catch(
      () =>
        new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Logo image failed to load"));
        }),
    );
    return image.naturalWidth > 0 && image.naturalHeight > 0
      ? image.naturalWidth / image.naturalHeight
      : 1;
  }

  async function applyLogoAsset(assetId: string | null, tenantName?: string) {
    if (!selected) return;
    if (!assetId || !selected.geometry.rect) {
      updateAnnotation(selected.id, {
        assetId,
        ...(tenantName && selected.label?.text
          ? { label: { ...selected.label, text: tenantName } }
          : {}),
      });
      return;
    }
    const aspect = await logoAspect(assetId).catch(() => 1);
    const rect = selected.geometry.rect;
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    const maxSide = Math.min(0.12, Math.max(0.045, Math.max(rect.w, rect.h)));
    const next =
      aspect >= 1
        ? { w: maxSide, h: maxSide / aspect }
        : { w: maxSide * aspect, h: maxSide };
    updateAnnotation(selected.id, {
      assetId,
      ...(tenantName && selected.label?.text
        ? { label: { ...selected.label, text: tenantName } }
        : {}),
      geometry: {
        ...selected.geometry,
        rect: {
          x: Math.min(Math.max(center.x - next.w / 2, 0), 1 - next.w),
          y: Math.min(Math.max(center.y - next.h / 2, 0), 1 - next.h),
          w: next.w,
          h: next.h,
        },
      },
    });
  }

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
            <CustomSelect
              value={
                selected.label?.binding
                  ? `${selected.label.binding.field}:${selected.spaceId ?? ""}`
                  : ""
              }
              options={[
                { value: "", label: "Free text" },
                ...spaces.flatMap((s) => [
                  {
                    value: `suiteNumber:${s.id}`,
                    label: `Suite ${s.suiteNumber} - suite number`,
                  },
                  {
                    value: `squareFootage:${s.id}`,
                    label: `Suite ${s.suiteNumber} - square footage`,
                  },
                  {
                    value: `suiteAndSquareFootage:${s.id}`,
                    label: `Suite ${s.suiteNumber} - suite + square footage`,
                  },
                ] satisfies CustomSelectOption<string>[]),
              ]}
              onValueChange={(v) => {
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
                      field: field as
                        | "suiteNumber"
                        | "squareFootage"
                        | "suiteAndSquareFootage"
                        | "askingRate",
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
            />
          </Field>
        ) : null}
      </InspectorSection>

      {selected.type !== "tenant-logo" ? (
        <InspectorSection icon={<Paintbrush className="size-4" />} title="Style">
          <div className="grid grid-cols-2 gap-3">
            {isText ? (
            <Field label="Text color">
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.color ?? "#0f172a"}
                onChange={(e) => patchStyle({ color: e.target.value })}
              />
            </Field>
          ) : null}
          {isText ? (
            <Field label="Text background">
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.fill ?? "#ffffff"}
                onChange={(e) =>
                  patchStyle({
                    fill: e.target.value,
                    fillOpacity: selected.style.fillOpacity ?? 0.85,
                  })
                }
              />
            </Field>
          ) : null}
          {!isText && (selected.style.fill !== undefined || isBindable || isDimension) ? (
            <Field label={isDimension ? "Label background" : "Fill"}>
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.fill ?? (isDimension ? "#ffffff" : "#2563eb")}
                onChange={(e) =>
                  patchStyle({
                    fill: e.target.value,
                    fillOpacity:
                      selected.style.fillOpacity ?? (isDimension ? 0.85 : 0.25),
                  })
                }
              />
            </Field>
          ) : null}
          {!isText || isDimension ? (
            <Field label={isDimension ? "Line color" : "Stroke"}>
              <Input
                type="color"
                className="h-9 p-1"
                value={selected.style.stroke ?? (isDimension ? "#475569" : "#2563eb")}
                onChange={(e) => patchStyle({ stroke: e.target.value })}
              />
            </Field>
          ) : null}
          {!isText || isDimension || selected.style.fill !== undefined ? (
            <div className="col-span-2">
              <Field
                label={
                  isDimension || isText ? "Background opacity" : "Fill opacity"
                }
              >
                <SliderControl
                  min={0}
                  max={1}
                  step={0.05}
                  value={
                    selected.style.fillOpacity ??
                    (isDimension || isText ? 0.85 : 0.25)
                  }
                  format={(value) => value.toFixed(2)}
                  onChange={(value) => patchStyle({ fillOpacity: value })}
                />
              </Field>
            </div>
          ) : null}
          {isText ? <div /> : null}
          {!isText || isDimension ? (
            <div className="col-span-2">
              <Field label={isDimension ? "Line width" : "Stroke width"}>
                <SliderControl
                  min={0}
                  max={20}
                  step={0.5}
                  value={selected.style.strokeWidth ?? (isDimension ? 1.5 : 2)}
                  format={(value) =>
                    Number.isInteger(value) ? String(value) : value.toFixed(1)
                  }
                  onChange={(value) => patchStyle({ strokeWidth: value })}
                />
              </Field>
            </div>
          ) : null}
          {isText ? (
            <div className="col-span-2">
              <Field label="Font size">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={8}
                    max={96}
                    step={1}
                    value={selected.style.fontSize ?? 16}
                    onChange={(e) =>
                      patchStyle({ fontSize: Number(e.target.value) })
                    }
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-700"
                  />
                  <span className="w-12 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-semibold text-slate-700">
                    {selected.style.fontSize ?? 16}
                  </span>
                </div>
              </Field>
            </div>
          ) : null}
          </div>
        </InspectorSection>
      ) : null}

      {selected.type === "tenant-logo" ? (
        <InspectorSection icon={<Paintbrush className="size-4" />} title="Logo Image">
          {rosterLogoOptions.length > 0 ? (
            <CustomSelect
              label="Choose from tenant roster"
              value={rosterLogoValue}
              options={rosterLogoSelectOptions}
              onValueChange={(value) => {
                const rosterLogo = rosterLogoByValue.get(value);
                void applyLogoAsset(
                  rosterLogo?.logoAssetId ?? null,
                  rosterLogo?.tenantName,
                );
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
                  muted={option.disabled}
                />
              )}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No Tenant Roster logos are available yet. Add or approve tenant logos
              from the Tenant Roster, or upload a custom logo below.
            </p>
          )}
          {selected.assetId ? (
            <div className="w-fit max-w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(selected.assetId)}
                alt="Selected tenant logo"
                className="block h-auto w-auto max-h-24 max-w-full object-contain"
              />
            </div>
          ) : null}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Style
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Background">
                <div className="space-y-2">
                  <Input
                    type="color"
                    className="h-9 p-1"
                    value={selected.style.fill ?? "#ffffff"}
                    onChange={(event) =>
                      patchStyle({
                        fill: event.target.value,
                        fillOpacity: selected.style.fillOpacity ?? 0.85,
                      })
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={selected.style.fill ? "secondary" : "ghost"}
                    className="w-full"
                    onClick={() =>
                      patchStyle({
                        fill: undefined,
                        fillOpacity: undefined,
                      })
                    }
                    disabled={!selected.style.fill}
                  >
                    No background
                  </Button>
                </div>
              </Field>
              <Field label="Border">
                <div className="space-y-2">
                  <Input
                    type="color"
                    className="h-9 p-1"
                    value={selected.style.stroke ?? "#0f3057"}
                    onChange={(event) =>
                      patchStyle({
                        stroke: event.target.value,
                        strokeWidth: selected.style.strokeWidth ?? 2,
                      })
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      selected.style.stroke || selected.style.strokeWidth
                        ? "secondary"
                        : "ghost"
                    }
                    className="w-full"
                    onClick={() =>
                      patchStyle({
                        stroke: undefined,
                        strokeWidth: undefined,
                      })
                    }
                    disabled={!selected.style.stroke && !selected.style.strokeWidth}
                  >
                    No border
                  </Button>
                </div>
              </Field>
            </div>
            {selected.style.fill ? (
              <Field label="Background opacity">
                <SliderControl
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.style.fillOpacity ?? 0.85}
                  format={(value) => value.toFixed(2)}
                  onChange={(value) => patchStyle({ fillOpacity: value })}
                />
              </Field>
            ) : (
              <p className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                No logo background is applied.
              </p>
            )}
            {selected.style.stroke || selected.style.strokeWidth ? (
              <Field label="Border width">
                <SliderControl
                  min={0}
                  max={16}
                  step={0.5}
                  value={selected.style.strokeWidth ?? 0}
                  format={(value) =>
                    Number.isInteger(value) ? String(value) : value.toFixed(1)
                  }
                  onChange={(value) =>
                    patchStyle({
                      strokeWidth: value,
                      stroke:
                        value > 0
                          ? selected.style.stroke ?? "#0f3057"
                          : selected.style.stroke,
                    })
                  }
                />
              </Field>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(selected.label?.text)}
              onChange={(event) => {
                if (event.target.checked) {
                  updateAnnotation(selected.id, {
                    label: {
                      text:
                        selected.label?.text ??
                        selectedRosterLogo?.tenantName ??
                        "Tenant name",
                    },
                    style: {
                      ...selected.style,
                      fontSize: selected.style.fontSize ?? 18,
                      labelColor: selected.style.labelColor ?? selected.style.color ?? "#0f172a",
                      labelFill: selected.style.labelFill ?? "#ffffff",
                      labelFillOpacity: selected.style.labelFillOpacity ?? 0.85,
                    },
                  });
                } else {
                  updateAnnotation(selected.id, { label: null });
                }
              }}
            />
            Show tenant name
          </label>
          {selected.label?.text ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Field label="Tenant name">
                <Input
                  value={selected.label.text}
                  onChange={(event) =>
                    updateAnnotation(selected.id, {
                      label: { ...selected.label, text: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Badge position">
                <CustomSelect
                  value={selected.label.placement ?? "below"}
                  options={[
                    { value: "below", label: "Below logo" },
                    { value: "above", label: "Above logo" },
                    { value: "left", label: "Left of logo" },
                    { value: "right", label: "Right of logo" },
                    { value: "overlay", label: "Overlay on logo" },
                  ]}
                  onValueChange={(placement) =>
                    updateAnnotation(selected.id, {
                      label: { ...selected.label, placement },
                    })
                  }
                />
              </Field>
              <Field label="Size">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={8}
                    max={72}
                    step={1}
                    value={selected.style.fontSize ?? 18}
                    onChange={(event) =>
                      patchStyle({ fontSize: Number(event.target.value) })
                    }
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-700"
                  />
                  <span className="w-12 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-700">
                    {selected.style.fontSize ?? 18}
                  </span>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color">
                  <Input
                    type="color"
                    className="h-9 p-1"
                    value={selected.style.labelColor ?? selected.style.color ?? "#0f172a"}
                    onChange={(event) => patchStyle({ labelColor: event.target.value })}
                  />
                </Field>
                <Field label="Background">
                  <Input
                    type="color"
                    className="h-9 p-1"
                    value={selected.style.labelFill ?? "#ffffff"}
                    onChange={(event) =>
                      patchStyle({
                        labelFill: event.target.value,
                        labelFillOpacity: selected.style.labelFillOpacity ?? 0.85,
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          ) : null}
          <input
            ref={logoUploadRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
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
                await applyLogoAsset(asset.id);
              } finally {
                setUploadingLogo(false);
                if (logoUploadRef.current) logoUploadRef.current.value = "";
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            loading={uploadingLogo}
            onClick={() => logoUploadRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Upload custom logo
          </Button>
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
            <CustomSelect
              value={selected.spaceId ?? ""}
              onValueChange={(value) =>
                updateAnnotation(selected.id, {
                  spaceId: value || null,
                })
              }
              options={[
                { value: "", label: "Not bound" },
                ...spaces.map((s) => ({
                  value: s.id,
                  label: `Suite ${s.suiteNumber}`,
                })),
              ]}
            />
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
  muted,
}: {
  label: string;
  logoAssetId?: string | null;
  muted?: boolean;
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
      <span className={cn("min-w-0 truncate", muted ? "text-slate-400" : undefined)}>
        {label}
        {muted ? " - no logo" : ""}
      </span>
    </span>
  );
}

function SliderControl({
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-700"
      />
      <span className="w-14 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-semibold text-slate-700">
        {format(value)}
      </span>
    </div>
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
