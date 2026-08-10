"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Headset,
  Plus,
  Circle,
  PaperPlaneTilt,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { PageShell } from "@/components/layout/page-shell";
import { toast } from "@/components/ui/toast";

type Ticket = {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  createdBy: string;
  adminReply: string;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "general", priority: "normal" });

  const load = useCallback(() => {
    fetch("/api/support-tickets")
      .then((r) => {
        if (r.status === 403) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((d) => { if (d?.data) setTickets(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast("Subject and message are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast("Ticket submitted successfully", "success");
      setForm({ subject: "", message: "", category: "general", priority: "normal" });
      setShowForm(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit ticket", "error");
    } finally { setSubmitting(false); }
  };

  const statusColors: Record<string, string> = {
    open: "text-blue-600",
    "in-progress": "text-amber-600",
    replied: "text-emerald-600",
    closed: "text-gray-400",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    normal: "bg-blue-50 text-blue-700",
    high: "bg-amber-50 text-amber-700",
    urgent: "bg-rose-50 text-rose-700",
  };

  return (
    <PageShell
      title="Support"
      icon={<Headset size={20} weight="bold" />}
      description="Submit a request or report an issue to the platform team."
      crumbs={[
        { label: "System Settings", href: "/settings" },
        { label: "Support" },
      ]}
      actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex h-9 items-center gap-1.5 border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
        >
          <Plus size={14} weight="bold" /> New Ticket
        </button>
      }
    >
      <div className="space-y-4">
        {/* Create Form */}
        {showForm && (
          <div className="border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject"
              className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue or request..."
              rows={4}
              className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical Issue</option>
                <option value="feature-request">Feature Request</option>
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <PaperPlaneTilt size={14} weight="bold" />
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="h-9 border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-10 text-center">
            <ChatCircleDots size={32} weight="bold" className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No tickets yet</p>
            <p className="mt-1 text-xs text-gray-400">Click &quot;New Ticket&quot; to submit a request.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle size={8} weight="fill" className={statusColors[t.status] || statusColors.open} />
                      <span className="text-xs font-bold text-gray-800">{t.subject}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold ${priorityColors[t.priority] || priorityColors.normal}`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">{t.category}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">{t.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      By {t.createdBy} · {formatDate(t.createdAt)} · Status: <span className="capitalize font-semibold">{t.status}</span>
                    </p>
                  </div>
                </div>

                {/* Admin Reply */}
                {t.adminReply && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Admin Reply:</p>
                    <p className="text-[11px] text-gray-700">{t.adminReply}</p>
                    {t.repliedAt && <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(t.repliedAt)}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

