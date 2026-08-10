"use client";

import { cn } from "@/lib/utils";
import type { CollaborationEditor } from "@/hooks/use-collaboration-presence";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getAvatarColor(name: string) {
  const charCode = name.charCodeAt(0) + name.length;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
}

/**
 * CollaborationIndicator - shows avatars of other users viewing/editing an item.
 * Used in detail views (modal/drawer) to show real-time collaboration.
 */
export function CollaborationIndicator({
  editors,
  className,
  maxVisible = 3,
}: {
  editors: CollaborationEditor[];
  className?: string;
  maxVisible?: number;
}) {
  if (editors.length === 0) return null;

  const visible = editors.slice(0, maxVisible);
  const overflow = editors.length - maxVisible;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex -space-x-1.5">
        {visible.map((editor) => (
          <div
            key={editor.userId}
            title={`${editor.userName} is ${editor.action}`}
            className={cn(
              "relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white",
              getAvatarColor(editor.userName),
            )}
          >
            {editor.userName.slice(0, 1).toUpperCase()}
            {editor.action === "editing" && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400 animate-pulse" />
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 ring-2 ring-white">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium text-gray-500">
        {editors.length === 1
          ? `${editors[0].userName} is ${editors[0].action}`
          : `${editors.length} people here`}
      </span>
    </div>
  );
}

/**
 * CollaborationDot - minimal indicator for table/list rows.
 * Shows a small colored dot when someone else is viewing that item.
 */
export function CollaborationDot({
  editors,
  className,
}: {
  editors: CollaborationEditor[];
  className?: string;
}) {
  if (editors.length === 0) return null;

  const hasEditor = editors.some((e) => e.action === "editing");
  const names = editors.map((e) => e.userName).join(", ");
  const tooltip = hasEditor
    ? `${names} editing`
    : `${names} viewing`;

  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex h-2 w-2 rounded-full",
        hasEditor ? "bg-emerald-400 animate-pulse" : "bg-blue-400",
        className,
      )}
    />
  );
}
