import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-800 bg-brand-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/properties"
              className="flex items-center gap-2 text-sm font-bold tracking-wide text-white"
            >
              <Image
                src="/brand/metro-icon.png"
                alt="Metro Marketing Studio"
                width={34}
                height={34}
                priority
                className="rounded-full"
              />
              <span>
                METRO<span className="text-accent-500"> MARKETING STUDIO</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/properties"
                className="rounded px-3 py-1.5 text-sm text-brand-100 hover:bg-brand-800 hover:text-white"
              >
                Properties
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-brand-200">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button
                type="submit"
                className="rounded px-3 py-1.5 text-xs text-brand-100 hover:bg-brand-800 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
