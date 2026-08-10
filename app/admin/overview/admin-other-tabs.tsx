"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash, Eye, EyeSlash, Headset, MagnifyingGlass, ClockCounterClockwise, Funnel } from "@phosphor-icons/react";
import { ModernDatePicker } from "@/components/shared/date-picker";
import { LoadingSkeleton } from "./admin-shared";
import { formatDate, formatDateTime } from "./admin-utils";

type Announcement = { id: number; title: string; message: string; type: string; targetCompany: string; active: number; createdBy: string; expiresAt: string | null; createdAt: string };
type AuditEntry = { id: number; actor: string; action: string; target: string; detail: string; createdAt: string };

// ─── Announcements Tab ───────────────────────────────────────────────────────
export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", targetCompany: "", expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/announcements").then((r) => r.json()).then((j) => setAnnouncements(j.data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try { await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setForm({ title: "", message: "", type: "info", targetCompany: "", expiresAt: "" }); setShowForm(false); load(); }
    catch {} setSubmitting(false);
  };

  const handleAction = async (id: number, action: "activate" | "deactivate" | "delete") => {
    await fetch("/api/admin/announcements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }); load();
  };

  if (loading) return <LoadingSkeleton />;
  const typeColors: Record<string, string> = { info: "bg-blue-50 text-blue-700", warning: "bg-amber-50 text-amber-700", maintenance: "bg-rose-50 text-rose-700", update: "bg-emerald-50 text-emerald-700" };
  const activeCount = announcements.filter((a) => a.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><h2 className="text-sm font-bold text-gray-800">Announcements</h2><span className="text-[10px] text-gray-400">{activeCount} active · {announcements.length} total</span></div>
        <button onClick={() => setShowForm(!showForm)} className="flex h-8 items-center gap-1.5 border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"><Plus size={12} weight="bold" /> New</button>
      </div>
      {showForm && (
        <div className="border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400" />
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message..." rows={3} className="w-full border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 resize-none" />
          <div className="flex flex-wrap gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"><option value="info">Info</option><option value="warning">Warning</option><option value="maintenance">Maintenance</option><option value="update">Update</option></select>
            <input value={form.targetCompany} onChange={(e) => setForm({ ...form, targetCompany: e.target.value })} placeholder="Target company (empty = all)" className="flex-1 border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none" />
            <div className="w-52"><ModernDatePicker name="expiresAt" value={form.expiresAt} onChange={(val) => setForm({ ...form, expiresAt: val })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={submitting} className="h-7 border border-blue-600 bg-blue-600 px-3 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{submitting ? "Sending..." : "Publish"}</button>
            <button onClick={() => setShowForm(false)} className="h-7 border border-gray-200 px-3 text-[11px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className={`border bg-white px-4 py-3 ${a.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1"><span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${typeColors[a.type] || typeColors.info}`}>{a.type}</span>{!a.active && <span className="text-[10px] text-gray-400">Inactive</span>}{a.targetCompany && <span className="text-[10px] text-gray-500">→ {a.targetCompany}</span>}</div>
                <p className="text-xs font-bold text-gray-800">{a.title}</p>
                <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{a.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">By {a.createdBy} · {formatDate(a.createdAt)}{a.expiresAt ? ` · Expires ${a.expiresAt}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => handleAction(a.id, a.active ? "deactivate" : "activate")} title={a.active ? "Deactivate" : "Activate"} className="flex h-7 w-7 items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50">{a.active ? <EyeSlash size={12} weight="bold" /> : <Eye size={12} weight="bold" />}</button>
                <button onClick={() => handleAction(a.id, "delete")} title="Delete" className="flex h-7 w-7 items-center justify-center border border-gray-200 text-rose-500 hover:bg-rose-50"><Trash size={12} weight="bold" /></button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No announcements yet.</p>}
      </div>
    </div>
  );
}

// ─── Tickets Tab ─────────────────────────────────────────────────────────────
export function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(() => { fetch("/api/admin/tickets").then((r) => r.json()).then((d) => setTickets(d.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: number, action: "reply" | "close" | "in-progress", reply?: string) => {
    setActionLoading(`${action}-${id}`);
    try { await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, reply }) }); setReplyId(null); setReplyText(""); load(); }
    catch {} setActionLoading(null);
  };

  if (loading) return <LoadingSkeleton />;
  const statusColors: Record<string, string> = { open: "bg-blue-50 text-blue-700", "in-progress": "bg-amber-50 text-amber-700", replied: "bg-emerald-50 text-emerald-700", closed: "bg-gray-100 text-gray-500" };
  const priorityColors: Record<string, string> = { low: "text-gray-500", normal: "text-blue-600", high: "text-amber-600", urgent: "text-rose-600" };
  const filteredTickets = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in-progress").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-800">Support Tickets</h2>
          <div className="flex items-center gap-2">
            {openCount > 0 && <span className="flex h-5 items-center gap-1 bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700">{openCount} open</span>}
            {inProgressCount > 0 && <span className="flex h-5 items-center gap-1 bg-amber-50 px-1.5 text-[10px] font-bold text-amber-700">{inProgressCount} in progress</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Funnel size={12} weight="bold" className="text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 border border-gray-200 bg-white px-2 text-[11px] outline-none">
            <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="replied">Replied</option><option value="closed">Closed</option>
          </select>
        </div>
      </div>
      {tickets.length === 0 ? (
        <div className="border border-gray-200 bg-white px-6 py-10 text-center"><Headset size={32} weight="bold" className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-semibold text-gray-600">No tickets</p><p className="mt-1 text-xs text-gray-400">Company admins can submit support tickets from their settings.</p></div>
      ) : filteredTickets.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No tickets with status &quot;{statusFilter}&quot;.</p>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((t) => (
            <div key={t.id} className={`border bg-white px-4 py-3 ${t.status === "open" ? "border-blue-100" : "border-gray-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold ${statusColors[t.status] || statusColors.open}`}>{t.status}</span>
                    <span className="text-xs font-bold text-gray-800">{t.subject}</span>
                    <span className={`text-[10px] font-bold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{t.category}</span>
                  </div>
                  <p className="text-[11px] text-gray-600">{t.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">From <span className="font-semibold">{t.company}</span> · {t.createdBy} · {formatDateTime(t.createdAt)}</p>
                </div>
              </div>
              {t.adminReply && (<div className="mt-2 border-t border-gray-100 pt-2 bg-emerald-50/50 -mx-4 px-4 py-2"><p className="text-[10px] font-semibold text-emerald-700">Your reply:</p><p className="text-[11px] text-gray-700">{t.adminReply}</p></div>)}
              {replyId === t.id && (
                <div className="mt-2 border-t border-gray-100 pt-2 space-y-2">
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply..." rows={2} className="w-full border border-gray-200 bg-white px-3 py-2 text-xs outline-none resize-none focus:border-blue-400" />
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(t.id, "reply", replyText)} disabled={!replyText.trim() || actionLoading === `reply-${t.id}`} className="h-7 bg-blue-600 px-3 text-[11px] font-bold text-white disabled:opacity-50">{actionLoading === `reply-${t.id}` ? "..." : "Send Reply"}</button>
                    <button onClick={() => { setReplyId(null); setReplyText(""); }} className="h-7 border border-gray-200 px-3 text-[11px] text-gray-600">Cancel</button>
                  </div>
                </div>
              )}
              {t.status !== "closed" && replyId !== t.id && (
                <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
                  <button onClick={() => { setReplyId(t.id); setReplyText(""); }} className="h-6 border border-gray-200 px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Reply</button>
                  {t.status === "open" && (<button onClick={() => handleAction(t.id, "in-progress")} className="h-6 border border-amber-200 px-2 text-[10px] font-medium text-amber-700 hover:bg-amber-50">{actionLoading === `in-progress-${t.id}` ? "..." : "In Progress"}</button>)}
                  <button onClick={() => handleAction(t.id, "close")} className="h-6 border border-gray-200 px-2 text-[10px] font-medium text-gray-500 hover:bg-gray-50">{actionLoading === `close-${t.id}` ? "..." : "Close"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ───────────────────────────────────────────────────────────
export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchAudit, setSearchAudit] = useState("");

  useEffect(() => { fetch("/api/admin/audit-log").then((r) => r.json()).then((j) => setLogs(j.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSkeleton />;

  const actionLabels: Record<string, string> = {
    suspend_company: "Suspended company", activate_company: "Activated company", extend_trial: "Extended trial",
    update_quota: "Updated user quota", update_plan: "Changed plan", create_announcement: "Created announcement",
    deactivate_announcement: "Deactivated announcement", activate_announcement: "Activated announcement",
    delete_announcement: "Deleted announcement", export_report: "Exported report",
    ticket_reply: "Replied to ticket", ticket_close: "Closed ticket", "ticket_in-progress": "Ticket in progress",
  };

  const filteredLogs = searchAudit
    ? logs.filter((l) => l.actor.toLowerCase().includes(searchAudit.toLowerCase()) || l.target.toLowerCase().includes(searchAudit.toLowerCase()) || (actionLabels[l.action] || l.action).toLowerCase().includes(searchAudit.toLowerCase()) || (l.detail || "").toLowerCase().includes(searchAudit.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-gray-800">Admin Audit Log</h2>
        <div className="relative">
          <MagnifyingGlass size={12} weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchAudit} onChange={(e) => setSearchAudit(e.target.value)} placeholder="Search logs..." className="h-7 w-52 border border-gray-200 bg-white pl-7 pr-2 text-[11px] outline-none focus:border-blue-400 transition" />
        </div>
      </div>
      {logs.length === 0 ? (
        <div className="border border-gray-200 bg-white px-6 py-10 text-center">
          <ClockCounterClockwise size={32} weight="bold" className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">No actions recorded yet</p>
          <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">All your admin actions will be logged here automatically.</p>
        </div>
      ) : (
        <div className="border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Time</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{log.actor}</td>
                    <td className="px-4 py-2.5 text-gray-700">{actionLabels[log.action] || log.action}</td>
                    <td className="px-4 py-2.5 text-gray-600">{log.target}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-48 truncate">{log.detail || "—"}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (<tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-400">No matching logs found.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
