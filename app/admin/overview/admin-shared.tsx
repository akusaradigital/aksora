import type { ReactNode } from "react";

export function ActionBtn({ label, loading, onClick, variant = "default", disabled = false }: {
  label: string; loading: boolean; onClick: () => void; variant?: "default" | "danger" | "success"; disabled?: boolean;
}) {
  const v = { default: "border-gray-200 text-gray-700 hover:bg-gray-50", danger: "border-rose-200 text-rose-700 hover:bg-rose-50", success: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" };
  return (<button onClick={onClick} disabled={loading || disabled} className={`inline-flex h-7 items-center border px-2.5 text-[11px] font-medium transition disabled:opacity-50 ${v[variant]}`}>{loading ? "..." : label}</button>);
}

export function UsagePill({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (<div className="flex items-center gap-2 bg-gray-50 px-2.5 py-1.5"><span className="text-gray-400">{icon}</span><span className="text-[11px] text-gray-600">{label}</span><span className="ml-auto text-xs font-bold text-gray-900">{value}</span></div>);
}

export function MetricCard({ icon, label, value, color, subtitle }: { icon: ReactNode; label: string; value: number; color: "blue" | "emerald" | "rose" | "amber" | "violet"; subtitle?: string }) {
  const c = { blue: "border-blue-100 bg-blue-50 text-blue-600", emerald: "border-emerald-100 bg-emerald-50 text-emerald-600", rose: "border-rose-100 bg-rose-50 text-rose-600", amber: "border-amber-100 bg-amber-50 text-amber-600", violet: "border-violet-100 bg-violet-50 text-violet-600" };
  return (<div className={`flex items-center gap-3 border px-4 py-3.5 ${c[color]}`}><div className="flex h-9 w-9 items-center justify-center rounded bg-white/70">{icon}</div><div><p className="text-2xl font-bold">{value.toLocaleString()}</p><p className="text-[10px] font-semibold opacity-80">{label}</p>{subtitle && <p className="text-[9px] opacity-60 mt-0.5">{subtitle}</p>}</div></div>);
}

export function LoadingSkeleton() {
  return (<div className="animate-pulse space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded bg-gray-200" />)}</div><div className="h-48 rounded bg-gray-200" /><div className="h-32 rounded bg-gray-200" /></div>);
}
