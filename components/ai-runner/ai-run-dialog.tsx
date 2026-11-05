"use client";

import { useEffect, useMemo, useState } from "react";
import { Robot, SpinnerGap } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { getAiRequestPayload, getApiKey, getStoredProviderModels } from "@/lib/ai-keys";
import { inferModelFamily } from "@/lib/ai-runner-models";

type Catalog = { providers: Record<string, string[]>; labels: Record<string, { label: string }> };

const inputCls = "h-9 w-full border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelCls = "mb-1 block text-xs font-semibold text-slate-700";

export function AiRunDialog({ runId, open, onClose, onQueued }: { runId: number; open: boolean; onClose: () => void; onQueued: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [locale, setLocale] = useState("");
  const [timezone, setTimezone] = useState("");
  const [autoHeal, setAutoHeal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || catalog) return;
    const active = getAiRequestPayload();
    setProvider(active.ai_provider || "google");
    setModel(active.ai_model || "");
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    setLocale(navigator.language || "");
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((j) => setCatalog(j.data))
      .catch(() => setCatalog({ providers: {}, labels: {} }));
  }, [open, catalog]);

  const models = useMemo(() => {
    const cached = provider ? getStoredProviderModels(provider) : [];
    return Array.from(new Set([...(cached || []), ...(catalog?.providers[provider] || [])]));
  }, [provider, catalog]);

  const visionOk = Boolean(inferModelFamily(model));

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const payload = getAiRequestPayload();
      const res = await fetch(`/api/execution-runs/${runId}/ai-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          // The key for the chosen provider, read from this browser only.
          apiKey: getApiKey(provider),
          publicUrl: provider === "9router-public" ? payload.nine_router_public_url : "",
          baseUrl: baseUrl.trim(),
          locale: locale.trim(),
          timezone: timezone.trim(),
          autoHeal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not queue the run");
      const missing = Number(json.data.casesWithoutScript) || 0;
      toast(missing ? `Queued. ${missing} case(s) have no script and will be marked Blocked.` : "Queued for the AI runner.", missing ? "info" : "success");
      onQueued();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue the run");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      title="Run with AI"
      description="A runner opens each case in Chromium and follows its automation script with a vision model."
      icon={<Robot size={20} weight="bold" />}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !provider || !model || !visionOk}
            className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            Queue run
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ai-run-provider" className={labelCls}>Provider</label>
            <select id="ai-run-provider" className={inputCls} value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); }}>
              {Object.keys(catalog?.providers || { [provider]: [] }).map((p) => (
                <option key={p} value={p}>{catalog?.labels[p]?.label || p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ai-run-model" className={labelCls}>Model</label>
            <input id="ai-run-model" list="ai-run-models" className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gemini-2.5-flash" />
            <datalist id="ai-run-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
        </div>
        {model && !visionOk && (
          <InlineAlert variant="warning" compact message="This model is not one Midscene can drive. Use a vision model such as Gemini, GPT-5, Qwen-VL, Doubao, GLM-V or UI-TARS." />
        )}
        <div>
          <label htmlFor="ai-run-url" className={labelCls}>Base URL</label>
          <input id="ai-run-url" className={inputCls} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://staging.example.com (leave empty to use the run environment)" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ai-run-locale" className={labelCls}>Browser locale</label>
            <input id="ai-run-locale" className={inputCls} value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en-US" />
          </div>
          <div>
            <label htmlFor="ai-run-tz" className={labelCls}>Time zone</label>
            <input id="ai-run-tz" className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Jakarta" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={autoHeal} onChange={(e) => setAutoHeal(e.target.checked)} />
          <span>
            <span className="font-semibold">Auto-heal failing steps</span>
            <span className="block text-xs text-slate-500">On a failed step the runner asks the model to rewrite the script and retries, up to 3 times. A healed script is offered for review; it does not replace the saved one.</span>
          </span>
        </label>
        <p className="text-xs text-slate-500">
          Your API key for this provider is sent with the run and deleted when the run finishes. A runner must be running: <code className="bg-slate-100 px-1 font-mono">node scripts/ai-runner.mjs</code>.
        </p>
        {error && <InlineAlert variant="error" compact message={error} />}
      </div>
    </ModalShell>
  );
}
