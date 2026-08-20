"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Buildings } from "@phosphor-icons/react";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Workspace name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; workspace?: { id: number } };
      if (!res.ok) throw new Error(data.error || "Failed to create workspace.");

      // Switch session to new workspace
      await fetch("/api/auth/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: data.workspace?.id }),
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app,#f8fafc)] px-4">
      <div className="w-full max-w-md border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
            <Buildings size={24} weight="bold" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Create your workspace</h1>
          <p className="text-center text-sm text-gray-500">
            You&apos;re almost in. Give your team&apos;s workspace a name to get started.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
              placeholder="Acme QA Team"
              autoFocus
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600">{error}</p>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="w-full bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
