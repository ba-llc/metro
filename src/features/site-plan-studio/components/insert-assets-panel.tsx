"use client";

import {
  ArrowUpRight,
  BoxSelect,
  Diamond,
  MapPinned,
  MessageSquare,
  Ruler,
  Square,
  Tag,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTool } from "../tools";
import { StudioPanel } from "./studio-shell";

const shapeTools = [
  "rectangle",
  "polygon",
  "pad-site",
  "parcel-boundary",
  "dashed-outline",
] as const;

const lineTools = ["arrow", "dimension"] as const;

const textTools = [
  "suite-label",
  "sqft-label",
  "parking-label",
  "callout",
] as const;

const iconByTool: Record<string, React.ReactNode> = {
  rectangle: <Square className="size-5" />,
  polygon: <Diamond className="size-5" />,
  "pad-site": <Square className="size-5" />,
  "parcel-boundary": <MapPinned className="size-5" />,
  "dashed-outline": <BoxSelect className="size-5" />,
  arrow: <ArrowUpRight className="size-5" />,
  dimension: <Ruler className="size-5" />,
  "suite-label": <Type className="size-5" />,
  "sqft-label": <Type className="size-5" />,
  "parking-label": <Tag className="size-5" />,
  callout: <MessageSquare className="size-5" />,
};

export function InsertAssetsPanel({
  activeToolId,
  onInsert,
}: {
  activeToolId: string;
  onInsert: (toolId: string) => void;
}) {
  if (!isOverlayTool(activeToolId)) return null;

  return (
    <StudioPanel
      title="Add Overlay"
      description="Choose an item to add to the current page."
    >
      <div className="space-y-5">
        <ToolGroup
          title="Shapes"
          items={shapeTools}
          activeToolId={activeToolId}
          onInsert={onInsert}
        />
        <ToolGroup
          title="Lines"
          items={lineTools}
          activeToolId={activeToolId}
          onInsert={onInsert}
        />
        <ToolGroup
          title="Text"
          items={textTools}
          activeToolId={activeToolId}
          onInsert={onInsert}
        />
      </div>
    </StudioPanel>
  );
}

function ToolGroup({
  title,
  items,
  activeToolId,
  onInsert,
}: {
  title: string;
  items: readonly string[];
  activeToolId: string;
  onInsert: (toolId: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((toolId) => {
          const tool = getTool(toolId);
          const selected = toolId === activeToolId;
          return (
            <button
              key={toolId}
              type="button"
              onClick={() => onInsert(toolId)}
              className={cn(
                "group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-3 text-center shadow-sm transition",
                selected
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 hover:border-brand-300 hover:bg-brand-50",
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-900">
                {iconByTool[toolId]}
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function isOverlayTool(activeToolId: string): boolean {
  return (
    shapeTools.includes(activeToolId as (typeof shapeTools)[number]) ||
    lineTools.includes(activeToolId as (typeof lineTools)[number]) ||
    textTools.includes(activeToolId as (typeof textTools)[number])
  );
}
