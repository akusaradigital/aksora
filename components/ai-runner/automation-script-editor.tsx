"use client";

import { useEffect, useState } from "react";
import { Code, FloppyDisk, MagicWand, SpinnerGap } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { getAiRequestPayload } from "@/lib/ai-keys";

const EXAMPLE = `web:
  url: "{{baseUrl}}"
tasks:
  - name: "Log in"
    flow:
      - aiInput: "{{username}}"
        locate: "Email field"
      - aiTap: "Sign in button"
      - aiAssert: "The dashboard is shown"`;

/** Midscene YAML editor for one test case: generate from the manual steps, edit, save. */
export function AutomationScriptEditor({ testCaseId, initialScript }: { testCaseId: number; initialScript?: string }) {
  const [script, setScript] = useState(initialScript ?? "");
  const [saved, setSaved] = useState(initialScript ?? "");
  const [loading, setLoading] = useState(initialScript === undefined);
  const [busy, setBusy] = useState<"" | "generate" | "save">("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialScript !== undefined) return;
    fetch(`/api/test-cases/${testCaseId}/automation-script`)
      .then((r) => r.json())
      .then((j) => { const s = String(j.data?.script || ""); setScript(s); setSaved(s); })
      .catch(() => setError("Could not load the script."))
      .finally(() => setLoading(false));
  }, [testCaseId, initialScript]);

  const generate = async () => {
    if (script.trim() && !window.confirm("Replace the current script with a new one generated from the test steps?")) return;
    setBusy("generate");
    setError("");
    setNotes("");
    try {
      const ai = getAiRequestPayload();
      const r = await fetch(`/api/test-cases/${testCaseId}/automation-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: { provider: ai.ai_provider, model: ai.ai_model, apiKey: ai.api_key, publicUrl: ai.nine_router_public_url } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed");
      setScript(j.data.script);
      setNotes(String(j.data.notes || ""));
      if (j.data.saved) { setSaved(j.data.script); toast("Script generated and saved.", "success"); }
      else setError(`Generated, but not saved: ${j.data.warning}. Edit it and save.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const r = await fetch(`/api/test-cases/${testCaseId}/automation-script`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not save");
      setSaved(script);
      toast("Script saved.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy("");
    }
  };

  const dirty = script !== saved;

  return (
    <section className="border border-slate-200 bg-white shadow-sm" aria-labelledby="automation-script-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 id="automation-script-title" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Code size={14} weight="bold" /> Automation script
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Midscene YAML the AI runner follows. Use {"{{variable}}"} for environment values.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={generate} disabled={!!busy || loading} className="inline-flex h-8 items-center gap-1.5 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {busy === "generate" ? <SpinnerGap size={13} weight="bold" className="animate-spin" /> : <MagicWand size={13} weight="bold" />}
            Generate from steps
          </button>
          <button type="button" onClick={save} disabled={!!busy || !dirty} className="inline-flex h-8 items-center gap-1.5 bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy === "save" ? <SpinnerGap size={13} weight="bold" className="animate-spin" /> : <FloppyDisk size={13} weight="bold" />}
            Save
          </button>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <label htmlFor={`automation-script-${testCaseId}`} className="sr-only">Automation script (YAML)</label>
        <textarea
          id={`automation-script-${testCaseId}`}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          onKeyDown={(e) => {
            // Tab inserts two spaces: YAML forbids tab indentation. Escape leaves the field.
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: a, selectionEnd: b } = el;
              setScript(script.slice(0, a) + "  " + script.slice(b));
              requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
            } else if (e.key === "Escape") e.currentTarget.blur();
          }}
          placeholder={loading ? "Loading..." : EXAMPLE}
          spellCheck={false}
          rows={14}
          className="w-full resize-y border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <p className="text-[11px] text-slate-500">Tab indents with two spaces. Press Esc, then Tab, to move on.</p>
        {notes && <p className="text-xs text-slate-600">{notes}</p>}
        {error && <InlineAlert variant="error" compact message={error} />}
      </div>
    </section>
  );
}
