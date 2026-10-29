import React from "react";
import {
  Lock,
  ShieldCheck,
  Database,
  Key,
  CheckCircle,
  FileLock,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

export function SecurityArchitectureGraphic() {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
      {/* Top Window Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[11px] font-mono text-slate-500">aksora.security/architecture</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
          <ShieldCheck size={12} weight="bold" /> SOC2 / ISO Aligned
        </span>
      </div>

      {/* Defense in Depth Layers */}
      <div className="space-y-3">
        {/* Layer 1: Edge & Transport */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Lock size={16} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Transport &amp; Edge Layer</p>
              <p className="text-[11px] text-slate-500">Strict CSP, TLS 1.3 &amp; HMAC Session Signatures</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            Enforced
          </span>
        </div>

        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={13} weight="bold" className="rotate-90" />
        </div>

        {/* Layer 2: Application & Auth RBAC */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Key size={16} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Granular RBAC &amp; Zod Validation</p>
              <p className="text-[11px] text-slate-500">8 engineering roles with strict endpoint scoping</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            Validated
          </span>
        </div>

        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={13} weight="bold" className="rotate-90" />
        </div>

        {/* Layer 3: Logical Tenant Isolation */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Database size={16} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Workspace Isolation &amp; Prepared SQL</p>
              <p className="text-[11px] text-slate-500">Zero cross-tenant leakage; parameterized queries only</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            Isolated
          </span>
        </div>

        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={13} weight="bold" className="rotate-90" />
        </div>

        {/* Layer 4: Immutable Audit & Encryption */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <FileLock size={16} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Encrypted Storage &amp; Audit Trail</p>
              <p className="text-[11px] text-slate-500">AES-256 at rest + 12-month tamper-proof audit log</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
            Encrypted
          </span>
        </div>
      </div>

      {/* Bottom Guarantee */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <CheckCircle size={14} weight="bold" className="text-emerald-600" />
          Zero Raw SQL Injection Vector
        </span>
        <span className="font-mono text-[10px] text-slate-400">TLS 1.3 / AES-256</span>
      </div>
    </div>
  );
}
