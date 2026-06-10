import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-800" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
