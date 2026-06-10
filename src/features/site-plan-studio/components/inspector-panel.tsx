"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { labelize } from "@/lib/utils";
import { uploadAsset } from "@/lib/api";
import type { AnnotationData } from "@/types/annotations";
import type { SpaceRecord } from "@/features/properties/types";
import { useCreateSpace } from "@/features/properties/hooks";
import { spaceBindableTypes, textAnnotationTypes } from "../tools";
import { useStudioStore } from "../store";

export function InspectorPanel({
  propertyId,
  spaces,
}: {
  propertyId: string;
  spaces: SpaceRecord[];
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
      <p className="text-sm text-slate-500">
        Select an annotation to edit its style, label, and space binding.
      </p>
    );
  }

  const isText = textAnnotationTypes.includes(selected.type);
  const isBindable = spaceBindableTypes.includes(selected.type);
  const boundSpace = spaces.find((s) => s.id === selected.spaceId);

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
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {labelize(selected.type)}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
          onClick={() => removeAnnotation(selected.id)}
        >
          Delete
        </Button>
      </div>

      {isText ? (
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
      ) : null}

      {/* Label binding: derive text from the bound Space record. */}
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
                Suite {s.suiteNumber} — suite number
              </option>,
              <option key={`${s.id}-sf`} value={`squareFootage:${s.id}`}>
                Suite {s.suiteNumber} — square footage
              </option>,
            ])}
          </Select>
        </Field>
      ) : null}

      {/* Style */}
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

      {/* Tenant logo image */}
      {selected.type === "tenant-logo" ? (
        <Field label="Logo image">
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
      ) : null}

      {/* Space binding for shapes */}
      {isBindable ? (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Space Binding
          </h4>
          {boundSpace ? (
            <p className="text-sm text-slate-700">
              Bound to <strong>Suite {boundSpace.suiteNumber}</strong>
              {boundSpace.squareFootage
                ? ` (${boundSpace.squareFootage.toLocaleString()} SF)`
                : ""}
            </p>
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
          <div className="flex items-end gap-2">
            <Field label="New suite #" className="flex-1">
              <Input
                value={newSuite}
                onChange={(e) => setNewSuite(e.target.value)}
                placeholder="120"
              />
            </Field>
            <Field label="SF" className="flex-1">
              <Input
                value={newSf}
                onChange={(e) => setNewSf(e.target.value)}
                type="number"
              />
            </Field>
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
              Create
            </Button>
          </div>
          {selected.geometry.rect ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={mergeWithOther}>
                Merge Spaces
              </Button>
              <Button size="sm" variant="secondary" onClick={splitShape}>
                Split Space
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
