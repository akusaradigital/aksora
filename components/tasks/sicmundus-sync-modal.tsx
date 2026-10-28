"use client";

import { useEffect, useState, useId } from "react";
import {
  PaperPlaneTilt,
  Sparkle,
  ArrowsClockwise,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import {
  DEFAULT_PRESET_TASKS,
  SicmundusSyncHeader,
  SicmundusSyncSuccess,
  SicmundusCredentialsFields,
  SicmundusTaskPreview,
  type SicmundusTaskProp,
  type SicmundusSyncResult,
  type SicmundusParentTask,
} from "@/components/tasks/sicmundus-sync-parts";
import { DurationInput } from "@/components/shared/duration-input";
import { getAiRequestPayload } from "@/lib/ai-keys";

export type { SicmundusTaskProp, SicmundusSyncResult };

export interface SicmundusSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: SicmundusTaskProp;
  onSyncSuccess?: (result: SicmundusSyncResult) => void;
}

export function SicmundusSyncModal({
  isOpen,
  onClose,
  task,
  onSyncSuccess,
}: SicmundusSyncModalProps) {
  const customIdInputId = useId();
  const subtaskTitleId = useId();
  const parentTaskId = useId();
  const dateInputId = useId();
  const notesInputId = useId();

  const [tasksList, setTasksList] = useState<SicmundusParentTask[]>(DEFAULT_PRESET_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(DEFAULT_PRESET_TASKS[0].id);
  const [isCustomTask, setIsCustomTask] = useState(false);
  const [customTaskId, setCustomTaskId] = useState("");

  const [subtaskTitle, setSubtaskTitle] = useState(task.title || "");
  const [date, setDate] = useState(() => {
    return task.startDate || task.endDate || new Date().toISOString().slice(0, 10);
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    if (typeof task.durationMinutes === "number" && task.durationMinutes > 0) {
      return task.durationMinutes;
    }
    const parsed = parseInt(String(task.durationMinutes ?? "").replace(/\D+/g, ""), 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 240;
  });
  const [notes, setNotes] = useState(task.description || "");

  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isFormattingAI, setIsFormattingAI] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    subtaskId: string;
    entryId: string;
    title: string;
    durationMinutes: number;
    sicmundusUrl: string;
  } | null>(null);

  // Load parent tasks from Sicmundus API on mount / when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const fetchTasks = async () => {
      try {
        const queryParams = username && password
          ? `?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
          : "";
        const res = await fetch(`/api/integrations/sicmundus/tasks${queryParams}`);
        if (!res.ok) return;
        const body = await res.json();
        if (active && body?.data?.tasks && Array.isArray(body.data.tasks) && body.data.tasks.length > 0) {
          setTasksList(body.data.tasks);
          setSelectedTaskId(body.data.tasks[0].id);
        }
      } catch {
        // Fallback to presets
      }
    };

    fetchTasks();
    return () => {
      active = false;
    };
  }, [isOpen, username, password]);

  // AI format task title & notes
  const handleAIFormat = async () => {
    if (isFormattingAI) return;
    setIsFormattingAI(true);
    setErrorMsg(null);

    try {
      const aiPayload = getAiRequestPayload();
      const res = await fetch("/api/integrations/sicmundus/ai-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: subtaskTitle || task.title,
          description: notes || task.description,
          project: task.project,
          category: task.category,
          durationMinutes,
          ai: aiPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to format with AI");
      }

      if (json.data?.subtaskTitle) {
        setSubtaskTitle(json.data.subtaskTitle);
      }
      if (json.data?.notes && !notes) {
        setNotes(json.data.notes);
      }
      if (json.data?.durationMinutes) {
        setDurationMinutes(json.data.durationMinutes);
      }
      toast("AI formatted task title", "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "AI formatting failed");
    } finally {
      setIsFormattingAI(false);
    }
  };

  // Perform sync to Sicmundus
  const handleSync = async () => {
    const finalTaskId = isCustomTask ? customTaskId.trim() : selectedTaskId;
    if (!finalTaskId) {
      setErrorMsg("Please select or specify a target Sicmundus task ID");
      return;
    }
    if (!subtaskTitle.trim()) {
      setErrorMsg("Subtask title cannot be empty");
      return;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setErrorMsg("Duration must be at least 1 minute");
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/integrations/sicmundus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          sicmundusTaskId: finalTaskId,
          subtaskTitle: subtaskTitle.trim(),
          durationMinutes,
          date,
          notes: notes.trim(),
          username: username.trim() || undefined,
          password: password.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Sync failed");
      }

      const subtaskId = json.data?.subtask?.id || "";
      const entryId = json.data?.entry?.id || "";
      const createdTitle = json.data?.subtask?.title || subtaskTitle.trim();
      const taskLink = json.data?.sicmundusTaskUrl || `https://sicmundus.magnusdigital.co.id/tasks?task=${encodeURIComponent(finalTaskId)}`;

      const result = {
        subtaskId,
        entryId,
        title: createdTitle,
        durationMinutes,
        sicmundusUrl: taskLink,
      };

      setSuccessData(result);
      onSyncSuccess?.({ subtaskId, entryId, title: createdTitle });
      toast("Task synced to Sicmundus", "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sync task");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSyncing) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in slide-in-from-bottom-2 duration-150 sm:slide-in-from-bottom-0">
        {/* Header */}
        <SicmundusSyncHeader onClose={onClose} isSyncing={isSyncing} />

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
              <WarningCircle size={15} weight="bold" className="mt-0.5 shrink-0" />
              <div className="flex-1 text-[11px] font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successData ? (
            <SicmundusSyncSuccess data={successData} onClose={onClose} />
          ) : (
            <>
              {/* Task Summary Preview */}
              <SicmundusTaskPreview task={task} />

              {/* Target Sicmundus Task Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={parentTaskId} className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Target Sicmundus Task
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTask(!isCustomTask)}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    {isCustomTask ? "Select from list" : "Enter custom Task ID"}
                  </button>
                </div>

                {isCustomTask ? (
                  <input
                    id={customIdInputId}
                    type="text"
                    value={customTaskId}
                    onChange={(e) => setCustomTaskId(e.target.value)}
                    placeholder="e.g. 48eaa317-0f7c-4152-ada5-e0c8b4eb88ac"
                    className="w-full border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-sky-600 focus:outline-none"
                  />
                ) : (
                  <select
                    id={parentTaskId}
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-sky-600 focus:outline-none"
                  >
                    {tasksList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} {t.project_name ? `(${t.project_name})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subtask Title with AI Format */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={subtaskTitleId} className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Subtask Title
                  </label>
                  <button
                    type="button"
                    onClick={handleAIFormat}
                    disabled={isFormattingAI || isSyncing}
                    className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition"
                    title="Format using active AI provider (Settings > AI & Models)"
                  >
                    <Sparkle size={12} weight="bold" className={isFormattingAI ? "animate-spin text-violet-600" : "text-violet-600"} />
                    {isFormattingAI ? "Formatting..." : "AI Format"}
                  </button>
                </div>
                <input
                  id={subtaskTitleId}
                  type="text"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="e.g. Testing Image Generator - Core Studio Layout"
                  className="w-full border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor={dateInputId} className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Date
                </label>
                <input
                  id={dateInputId}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* Duration with Jam & Menit Dual Input and Live Conversion */}
              <div>
                <DurationInput
                  value={durationMinutes}
                  onChange={(mins) => setDurationMinutes(mins)}
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor={notesInputId} className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Notes <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  id={notesInputId}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional work notes or bug references..."
                  className="h-20 w-full resize-none overflow-y-auto border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* Credentials Collapsible */}
              <SicmundusCredentialsFields
                show={showCredentials}
                onToggle={() => setShowCredentials(!showCredentials)}
                username={username}
                onUsernameChange={setUsername}
                password={password}
                onPasswordChange={setPassword}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {!successData && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200/80 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={13} weight="bold" />
                  Sync to Sicmundus
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
