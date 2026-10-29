"use client";

import { useState, useEffect } from "react";
import {
  Heartbeat, ArrowClockwise, Plus, CheckCircle, XCircle, Globe,
  ShieldCheck, Trash, X
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export type CanaryItem = {
  id: number;
  name: string;
  project: string;
  environment: string;
  url: string;
  method: string;
  expectedStatus: number;
  lastStatus?: number;
  lastLatencyMs?: number;
  lastCheckedAt?: string;
  isHealthy: boolean;
  lastError?: string;
};

export function CanaryHealthWidget() {
  const [canaries, setCanaries] = useState<CanaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pingingAll, setPingingAll] = useState(false);
  const [pingingId, setPingingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [saving, setSaving] = useState(false);

  const fetchCanaries = async () => {
    try {
      const res = await fetch("/api/canary");
      const json = await res.json();
      if (res.ok) {
        setCanaries(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanaries();
  }, []);

  const pingAll = async () => {
    setPingingAll(true);
    try {
      const res = await fetch("/api/canary/ping-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to ping all");
      toast("All canary checks updated", "success");
      await fetchCanaries();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ping all failed", "error");
    } finally {
      setPingingAll(false);
    }
  };

  const pingOne = async (id: number) => {
    setPingingId(id);
    try {
      const res = await fetch(`/api/canary/${id}/ping`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ping failed");

      setCanaries((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...json.data } : c))
      );
      toast("Health check completed", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ping error", "error");
    } finally {
      setPingingId(null);
    }
  };

  const handleAddCanary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/canary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          environment,
          expectedStatus,
          method: "GET",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add canary");

      toast("Canary added", "success");
      setShowAddModal(false);
      setName("");
      setUrl("");
      await fetchCanaries();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this canary monitor?")) return;
    try {
      const res = await fetch(`/api/canary/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCanaries((prev) => prev.filter((c) => c.id !== id));
        toast("Canary removed", "info");
      }
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const healthyCount = canaries.filter((c) => c.isHealthy).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Heartbeat size={16} weight="bold" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Environment Canary (Health Monitor)</h3>
            <p className="text-[11px] text-slate-400">
              {canaries.length === 0
                ? "No target monitors configured"
                : `${healthyCount}/${canaries.length} endpoints operational`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={pingAll}
            disabled={pingingAll || canaries.length === 0}
            className="flex h-7 items-center gap-1 rounded-md bg-slate-100 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
          >
            <ArrowClockwise size={12} weight="bold" className={cn(pingingAll && "animate-spin")} />
            Ping All
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] font-bold text-white hover:bg-blue-700 transition"
          >
            <Plus size={12} weight="bold" /> Add Canary
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-slate-900">Add Health Check Endpoint</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCanary} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Endpoint Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Staging Auth API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  URL Target
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://staging.example.com/health"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                    <option value="uat">UAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Expected HTTP
                  </label>
                  <input
                    type="number"
                    value={expectedStatus}
                    onChange={(e) => setExpectedStatus(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Canary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canary List */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading canary health status...</div>
      ) : canaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
          <Globe size={24} className="mx-auto text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-600">No canary endpoints yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Add staging health endpoints to monitor uptime and latency in real-time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {canaries.map((canary) => (
            <div key={canary.id} className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "flex h-2.5 w-2.5 rounded-full shrink-0",
                    canary.isHealthy ? "bg-emerald-500 shadow-2xs shadow-emerald-500/50" : "bg-rose-500 animate-pulse"
                  )}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 truncate">{canary.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-500 uppercase">
                      {canary.environment}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate block max-w-xs">
                    {canary.url}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canary.lastLatencyMs !== undefined && canary.lastLatencyMs !== null && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold",
                      canary.lastLatencyMs < 200
                        ? "bg-emerald-50 text-emerald-700"
                        : canary.lastLatencyMs < 600
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {canary.lastLatencyMs}ms
                  </span>
                )}

                <span
                  className={cn(
                    "text-[10px] font-mono font-bold",
                    canary.isHealthy ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {canary.lastStatus ? `HTTP ${canary.lastStatus}` : "Unchecked"}
                </span>

                <button
                  type="button"
                  onClick={() => pingOne(canary.id)}
                  disabled={pingingId === canary.id}
                  title="Ping now"
                  className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                >
                  <ArrowClockwise size={13} className={cn(pingingId === canary.id && "animate-spin")} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(canary.id)}
                  title="Remove canary"
                  className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition"
                >
                  <Trash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
