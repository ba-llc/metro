import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Form field wrapper: label + control + validation error. */
export function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
