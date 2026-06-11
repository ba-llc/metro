"use client";

import {
  Building2,
  Hand,
  Layers2,
  MapPinned,
  MousePointer2,
  Navigation,
  SquarePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tools, type ToolDefinition } from "../tools";

const iconByTool: Record<string, React.ReactNode> = {
  select: <MousePointer2 className="size-5" />,
  pan: <Hand className="size-5" />,
  "tenant-logo": <Building2 className="size-5" />,
  "directional-indicator": <Navigation className="size-5" />,
};

const primaryTools = new Set([
  "select",
  "pan",
  "rectangle",
  "tenant-logo",
  "directional-indicator",
]);

const overlayTools = new Set([
  "rectangle",
  "polygon",
  "pad-site",
  "parcel-boundary",
  "dashed-outline",
  "arrow",
  "dimension",
  "suite-label",
  "sqft-label",
  "parking-label",
  "callout",
]);

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
  const selectTool = visibleTools.find((tool) => tool.id === "select");
  const panTool = visibleTools.find((tool) => tool.id === "pan");
  const overlayTool = visibleTools.find((tool) => tool.id === "rectangle");
  const imageTool = visibleTools.find((tool) => tool.id === "tenant-logo");
  const otherTools = visibleTools.filter(
    (tool) =>
      tool.id !== "select" &&
      tool.id !== "pan" &&
      tool.id !== "rectangle" &&
      tool.id !== "tenant-logo",
  );

  return (
    <div className="flex h-full flex-col items-center gap-2 overflow-y-auto p-3">
      {selectTool ? (
        <ToolButton
          label={`${selectTool.label}${selectTool.shortcut ? ` (${selectTool.shortcut})` : ""}`}
          active={activeToolId === selectTool.id}
          onClick={() => onToolChange(selectTool.id)}
          shortcut={selectTool.shortcut}
        >
          {iconForTool(selectTool)}
        </ToolButton>
      ) : null}
      {panTool ? (
        <ToolButton
          label={`${panTool.label}${panTool.shortcut ? ` (${panTool.shortcut})` : ""}`}
          active={activeToolId === panTool.id}
          onClick={() => onToolChange(panTool.id)}
          shortcut={panTool.shortcut}
        >
          {iconForTool(panTool)}
        </ToolButton>
      ) : null}
      {onPagesOpen ? (
        <ToolButton
          label="Pages"
          active={pagesActive}
          onClick={onPagesOpen}
        >
          <Layers2 className="size-5" />
        </ToolButton>
      ) : null}
      {onMapsOpen ? (
        <ToolButton
          label="Generated Maps"
          active={mapsActive}
          onClick={onMapsOpen}
        >
          <MapPinned className="size-5" />
        </ToolButton>
      ) : null}
      {overlayTool ? (
        <ToolButton
          label="Add Overlay"
          active={overlayTools.has(activeToolId)}
          onClick={() => onToolChange(overlayTool.id)}
        >
          <SquarePlus className="size-5" />
        </ToolButton>
      ) : null}
      {imageTool ? (
        <ToolButton
          label={`${imageTool.label}${imageTool.shortcut ? ` (${imageTool.shortcut})` : ""}`}
          active={activeToolId === imageTool.id}
          onClick={() => onToolChange(imageTool.id)}
          shortcut={imageTool.shortcut}
        >
          {iconForTool(imageTool)}
        </ToolButton>
      ) : null}
      {otherTools.map((tool) => (
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
