"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "../store";

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
          + Add
        </Button>
      </div>
      <ul className="space-y-1">
        {sorted.map((layer) => (
          <li
            key={layer.id}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm",
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
            <button
              title={layer.visible ? "Hide layer" : "Show layer"}
              className="px-1 text-xs text-slate-400 hover:text-slate-700"
              onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
            >
              {layer.visible ? "👁" : "–"}
            </button>
            <button
              title={layer.locked ? "Unlock layer" : "Lock layer"}
              className="px-1 text-xs text-slate-400 hover:text-slate-700"
              onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
            >
              {layer.locked ? "🔒" : "🔓"}
            </button>
            <button
              title="Move up"
              className="px-1 text-xs text-slate-400 hover:text-slate-700"
              onClick={() => moveLayer(layer.id, 1)}
            >
              ↑
            </button>
            <button
              title="Move down"
              className="px-1 text-xs text-slate-400 hover:text-slate-700"
              onClick={() => moveLayer(layer.id, -1)}
            >
              ↓
            </button>
            {layers.length > 1 ? (
              <button
                title="Delete layer"
                className="px-1 text-xs text-red-400 hover:text-red-600"
                onClick={() => removeLayer(layer.id)}
              >
                ✕
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
