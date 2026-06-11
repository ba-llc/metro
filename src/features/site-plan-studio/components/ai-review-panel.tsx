"use client";

import { Check, MousePointer2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "../store";
import { StudioPanel } from "./studio-shell";

export function AiReviewPanel({
  onContinueEditing,
}: {
  onContinueEditing: () => void;
}) {
  const layers = useStudioStore((s) => s.layers);
  const annotations = useStudioStore((s) => s.annotations);
  const select = useStudioStore((s) => s.select);
  const removeLayer = useStudioStore((s) => s.removeLayer);
  const updateLayer = useStudioStore((s) => s.updateLayer);

  const suggestionLayers = layers.filter((layer) =>
    layer.name.startsWith("AI Suggestions"),
  );
  const suggestionLayerIds = new Set(suggestionLayers.map((layer) => layer.id));
  const suggestions = annotations.filter((annotation) =>
    suggestionLayerIds.has(annotation.layerId),
  );

  return (
    <StudioPanel
      title="AI Review"
      description="Review generated overlays before treating them as broker-edited annotations."
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {suggestions.length} suggestions ready
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                These are editable annotations. Move anything that is off, then
                accept the layer or discard and analyze again.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => {
              for (const layer of suggestionLayers) {
                updateLayer(layer.id, { name: "Broker Edits" });
              }
              onContinueEditing();
            }}
          >
            <Check className="size-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              for (const layer of suggestionLayers) {
                removeLayer(layer.id);
              }
              onContinueEditing();
            }}
          >
            <Trash2 className="size-4" />
            Discard
          </Button>
        </div>

        <div className="space-y-2">
          {suggestions.slice(0, 12).map((annotation, index) => (
            <button
              key={annotation.id}
              type="button"
              onClick={() => select(annotation.id)}
              className="grid w-full grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">
                  {annotation.type}
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MousePointer2 className="size-3" />
                  Focus and adjust
                </span>
              </span>
            </button>
          ))}
          {suggestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No AI suggestion layer is active. Run AI Analyze to create one.
            </p>
          ) : null}
        </div>
      </div>
    </StudioPanel>
  );
}
