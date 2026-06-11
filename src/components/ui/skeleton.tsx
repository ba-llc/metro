import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer rounded-md", className)}
    />
  );
}

export function SkeletonText({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3.5",
            index === lines - 1 && lines > 1 ? "w-4/5" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={className}
      role="status"
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-3 border-t border-slate-100 pt-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading properties">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function PropertyWorkspaceSkeleton({
  content,
}: {
  content?: ReactNode;
}) {
  return (
    <LoadingRegion
      label="Loading property"
      className="mx-auto w-full max-w-6xl"
    >
      <div className="mb-6 space-y-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="mb-6 flex gap-1 border-b border-slate-200 pb-px">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="mb-[-1px] h-9 w-24 rounded-none" />
        ))}
      </div>
      {content ?? <PanelGridSkeleton />}
    </LoadingRegion>
  );
}

export function PanelGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, column) => (
        <div key={column} className="space-y-6">
          {Array.from({ length: column === 0 ? 3 : 2 }).map((__, panel) => (
            <div
              key={panel}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <Skeleton className="mb-4 h-5 w-32" />
              <SkeletonText lines={4} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MediaCardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading items">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SitePlanCardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading site plans">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mb-3 h-6 w-4/5" />
            <Skeleton className="h-3.5 w-2/3" />
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <LoadingRegion label="Loading table">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex gap-4 border-b border-slate-100 px-5 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="flex gap-4 border-b border-slate-50 px-5 py-4 last:border-b-0"
          >
            {Array.from({ length: columns }).map((__, col) => (
              <Skeleton key={col} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function MarketingDocumentsSkeleton() {
  return (
    <LoadingRegion label="Loading documents">
      <div className="mt-6 space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function TemplateGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading templates">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <Skeleton className="mb-3 aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function MapPreviewSkeleton() {
  return (
    <LoadingRegion label="Rendering preview">
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
    </LoadingRegion>
  );
}

export function MediaPlaceholderSkeleton() {
  return <Skeleton className="aspect-[4/3] w-full rounded-none" />;
}

export function StudioSkeleton() {
  return (
    <LoadingRegion label="Loading studio" className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 shrink-0 border-r border-slate-200 p-4 lg:block">
          <SkeletonText lines={6} />
        </div>
        <Skeleton className="m-4 min-h-0 flex-1 rounded-lg" />
        <div className="hidden w-80 shrink-0 border-l border-slate-200 p-4 xl:block">
          <SkeletonText lines={8} />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function DiscoverResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <LoadingRegion label="Searching places">
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
