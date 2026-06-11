"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  storageKey: string;
  toolRail: ReactNode;
  leftPanel: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
  defaultLeft?: number;
  defaultRight?: number;
};

const minLeft = 220;
const maxLeft = 420;
const minRight = 300;
const maxRight = 520;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ResizableStudioPanels({
  storageKey,
  toolRail,
  leftPanel,
  canvas,
  rightPanel,
  defaultLeft = 280,
  defaultRight = 360,
}: Props) {
  const [leftWidth, setLeftWidth] = useState(defaultLeft);
  const [rightWidth, setRightWidth] = useState(defaultRight);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { left?: number; right?: number };
    if (typeof parsed.left === "number") setLeftWidth(clamp(parsed.left, minLeft, maxLeft));
    if (typeof parsed.right === "number") setRightWidth(clamp(parsed.right, minRight, maxRight));
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ left: leftWidth, right: rightWidth }),
    );
  }, [leftWidth, rightWidth, storageKey]);

  function startResize(side: "left" | "right", startX: number) {
    const startLeft = leftWidth;
    const startRight = rightWidth;

    const onMove = (event: PointerEvent) => {
      const dx = event.clientX - startX;
      if (side === "left") {
        setLeftWidth(clamp(startLeft + dx, minLeft, maxLeft));
      } else {
        setRightWidth(clamp(startRight - dx, minRight, maxRight));
      }
    };

    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className="grid min-h-0 flex-1"
      style={{
        gridTemplateColumns: `76px ${leftWidth}px 8px minmax(0, 1fr) 8px ${rightWidth}px`,
      }}
    >
      <div className="min-h-0 border-r border-slate-200 bg-white">{toolRail}</div>
      <aside className="min-h-0 overflow-hidden border-r border-slate-200 bg-white/90">
        {leftPanel}
      </aside>
      <ResizeGutter
        label="Resize left panel"
        onPointerDown={(event) => startResize("left", event.clientX)}
        onDoubleClick={() => setLeftWidth(leftWidth <= minLeft + 8 ? defaultLeft : minLeft)}
      />
      <main className="min-h-0 min-w-0 overflow-hidden">{canvas}</main>
      <ResizeGutter
        label="Resize right panel"
        onPointerDown={(event) => startResize("right", event.clientX)}
        onDoubleClick={() => setRightWidth(rightWidth <= minRight + 8 ? defaultRight : minRight)}
      />
      <aside className="min-h-0 overflow-hidden border-l border-slate-200 bg-white/90">
        {rightPanel}
      </aside>
    </div>
  );
}

function ResizeGutter({
  label,
  className,
  onPointerDown,
  onDoubleClick,
}: {
  label: string;
  className?: string;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onDoubleClick: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      className={cn(
        "group relative cursor-col-resize bg-slate-100 transition hover:bg-brand-50",
        className,
      )}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-brand-400" />
    </div>
  );
}
