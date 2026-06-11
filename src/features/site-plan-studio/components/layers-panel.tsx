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

export function LayersPanel() {
  const layers = useStudioStore((s) => s.layers);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const setActiveLayer = useStudioStore((s) => s.setActiveLayer);
  const addLayer = useStudioStore((s) => s.addLayer);
  const updateLayer = useStudioStore((s) => s.updateLayer);
  const removeLayer = useStudioStore((s) => s.removeLayer);
  const moveLayer = useStudioStore((s) => s.moveLayer);

  const sorted = [...layers].sort((a, b) => b.sortOrder - a.sortOrder);

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
        {sorted.map((layer) => (
          <li
            key={layer.id}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm",
              layer.id === activeLayerId
                ? "border-brand-300 bg-brand-50"
                : "border-slate-200 bg-white",
            )}
          >
            <button
              className="flex-1 truncate text-left text-slate-700"
              onClick={() => setActiveLayer(layer.id)}
              title={layer.name}
            >
              {layer.name}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
