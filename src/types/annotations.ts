import { z } from "zod";

export const annotationTypes = [
  "rectangle",
  "polygon",
  "parcel-boundary",
  "pad-site",
  "dashed-outline",
  "arrow",
  "dimension",
  "suite-label",
  "sqft-label",
  "parking-label",
  "callout",
  "tenant-logo",
  "directional-indicator",
] as const;

export type AnnotationType = (typeof annotationTypes)[number];

const pointSchema = z.object({ x: z.number(), y: z.number() });

/** Normalized 0-1 coordinates relative to page dimensions. */
export const annotationGeometrySchema = z.object({
  points: z.array(pointSchema).optional(),
  rect: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .optional(),
  rotation: z.number().optional(),
});

export const annotationStyleSchema = z.object({
  fill: z.string().optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  dash: z.array(z.number()).optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  labelFill: z.string().optional(),
  labelFillOpacity: z.number().min(0).max(1).optional(),
  labelColor: z.string().optional(),
});

export const annotationLabelSchema = z.object({
  text: z.string().optional(),
  placement: z
    .enum(["below", "above", "left", "right", "overlay"])
    .optional(),
  binding: z
    .object({
      entity: z.literal("space"),
      field: z.enum([
        "suiteNumber",
        "squareFootage",
        "suiteAndSquareFootage",
        "askingRate",
      ]),
      format: z.string().optional(),
    })
    .optional(),
});

export const annotationSchema = z.object({
  id: z.string(),
  layerId: z.string(),
  type: z.enum(annotationTypes),
  geometry: annotationGeometrySchema,
  style: annotationStyleSchema,
  label: annotationLabelSchema.nullable().optional(),
  spaceId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  zIndex: z.number().int(),
});

export const annotationLayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  sortOrder: z.number().int(),
  visible: z.boolean(),
  locked: z.boolean(),
});

/** Batch save payload for a site plan page. */
export const pageAnnotationsSchema = z.object({
  layers: z.array(annotationLayerSchema),
  annotations: z.array(annotationSchema),
});

export type AnnotationGeometry = z.infer<typeof annotationGeometrySchema>;
export type AnnotationStyle = z.infer<typeof annotationStyleSchema>;
export type AnnotationLabel = z.infer<typeof annotationLabelSchema>;
export type AnnotationData = z.infer<typeof annotationSchema>;
export type AnnotationLayerData = z.infer<typeof annotationLayerSchema>;
export type PageAnnotations = z.infer<typeof pageAnnotationsSchema>;
