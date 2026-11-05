"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudArrowDown } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";

type Project = { id: number; name: string };

const inputClass =
  "h-9 w-full border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700";

export function TestmoImportButton({ suiteId }: { suiteId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
      >
        <CloudArrowDown size={18} weight="bold" />
        Import from Testmo
      </button>
      {open && <TestmoImportModal suiteId={suiteId} onClose={() => setOpen(false)} />}
    </>
  );
}

function TestmoImportModal({ suiteId, onClose }: { suiteId: string; onClose: () => void }) {
  const router = useRouter();
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed.");
    return json.data;
  };

  const loadProjects = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const list: Project[] = await post("/api/test-cases/import/testmo/projects", { workspaceUrl, apiToken });
      setProjects(list);
      setProjectId(list[0] ? String(list[0].id) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Testmo.");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await post("/api/test-cases/import/testmo", { workspaceUrl, apiToken, projectId: Number(projectId), targetSuiteId: Number(suiteId) });
      toast(data.imported ? `Imported ${data.imported} cases from Testmo` : "That project has no cases", data.imported ? "success" : "info");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Import from Testmo"
      description="Pulls every case from a Testmo project into this suite. Your API token is used for this import only and is not saved."
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && <InlineAlert variant="error" message={error} />}

        <form onSubmit={loadProjects} className="space-y-4">
          <div>
            <label htmlFor="testmo-url" className={labelClass}>Testmo URL</label>
            <input id="testmo-url" required value={workspaceUrl} onChange={(e) => setWorkspaceUrl(e.target.value)} placeholder="https://your-team.testmo.net" className={inputClass} />
          </div>
          <div>
            <label htmlFor="testmo-token" className={labelClass}>API token</label>
            <input id="testmo-token" type="password" autoComplete="off" required value={apiToken} onChange={(e) => setApiToken(e.target.value)} className={inputClass} />
            <p className="mt-1 text-[11px] text-slate-500">Create one in Testmo under your profile, API access.</p>
          </div>
          {projects === null && (
            <div className="flex justify-end">
              <button type="submit" disabled={busy} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Connecting..." : "Load projects"}
              </button>
            </div>
          )}
        </form>

        {projects !== null && (
          <>
            {projects.length === 0 ? (
              <p className="text-xs text-slate-600">No projects found for this token.</p>
            ) : (
              <div>
                <label htmlFor="testmo-project" className={labelClass}>Project</label>
                <select id="testmo-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-9 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={runImport} disabled={busy || !projectId} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Importing..." : "Import cases"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
