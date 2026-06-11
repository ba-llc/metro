"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AssetRecordType,
  Tldraw,
  createShapeId,
  toRichText,
  type Editor,
  type TLAsset,
  type TLShape,
  type TLShapePartial,
} from "tldraw";
import { assetUrl } from "@/lib/api";
import type { AnnotationData } from "@/types/annotations";
import type { SitePlanPageDetail } from "../types";
import { useStudioStore } from "../store";

type TldrawStudioCanvasProps = {
  page: SitePlanPageDetail;
  resolveLabel: (annotation: AnnotationData) => string;
};

const BACKGROUND_ID = "site-plan-background";

export function TldrawStudioCanvas({
  page,
  resolveLabel,
}: TldrawStudioCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const syncingRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const annotations = useStudioStore((s) => s.annotations);
  const layers = useStudioStore((s) => s.layers);
  const updateAnnotation = useStudioStore((s) => s.updateAnnotation);
  const removeAnnotation = useStudioStore((s) => s.removeAnnotation);

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((layer) => layer.visible).map((layer) => layer.id)),
    [layers],
  );
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => visibleLayerIds.has(annotation.layerId)),
    [annotations, visibleLayerIds],
  );

  const syncTldrawToStore = useCallback(
    (editor: Editor) => {
      if (syncingRef.current) return;
      const seen = new Set<string>();
      for (const shape of editor.getCurrentPageShapes()) {
        const annotationId = annotationIdForShape(shape);
        if (!annotationId) continue;
        seen.add(annotationId);
        const annotation = useStudioStore
          .getState()
          .annotations.find((candidate) => candidate.id === annotationId);
        if (!annotation) continue;
        const rect = rectFromShape(editor, shape, page.width, page.height);
        if (!rect) continue;
        updateAnnotation(annotationId, {
          geometry: {
            ...annotation.geometry,
            rect,
            rotation: shape.rotation ? radiansToDegrees(shape.rotation) : annotation.geometry.rotation,
          },
        });
      }

      for (const annotation of useStudioStore.getState().annotations) {
        if (!visibleLayerIds.has(annotation.layerId)) continue;
        if (seen.has(annotation.id)) continue;
        const hadShape = editor
          .getCurrentPageShapes()
          .some((shape) => annotationIdForShape(shape) === annotation.id);
        if (hadShape) removeAnnotation(annotation.id);
      }
    },
    [page.height, page.width, removeAnnotation, updateAnnotation, visibleLayerIds],
  );

  const rebuildDocument = useCallback(
    (editor: Editor) => {
      syncingRef.current = true;
      try {
        editor.selectAll();
        editor.deleteShapes(editor.getSelectedShapeIds());

        const backgroundAsset = imageAsset(
          AssetRecordType.createId(`${BACKGROUND_ID}-${page.id}`),
          `Page ${page.pageNumber}`,
          assetUrl(page.imageAssetId),
          page.width,
          page.height,
        );
        const assets: TLAsset[] = [backgroundAsset];
        const shapes: TLShapePartial[] = [
          {
            id: createShapeId(BACKGROUND_ID),
            type: "image",
            x: 0,
            y: 0,
            isLocked: true,
            props: {
              assetId: backgroundAsset.id,
              w: page.width,
              h: page.height,
              crop: null,
              altText: `Site plan page ${page.pageNumber}`,
            },
          } as TLShapePartial,
        ];

        for (const annotation of visibleAnnotations) {
          const shape = shapeFromAnnotation(annotation, page, resolveLabel, assets);
          if (shape) shapes.push(shape);
        }

        editor.createAssets(assets);
        editor.createShapes(shapes);
        editor.sendToBack([createShapeId(BACKGROUND_ID)]);
        editor.zoomToFit({ immediate: true });
        editor.setCurrentTool("select");
      } finally {
        window.setTimeout(() => {
          syncingRef.current = false;
        }, 0);
      }
    },
    [page, resolveLabel, visibleAnnotations],
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      rebuildDocument(editor);
      return editor.store.listen(
        () => {
          if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
          syncTimerRef.current = window.setTimeout(() => {
            syncTldrawToStore(editor);
          }, 250);
        },
        { scope: "document", source: "user" } as never,
      );
    },
    [rebuildDocument, syncTldrawToStore],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    rebuildDocument(editor);
  }, [rebuildDocument]);

  useEffect(
    () => () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    },
    [],
  );

  return (
    <div className="h-full min-h-0 bg-slate-100">
      <Tldraw key={page.id} onMount={handleMount} />
    </div>
  );
}

