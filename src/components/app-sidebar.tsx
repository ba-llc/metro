"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebarUser } from "@/components/app-sidebar-user";

const STORAGE_KEY = "metro.sidebar.collapsed";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Contacts", href: "/contacts", icon: Users },
];

export function AppSidebar({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-brand-800 bg-brand-900 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-brand-800",
          collapsed ? "justify-center px-2 py-3" : "items-center gap-2 px-3 py-3",
        )}
      >
        {collapsed ? (
          <div className="group relative">
            <Link
              href="/dashboard"
              className="flex items-center justify-center rounded-full"
              title="Metro Studio"
            >
              <Image
                src="/brand/metro-icon.png"
                alt="Metro Studio"
                width={32}
                height={32}
                priority
                className="shrink-0 rounded-full"
              />
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-900/95 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <PanelLeftOpen className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-sm font-bold tracking-wide text-white"
              title="Metro Studio"
            >
              <Image
                src="/brand/metro-icon.png"
                alt="Metro Studio"
                width={32}
                height={32}
                priority
                className="shrink-0 rounded-full"
              />
              {mounted ? (
                <span className="truncate">
                  METRO<span className="text-accent-500"> STUDIO</span>
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-brand-200 transition-colors hover:bg-brand-800 hover:text-white"
            >
              <PanelLeftClose className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto",
          collapsed ? "items-center p-2" : "p-3",
        )}
      >
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-colors",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                active
                  ? "bg-brand-800 text-white"
                  : "text-brand-100 hover:bg-brand-800/70 hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {mounted && !collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <AppSidebarUser collapsed={mounted && collapsed} name={name} email={email} />
    </aside>
  );
}
