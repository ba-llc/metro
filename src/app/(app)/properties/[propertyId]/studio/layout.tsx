export default function PropertyStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh)] min-h-0 flex-col overflow-hidden">
      {children}
    </div>
  );
}
