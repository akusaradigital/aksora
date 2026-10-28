"use client";

import { useState } from "react";
import { Scroll, Copy, Check, Sparkle, Tag } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { cn } from "@/lib/utils";

export function AiReleaseNotesModal({
  isOpen,
  onClose,
  defaultVersion = "v1.0.0",
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultVersion?: string;
}) {
  const [version, setVersion] = useState(defaultVersion);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"user" | "tech">("user");
  const [userFacing, setUserFacing] = useState("");
  const [techChangelog, setTechChangelog] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showUnconfigured, setShowUnconfigured] = useState(false);

  const handleGenerate = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setGenerating(true);
    try {
      const [resBugs, resTasks] = await Promise.all([
        fetch("/api/items/bugs").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/items/tasks").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const closedBugs = ((resBugs.data as Array<Record<string, unknown>>) || [])
        .filter((b) => String(b.status || "").toLowerCase() === "closed" || String(b.status || "").toLowerCase() === "done")
        .slice(0, 15);
      const doneTasks = ((resTasks.data as Array<Record<string, unknown>>) || [])
        .filter((t) => String(t.status || "").toLowerCase() === "done" || String(t.status || "").toLowerCase() === "completed")
        .slice(0, 15);

      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_release_notes",
          payload: {
            releaseVersion: version.trim() || "v1.0.0",
            closedBugs,
            completedTasks: doneTasks,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate release notes");

      setUserFacing(json.data?.userFacing || "");
      setTechChangelog(json.data?.technicalChangelog || "");
      setHighlights(json.data?.highlights || []);
      toast(`Release notes for ${version} generated!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = activeTab === "user" ? userFacing : techChangelog;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast("Release notes copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast("Failed to copy", "error");
    });
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Release Notes & Changelog Generator"
        description="Aggregate resolved tickets and closed bugs into customer announcements and engineering changelogs."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
            <Scroll size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {(userFacing || techChangelog) && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  {copied ? "Copied" : "Copy Selected Tab"}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700 transition disabled:opacity-50"
              >
                <Sparkle size={14} weight="bold" className={cn(generating && "animate-spin")} />
                {generating ? "Generating Notes..." : "Generate Release Notes"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Release Version / Tag
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400">
                  <Tag size={13} weight="bold" />
                </div>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. v1.12.0 or 2026.10-RC1"
                  className="h-8 w-full rounded-md border border-slate-200 pl-7 pr-3 text-xs font-bold text-slate-900 outline-none transition focus:border-teal-500"
                />
              </div>
            </div>
            {highlights.length > 0 && (
              <div className="flex-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Highlights</span>
                <ul className="list-disc list-inside text-[11px] text-teal-950 mt-0.5 space-y-0.5">
                  {highlights.slice(0, 2).map((h, i) => (
                    <li key={i} className="truncate">{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {(userFacing || techChangelog) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("user")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition",
                    activeTab === "user" ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  User-Facing Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tech")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition",
                    activeTab === "tech" ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Technical Engineering Changelog
                </button>
              </div>

              <textarea
                value={activeTab === "user" ? userFacing : techChangelog}
                onChange={(e) => (activeTab === "user" ? setUserFacing(e.target.value) : setTechChangelog(e.target.value))}
                className="h-64 w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono text-slate-800 outline-none leading-relaxed"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <Scroll size={32} weight="bold" className="mx-auto text-teal-500" />
              <p className="font-semibold text-slate-800 text-xs">Automate Sprint Release Documentation</p>
              <p className="text-[11px] text-slate-400">
                Click &ldquo;Generate Release Notes&rdquo; to pull closed bug fixes and tasks, then summarize into announcement notes.
              </p>
            </div>
          )}
        </div>
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Release Notes Generator"
      />
    </>
  );
}