function shapeFromAnnotation(
  annotation: AnnotationData,
  page: SitePlanPageDetail,
  resolveLabel: (annotation: AnnotationData) => string,
  assets: TLAsset[],
): TLShapePartial | null {
  const rect = annotation.geometry.rect ?? rectFromPoints(annotation, page);
  if (!rect) return null;
  const x = rect.x * page.width;
  const y = rect.y * page.height;
  const w = Math.max(24, rect.w * page.width);
  const h = Math.max(24, rect.h * page.height);
  const id = createShapeId(`annotation-${annotation.id}`);
  const meta = { annotationId: annotation.id };
  const rotation = degreesToRadians(annotation.geometry.rotation ?? 0);

  if (annotation.type === "tenant-logo" && annotation.assetId) {
    const assetId = AssetRecordType.createId(`annotation-asset-${annotation.id}`);
    assets.push(imageAsset(assetId, "Tenant logo", assetUrl(annotation.assetId), w, h));
    return {
      id,
      type: "image",
      x,
      y,
      rotation,
      meta,
      props: {
        assetId,
        w,
        h,
        crop: null,
        altText: resolveLabel(annotation) || "Tenant logo",
      },
    } as TLShapePartial;
  }

  if (isTextAnnotation(annotation.type)) {
    return {
      id,
      type: "text",
      x,
      y,
      rotation,
      meta,
      props: {
        w,
        color: closestTldrawColor(annotation.style.color ?? annotation.style.stroke),
        size: textSize(annotation.style.fontSize),
        richText: toRichText(resolveLabel(annotation) || annotation.label?.text || "Label"),
      },
    } as TLShapePartial;
  }

  const fill = annotation.style.fillOpacity && annotation.style.fillOpacity > 0
    ? closestTldrawColor(annotation.style.fill)
    : "none";

  return {
    id,
    type: "geo",
    x,
    y,
    rotation,
    meta,
    props: {
      geo: annotation.type === "polygon" || annotation.type === "parcel-boundary" ? "cloud" : "rectangle",
      w,
      h,
      color: closestTldrawColor(annotation.style.stroke),
      fill,
      dash: annotation.style.dash?.length ? "dashed" : "draw",
      size: strokeSize(annotation.style.strokeWidth),
      richText: annotation.type === "pad-site" ? toRichText("Pad") : toRichText(""),
    },
  } as TLShapePartial;
}

function rectFromShape(
  editor: Editor,
  shape: TLShape,
  pageWidth: number,
  pageHeight: number,
): AnnotationData["geometry"]["rect"] | null {
  const bounds = editor.getShapePageBounds(shape);
  if (!bounds) return null;
  return {
    x: clamp(bounds.x / pageWidth),
    y: clamp(bounds.y / pageHeight),
    w: clamp(bounds.w / pageWidth),
    h: clamp(bounds.h / pageHeight),
  };
}

function rectFromPoints(
  annotation: AnnotationData,
  page: SitePlanPageDetail,
): AnnotationData["geometry"]["rect"] | null {
  const points = annotation.geometry.points;
  if (!points?.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(24 / page.width, maxX - minX),
    h: Math.max(24 / page.height, maxY - minY),
  };
}

function imageAsset(
  id: ReturnType<typeof AssetRecordType.createId>,
  name: string,
  src: string,
  w: number,
  h: number,
): TLAsset {
  return {
    id,
    typeName: "asset",
    type: "image",
    props: {
      src,
      name,
      w,
      h,
      mimeType: "image/png",
      isAnimated: false,
    },
    meta: {},
  } as TLAsset;
}

function annotationIdForShape(shape: TLShape): string | null {
  const meta = shape.meta as { annotationId?: unknown } | undefined;
  return typeof meta?.annotationId === "string" ? meta.annotationId : null;
}

function isTextAnnotation(type: AnnotationData["type"]) {
  return [
    "suite-label",
    "sqft-label",
    "parking-label",
    "callout",
    "directional-indicator",
  ].includes(type);
}

function closestTldrawColor(color?: string) {
  if (!color || color === "transparent") return "black";
  const normalized = color.toLowerCase();
  if (normalized.includes("ef4444") || normalized.includes("red")) return "red";
  if (normalized.includes("f59e0b") || normalized.includes("orange")) return "orange";
  if (normalized.includes("eab308") || normalized.includes("yellow")) return "yellow";
  if (normalized.includes("22c55e") || normalized.includes("green")) return "green";
  if (normalized.includes("2563eb") || normalized.includes("blue")) return "blue";
  if (normalized.includes("7c3aed") || normalized.includes("purple")) return "violet";
  if (normalized.includes("64748b") || normalized.includes("slate")) return "grey";
  return "black";
}

function strokeSize(width?: number) {
  if (!width || width <= 1) return "s";
  if (width <= 3) return "m";
  if (width <= 6) return "l";
  return "xl";
}

function textSize(fontSize?: number) {
  if (!fontSize || fontSize <= 14) return "s";
  if (fontSize <= 20) return "m";
  if (fontSize <= 32) return "l";
  return "xl";
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}
