"use client";

import { FileImage, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SitePlanDetail } from "../types";
import { StudioPanel } from "./studio-shell";

export function PagesPanel({
  plan,
  activeIndex,
  onPageChange,
  onDeletePage,
  deletingPageId,
}: {
  plan: SitePlanDetail;
  activeIndex: number;
  onPageChange: (index: number) => void;
  onDeletePage?: (pageId: string, index: number) => void;
  deletingPageId?: string | null;
}) {
  return (
    <StudioPanel
      title="Pages"
      description="Switch between PDF pages in this site plan."
    >
      <div className="space-y-3">
        {plan.pages.map((page, index) => (
          <div
            key={page.id}
            role="button"
            tabIndex={0}
            onClick={() => onPageChange(index)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onPageChange(index);
            }}
            className={cn(
              "cursor-pointer",
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
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Page {page.pageNumber}
                </p>
                {onDeletePage && plan.pages.length > 1 ? (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Delete page"
                    aria-label={`Delete page ${page.pageNumber}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeletePage(page.id, index);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onDeletePage(page.id, index);
                    }}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    {deletingPageId === page.id ? (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {page.layers.reduce((sum, layer) => sum + layer.annotations.length, 0)} overlays
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                <FileImage className="size-3" />
                {page.width} x {page.height}
              </p>
            </div>
          </div>
        ))}
      </div>

    </StudioPanel>
  );
}
