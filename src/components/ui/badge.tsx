import { cn, labelize } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "slate" | "blue";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  AVAILABLE: "green",
  LEASED: "slate",
  PENDING: "amber",
  NOT_AVAILABLE: "red",
  ACTIVE: "green",
  DRAFT: "amber",
  ARCHIVED: "slate",
  READY: "green",
  QUEUED: "amber",
  RENDERING: "blue",
  PROCESSING: "blue",
  FAILED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? "slate"}>{labelize(status)}</Badge>;
}
