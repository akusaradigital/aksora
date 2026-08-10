"use client";

import { Badge } from "@/components/shared/badge";
import { formatDate, formatDisplayText } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { diffDays, parseDate, isValidDateRange } from "./gantt-helpers";
import type { EnhancedEditModalState } from "./gantt-helpers";

interface GanttEditModalProps {
  editModal: EnhancedEditModalState;
  setEditModal: (m: EnhancedEditModalState | null) => void;
  refresh: () => void;
}

export function GanttEditModal({ editModal, setEditModal, refresh }: GanttEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onClick={() => setEditModal(null)}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-gray-200/80 bg-white p-5 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Timeline details</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{editModal.item.label}</h3>
            <a
              href={editModal.navigationLink}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Go to {editModal.item.type === "sprint" ? "Sprints" : editModal.item.type === "plan" ? "Test Plans" : "Tasks"} →
            </a>
          </div>
          <button
            type="button"
            onClick={() => setEditModal(null)}
            className=" border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Type</p>
            <p className="mt-2 text-sm font-bold text-gray-900">
              {editModal.item.type === "sprint" ? "Sprints" : editModal.item.type === "plan" ? "Test Plans" : "Tasks"}
            </p>
          </div>
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Status</p>
            <div className="mt-2">
              <Badge value={editModal.item.status} />
            </div>
          </div>
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Progress</p>
            <p className="mt-2 text-sm font-bold text-gray-900">{editModal.progress}%</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden  bg-gray-200">
              <div className="h-full  bg-indigo-500" style={{ width: `${editModal.progress}%` }} />
            </div>
          </div>
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duration</p>
            <p className="mt-2 text-sm font-bold text-gray-900">
              {Math.max(1, diffDays(parseDate(editModal.startDate), parseDate(editModal.endDate)) + 1)} days
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Start</p>
            {editModal.canEdit ? (
              <input type="date" value={editModal.startDate}
                onChange={(e) => setEditModal({ ...editModal, startDate: e.target.value })}
                className="mt-2 w-full  border border-gray-200 px-2 py-1 text-sm font-bold text-gray-900" />
            ) : (
              <p className="mt-2 text-sm font-bold text-gray-900">{formatDate(editModal.startDate)}</p>
            )}
          </div>
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">End</p>
            {editModal.canEdit ? (
              <input type="date" value={editModal.endDate}
                onChange={(e) => setEditModal({ ...editModal, endDate: e.target.value })}
                className="mt-2 w-full  border border-gray-200 px-2 py-1 text-sm font-bold text-gray-900" />
            ) : (
              <p className="mt-2 text-sm font-bold text-gray-900">{formatDate(editModal.endDate)}</p>
            )}
          </div>
        </div>

        {editModal.canEdit && !isValidDateRange(editModal.startDate, editModal.endDate) && (
          <p className="mt-2 text-xs font-semibold text-red-500">End date must be on or after start date.</p>
        )}

        {editModal.statusBreakdown.length > 0 && (
          <div className="mt-3  border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Child Items</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {editModal.statusBreakdown.map((s) => (
                <span key={s.status} className=" bg-white border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700">
                  {formatDisplayText(s.status)}: {s.count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Summary</p>
            <p className="mt-2 text-sm font-semibold text-gray-800">
              {editModal.item.sublabel || "No additional summary."}
            </p>
          </div>
          <div className=" border border-gray-200/80 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Related</p>
            <div className="mt-2 space-y-2 text-sm font-semibold text-gray-800">
              <p>
                <span className="text-gray-500">Owner:</span>{" "}
                {editModal.item.owner || "-"}
              </p>
              {editModal.item.type === "plan" && (
                <p>
                  <span className="text-gray-500">Sprint:</span>{" "}
                  {editModal.item.relatedSprint || "-"}
                </p>
              )}
            </div>
          </div>
        </div>

        {editModal.canEdit && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!isValidDateRange(editModal.startDate, editModal.endDate)}
              onClick={async () => {
                const [type, id] = editModal.key.split(":");
                try {
                  const res = await fetch("/api/gantt", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: Number(id), type, startDate: editModal.startDate, endDate: editModal.endDate }),
                  });
                  if (!res.ok) throw new Error("Failed");
                  setEditModal(null);
                  refresh();
                } catch {
                  toast("Failed to save changes", "error");
                }
              }}
              className=" bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
