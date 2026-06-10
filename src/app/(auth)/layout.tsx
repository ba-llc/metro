import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/brand/metro-icon.png"
            alt="Metro Marketing Studio"
            width={96}
            height={96}
            priority
            className="mx-auto mb-4 rounded-full"
          />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Metro Marketing Studio
          </h1>
          <p className="mt-2 text-sm text-brand-200">
            The commercial real estate marketing operating system
          </p>
        </div>
        <div className="rounded-lg bg-white p-8 shadow-xl">{children}</div>
      </div>
    </div>
  );
}
