export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse p-6">
      <div className="h-8 w-48 bg-gray-100" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 w-28 bg-gray-100" />)}
      </div>
      <div className="h-96 bg-gray-100" />
    </div>
  );
}
