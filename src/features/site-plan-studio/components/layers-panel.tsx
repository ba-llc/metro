"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "../store";
import type { AnnotationData, AnnotationType } from "@/types/annotations";

function LayerIconButton({
  title,
  className,
  onClick,
  children,
}: {
  title: string;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function LayersPanel({
  assetLabelsById = {},
}: {
  assetLabelsById?: Record<string, string>;
}) {
  const layers = useStudioStore((s) => s.layers);
  const annotations = useStudioStore((s) => s.annotations);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const selectedId = useStudioStore((s) => s.selectedId);
  const setActiveLayer = useStudioStore((s) => s.setActiveLayer);
  const select = useStudioStore((s) => s.select);
  const addLayer = useStudioStore((s) => s.addLayer);
  const updateLayer = useStudioStore((s) => s.updateLayer);
  const removeLayer = useStudioStore((s) => s.removeLayer);
  const moveLayer = useStudioStore((s) => s.moveLayer);
  const removeAnnotation = useStudioStore((s) => s.removeAnnotation);

  const sorted = [...layers].sort((a, b) => b.sortOrder - a.sortOrder);
  const annotationsByLayer = new Map<string, AnnotationData[]>();
  for (const annotation of annotations) {
    const existing = annotationsByLayer.get(annotation.layerId) ?? [];
    existing.push(annotation);
    annotationsByLayer.set(annotation.layerId, existing);
  }
  for (const items of annotationsByLayer.values()) {
    items.sort((a, b) => b.zIndex - a.zIndex);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Layers
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => addLayer(`Layer ${layers.length + 1}`)}
        >
          <Plus className="mr-1 size-3.5" />
          Add
        </Button>
      </div>
      <ul className="space-y-1">
        {sorted.map((layer) => {
          const layerAnnotations = annotationsByLayer.get(layer.id) ?? [];
          return (
            <li key={layer.id} className="space-y-1">
              <div
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm",
                  layer.id === activeLayerId
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200 bg-white",
                )}
              >
                <button
                  className="min-w-0 flex-1 truncate text-left text-slate-700"
                  onClick={() => setActiveLayer(layer.id)}
                  title={layer.name}
                >
                  {layer.name}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {layerAnnotations.length}
                  </span>
                </button>
                <LayerIconButton
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                >
                  {layer.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </LayerIconButton>
                <LayerIconButton
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
                >
                  {layer.locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                </LayerIconButton>
                <LayerIconButton title="Move up" onClick={() => moveLayer(layer.id, 1)}>
                  <ArrowUp className="size-4" />
                </LayerIconButton>
                <LayerIconButton title="Move down" onClick={() => moveLayer(layer.id, -1)}>
                  <ArrowDown className="size-4" />
                </LayerIconButton>
                {layers.length > 1 ? (
                  <LayerIconButton
                    title="Delete layer"
                    className="text-red-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeLayer(layer.id)}
                  >
                    <Trash2 className="size-4" />
                  </LayerIconButton>
                ) : null}
              </div>
              {layerAnnotations.length > 0 ? (
                <ul className="space-y-1 pl-3">
                  {layerAnnotations.map((annotation) => (
                    <li
                      key={annotation.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition",
                        annotation.id === selectedId
                          ? "border-brand-300 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        title={annotationLayerItemLabel(annotation, assetLabelsById)}
                        onClick={() => {
                          setActiveLayer(layer.id);
                          select(annotation.id);
                        }}
                      >
                        <span className="block truncate font-medium">
                          {annotationLayerItemLabel(annotation, assetLabelsById)}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {annotation.type}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Delete overlay"
                        aria-label={`Delete ${annotationLayerItemLabel(annotation, assetLabelsById)}`}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeAnnotation(annotation.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-3 text-xs text-slate-400">No overlays in this layer</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function annotationLayerItemLabel(
  annotation: AnnotationData,
  assetLabelsById: Record<string, string>,
): string {
  const text = annotation.label?.text?.trim();
  if (text) return text;
  if (annotation.type === "tenant-logo" && annotation.assetId) {
    const assetLabel = assetLabelsById[annotation.assetId]?.trim();
    if (assetLabel) return assetLabel;
  }
  return annotationTypeLabel(annotation.type);
}

function annotationTypeLabel(type: AnnotationType): string {
  switch (type) {
    case "tenant-logo":
      return "Tenant logo";
    case "directional-indicator":
      return "Directional indicator";
    case "suite-label":
      return "Suite label";
    case "sqft-label":
      return "Square footage label";
    case "parking-label":
      return "Parking label";
    case "parcel-boundary":
      return "Parcel boundary";
    case "pad-site":
      return "Pad site";
    case "dashed-outline":
      return "Dashed outline";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");
  }
}
