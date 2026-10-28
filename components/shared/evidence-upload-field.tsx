"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileImage,
  UploadSimple,
  LinkSimple,
  X,
  ArrowsOutSimple,
  Sparkle,
  CheckCircle,
} from "@phosphor-icons/react";
import { compressImageToWebp, formatFileSize, type CompressedImageResult } from "@/lib/image-compress";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface EvidenceUploadFieldProps {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EvidenceUploadField({
  name = "evidence",
  defaultValue = "",
  value: controlledValue,
  onChange,
  placeholder = "Upload screenshot or paste image (Ctrl+V)",
  disabled = false,
  className,
}: EvidenceUploadFieldProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = isControlled ? controlledValue : internalValue;

  const [activeTab, setActiveTab] = useState<"image" | "url">(
    currentValue && currentValue.startsWith("http") ? "url" : "image"
  );
  const [compressing, setCompressing] = useState(false);
  const [stats, setStats] = useState<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateValue = useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal);
      }
      onChange?.(newVal);
    },
    [isControlled, onChange]
  );

  const handleProcessImage = useCallback(
    async (file: File | Blob) => {
      if (disabled) return;
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast("Please upload a valid image file", "warning");
        return;
      }

      setCompressing(true);
      try {
        const result: CompressedImageResult = await compressImageToWebp(file, {
          maxDimension: 1440,
          quality: 0.8,
        });

        updateValue(result.dataUrl);
        setStats({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          ratio: result.compressionRatio,
        });

        toast(
          `Image compressed to ${formatFileSize(result.compressedSize)} (${result.compressionRatio}% smaller)`,
          "success"
        );
      } catch (err) {
        toast(err instanceof Error ? err.message : "Compression failed", "error");
      } finally {
        setCompressing(false);
      }
    },
    [disabled, updateValue]
  );

  // Global & Local clipboard paste (Ctrl+V) handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            setActiveTab("image");
            handleProcessImage(blob);
            return;
          }
        }
      }

      // If pasting URL outside an input field
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (!isInput) {
        const text = e.clipboardData?.getData("text") || "";
        if (text.startsWith("http://") || text.startsWith("https://")) {
          setActiveTab("url");
          updateValue(text);
        }
      }
    },
    [disabled, handleProcessImage, updateValue]
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessImage(files[0]);
    }
  };

  const isDataImage = currentValue && currentValue.startsWith("data:image/");

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      className={cn("w-full space-y-2 text-xs", className)}
    >
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={currentValue} />

      {/* Mode switcher */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("image")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
              activeTab === "image"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileImage size={13} weight="bold" />
            Screenshot / Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
              activeTab === "url"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LinkSimple size={13} weight="bold" />
            External Link
          </button>
        </div>

        {currentValue && (
          <button
            type="button"
            onClick={() => {
              updateValue("");
              setStats(null);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
          >
            <X size={12} weight="bold" />
            Clear
          </button>
        )}
      </div>

      {/* Tab: Screenshot / Image */}
      {activeTab === "image" && (
        <div className="space-y-2">
          {/* If image is already attached, show preview card */}
          {isDataImage ? (
            <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <div className="flex items-start gap-3">
                <div className="relative group shrink-0 h-16 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <img
                    src={currentValue}
                    alt="Evidence Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLightbox(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white"
                  >
                    <ArrowsOutSimple size={16} weight="bold" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <CheckCircle size={14} weight="bold" className="text-emerald-600" />
                    <span>Evidence Attached</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                      WebP Ultra-Light
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                    {stats ? (
                      <>
                        <span className="line-through text-slate-400">
                          {formatFileSize(stats.originalSize)}
                        </span>{" "}
                        &rarr;{" "}
                        <strong className="text-emerald-700">
                          {formatFileSize(stats.compressedSize)}
                        </strong>{" "}
                        ({stats.ratio}% compressed, 100% sharp)
                      </>
                    ) : (
                      "Optimized image stored directly in record."
                    )}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLightbox(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      Enlarge Image
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition"
                    >
                      Replace Image
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    updateValue("");
                    setStats(null);
                  }}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>
          ) : (
            /* Dropzone when no image */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
                isDragging
                  ? "border-blue-500 bg-blue-50/70"
                  : "border-slate-300/80 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30",
                compressing && "pointer-events-none opacity-60"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || compressing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessImage(file);
                  e.target.value = "";
                }}
              />

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-blue-600 shadow-xs mb-2 group-hover:scale-105 transition">
                {compressing ? (
                  <Sparkle size={18} weight="bold" className="animate-spin text-blue-600" />
                ) : (
                  <UploadSimple size={18} weight="bold" />
                )}
              </div>

              <p className="text-xs font-bold text-slate-700">
                {compressing ? (
                  "Compressing to ultra-light WebP..."
                ) : (
                  <>
                    <span className="text-blue-600 underline">Click to upload</span>, drag &amp; drop, or press{" "}
                    <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                      Ctrl+V
                    </kbd>
                  </>
                )}
              </p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Auto-compressed to &lt;70 KB WebP with sharp UI text &amp; zero blur
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: External Link (Loom, Figma, Jira, Drive) */}
      {activeTab === "url" && (
        <div>
          <input
            type="text"
            value={isDataImage ? "" : currentValue}
            onChange={(e) => updateValue(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || "e.g. https://jira.example.com/ticket-123 or https://loom.com/share/..."}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 shadow-2xs"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Paste URL directly or switch to Screenshot tab to upload/paste image with Ctrl+V.
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightbox && isDataImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition"
            >
              <X size={16} weight="bold" />
            </button>
            <img
              src={currentValue}
              alt="Enlarged Evidence"
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
