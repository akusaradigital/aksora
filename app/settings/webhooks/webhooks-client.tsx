"use client";

import { useEffect, useState } from "react";
import {
  WebhooksLogo,
  Plus,
  Trash,
  Copy,
  Check,
  Warning,
  X,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";

export type WebhookItem = {
  id: string | number;
  url: string;
  events: string;
  active: boolean | number;
  createdAt: string;
  lastTriggeredAt?: string | null;
  lastStatus?: number | null;
  failureCount?: number;
};

export function WebhooksClient() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WebhookItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/webhooks");
      if (!res.ok) throw new Error("Failed to load webhooks.");
      const data = await res.json();
      setWebhooks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, events: ["*"] }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create webhook.");
      }

      const data = await res.json();
      setCreatedSecret(data?.data?.secret || null);
      setIsCreateOpen(false);
      setUrl("");
      toast("Webhook created successfully", "success");
      fetchWebhooks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/settings/webhooks?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete webhook.");
      }
      toast("Webhook deleted", "success");
      fetchWebhooks();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete webhook", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast("Copied to clipboard", "success");
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Outbound Webhooks</h2>
          <p className="mt-1 text-xs text-slate-500">
            Aksora will POST a JSON payload to your URL whenever data changes (create, update, delete) across any module.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Plus size={15} weight="bold" />
          Add Webhook
        </button>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Registered Webhooks</h3>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
              <WebhooksLogo size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No Webhooks Registered</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Add a webhook URL to receive real-time notifications when data changes in Aksora.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">URL</th>
                  <th className="px-6 py-3">Events</th>
                  <th className="px-6 py-3">Last Triggered</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {webhooks.map((hook) => {
                  const isActive = Boolean(hook.active);
                  const failureCount = hook.failureCount ?? 0;
                  return (
                    <tr key={hook.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 max-w-xs truncate font-mono text-[11px] font-semibold text-slate-800" title={hook.url}>
                        {hook.url}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                          {hook.events === "*" ? "All events" : hook.events}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(hook.lastTriggeredAt)}
                        {hook.lastStatus ? ` (HTTP ${hook.lastStatus})` : ""}
                      </td>
                      <td className="px-6 py-4">
                        {!isActive ? (
                          <span className="inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                            Disabled ({failureCount} failures)
                          </span>
                        ) : failureCount > 0 ? (
                          <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Failing ({failureCount})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(hook)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                        >
                          <Trash size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Verifying the signature</h3>
        <p className="text-xs leading-relaxed text-slate-600">
          Every request includes an <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800">X-Aksora-Signature</code> header
          — an HMAC-SHA256 hex digest of the raw request body, signed with your webhook secret. Recompute it on your end
          and compare to reject forged requests.
        </p>
        <pre className="overflow-x-auto bg-slate-900 p-3.5 text-[11px] font-mono text-slate-100 leading-relaxed">
          <code>{`const crypto = require("crypto");
const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
if (expected !== req.headers["x-aksora-signature"]) throw new Error("Invalid signature");`}</code>
        </pre>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Webhook</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} weight="bold" />
              </button>
            </div>

            {createError && <InlineAlert variant="error" message={createError} className="mb-4" />}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-server.com/webhooks/aksora"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full h-9 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Must be a public HTTPS endpoint able to receive a POST request with a JSON body.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !url.trim()}
                  className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <ShieldCheck size={22} className="text-emerald-600" weight="bold" />
              <h3 className="text-base font-bold text-slate-900">Your Webhook Secret</h3>
            </div>

            <div className="space-y-4">
              <div className="border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Warning size={16} className="text-rose-600" weight="bold" />
                  Save this secret now!
                </div>
                <p className="text-[11px] leading-relaxed">
                  This is the <strong>only time</strong> the signing secret will be displayed. Use it to verify incoming
                  webhook signatures.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Signing Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdSecret}
                    className="flex-1 h-10 border border-slate-300 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-900 outline-none select-all"
                  />
                  <button
                    onClick={() => copySecret(createdSecret)}
                    className="flex h-10 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition shrink-0"
                  >
                    {copiedSecret ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
                    {copiedSecret ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setCreatedSecret(null)}
                  className="h-9 bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  I have saved this secret
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Webhook"
        message={`Are you sure you want to delete this webhook? Aksora will stop sending events to "${deleteTarget?.url}".`}
        confirmText={deleteLoading ? "Deleting..." : "Yes, Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
