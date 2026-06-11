"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

function UserAvatar() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
        aria-hidden
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function AppSidebarUser({
  collapsed,
  name,
  email,
}: {
  collapsed: boolean;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = name.trim() || email;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [collapsed]);

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", collapsed ? "" : "border-t border-brand-800 p-3")}
    >
      {collapsed ? <div className="border-t border-brand-800" aria-hidden /> : null}
      {open ? (
        <div
          className={cn(
            "absolute z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
            collapsed
              ? "bottom-3 left-full ml-2 w-40"
              : "inset-x-3 bottom-full mb-2",
          )}
        >
          {!collapsed ? (
            <p className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
              {displayName}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      ) : null}
      <div className={cn(collapsed && "flex justify-center py-2")}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={displayName}
          title={displayName}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "rounded-md transition-colors hover:bg-brand-800",
            collapsed
              ? "p-1"
              : "flex w-full items-center gap-3 px-1 py-1 text-left",
          )}
        >
          <UserAvatar />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                {displayName}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "size-4 shrink-0 text-brand-300 transition-transform",
                  open ? "rotate-180" : "",
                )}
                aria-hidden
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </>
          ) : null}
        </button>
      </div>
    </div>
  );
}
