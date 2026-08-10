export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse p-6">
      <div className="h-8 w-48 bg-gray-100" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 bg-gray-100" />
        <div className="h-72 bg-gray-100" />
      </div>
    </div>
  );
}
