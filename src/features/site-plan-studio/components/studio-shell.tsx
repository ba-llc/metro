"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileImage,
  History,
  Layers3,
  MousePointer2,
  PanelRight,
  Sparkles,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SitePlanDetail } from "../types";
import { ResizableStudioPanels } from "./resizable-panels";

export type StudioMode = "edit" | "review";
export type RightPanelTab = "inspect" | "layers" | "data";

type ShellProps = {
  propertyId: string;
  plan: SitePlanDetail;
  pageIndex: number;
  onPageChange: (index: number) => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  dirty: boolean;
  saving: boolean;
  analyzing: boolean;
  exporting: boolean;
  analysisMessage: string | null;
  analysisTone?: "info" | "warning" | "error";
  reviewSuggestionCount: number;
  onAnalyze: () => void;
  onVersions: () => void;
  onExport: () => void;
  toolRail: ReactNode;
  leftPanel: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
  statusBar?: ReactNode;
  children?: ReactNode;
};

export function StudioShell({
  propertyId,
  plan,
  pageIndex,
  onPageChange,
  mode,
  onModeChange,
  dirty,
  saving,
  analyzing,
  exporting,
  analysisMessage,
  analysisTone = "info",
  reviewSuggestionCount,
  onAnalyze,
  onVersions,
  onExport,
  toolRail,
  leftPanel,
  canvas,
  rightPanel,
  statusBar,
  children,
}: ShellProps) {
  const modeTabs: Array<
    [StudioMode, ComponentType<{ className?: string }>, string]
  > = [["edit", MousePointer2, "Edit"]];
  if (reviewSuggestionCount > 0) {
    modeTabs.push(["review", Sparkles, "AI Review"]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100">
      <header className="grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/properties/${propertyId}/site-plans`}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-brand-200 hover:text-brand-900"
            aria-label="Back to site plan library"
            title="Back to site plan library"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-950">
                {plan.title}
              </p>
              <SaveState dirty={dirty} saving={saving} />
              {reviewSuggestionCount > 0 ? (
                <ReviewState count={reviewSuggestionCount} />
              ) : null}
            </div>
            <p className="truncate text-xs text-slate-500">
              {plan.property.name} / Page {pageIndex + 1} of {plan.pages.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 p-1">
          {modeTabs.map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id as StudioMode)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition",
                mode === id
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {plan.pages.length > 1 ? (
            <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 md:flex">
              {plan.pages.map((page, i) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(i)}
                  className={cn(
                    "h-7 min-w-7 rounded-full px-2 text-xs font-semibold transition",
                    i === pageIndex
                      ? "bg-brand-900 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {page.pageNumber}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            loading={analyzing}
            onClick={onAnalyze}
          >
            <Bot className="size-4" />
            AI Analyze
          </Button>
          <Button size="sm" variant="secondary" onClick={onVersions}>
            <History className="size-4" />
            Versions
          </Button>
          <Button size="sm" loading={exporting} onClick={onExport}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </header>

      {analysisMessage ? (
        <div
          className={cn(
            "shrink-0 border-b px-4 py-2 text-xs",
            analysisTone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : analysisTone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-100 bg-blue-50 text-blue-800",
          )}
        >
          {analysisMessage}
        </div>
      ) : null}

      <ResizableStudioPanels
        storageKey={`studio-layout:${plan.id}`}
        toolRail={toolRail}
        leftPanel={leftPanel}
        canvas={canvas}
        rightPanel={rightPanel}
      />

      {children}

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-xs text-slate-500">
        {statusBar ?? (
          <>
            <span>Space + drag to pan / Scroll to zoom / Drag gutters to resize panels</span>
            <span className="hidden shrink-0 items-center gap-4 md:flex">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                  V
                </kbd>
                Select
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                  H
                </kbd>
                Pan
              </span>
            </span>
          </>
        )}
      </footer>
    </div>
  );
}

function ReviewState({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
      <Sparkles className="size-3" />
      {count} pending
    </span>
  );
}

function SaveState({ dirty, saving }: { dirty: boolean; saving: boolean }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        <Clock3 className="size-3" />
        Saving
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <Clock3 className="size-3" />
        Unsaved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      <CheckCircle2 className="size-3" />
      Saved
    </span>
  );
}

export function StudioPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-b border-slate-200 px-4 py-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-900">
          <PanelRight className="size-4" />
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="min-h-0 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

export function RightPanelTabs({
  active,
  onChange,
}: {
  active: RightPanelTab;
  onChange: (tab: RightPanelTab) => void;
}) {
  const tabs: Array<[RightPanelTab, ReactNode, string]> = [
    ["inspect", <MousePointer2 key="inspect" className="size-4" />, "Inspect"],
    ["layers", <Layers3 key="layers" className="size-4" />, "Layers"],
    ["data", <FileImage key="data" className="size-4" />, "Data"],
  ];

  return (
    <div className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-50 p-2">
      {tabs.map(([id, icon, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition",
            active === id
              ? "bg-white text-brand-900 shadow-sm"
              : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
