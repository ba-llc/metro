import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        name={session.user.name ?? ""}
        email={session.user.email ?? ""}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-8 [scrollbar-gutter:stable]">
        {children}
      </main>
    </div>
  );
}
