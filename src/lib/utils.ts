import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** `12,500 SF` */
export function formatSF(sf: number | null | undefined): string {
  if (sf == null) return "—";
  return `${formatNumber(sf)} SF`;
}

/** `$24.00/SF NNN` */
export function formatRate(
  rate: number | string | null | undefined,
  rateType?: string | null,
): string {
  if (rate == null) return "—";
  const n = typeof rate === "string" ? Number(rate) : rate;
  if (Number.isNaN(n)) return "—";
  const base = `$${n.toFixed(2)}/SF`;
  return rateType ? `${base} ${rateType}` : base;
}

/** `$86,400` */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** `24,500 VPD (2025)` */
export function formatTraffic(count: number, year?: number | null): string {
  return year ? `${formatNumber(count)} VPD (${year})` : `${formatNumber(count)} VPD`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `just now`, `4h ago`, `3d ago`; falls back to `Jun 2, 2026` past a week. */
export function timeAgo(date: string | Date): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
