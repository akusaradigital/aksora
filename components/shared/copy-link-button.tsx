"use client";

import { useState, useCallback, useRef } from "react";
import { Link, Check } from "@phosphor-icons/react";
import { buildShareableUrl, buildShareableUrlWithTab } from "@/lib/shareable-url";
import { toast } from "@/components/ui/toast";

const DEFAULT_TAB = "details";

interface CopyLinkButtonProps {
  module: string;
  itemId: string | number;
  publicToken?: string;
  activeTab?: string | null;
}

export function CopyLinkButton({ module, itemId, publicToken, activeTab }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    // Use publicToken if available, otherwise fall back to itemId
    const viewKey = publicToken?.trim() || String(itemId);
    // Include tab in URL only if it's a non-default, non-empty tab
    const shouldIncludeTab = activeTab && activeTab !== DEFAULT_TAB;
    const url = shouldIncludeTab
      ? buildShareableUrlWithTab(window.location.origin, module, viewKey, activeTab)
      : buildShareableUrl(window.location.origin, module, viewKey);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied to clipboard", "success", { duration: 3000 });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 2000);
    } catch {
      toast("Could not copy link. Try copying the URL from the address bar.", "error", { duration: 5000 });
    }
  }, [module, itemId, publicToken, activeTab]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className=" p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
      aria-label={copied ? "Link copied" : "Copy link"}
      title={copied ? "Link copied" : "Copy link"}
    >
      {copied ? (
        <Check size={14} weight="bold" className="text-emerald-500" />
      ) : (
        <Link size={14} weight="bold" />
      )}
    </button>
  );
}
