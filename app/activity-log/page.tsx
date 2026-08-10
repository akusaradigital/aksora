import { Suspense } from "react";
import { ActivityLogPage } from "@/components/activity/activity-log-page";

export const dynamic = "force-dynamic";

export default function ActivityLog() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-4 w-4 animate-square-spin bg-gray-800" />
        </div>
      }
    >
      <ActivityLogPage />
    </Suspense>
  );
}
