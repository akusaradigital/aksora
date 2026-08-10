export default function ReportsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 animate-square-spin bg-gray-800" />
        <p className="text-xs font-medium text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
