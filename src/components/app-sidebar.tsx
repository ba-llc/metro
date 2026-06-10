"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Properties", href: "/properties" },
];

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      {navItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-800 text-white"
                : "text-brand-100 hover:bg-brand-800/70 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
