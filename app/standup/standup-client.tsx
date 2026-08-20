"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Checks,
  FloppyDiskBack,
  Bug,
  Kanban,
  FileText,
  Clock,
  Warning,
  Sparkle
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

type Task = { id: number; title: string; status: string; priority: string; project: string };
type BugItem = { id: number; title: string; severity: string; status: string; project: string };
type StandupNote = { id: number; title: string; content: string; date: string; attendees: string };

type StandupData = {
  user: { name: string; email: string; role: string };
  tasks: Task[];
  bugs: BugItem[];
  recentStandups: StandupNote[];
};

export function StandupClient() {
  const router = useRouter();
  const [data, setData] = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hasBlocker, setHasBlocker] = useState(false);
  const [project, setProject] = useState("");

  useEffect(() => {
    fetch("/api/standup")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json.tasks?.length > 0) {
          setProject(json.tasks[0].project);
        } else if (json.bugs?.length > 0) {
          setProject(json.bugs[0].project);
        } else {
          setProject("General");
        }

        // Prefill Today's focus with In Progress or active tasks
        const activeTasks = json.tasks?.filter((t: Task) => t.status.toLowerCase() === "in progress" || t.status.toLowerCase() === "active") || [];
        const activeBugs = json.bugs?.filter((b: BugItem) => b.status.toLowerCase() === "active" || b.status.toLowerCase() === "open") || [];

        const focusItems = [
          ...activeTasks.map((t: Task) => `Task: ${t.title}`),
          ...activeBugs.map((b: BugItem) => `Bug: ${b.title}`)
        ];

        if (focusItems.length > 0) {
          setToday(focusItems.map((item) => `- ${item}`).join("\n"));
        } else {
          setToday("- Focus on pending backlog tasks\n- Review QA pipeline");
        }

        setYesterday("- Worked on general QA & test tasks");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast("Failed to load standup context", "error");
        setLoading(false);
      });
  }, []);

  const handleAutoSuggest = () => {
    if (!data) return;
    const completedTasks = data.tasks.filter((t) => t.status.toLowerCase() === "done" || t.status.toLowerCase() === "completed");
    const resolvedBugs = data.bugs.filter((b) => b.status.toLowerCase() === "resolved" || b.status.toLowerCase() === "closed");

    const doneList = [
      ...completedTasks.map((t) => `Task: [Done] ${t.title}`),
      ...resolvedBugs.map((b) => `Bug: [Fixed] ${b.title}`)
    ];

    if (doneList.length > 0) {
      setYesterday(doneList.map((item) => `- ${item}`).join("\n"));
    } else {
      setYesterday("- Worked on various task validations");
    }
    toast("Yesterday prefilled with completed items!", "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const title = `Daily Standup - ${data?.user?.name || "User"} (${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`;
    const content = `Yesterday:\n${yesterday}\n\nToday:\n${today}\n\nBlockers:\n${hasBlocker ? blockers : "None"}`;

    try {
      const res = await fetch("/api/items/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project,
          attendees: data?.user?.name || "User",
          content,
          actionItems: hasBlocker ? blockers : "",
          relatedItems: "",
          date: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast("Standup logged successfully to Meeting Notes!", "success");
      router.push("/meeting-notes");
      router.refresh();
    } catch {
      toast("Failed to log standup", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500 py-10">Preparing standup context...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Input Form */}
      <div className="lg:col-span-2 space-y-4">
        <form onSubmit={handleSubmit} className="glass-card bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-900">New Daily Log</h3>
            <button
              type="button"
              onClick={handleAutoSuggest}
              className="inline-flex h-8 items-center gap-1.5 glass-card bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Sparkle size={14} weight="bold" /> Auto-Suggest Yesterday
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Active Project</label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="h-10 w-full glass-card px-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none"
              placeholder="e.g. Website Revamp"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">What did you do yesterday?</label>
            <textarea
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              rows={3}
              className="w-full glass-card p-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">What is your focus for today?</label>
            <textarea
              value={today}
              onChange={(e) => setToday(e.target.value)}
              rows={3}
              className="w-full glass-card p-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBlocker}
                onChange={(e) => setHasBlocker(e.target.checked)}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Warning size={14} weight="bold" className="text-amber-500" /> Do you have any blockers?
              </span>
            </label>

            {hasBlocker && (
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Describe your blockers or assistance needed..."
                rows={2}
                className="w-full glass-card p-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none border-amber-300 bg-amber-50/20"
                required
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center gap-2 bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <FloppyDiskBack size={16} weight="bold" />
            {submitting ? "Saving..." : "Log Standup to Notes"}
          </button>
        </form>
      </div>

      {/* Context Sidebar */}
      <div className="space-y-4">
        {/* Active Work Context */}
        <div className="glass-card bg-slate-50/50 p-5 space-y-4 border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Work Items</h4>

          {/* Tasks */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Kanban size={12} weight="bold" /> Assigned Tasks ({data?.tasks?.length || 0})
            </span>
            <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
              {data?.tasks && data.tasks.length > 0 ? (
                data.tasks.map((t) => (
                  <div key={t.id} className="glass-card bg-white p-2.5 text-xs">
                    <div className="font-semibold text-slate-950 line-clamp-1">{t.title}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{t.project}</span>
                      <span className="font-medium text-blue-600 capitalize">{t.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400">No active tasks assigned</div>
              )}
            </div>
          </div>

          {/* Bugs */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Bug size={12} weight="bold" /> Assigned Bugs ({data?.bugs?.length || 0})
            </span>
            <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
              {data?.bugs && data.bugs.length > 0 ? (
                data.bugs.map((b) => (
                  <div key={b.id} className="glass-card bg-white p-2.5 text-xs">
                    <div className="font-semibold text-slate-950 line-clamp-1">{b.title}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{b.project}</span>
                      <span className="font-medium text-rose-600 capitalize">{b.severity}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400">No active bugs assigned</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Standup History */}
        <div className="glass-card bg-white p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Clock size={14} weight="bold" /> Recent Standups
          </h4>
          <div className="space-y-3">
            {data?.recentStandups && data.recentStandups.length > 0 ? (
              data.recentStandups.map((note) => (
                <div key={note.id} className="border-l-2 border-slate-200 pl-3 space-y-1">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{note.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(note.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                  <pre className="text-[10px] text-slate-600 font-mono line-clamp-3 bg-slate-50 p-1.5 overflow-hidden">
                    {note.content}
                  </pre>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">No recent standup notes found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
