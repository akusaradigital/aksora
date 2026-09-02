"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowSquareOut, Camera } from "@phosphor-icons/react";

interface OEmbedData {
  title?: string;
  description?: string;
  thumbnail_url?: string | null;
  capture_type?: string;
  provider_name?: string;
  author_name?: string;
}

// ponytail: in-memory cache per session to avoid re-fetching the same capture embed
const embedCache = new Map<string, OEmbedData | null>();

export function BugSnapPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<OEmbedData | null>(() => embedCache.get(url) || null);
  const [loading, setLoading] = useState(!embedCache.has(url));

  useEffect(() => {
    if (embedCache.has(url)) {
      setData(embedCache.get(url) || null);
      setLoading(false);
      return;
    }

    const bugsnapBase = process.env.NEXT_PUBLIC_BUGSNAP_URL || "https://bugsnap.akusaraproject.my.id";
    const oembedUrl = `${bugsnapBase.replace(/\/+$/, "")}/api/oembed?url=${encodeURIComponent(url)}`;

    let cancelled = false;
    fetch(oembedUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        embedCache.set(url, json);
        setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          embedCache.set(url, null);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 animate-pulse">
        <Camera size={16} />
        <span>Loading BugSnap preview...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-3.5 shadow-sm transition hover:border-indigo-200">
      <div className="flex items-center justify-between gap-2 border-b border-indigo-100/60 pb-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
          <Camera size={14} weight="bold" />
          <span>BugSnap Capture</span>
          {data.capture_type && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] uppercase font-bold text-indigo-800">
              {data.capture_type}
            </span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
        >
          <span>Open</span>
          <ArrowSquareOut size={12} />
        </a>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row gap-3">
        {data.thumbnail_url && (
          <div className="relative h-24 w-full sm:w-36 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
            <Image
              src={data.thumbnail_url}
              alt={data.title || "Capture thumbnail"}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-xs font-bold text-slate-900 truncate">{data.title}</h4>
          {data.description && (
            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}
          {data.author_name && (
            <p className="text-[10px] text-slate-400">Captured by {data.author_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
