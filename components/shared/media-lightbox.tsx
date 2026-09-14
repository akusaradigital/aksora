"use client";

import { useState, useEffect } from "react";
import { X, MagnifyingGlassPlus, MagnifyingGlassMinus, Copy, Check, ArrowSquareOut, FileText, VideoCamera, Image as ImageIcon } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

export interface MediaLightboxProps {
  url: string;
  name?: string;
  onClose: () => void;
}

export function isImageMedia(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(url.split("?")[0]);
}

export function isVideoMedia(url: string): boolean {
  return /\.(mp4|webm|mov|mkv|ogg)$/i.test(url.split("?")[0]);
}

export function isTextOrLogMedia(url: string): boolean {
  return /\.(log|txt|json|yml|yaml|csv|tsv|md|xml)$/i.test(url.split("?")[0]);
}

export function MediaLightbox({ url, name, onClose }: MediaLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isImg = isImageMedia(url);
  const isVid = isVideoMedia(url);
  const isTxt = isTextOrLogMedia(url);

  useEffect(() => {
    if (isTxt) {
      setTextLoading(true);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load text content");
          return res.text();
        })
        .then((txt) => setTextContent(txt))
        .catch(() => setTextContent("Unable to preview text content directly. Use the Open Original link."))
        .finally(() => setTextLoading(false));
    }
  }, [url, isTxt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      toast("Log content copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayName = name || url.split("/").pop() || "Media Preview";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            {isImg && <ImageIcon size={18} weight="bold" className="text-emerald-400 shrink-0" />}
            {isVid && <VideoCamera size={18} weight="bold" className="text-blue-400 shrink-0" />}
            {isTxt && <FileText size={18} weight="bold" className="text-amber-400 shrink-0" />}
            <span className="truncate text-xs font-semibold text-slate-200">{displayName}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImg && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinus size={16} weight="bold" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlus size={16} weight="bold" />
                </button>
              </>
            )}

            {isTxt && textContent && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                {copied ? <Check size={14} weight="bold" className="text-emerald-400" /> : <Copy size={14} weight="bold" />}
                {copied ? "Copied" : "Copy Log"}
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Open Original in New Tab"
            >
              <ArrowSquareOut size={16} weight="bold" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] max-h-[75vh] bg-slate-950">
          {isImg ? (
            <div className="overflow-auto max-h-full max-w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={displayName}
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                className="max-h-[65vh] max-w-full object-contain transition-transform duration-100 rounded"
              />
            </div>
          ) : isVid ? (
            <video controls src={url} className="max-h-[65vh] max-w-full rounded shadow-lg">
              Your browser does not support HTML5 video.
            </video>
          ) : isTxt ? (
            textLoading ? (
              <p className="text-xs text-slate-400">Loading text content...</p>
            ) : (
              <div className="w-full h-full max-h-[65vh] overflow-auto rounded-lg bg-slate-900 p-4 border border-slate-800">
                <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {textContent}
                </pre>
              </div>
            )
          ) : (
            <div className="text-center p-8">
              <FileText size={48} className="mx-auto text-slate-600 mb-3" weight="bold" />
              <p className="text-sm font-semibold text-slate-300">File preview not available directly</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                Download or view file <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
