"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

/** Company logo used on PDF report covers. Saving is admin-only (enforced by the API). */
export function CompanyLogoField() {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings/company-logo")
      .then((r) => r.json())
      .then((j) => setLogoUrl(j.data?.logoUrl || ""))
      .catch(() => undefined);
  }, []);

  const save = async (url: string) => {
    const res = await fetch("/api/settings/company-logo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not save logo");
    setLogoUrl(url);
    router.refresh();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      await save(json.url);
      toast("Company logo saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
      <div className="flex h-16 w-32 shrink-0 items-center justify-center border border-dashed border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoUrl ? <img src={logoUrl} alt="Company logo" className="max-h-14 max-w-28 object-contain" /> : <ImageIcon size={22} weight="bold" className="text-slate-300" />}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-slate-900">Company logo</h3>
        <p className="mt-1 text-xs text-slate-500">Shown on the cover of exported PDF reports. PNG or JPEG, up to 5 MB. Admins only.</p>
      </div>
      <div className="flex gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-slate-900 px-3 text-xs font-bold text-white focus-within:ring-2 focus-within:ring-blue-500">
          {busy ? "Uploading..." : logoUrl ? "Replace" : "Upload logo"}
          <input type="file" accept="image/png,image/jpeg" className="sr-only" disabled={busy}
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {logoUrl && (
          <button type="button" disabled={busy}
            onClick={() => save("").catch((err) => toast(err.message, "error"))}
            className="h-9 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
