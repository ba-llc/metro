import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AppSidebarNav } from "@/components/app-sidebar";
import { AppSidebarUser } from "@/components/app-sidebar-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-brand-800 bg-brand-900">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 border-b border-brand-800 px-5 py-4 text-sm font-bold tracking-wide text-white"
        >
          <Image
            src="/brand/metro-icon.png"
            alt="Metro Marketing Studio"
            width={32}
            height={32}
            priority
            className="rounded-full"
          />
          <span>
            METRO<span className="text-accent-500"> MARKETING</span>
          </span>
        </Link>
        <AppSidebarNav />
        <AppSidebarUser
          name={session.user.name ?? ""}
          email={session.user.email ?? ""}
        />
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
