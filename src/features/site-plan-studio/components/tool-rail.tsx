"use client";

import {
  ArrowUpRight,
  Hand,
  Image,
  Layers2,
  MapPinned,
  MousePointer2,
  Navigation,
  Square,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tools, type ToolDefinition } from "../tools";

const iconByTool: Record<string, React.ReactNode> = {
  select: <MousePointer2 className="size-5" />,
  pan: <Hand className="size-5" />,
  rectangle: <Square className="size-5" />,
  arrow: <ArrowUpRight className="size-5" />,
  "suite-label": <Type className="size-5" />,
  "tenant-logo": <Image className="size-5" />,
  "directional-indicator": <Navigation className="size-5" />,
};

const primaryTools = new Set([
  "select",
  "pan",
  "rectangle",
  "arrow",
  "suite-label",
  "tenant-logo",
  "directional-indicator",
]);

const railLabelByTool: Record<string, string> = {
  rectangle: "Shapes",
  "suite-label": "Text",
};

export function ToolRail({
  activeToolId,
  pagesActive = false,
  mapsActive = false,
  onToolChange,
  onPagesOpen,
  onMapsOpen,
}: {
  activeToolId: string;
  pagesActive?: boolean;
  mapsActive?: boolean;
  onToolChange: (toolId: string) => void;
  onPagesOpen?: () => void;
  onMapsOpen?: () => void;
}) {
  const visibleTools = tools.filter((tool) => primaryTools.has(tool.id));

  return (
    <div className="flex h-full flex-col items-center gap-2 overflow-y-auto p-3">
      {onPagesOpen ? (
        <ToolButton
          label="Pages"
          active={pagesActive}
          onClick={onPagesOpen}
        >
          <Layers2 className="size-5" />
        </ToolButton>
      ) : null}
      {visibleTools.map((tool) => (
        <ToolButton
          key={tool.id}
          label={`${railLabelByTool[tool.id] ?? tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          active={activeToolId === tool.id}
          onClick={() => onToolChange(tool.id)}
          shortcut={tool.shortcut}
        >
          {iconForTool(tool)}
        </ToolButton>
      ))}
      {onMapsOpen ? (
        <ToolButton
          label="Generated Maps"
          active={mapsActive}
          onClick={onMapsOpen}
        >
          <MapPinned className="size-5" />
        </ToolButton>
      ) : null}
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
