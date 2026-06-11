"use client";

import { Fragment } from "react";
import {
  Arrow,
  Image as KonvaImage,
  Label,
  Line,
  Rect,
  Tag,
  Text,
} from "react-konva";
import type Konva from "konva";
import type { AnnotationData } from "@/types/annotations";
import { assetUrl } from "@/lib/api";
import { useHtmlImage } from "./use-html-image";

type Props = {
  annotation: AnnotationData;
  pageW: number;
  pageH: number;
  interactive: boolean;
  resolveLabel: (a: AnnotationData) => string;
  onSelect: () => void;
  onChange: (patch: Partial<AnnotationData>) => void;
};

function withAlpha(hex: string | undefined, opacity: number | undefined): string | undefined {
  if (!hex) return undefined;
  const alpha = Math.round((opacity ?? 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return hex.length === 7 ? `${hex}${alpha}` : hex;
}

export function AnnotationNode({
  annotation: a,
  pageW,
  pageH,
  interactive,
  resolveLabel,
  onSelect,
  onChange,
}: Props) {
  const style = a.style;
  const stroke = style.stroke;
  const strokeWidth = style.strokeWidth ?? 2;
  const dash = style.dash;
  const fill = withAlpha(style.fill, style.fillOpacity);

  const common = {
    id: a.id,
    draggable: interactive,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const dx = node.x();
      const dy = node.y();
      node.position({ x: 0, y: 0 });
      moveBy(dx, dy);
    },
  };

  function moveBy(dxPx: number, dyPx: number) {
    const dx = dxPx / pageW;
    const dy = dyPx / pageH;
    if (a.geometry.rect) {
      onChange({
        geometry: {
          ...a.geometry,
          rect: {
            ...a.geometry.rect,
            x: a.geometry.rect.x + dx,
            y: a.geometry.rect.y + dy,
          },
        },
      });
    } else if (a.geometry.points) {
      onChange({
        geometry: {
          ...a.geometry,
          points: a.geometry.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        },
      });
    }
  }

  // --- Rect-based shapes ---
  if (
    (a.type === "rectangle" ||
      a.type === "pad-site" ||
      a.type === "dashed-outline") &&
    a.geometry.rect
  ) {
    const r = a.geometry.rect;
    return (
      <Rect
        {...common}
        x={0}
        y={0}
        offsetX={-r.x * pageW}
        offsetY={-r.y * pageH}
        width={r.w * pageW}
        height={r.h * pageH}
        rotation={a.geometry.rotation ?? 0}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scale({ x: 1, y: 1 });
          const x = node.x();
          const y = node.y();
          node.position({ x: 0, y: 0 });
          onChange({
            geometry: {
              ...a.geometry,
              rect: {
                x: r.x + x / pageW,
                y: r.y + y / pageH,
                w: Math.max(0.005, (r.w * scaleX * pageW) / pageW),
                h: Math.max(0.005, (r.h * scaleY * pageH) / pageH),
              },
              rotation: node.rotation(),
            },
          });
        }}
      />
    );
  }

  // --- Polygon shapes ---
  if (
    (a.type === "polygon" || a.type === "parcel-boundary") &&
    a.geometry.points
  ) {
    const flat = a.geometry.points.flatMap((p) => [p.x * pageW, p.y * pageH]);
    return (
      <Line
        {...common}
        points={flat}
        closed
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
      />
    );
  }

  // --- Arrow ---
  if (a.type === "arrow" && a.geometry.points && a.geometry.points.length >= 2) {
    const flat = a.geometry.points.flatMap((p) => [p.x * pageW, p.y * pageH]);
    return (
      <Arrow
        {...common}
        points={flat}
        stroke={stroke}
        fill={stroke}
        strokeWidth={strokeWidth}
        pointerLength={12}
        pointerWidth={12}
      />
    );
  }

  // --- Dimension (double-ended arrow + measurement text) ---
  if (
    a.type === "dimension" &&
    a.geometry.points &&
    a.geometry.points.length >= 2
  ) {
    const [p1, p2] = a.geometry.points;
    if (!p1 || !p2) return null;
    const x1 = p1.x * pageW;
    const y1 = p1.y * pageH;
    const x2 = p2.x * pageW;
    const y2 = p2.y * pageH;
    return (
      <Fragment>
        <Arrow
          {...common}
          points={[x1, y1, x2, y2]}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
          pointerLength={8}
          pointerWidth={8}
          pointerAtBeginning
        />
        <Text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - (style.fontSize ?? 14) - 4}
          text={resolveLabel(a)}
          fontSize={style.fontSize ?? 14}
          fill={style.color ?? "#475569"}
          listening={false}
        />
      </Fragment>
    );
  }

  // --- Tenant logo ---
  if (a.type === "tenant-logo" && a.geometry.rect) {
    const r = a.geometry.rect;
    return (
      <TenantLogoNode
        common={common}
        rect={{ x: r.x * pageW, y: r.y * pageH, w: r.w * pageW, h: r.h * pageH }}
        pageW={pageW}
        pageH={pageH}
        assetId={a.assetId ?? null}
        onChange={onChange}
      />
    );
  }

  // --- Text-bearing point annotations ---
  if (a.geometry.points && a.geometry.points.length >= 1) {
    const p = a.geometry.points[0];
    if (!p) return null;
    const x = p.x * pageW;
    const y = p.y * pageH;
    const text = resolveLabel(a);
    const fontSize = style.fontSize ?? 16;

    if (a.type === "callout") {
      return (
        <Label {...common} x={x} y={y}>
          <Tag
            fill={style.fill ?? "#0f3057"}
            cornerRadius={4}
            pointerDirection="down"
            pointerWidth={10}
            pointerHeight={8}
          />
          <Text
            text={text}
            fontSize={fontSize}
            fill={style.color ?? "#ffffff"}
            padding={8}
          />
        </Label>
      );
    }

    return (
      <Text
        {...common}
        x={x}
        y={y}
        text={text}
        fontSize={fontSize}
        fontStyle="bold"
        fill={style.color ?? "#0f172a"}
      />
    );
  }

  return null;
}

