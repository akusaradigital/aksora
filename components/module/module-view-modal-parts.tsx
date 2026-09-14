"use client";

import Image from "next/image";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { HighlightText } from "@/components/shared/highlight-text";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { BugSnapPreviewCard } from "@/components/shared/bugsnap-preview-card";
import { MediaLightbox } from "@/components/shared/media-lightbox";

/** Image file extensions for evidence preview */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];

export function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return IMAGE_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
  }
}

/** Lightbox for image & media preview */
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return <MediaLightbox url={src} onClose={onClose} />;
}

export function ActivityTab({ module, itemId }: { module: string; itemId: string | number }) {
  return <ActivityTimeline module={module} entityId={itemId} />;
}

export function renderNotes(value: string) {
  const lines = value.split(/\r?\n/).filter(Boolean);
  return (
    <div className="space-y-2 text-xs leading-relaxed text-gray-800">
      {lines.map((line, index) => {
        const match = line.match(/^(\d+\.\s*)?(?:\*\*)?(.+?)(?:\*\*)?:\s*(.+)$/);
        if (match) {
          const [, prefix = "", title, body] = match;
          return (
            <p key={`${index}-${title}`} className="whitespace-pre-wrap break-words">
              <span className="font-semibold">{prefix}</span>
              <span className="font-bold">{title}:</span> {body}
            </p>
          );
        }
        return (
          <p key={`${index}-${line}`} className="whitespace-pre-wrap break-words">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function renderEvidence(
  displayValue: string,
  setLightboxSrc: (src: string) => void,
) {
  if (!displayValue.startsWith("http")) {
    return <p className="text-xs text-gray-800 font-semibold break-all">{displayValue}</p>;
  }

  // Detect BugSnap captures
  const isBugSnap = /bugsnap[^\s]*\/v\/[a-zA-Z0-9_-]+/i.test(displayValue);
  if (isBugSnap) {
    return <BugSnapPreviewCard url={displayValue} />;
  }

  if (isImageUrl(displayValue)) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setLightboxSrc(displayValue)}
          className="group relative block w-full overflow-hidden  border border-gray-200 bg-gray-50 transition hover:border-blue-300 "
        >
          <Image
            src={displayValue}
            alt="Evidence"
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition group-"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
            <div className=" bg-white/90 p-2 opacity-0 shadow-lg transition group-hover:opacity-100">
              <ArrowSquareOut size={16} weight="bold" className="text-gray-700" />
            </div>
          </div>
        </button>
        <a href={displayValue} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
          <ArrowSquareOut size={11} weight="bold" /> Open in new tab
        </a>
      </div>
    );
  }

  return (
    <a href={displayValue} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-xs text-blue-600 hover:underline">
      <ArrowSquareOut size={12} weight="bold" className="shrink-0" />
      {displayValue}
    </a>
  );
}

export function renderRoleField(row: Record<string, string | number>, getRoleLabel: (role: string) => string) {
  return <HighlightText text={getRoleLabel(String(row.role ?? ""))} query="" />;
}

