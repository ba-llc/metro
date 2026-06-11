"use client";

import {
  ArrowUpRight,
  BoxSelect,
  Building2,
  Compass,
  Image,
  MapPinned,
  MousePointer2,
  Pentagon,
  Square,
  Tag,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tools, type ToolDefinition } from "../tools";

const iconByTool: Record<string, React.ReactNode> = {
  select: <MousePointer2 className="size-5" />,
  rectangle: <Square className="size-5" />,
  polygon: <Pentagon className="size-5" />,
  "parcel-boundary": <MapPinned className="size-5" />,
  "pad-site": <Building2 className="size-5" />,
  "dashed-outline": <BoxSelect className="size-5" />,
  arrow: <ArrowUpRight className="size-5" />,
  dimension: <Tag className="size-5" />,
  "suite-label": <Type className="size-5" />,
  "sqft-label": <Type className="size-5" />,
  "parking-label": <Tag className="size-5" />,
  callout: <Tag className="size-5" />,
  "tenant-logo": <Image className="size-5" />,
  "directional-indicator": <Compass className="size-5" />,
};

const primaryTools = new Set([
  "select",
  "rectangle",
  "polygon",
  "pad-site",
  "arrow",
  "suite-label",
  "sqft-label",
  "callout",
  "tenant-logo",
  "directional-indicator",
]);

export function ToolRail({
  activeToolId,
  onToolChange,
}: {
  activeToolId: string;
  onToolChange: (toolId: string) => void;
}) {
  const visibleTools = tools.filter((tool) => primaryTools.has(tool.id));

  return (
    <div className="flex h-full flex-col items-center gap-2 overflow-y-auto p-3">
      {visibleTools.map((tool) => (
        <ToolButton
          key={tool.id}
          label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          active={activeToolId === tool.id}
          onClick={() => onToolChange(tool.id)}
          shortcut={tool.shortcut}
        >
          {iconForTool(tool)}
        </ToolButton>
      ))}
    </div>
  );
}

function iconForTool(tool: ToolDefinition) {
  return iconByTool[tool.id] ?? <MousePointer2 className="size-5" />;
}

function ToolButton({
  label,
  active,
  disabled,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative inline-flex size-12 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-brand-900 bg-brand-900 text-white shadow-lg shadow-brand-900/20"
          : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-brand-900 hover:shadow-sm",
      )}
    >
      {children}
      {shortcut ? (
        <span
          className={cn(
            "absolute bottom-1 right-1 rounded px-1 text-[9px] font-semibold",
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400",
          )}
        >
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
