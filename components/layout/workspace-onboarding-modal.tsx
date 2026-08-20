"use client";

import { useState } from "react";
import { Buildings } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function WorkspaceOnboardingModal() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Workspace name is required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create workspace."); return; }
      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md border border-gray-200 bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Buildings size={24} weight="bold" className="text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Set up your workspace</h2>
          <p className="text-center text-sm text-gray-500">
            A workspace is your team&apos;s home in Aksora. Give it a name to get started.
          </p>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Workspace name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Acme Engineering"
              disabled={loading}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