function TenantLogoNode({
  common,
  rect,
  pageW,
  pageH,
  assetId,
  onChange,
}: {
  common: Record<string, unknown>;
  rect: { x: number; y: number; w: number; h: number };
  pageW: number;
  pageH: number;
  assetId: string | null;
  onChange: (patch: Partial<AnnotationData>) => void;
}) {
  const image = useHtmlImage(assetId ? assetUrl(assetId) : null);
  if (!image) return null;

  const imageAspect =
    image.naturalWidth > 0 && image.naturalHeight > 0
      ? image.naturalWidth / image.naturalHeight
      : rect.w / rect.h;
  const heightFromWidth = rect.w / imageAspect;
  const widthFromHeight = rect.h * imageAspect;
  const useWidth = Math.abs(heightFromWidth - rect.h) <= Math.abs(widthFromHeight - rect.w);
  const display = useWidth
    ? { x: rect.x, y: rect.y, w: rect.w, h: heightFromWidth }
    : { x: rect.x, y: rect.y, w: widthFromHeight, h: rect.h };

  return (
    <KonvaImage
      {...common}
      x={display.x}
      y={display.y}
      width={display.w}
      height={display.h}
      image={image}
      onDragEnd={(e) => {
        const node = e.target;
        onChange({
          geometry: {
            rect: {
              x: node.x() / pageW,
              y: node.y() / pageH,
              w: display.w / pageW,
              h: display.h / pageH,
            },
          },
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scale = Math.max(node.scaleX(), node.scaleY());
        node.scale({ x: 1, y: 1 });
        onChange({
          geometry: {
            rotation: node.rotation(),
            rect: {
              x: node.x() / pageW,
              y: node.y() / pageH,
              w: Math.max(0.005, (display.w * scale) / pageW),
              h: Math.max(0.005, (display.h * scale) / pageH),
            },
          },
        });
      }}
      rotation={0}
    />
  );
}
