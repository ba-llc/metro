"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { AnnotationData } from "@/types/annotations";
import { assetUrl } from "@/lib/api";
import { getTool } from "../tools";
import { useStudioStore } from "../store";
import { AnnotationNode } from "./annotation-node";
import { useHtmlImage } from "./use-html-image";
import type { SitePlanPageDetail } from "../types";

type Point = { x: number; y: number };

export function StudioCanvas({
  page,
  resolveLabel,
  stageRef,
}: {
  page: SitePlanPageDetail;
  resolveLabel: (a: AnnotationData) => string;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [scale, setScale] = useState(0.5);

  const layers = useStudioStore((s) => s.layers);
  const annotations = useStudioStore((s) => s.annotations);
  const selectedId = useStudioStore((s) => s.selectedId);
  const activeToolId = useStudioStore((s) => s.activeToolId);
  const select = useStudioStore((s) => s.select);
  const addAnnotation = useStudioStore((s) => s.addAnnotation);
  const updateAnnotation = useStudioStore((s) => s.updateAnnotation);

  const background = useHtmlImage(assetUrl(page.imageAssetId));

  // Draft state while drawing.
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [draftCurrent, setDraftCurrent] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);

  const pageW = page.width;
  const pageH = page.height;
  const tool = getTool(activeToolId);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(w / pageW, 1.25));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageW]);

  // Attach transformer to the selected rect-like node.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const selected = annotations.find((a) => a.id === selectedId);
    const isRect =
      selected &&
      (selected.type === "rectangle" ||
        selected.type === "pad-site" ||
        selected.type === "dashed-outline" ||
        selected.type === "tenant-logo");
    if (selectedId && isRect) {
      const node = stage.findOne(`#${selectedId}`);
      transformer.nodes(node ? [node] : []);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedId, annotations, stageRef]);

  function pointerPagePos(): Point | null {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale / pageW, y: pos.y / scale / pageH };
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
        addAnnotation({
          type: "tenant-logo",
          geometry: { rect: { x: pos.x, y: pos.y, w: 0.1, h: 0.05 } },
          style: tool.defaultStyle,
          label: null,
        });
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
    if (draftStart) {
      const pos = pointerPagePos();
      if (pos) setDraftCurrent(pos);
    }
  }

  function onMouseUp() {
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

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-slate-300 bg-slate-200"
      style={{ cursor: tool.mode === "select" ? "default" : "crosshair" }}
    >
      <Stage
        ref={stageRef}
        width={pageW * scale}
        height={pageH * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
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
            rotateEnabled
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>
    </div>
  );
}
