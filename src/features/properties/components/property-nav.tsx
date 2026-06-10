"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", segment: "" },
  { label: "Site Plans", segment: "site-plans" },
  { label: "Maps", segment: "maps" },
  { label: "Marketing", segment: "marketing" },
];

export function PropertyNav({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;

  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment
          ? pathname.startsWith(href)
          : pathname === base;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-800 text-brand-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
