"use client";

import { Fragment } from "react";
import {
  Arrow,
  Circle,
  Group,
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
  zoom: number;
  selected: boolean;
  interactive: boolean;
  resolveLabel: (a: AnnotationData) => string;
  onSelect: () => void;
  onChange: (patch: Partial<AnnotationData>) => void;
};

function withAlpha(hex: string | undefined, opacity: number | undefined): string | undefined {
  if (!hex) return undefined;
  if (hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity ?? 1})`;
}

export function AnnotationNode({
  annotation: a,
  pageW,
  pageH,
  zoom,
  selected,
  interactive,
  resolveLabel,
  onSelect,
  onChange,
}: Props) {
  const style = a.style;
  const stroke = style.stroke;
  const strokeWidth = style.strokeWidth ?? 2;
  const handleRadius = Math.max(5, 6 / Math.max(0.05, zoom));
  const handleStrokeWidth = Math.max(1.5, 2 / Math.max(0.05, zoom));
  const hitStrokeWidth = Math.max(16 / Math.max(0.05, zoom), strokeWidth * 4);
  const dash = style.dash;
  const fill = withAlpha(style.fill, style.fillOpacity);

  const commonBase = {
    id: a.id,
    draggable: interactive,
    onClick: onSelect,
    onTap: onSelect,
  };

  const commonDeltaDrag = {
    ...commonBase,
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

  function updatePoint(index: number, xPx: number, yPx: number) {
    if (!a.geometry.points) return;
    onChange({
      geometry: {
        ...a.geometry,
        points: a.geometry.points.map((point, pointIndex) =>
          pointIndex === index
            ? {
                x: Math.min(Math.max(xPx / pageW, 0), 1),
                y: Math.min(Math.max(yPx / pageH, 0), 1),
              }
            : point,
        ),
      },
    });
  }

  function endpointHandles(points: [number, number, number, number]) {
    if (!selected || !interactive) return null;
    const [x1, y1, x2, y2] = points;
    return (
      <Fragment>
        <Circle
          x={x1}
          y={y1}
          radius={handleRadius}
          fill="#ffffff"
          stroke="#0ea5e9"
          strokeWidth={handleStrokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={(event) => updatePoint(0, event.target.x(), event.target.y())}
        />
        <Circle
          x={x2}
          y={y2}
          radius={handleRadius}
          fill="#ffffff"
          stroke="#0ea5e9"
          strokeWidth={handleStrokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={(event) => updatePoint(1, event.target.x(), event.target.y())}
        />
      </Fragment>
    );
  }

  function polygonPointHandles() {
    if (!selected || !interactive || !a.geometry.points) return null;
    return (
      <Fragment>
        {a.geometry.points.map((point, index) => (
          <Circle
            key={`${a.id}-point-${index}`}
            x={point.x * pageW}
            y={point.y * pageH}
            radius={handleRadius}
            fill="#ffffff"
            stroke="#0ea5e9"
            strokeWidth={handleStrokeWidth}
            draggable
            onClick={onSelect}
            onTap={onSelect}
            onDragMove={(event) =>
              updatePoint(index, event.target.x(), event.target.y())
            }
          />
        ))}
      </Fragment>
    );
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
        {...commonBase}
        x={r.x * pageW}
        y={r.y * pageH}
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
          onChange({
            geometry: {
              ...a.geometry,
              rect: {
                x: node.x() / pageW,
                y: node.y() / pageH,
                w: Math.max(0.005, (node.width() * scaleX) / pageW),
                h: Math.max(0.005, (node.height() * scaleY) / pageH),
              },
              rotation: node.rotation(),
            },
          });
        }}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            geometry: {
              ...a.geometry,
              rect: {
                ...r,
                x: node.x() / pageW,
                y: node.y() / pageH,
              },
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
      <Fragment>
        <Line
          {...commonDeltaDrag}
          points={flat}
          closed
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          dash={dash}
        />
        {polygonPointHandles()}
      </Fragment>
    );
  }

  // --- Arrow ---
  if (a.type === "arrow" && a.geometry.points && a.geometry.points.length >= 2) {
    const flat = a.geometry.points.flatMap((p) => [p.x * pageW, p.y * pageH]);
    return (
      <Fragment>
        <Arrow
          {...commonDeltaDrag}
          points={flat}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          pointerLength={12}
          pointerWidth={12}
        />
        {endpointHandles(flat as [number, number, number, number])}
      </Fragment>
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
    const fontSize = style.fontSize ?? 14;
    const labelPadding = Math.max(5, fontSize * 0.35);
    const labelX = (x1 + x2) / 2;
    const labelY = (y1 + y2) / 2 - fontSize - labelPadding * 2;
    return (
      <Fragment>
        <Arrow
          {...commonDeltaDrag}
          points={[x1, y1, x2, y2]}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          pointerLength={8}
          pointerWidth={8}
          pointerAtBeginning
        />
        <Label
          x={labelX}
          y={labelY}
          draggable={interactive}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            const node = e.target;
            const dx = node.x() - labelX;
            const dy = node.y() - labelY;
            node.position({ x: labelX, y: labelY });
            moveBy(dx, dy);
          }}
        >
          <Tag
            fill={withAlpha(style.fill ?? "#ffffff", style.fillOpacity ?? 0.85)}
            cornerRadius={3}
          />
          <Text
            text={resolveLabel(a)}
            fontSize={fontSize}
            fill={style.color ?? "#475569"}
            padding={labelPadding}
          />
        </Label>
        {endpointHandles([x1, y1, x2, y2])}
      </Fragment>
    );
  }

  // --- Tenant logo ---
  if (a.type === "tenant-logo" && a.geometry.rect) {
    const r = a.geometry.rect;
    return (
      <TenantLogoNode
        common={commonBase}
        annotation={a}
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
    const textPadding = Math.max(8, fontSize * 0.45);

    if (a.type === "callout") {
      return (
        <Label
          {...commonBase}
          x={x}
          y={y}
          onDragEnd={(e) => {
            const node = e.target;
            onChange({
              geometry: {
                ...a.geometry,
                points: [{ x: node.x() / pageW, y: node.y() / pageH }],
              },
            });
          }}
        >
          <Tag
            fill={style.fill ?? "#0f3057"}
            cornerRadius={4}
            pointerDirection="down"
            pointerWidth={Math.max(10, fontSize * 0.65)}
            pointerHeight={Math.max(8, fontSize * 0.45)}
          />
          <Text
            text={text}
            fontSize={fontSize}
            fill={style.color ?? "#ffffff"}
            padding={textPadding}
          />
        </Label>
      );
    }

    const onTextDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onChange({
        geometry: {
          ...a.geometry,
          points: [{ x: node.x() / pageW, y: node.y() / pageH }],
        },
      });
    };

    if (style.fill) {
      return (
        <Label
          {...commonBase}
          x={x}
          y={y}
          onDragEnd={onTextDragEnd}
        >
          <Tag
            fill={withAlpha(style.fill, style.fillOpacity ?? 0.85)}
            cornerRadius={4}
          />
          <Text
            text={text}
            fontSize={fontSize}
            fontStyle="bold"
            fill={style.color ?? "#0f172a"}
            padding={textPadding}
          />
        </Label>
      );
    }

    return (
      <Text
        {...commonBase}
        x={x}
        y={y}
        text={text}
        fontSize={fontSize}
        fontStyle="bold"
        fill={style.color ?? "#0f172a"}
        onDragEnd={onTextDragEnd}
      />
    );
  }

  return null;
}

function TenantLogoNode({
  common,
  annotation,
  rect,
  pageW,
  pageH,
  assetId,
  onChange,
}: {
  common: Record<string, unknown>;
  annotation: AnnotationData;
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
  const tenantName = annotation.label?.text?.trim();
  const fontSize = annotation.style.fontSize ?? Math.max(14, display.h * 0.22);
  const labelPadding = Math.max(4, fontSize * 0.25);
  const labelGap = Math.max(4, fontSize * 0.2);
  const labelPlacement = annotation.label?.placement ?? "below";
  const badgePad = Math.max(4, Math.min(display.w, display.h) * 0.08);
  const badge = {
    x: display.x - badgePad,
    y: display.y - badgePad,
    w: display.w + badgePad * 2,
    h: display.h + badgePad * 2,
  };
  const hasLogoBackground = Boolean(annotation.style.fill);
  const hasLogoBorder = Boolean(
    annotation.style.stroke && (annotation.style.strokeWidth ?? 0) > 0,
  );

  function moveLogoRect(xPx: number, yPx: number, wPx = display.w, hPx = display.h) {
    onChange({
      geometry: {
        ...annotation.geometry,
        rect: {
          x: xPx / pageW,
          y: yPx / pageH,
          w: wPx / pageW,
          h: hPx / pageH,
        },
      },
    });
  }

  function labelFrame() {
    const anchor = hasLogoBackground || hasLogoBorder ? badge : display;
    const width = labelPlacement === "left" || labelPlacement === "right"
      ? Math.max(anchor.w * 0.85, fontSize * 4)
      : anchor.w;
    switch (labelPlacement) {
      case "above":
        return {
          x: anchor.x + anchor.w / 2,
          y: anchor.y - fontSize - labelPadding * 2 - labelGap,
          textX: -width / 2,
          width,
        };
      case "left":
        return {
          x: anchor.x - width - labelGap,
          y: anchor.y + anchor.h / 2 - fontSize / 2 - labelPadding,
          textX: 0,
          width,
        };
      case "right":
        return {
          x: anchor.x + anchor.w + labelGap,
          y: anchor.y + anchor.h / 2 - fontSize / 2 - labelPadding,
          textX: 0,
          width,
        };
      case "overlay":
        return {
          x: display.x + display.w / 2,
          y: display.y + display.h / 2 - fontSize / 2 - labelPadding,
          textX: -width / 2,
          width,
        };
      case "below":
      default:
        return {
          x: anchor.x + anchor.w / 2,
          y: anchor.y + anchor.h + labelGap,
          textX: -width / 2,
          width,
        };
    }
  }

  const label = labelFrame();

  return (
    <Group>
      {hasLogoBackground || hasLogoBorder ? (
        <Rect
          x={badge.x}
          y={badge.y}
          width={badge.w}
          height={badge.h}
          cornerRadius={Math.max(4, badgePad * 1.25)}
          fill={hasLogoBackground
            ? withAlpha(annotation.style.fill, annotation.style.fillOpacity ?? 0.85)
            : undefined}
          stroke={hasLogoBorder ? annotation.style.stroke : undefined}
          strokeWidth={hasLogoBorder ? annotation.style.strokeWidth : 0}
          listening={false}
        />
      ) : null}
      <KonvaImage
        {...common}
        x={display.x}
        y={display.y}
        width={display.w}
        height={display.h}
        image={image}
        onDragEnd={(e) => {
          const node = e.target;
          moveLogoRect(node.x(), node.y());
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scale = Math.max(node.scaleX(), node.scaleY());
          node.scale({ x: 1, y: 1 });
          onChange({
            geometry: {
              ...annotation.geometry,
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
      {tenantName ? (
        <Label
          x={label.x}
          y={label.y}
          draggable={Boolean(common.draggable)}
          onClick={common.onClick as () => void}
          onTap={common.onTap as () => void}
          onDragEnd={(e) => {
            const node = e.target;
            const dx = node.x() - label.x;
            const dy = node.y() - label.y;
            node.position({ x: label.x, y: label.y });
            moveLogoRect(display.x + dx, display.y + dy);
          }}
        >
          <Tag
            fill={withAlpha(
              annotation.style.labelFill ?? "#ffffff",
              annotation.style.labelFillOpacity ?? 0.85,
            )}
            cornerRadius={4}
          />
          <Text
            text={tenantName}
            x={label.textX}
            width={label.width}
            align="center"
            fontSize={fontSize}
            fontStyle="bold"
            fill={annotation.style.labelColor ?? annotation.style.color ?? "#0f172a"}
            padding={labelPadding}
          />
        </Label>
      ) : null}
    </Group>
  );
}
