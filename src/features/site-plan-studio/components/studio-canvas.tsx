"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  ChevronDown,
  LocateFixed,
  Minus,
  Move,
  Plus,
} from "lucide-react";
import { Stage, Layer, Image as KonvaImage, Rect, Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { AnnotationData } from "@/types/annotations";
import { assetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getTool } from "../tools";
import { useStudioStore } from "../store";
import { AnnotationNode } from "./annotation-node";
import { useHtmlImage } from "./use-html-image";
import type { SitePlanPageDetail } from "../types";
import type { StudioMode } from "./studio-shell";

type Point = { x: number; y: number };

export function StudioCanvas({
  page,
  resolveLabel,
  stageRef,
  mode,
  logoDropEnabled,
  symbolDropEnabled,
  logoPlacementRequest,
  toolInsertRequest,
  symbolPlacementRequest,
}: {
  page: SitePlanPageDetail;
  resolveLabel: (a: AnnotationData) => string;
  stageRef: React.RefObject<Konva.Stage | null>;
  mode: StudioMode;
  logoDropEnabled: boolean;
  symbolDropEnabled: boolean;
  logoPlacementRequest: { id: number; assetId: string } | null;
  toolInsertRequest: { id: number; toolId: string } | null;
  symbolPlacementRequest: { id: number; text: string } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: page.width, height: page.height });
  const [spacePan, setSpacePan] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const handledLogoPlacementRequest = useRef<number | null>(null);
  const handledToolInsertRequest = useRef<number | null>(null);
  const handledSymbolPlacementRequest = useRef<number | null>(null);
  const panStartRef = useRef<{ pointer: Point; pan: Point } | null>(null);

  const layers = useStudioStore((s) => s.layers);
  const annotations = useStudioStore((s) => s.annotations);
  const reviewSuggestions = useStudioStore((s) => s.reviewSuggestions);
  const selectedId = useStudioStore((s) => s.selectedId);
  const activeToolId = useStudioStore((s) => s.activeToolId);
  const select = useStudioStore((s) => s.select);
  const addAnnotation = useStudioStore((s) => s.addAnnotation);
  const updateAnnotation = useStudioStore((s) => s.updateAnnotation);
  const updateSuggestionAnnotation = useStudioStore((s) => s.updateSuggestionAnnotation);

  const background = useHtmlImage(assetUrl(page.imageAssetId));

  // Draft state while drawing.
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [draftCurrent, setDraftCurrent] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);

  const pageW = page.width;
  const pageH = page.height;
  const tool = getTool(activeToolId);
  const panMode = activeToolId === "pan" || spacePan;
  const scale = zoom;
  const reviewLayers = useMemo(
    () => reviewSuggestions?.layers ?? [],
    [reviewSuggestions],
  );
  const reviewAnnotations = useMemo(
    () => reviewSuggestions?.annotations ?? [],
    [reviewSuggestions],
  );
  const reviewAnnotationIds = useMemo(
    () => new Set(reviewAnnotations.map((a) => a.id)),
    [reviewAnnotations],
  );
  const allAnnotations = useMemo(
    () => [...annotations, ...reviewAnnotations],
    [annotations, reviewAnnotations],
  );
  const selectedAnnotation = useMemo(
    () => allAnnotations.find((a) => a.id === selectedId) ?? null,
    [allAnnotations, selectedId],
  );
  const selectedIsTenantLogo = selectedAnnotation?.type === "tenant-logo";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
      fitToScreen();
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageW, pageH]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePan(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePan(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Attach transformer to the selected rect-like node.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const isRect =
      selectedAnnotation &&
      (selectedAnnotation.type === "rectangle" ||
        selectedAnnotation.type === "pad-site" ||
        selectedAnnotation.type === "dashed-outline" ||
        selectedAnnotation.type === "tenant-logo");
    if (selectedId && isRect) {
      const node = stage.findOne(`#${selectedId}`);
      transformer.nodes(node ? [node] : []);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedId, selectedAnnotation, stageRef]);

  function pointerPagePos(): Point | null {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - pan.x) / scale / pageW,
      y: (pos.y - pan.y) / scale / pageH,
    };
  }

  function containerPointToPagePoint(point: Point): Point {
    return {
      x: (point.x - pan.x) / scale / pageW,
      y: (point.y - pan.y) / scale / pageH,
    };
  }

  function clampPoint(point: Point): Point {
    return {
      x: Math.min(Math.max(point.x, 0), 1),
      y: Math.min(Math.max(point.y, 0), 1),
    };
  }

  async function imageAspect(assetId: string): Promise<number> {
    const image = new window.Image();
    image.src = assetUrl(assetId);
    await image.decode().catch(
      () =>
        new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Logo image failed to load"));
        }),
    );
    return image.naturalWidth > 0 && image.naturalHeight > 0
      ? image.naturalWidth / image.naturalHeight
      : 1;
  }

  async function addLogoAt(assetId: string, center: Point) {
    const aspect = await imageAspect(assetId).catch(() => 1);
    const w = Math.min(0.12, Math.max(0.045, 0.07 * Math.min(aspect, 1.8)));
    const h = Math.min(0.12, Math.max(0.035, w / aspect));
    const clamped = clampPoint(center);
    addAnnotation({
      type: "tenant-logo",
      geometry: {
        rect: {
          x: Math.min(Math.max(clamped.x - w / 2, 0), 1 - w),
          y: Math.min(Math.max(clamped.y - h / 2, 0), 1 - h),
          w,
          h,
        },
      },
      style: {},
      label: null,
      assetId,
    });
  }

  function visibleCenterPoint(): Point | null {
    const el = containerRef.current;
    if (!el) return null;
    return containerPointToPagePoint({
      x: el.clientWidth / 2,
      y: el.clientHeight / 2,
    });
  }

  function addToolAt(toolId: string, center: Point) {
    const insertTool = getTool(toolId);
    const clamped = clampPoint(center);
    const type = insertTool.id as AnnotationData["type"];

    if (insertTool.mode === "drag-rect") {
      const w = type === "pad-site" ? 0.14 : 0.12;
      const h = type === "pad-site" ? 0.09 : 0.075;
      addAnnotation({
        type,
        geometry: {
          rect: {
            x: Math.min(Math.max(clamped.x - w / 2, 0), 1 - w),
            y: Math.min(Math.max(clamped.y - h / 2, 0), 1 - h),
            w,
            h,
          },
        },
        style: insertTool.defaultStyle,
        label: null,
      });
      return;
    }

    if (insertTool.mode === "polygon") {
      const w = type === "parcel-boundary" ? 0.16 : 0.12;
      const h = type === "parcel-boundary" ? 0.1 : 0.08;
      addAnnotation({
        type,
        geometry: {
          points: [
            clampPoint({ x: clamped.x, y: clamped.y - h / 2 }),
            clampPoint({ x: clamped.x + w / 2, y: clamped.y }),
            clampPoint({ x: clamped.x, y: clamped.y + h / 2 }),
            clampPoint({ x: clamped.x - w / 2, y: clamped.y }),
          ],
        },
        style: insertTool.defaultStyle,
        label: null,
      });
      return;
    }

    if (insertTool.mode === "two-point") {
      const dx = 0.07;
      addAnnotation({
        type,
        geometry: {
          points: [
            clampPoint({ x: clamped.x - dx, y: clamped.y }),
            clampPoint({ x: clamped.x + dx, y: clamped.y }),
          ],
        },
        style: insertTool.defaultStyle,
        label:
          type === "dimension"
            ? { text: insertTool.defaultText ?? "0'" }
            : null,
      });
      return;
    }

    if (insertTool.mode === "point") {
      if (type === "tenant-logo") return;
      addAnnotation({
        type,
        geometry: { points: [clamped] },
        style: insertTool.defaultStyle,
        label: { text: insertTool.defaultText ?? "Label" },
      });
    }
  }

  useEffect(() => {
    if (!logoPlacementRequest) return;
    if (handledLogoPlacementRequest.current === logoPlacementRequest.id) return;
    handledLogoPlacementRequest.current = logoPlacementRequest.id;
    const el = containerRef.current;
    if (!el) return;
    void addLogoAt(
      logoPlacementRequest.assetId,
      containerPointToPagePoint({
        x: el.clientWidth / 2,
        y: el.clientHeight / 2,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoPlacementRequest]);

  useEffect(() => {
    if (!toolInsertRequest) return;
    if (handledToolInsertRequest.current === toolInsertRequest.id) return;
    handledToolInsertRequest.current = toolInsertRequest.id;
    const center = visibleCenterPoint();
    if (!center) return;
    addToolAt(toolInsertRequest.toolId, center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInsertRequest]);

  function addSymbolAt(text: string, point: Point) {
    const clamped = clampPoint(point);
    addAnnotation({
      type: "directional-indicator",
      geometry: { points: [clamped] },
      style: { fontSize: 26, color: "#0f172a" },
      label: { text },
    });
  }

  useEffect(() => {
    if (!symbolPlacementRequest) return;
    if (handledSymbolPlacementRequest.current === symbolPlacementRequest.id) return;
    handledSymbolPlacementRequest.current = symbolPlacementRequest.id;
    const center = visibleCenterPoint();
    if (!center) return;
    addSymbolAt(symbolPlacementRequest.text, center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolPlacementRequest]);

  function supportsDrop(event: DragEvent<HTMLDivElement>) {
    const types = Array.from(event.dataTransfer.types);
    return (
      (logoDropEnabled &&
        types.includes("application/x-metro-logo-asset")) ||
      (symbolDropEnabled &&
        types.includes("application/x-metro-symbol"))
    );
  }

  function fitToScreen() {
    const el = containerRef.current;
    if (!el) return;
    const nextZoom = Math.min(
      (el.clientWidth - 96) / pageW,
      (el.clientHeight - 96) / pageH,
      1.25,
    );
    const safeZoom = Math.max(0.08, nextZoom);
    setZoom(safeZoom);
    setPan({
      x: Math.max(48, (el.clientWidth - pageW * safeZoom) / 2),
      y: Math.max(48, (el.clientHeight - pageH * safeZoom) / 2),
    });
  }

  function setZoomAroundCenter(nextZoom: number) {
    const el = containerRef.current;
    if (!el) {
      setZoom(nextZoom);
      return;
    }
    const center = { x: el.clientWidth / 2, y: el.clientHeight / 2 };
    zoomAroundPoint(nextZoom, center);
  }

  function zoomAroundPoint(nextZoom: number, point: Point) {
    const clamped = Math.min(Math.max(nextZoom, 0.1), 3);
    setPan((currentPan) => {
      const pagePoint = {
        x: (point.x - currentPan.x) / zoom,
        y: (point.y - currentPan.y) / zoom,
      };
      return {
        x: point.x - pagePoint.x * clamped,
        y: point.y - pagePoint.y * clamped,
      };
    });
    setZoom(clamped);
  }

  function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? 1.08 : 0.92;
    zoomAroundPoint(zoom * factor, pointer);
  }

  function finishPolygon() {
    if (polygonPoints.length >= 3) {
      addAnnotation({
        type: tool.id as AnnotationData["type"],
        geometry: { points: polygonPoints },
        style: tool.defaultStyle,
        label: null,
      });
    }
    setPolygonPoints([]);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && polygonPoints.length >= 3) finishPolygon();
      if (e.key === "Escape") setPolygonPoints([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonPoints, activeToolId]);

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (panMode && pointer) {
      setIsPanning(true);
      panStartRef.current = { pointer, pan };
      return;
    }

    const pos = pointerPagePos();
    if (!pos) return;

    if (tool.mode === "select") {
      if (e.target === e.target.getStage() || e.target.name() === "background") {
        select(null);
      }
      return;
    }

    if (tool.mode === "drag-rect" || tool.mode === "two-point") {
      setDraftStart(pos);
      setDraftCurrent(pos);
      return;
    }

    if (tool.mode === "polygon") {
      setPolygonPoints((pts) => [...pts, pos]);
      return;
    }

    if (tool.mode === "point") {
      if (tool.id === "tenant-logo") {
        return;
      } else {
        addAnnotation({
          type: tool.id as AnnotationData["type"],
          geometry: { points: [pos] },
          style: tool.defaultStyle,
          label: { text: tool.defaultText ?? "Label" },
        });
      }
    }
  }

  function onMouseMove() {
    if (isPanning) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      const start = panStartRef.current;
      if (pointer && start) {
        setPan({
          x: start.pan.x + pointer.x - start.pointer.x,
          y: start.pan.y + pointer.y - start.pointer.y,
        });
      }
      return;
    }

    if (draftStart) {
      const pos = pointerPagePos();
      if (pos) setDraftCurrent(pos);
    }
  }

  function onMouseUp() {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    if (!draftStart || !draftCurrent) return;
    const start = draftStart;
    const end = draftCurrent;
    setDraftStart(null);
    setDraftCurrent(null);

    if (tool.mode === "drag-rect") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < 0.005 || h < 0.005) return;
      addAnnotation({
        type: tool.id as AnnotationData["type"],
        geometry: { rect: { x, y, w, h } },
        style: tool.defaultStyle,
        label: null,
      });
    } else if (tool.mode === "two-point") {
      if (Math.hypot(end.x - start.x, end.y - start.y) < 0.005) return;
      addAnnotation({
        type: tool.id as AnnotationData["type"],
        geometry: { points: [start, end] },
        style: tool.defaultStyle,
        label:
          tool.id === "dimension" ? { text: tool.defaultText ?? "0'" } : null,
      });
    }
  }

  const sortedLayers = [...layers].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedReviewLayers = [...reviewLayers].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden bg-slate-200"
      style={{
        cursor: panMode ? (isPanning ? "grabbing" : "grab") : tool.mode === "select" ? "default" : "crosshair",
      }}
      onDragOver={(event) => {
        if (!supportsDrop(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        const assetId = event.dataTransfer.getData("application/x-metro-logo-asset");
        const symbol = event.dataTransfer.getData("application/x-metro-symbol");
        if (!supportsDrop(event) || (!assetId && !symbol)) return;
        event.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const point = containerPointToPagePoint({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        if (assetId) {
          void addLogoAt(assetId, point);
        } else if (symbol) {
          addSymbolAt(symbol, point);
        }
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.85),transparent_30rem),linear-gradient(135deg,#dfe8f2,#f8fbfd)]" />
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={scale}
        scaleY={scale}
        x={pan.x}
        y={pan.y}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
      >
        {/* Locked background: the immutable page raster. */}
        <Layer listening={tool.mode === "select"}>
          {background ? (
            <KonvaImage
              name="background"
              image={background}
              width={pageW}
              height={pageH}
              listening
            />
          ) : (
            <Rect width={pageW} height={pageH} fill="#ffffff" name="background" />
          )}
        </Layer>

        {sortedLayers.map((layer) =>
          layer.visible ? (
            <Layer key={layer.id} listening={!layer.locked && tool.mode === "select"}>
              {annotations
                .filter((a) => a.layerId === layer.id)
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((a) => (
                  <AnnotationNode
                    key={a.id}
                    annotation={a}
                    pageW={pageW}
                    pageH={pageH}
                    interactive={!layer.locked && tool.mode === "select"}
                    resolveLabel={resolveLabel}
                    onSelect={() => select(a.id)}
                    onChange={(patch) => updateAnnotation(a.id, patch)}
                  />
                ))}
            </Layer>
          ) : null,
        )}

        {sortedReviewLayers.map((layer) =>
          layer.visible ? (
            <Layer key={layer.id} listening={!layer.locked && tool.mode === "select"}>
              {reviewAnnotations
                .filter((a) => a.layerId === layer.id)
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((a) => (
                  <AnnotationNode
                    key={a.id}
                    annotation={a}
                    pageW={pageW}
                    pageH={pageH}
                    interactive={!layer.locked && tool.mode === "select"}
                    resolveLabel={resolveLabel}
                    onSelect={() => select(a.id)}
                    onChange={(patch) =>
                      reviewAnnotationIds.has(a.id)
                        ? updateSuggestionAnnotation(a.id, patch)
                        : updateAnnotation(a.id, patch)
                    }
                  />
                ))}
            </Layer>
          ) : null,
        )}

        {/* Draft overlay while drawing. */}
        <Layer listening={false}>
          {draftStart && draftCurrent && tool.mode === "drag-rect" ? (
            <Rect
              x={Math.min(draftStart.x, draftCurrent.x) * pageW}
              y={Math.min(draftStart.y, draftCurrent.y) * pageH}
              width={Math.abs(draftCurrent.x - draftStart.x) * pageW}
              height={Math.abs(draftCurrent.y - draftStart.y) * pageH}
              stroke="#2563eb"
              dash={[6, 4]}
              strokeWidth={1.5}
            />
          ) : null}
          {draftStart && draftCurrent && tool.mode === "two-point" ? (
            <Line
              points={[
                draftStart.x * pageW,
                draftStart.y * pageH,
                draftCurrent.x * pageW,
                draftCurrent.y * pageH,
              ]}
              stroke="#2563eb"
              strokeWidth={2}
              dash={[6, 4]}
            />
          ) : null}
          {polygonPoints.length > 0 ? (
            <Line
              points={polygonPoints.flatMap((p) => [p.x * pageW, p.y * pageH])}
              stroke="#2563eb"
              strokeWidth={2}
              dash={[6, 4]}
            />
          ) : null}
        </Layer>

        <Layer>
          <Transformer
            ref={transformerRef}
            rotateEnabled={!selectedIsTenantLogo}
            flipEnabled={false}
            keepRatio={selectedIsTenantLogo}
            enabledAnchors={
              selectedIsTenantLogo
                ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                : undefined
            }
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              if (!selectedIsTenantLogo) return newBox;
              const ratio = oldBox.width / oldBox.height || 1;
              const side = Math.max(Math.abs(newBox.width), Math.abs(newBox.height) * ratio);
              return {
                ...newBox,
                width: side,
                height: side / ratio,
              };
            }}
          />
        </Layer>
      </Stage>

      <div className="absolute left-4 top-4 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur">
        {mode === "review" ? "AI Review" : "Edit"} / {Math.round(zoom * 100)}%
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          onClick={() => setZoomAroundCenter(zoom * 0.85)}
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-900"
            style={{ width: `${Math.min(100, Math.max(6, (zoom / 3) * 100))}%` }}
          />
        </div>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          onClick={() => setZoomAroundCenter(zoom * 1.15)}
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-brand-900 transition hover:bg-slate-100"
          onClick={fitToScreen}
        >
          <LocateFixed className="size-4" />
          Fit
        </button>
      </div>

      <div className="absolute bottom-4 right-4 h-28 w-36 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur">
        <div className="relative h-full rounded-xl border border-slate-200 bg-slate-50">
          <div
            className="absolute rounded border-2 border-brand-500 bg-brand-500/10"
            style={miniViewportStyle({
              container: containerRef.current,
              pageW,
              pageH,
              pan,
              zoom,
          containerSize,
            })}
          />
        </div>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-lg backdrop-blur">
        <Move className={cn("size-4", panMode ? "text-brand-900" : "text-slate-400")} />
        <span>Space + drag to pan</span>
        <ChevronDown className="size-3 text-slate-400" />
      </div>
    </div>
  );
}

function miniViewportStyle({
  container,
  containerSize,
  pageW,
  pageH,
  pan,
  zoom,
}: {
  container: HTMLDivElement | null;
  containerSize: { width: number; height: number };
  pageW: number;
  pageH: number;
  pan: Point;
  zoom: number;
}): React.CSSProperties {
  if (!container) return { left: "20%", top: "20%", width: "50%", height: "50%" };
  const visible = {
    x: Math.max(0, -pan.x / zoom),
    y: Math.max(0, -pan.y / zoom),
    w: Math.min(pageW, containerSize.width / zoom),
    h: Math.min(pageH, containerSize.height / zoom),
  };
  return {
    left: `${(visible.x / pageW) * 100}%`,
    top: `${(visible.y / pageH) * 100}%`,
    width: `${Math.min(100, (visible.w / pageW) * 100)}%`,
    height: `${Math.min(100, (visible.h / pageH) * 100)}%`,
  };
}
