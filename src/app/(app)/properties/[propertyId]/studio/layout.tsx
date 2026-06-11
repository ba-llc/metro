export default function PropertyStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="m-1 flex h-[calc(100vh-4.5rem)] min-h-0 flex-col overflow-hidden rounded-xl">
      {children}
    </div>
  );
}
