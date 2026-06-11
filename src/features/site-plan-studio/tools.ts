import type {
  AnnotationStyle,
  AnnotationType,
} from "@/types/annotations";

/**
 * Tool registry. Every tool is data + a creation mode the canvas understands;
 * adding a tool never touches the editor core.
 */
export type ToolCreationMode =
  | "select"
  | "drag-rect" // press-drag-release creates a rect geometry
  | "polygon" // click to add points, double-click / Enter to finish
  | "two-point" // press-drag-release creates a 2-point line
  | "point"; // single click placement

export type ToolDefinition = {
  id: AnnotationType | "select" | "pan";
  label: string;
  shortcut?: string;
  mode: ToolCreationMode;
  defaultStyle: AnnotationStyle;
  /** Default label payload for text-bearing annotations. */
  defaultText?: string;
};

export const tools: ToolDefinition[] = [
  { id: "select", label: "Select", shortcut: "V", mode: "select", defaultStyle: {} },
  { id: "pan", label: "Pan", shortcut: "H", mode: "select", defaultStyle: {} },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    mode: "drag-rect",
    defaultStyle: { fill: "#2563eb", fillOpacity: 0.25, stroke: "#2563eb", strokeWidth: 2 },
  },
  {
    id: "polygon",
    label: "Polygon",
    shortcut: "P",
    mode: "polygon",
    defaultStyle: { fill: "#2563eb", fillOpacity: 0.25, stroke: "#2563eb", strokeWidth: 2 },
  },
  {
    id: "parcel-boundary",
    label: "Parcel Boundary",
    mode: "polygon",
    defaultStyle: { stroke: "#dc2626", strokeWidth: 3, dash: [12, 6], fillOpacity: 0 },
  },
  {
    id: "pad-site",
    label: "Pad Site",
    mode: "drag-rect",
    defaultStyle: { fill: "#f59e0b", fillOpacity: 0.3, stroke: "#d97706", strokeWidth: 2, dash: [8, 4] },
  },
  {
    id: "dashed-outline",
    label: "Dashed Outline",
    mode: "drag-rect",
    defaultStyle: { stroke: "#0f3057", strokeWidth: 2, dash: [8, 4], fillOpacity: 0 },
  },
  {
    id: "arrow",
    label: "Arrow",
    shortcut: "A",
    mode: "two-point",
    defaultStyle: { stroke: "#0f3057", strokeWidth: 3 },
  },
  {
    id: "dimension",
    label: "Dimension",
    mode: "two-point",
    defaultStyle: { stroke: "#475569", strokeWidth: 1.5, fontSize: 14, color: "#475569" },
    defaultText: "0'",
  },
  {
    id: "suite-label",
    label: "Suite Label",
    shortcut: "S",
    mode: "point",
    defaultStyle: { fontSize: 18, color: "#0f172a" },
    defaultText: "Suite 100",
  },
  {
    id: "sqft-label",
    label: "SF Label",
    mode: "point",
    defaultStyle: { fontSize: 16, color: "#0f172a" },
    defaultText: "0 SF",
  },
  {
    id: "parking-label",
    label: "Parking Label",
    mode: "point",
    defaultStyle: { fontSize: 14, color: "#1e40af" },
    defaultText: "P: 120 spaces",
  },
  {
    id: "callout",
    label: "Callout",
    mode: "point",
    defaultStyle: { fontSize: 14, color: "#ffffff", fill: "#0f3057", fillOpacity: 1 },
    defaultText: "Callout",
  },
  {
    id: "tenant-logo",
    label: "Tenant Logo",
    mode: "point",
    defaultStyle: {},
  },
  {
    id: "directional-indicator",
    label: "North Arrow",
    mode: "point",
    defaultStyle: { fontSize: 26, color: "#0f172a" },
    defaultText: "▲ N",
  },
];

export function getTool(id: string): ToolDefinition {
  const tool = tools.find((t) => t.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}

export const textAnnotationTypes: AnnotationType[] = [
  "suite-label",
  "sqft-label",
  "parking-label",
  "callout",
  "dimension",
  "directional-indicator",
];

export const spaceBindableTypes: AnnotationType[] = [
  "rectangle",
  "polygon",
  "pad-site",
  "dashed-outline",
];
