"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { CustomFieldsEditor } from "@/components/case-setup/custom-fields-editor";
import type { CustomFieldValues } from "@/lib/case-fields";

type Props = {
  testCaseId: number;
  title: string;
  onClose: () => void;
  /** Extra sections (e.g. the automation script editor) rendered under custom fields. */
  children?: React.ReactNode;
};

/** Side panel for per-case extras that do not fit in the grid: custom fields and automation. */
export function CaseDetailsDrawer({ testCaseId, title, onClose, children }: Props) {
  const [values, setValues] = useState<CustomFieldValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/test-cases/${testCaseId}/custom-fields`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setValues(json.data || {});
        setStatus("idle");
      })
      .catch(() => !cancelled && setStatus("idle"));
    return () => {
      cancelled = true;
    };
  }, [testCaseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setStatus("saving");
    setMessage("");
    const res = await fetch(`/api/test-cases/${testCaseId}/custom-fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customFields: values }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors(json.fields || {});
      setMessage(json.error || "Could not save custom fields.");
      setStatus("error");
      return;
    }
    setErrors({});
    setValues(json.data || values);
    setStatus("saved");
    setMessage("Custom fields saved.");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${title}`}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="truncate text-sm font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900" aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </header>

        <section className="space-y-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom fields</h3>
          {status === "loading" ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : (
            <>
              <CustomFieldsEditor value={values} onChange={setValues} errors={errors} disabled={status === "saving"} />
              <p className="text-[11px] text-slate-500">Fields are defined by admins in Settings → Test Case Setup.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={status === "saving"}
                  className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {status === "saving" ? "Saving…" : "Save fields"}
                </button>
                {message && (
                  <span role="status" className={status === "error" ? "text-xs text-rose-600" : "text-xs text-emerald-700"}>
                    {message}
                  </span>
                )}
              </div>
            </>
          )}
        </section>

        {children && <div className="px-5 py-4">{children}</div>}
      </aside>
    </div>
  );
}
