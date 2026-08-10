import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-xl  border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center  bg-amber-100 text-amber-600">
          <WarningCircle size={28} weight="fill" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-sm text-gray-600">
          The page you requested does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center  bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
