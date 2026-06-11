"use client";

import { Bot, FileImage, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SitePlanDetail } from "../types";
import { StudioPanel } from "./studio-shell";

export function PagesPanel({
  plan,
  activeIndex,
  onPageChange,
  onAnalyze,
  analyzing,
}: {
  plan: SitePlanDetail;
  activeIndex: number;
  onPageChange: (index: number) => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  return (
    <StudioPanel
      title="Pages and Assets"
      description="Navigate pages and start high-value actions without leaving the canvas."
    >
      <div className="space-y-3">
        {plan.pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            onClick={() => onPageChange(index)}
            className={cn(
              "grid w-full grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border p-2 text-left transition",
              index === activeIndex
                ? "border-brand-300 bg-brand-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <div className="relative h-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="absolute inset-2 rounded border border-slate-300 bg-white" />
              <div className="absolute left-4 top-5 h-8 w-10 rotate-[-8deg] rounded border border-slate-400" />
              <div className="absolute bottom-3 right-3 h-5 w-8 rounded bg-orange-100 ring-1 ring-orange-300" />
            </div>
            <div className="min-w-0 py-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                Page {page.pageNumber}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {page.layers.reduce((sum, layer) => sum + layer.annotations.length, 0)} overlays
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                <FileImage className="size-3" />
                {page.width} x {page.height}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex size-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI overlay pass</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Propose editable availability overlays, labels, logos, and review callouts.
            </p>
          </div>
        </div>
        <Button className="mt-3 w-full" size="sm" loading={analyzing} onClick={onAnalyze}>
          <ImagePlus className="size-4" />
          Analyze Current Page
        </Button>
      </div>
    </StudioPanel>
  );
}
