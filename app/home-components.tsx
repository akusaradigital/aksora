import Link from "next/link";
import {
  Checks,
  CheckCircle,
  ArrowRight,
  X,
  Quotes,
} from "@phosphor-icons/react/dist/ssr";

export function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export function DashPreviewRow({ label, value, color, pct }: { label: string; value: string; color: string; pct: number }) {
  const colorMap: Record<string, string> = { rose: "bg-rose-500", emerald: "bg-emerald-500", blue: "bg-blue-500", violet: "bg-violet-500" };
  const textMap: Record<string, string> = { rose: "text-rose-400", emerald: "text-emerald-400", blue: "text-blue-400", violet: "text-violet-400" };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className={`text-[12px] font-bold ${textMap[color]}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full ${colorMap[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PainPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <X size={14} weight="bold" className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true" />
      <p className="text-[13px] text-gray-600">{text}</p>
    </div>
  );
}

export function SolvePoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <CheckCircle size={14} weight="bold" className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
      <p className="text-[13px] text-gray-600">{text}</p>
    </div>
  );
}

export function CompareRow({ feature, ours, spreadsheet, jira }: { feature: string; ours: string; spreadsheet: string; jira: string }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4 text-[12px] font-medium text-gray-700">{feature}</td>
      <td className="py-3 px-4 text-[12px] font-semibold text-blue-700 bg-blue-50/50 border-x border-blue-100/50">{ours}</td>
      <td className="py-3 px-4 text-[12px] text-gray-500">{spreadsheet}</td>
      <td className="py-3 px-4 text-[12px] text-gray-500">{jira}</td>
    </tr>
  );
}

export function HomeComparisonSection() {
  return (
    <section className="border-b border-gray-100 bg-gray-50" aria-labelledby="compare-heading">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-1">Why Switch</p>
          <h2 id="compare-heading" className="text-2xl font-bold text-gray-900">Aksora vs. the alternatives</h2>
          <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">A quick look at what changes when the work lives in one place.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="py-3 px-4 text-[12px] font-semibold text-gray-500 w-[200px]">Feature</th>
                <th scope="col" className="py-3 px-4 text-[12px] font-semibold text-gray-900 bg-blue-50 border-x border-blue-100">
                  <span className="flex items-center gap-1.5">
                    <Checks size={14} weight="bold" className="text-blue-600" aria-hidden="true" />
                    Aksora
                  </span>
                </th>
                <th scope="col" className="py-3 px-4 text-[12px] font-semibold text-gray-500">Spreadsheets</th>
                <th scope="col" className="py-3 px-4 text-[12px] font-semibold text-gray-500">Jira / TestRail</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow feature="Setup time" ours="2 minutes" spreadsheet="Instant but messy" jira="Days to weeks" />
              <CompareRow feature="Test case management" ours="Built-in library" spreadsheet="Manual tabs" jira="Separate tool needed" />
              <CompareRow feature="Bug tracking" ours="Integrated workflow" spreadsheet="No lifecycle" jira="Complex setup" />
              <CompareRow feature="Sprint visibility" ours="Real-time dashboard" spreadsheet="Manual charts" jira="Requires plugins" />
              <CompareRow feature="Team onboarding" ours="Self-explanatory UI" spreadsheet="Tribal knowledge" jira="Training required" />
              <CompareRow feature="Auto reports" ours="Weekly digest + health" spreadsheet="Manual effort" jira="Paid add-ons" />
              <CompareRow feature="Price for 10 users" ours="$0 – $190/mo" spreadsheet="Free" jira="$500+/mo" />
              <CompareRow feature="Learning curve" ours="Minutes" spreadsheet="Low but chaotic" jira="Steep" />
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 bg-blue-600 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-blue-500 transition-colors">
            Try It Free — See the Difference
            <ArrowRight size={13} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FeatureCard({ icon, color, bg, title, desc }: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }) {
  return (
    <article className="border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center ${bg} ${color}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{desc}</p>
    </article>
  );
}

export function PersonaCard({ icon, color, bg, role, pain, benefit }: { icon: React.ReactNode; color: string; bg: string; role: string; pain: string; benefit: string }) {
  return (
    <article className="border border-gray-200 bg-white p-5 flex flex-col hover:border-gray-300 hover:shadow-sm transition-all">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center ${bg} ${color}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-[13px] font-bold text-gray-900 mb-2">{role}</h3>
      <div className="flex items-start gap-2 mb-3">
        <X size={12} weight="bold" className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true" />
        <p className="text-[11px] text-gray-500 leading-relaxed">{pain}</p>
      </div>
      <div className="flex items-start gap-2 flex-1">
        <CheckCircle size={12} weight="bold" className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <p className="text-[11px] text-gray-600 leading-relaxed">{benefit}</p>
      </div>
    </article>
  );
}

export function StepCard({ num, title, desc, icon }: { num: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <article className="border border-gray-200 bg-white p-5 relative overflow-hidden hover:border-blue-200 transition-colors">
      <span className="absolute top-3 right-4 text-4xl font-bold text-gray-100" aria-hidden="true">{num}</span>
      <div className="relative">
        <div className="mb-3 text-blue-600" aria-hidden="true">{icon}</div>
        <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
        <p className="mt-1.5 text-[12px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </article>
  );
}

export function MiniCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="border border-gray-200 bg-white p-4 flex items-start gap-3">
      <span className="shrink-0 text-gray-500 mt-0.5" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-[12px] font-bold text-gray-900">{label}</p>
        <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export function TestimonialCard({ quote, name, role, company }: { quote: string; name: string; role: string; company: string }) {
  return (
    <blockquote className="border border-gray-200 bg-white p-6 flex flex-col">
      <Quotes size={20} weight="bold" className="text-blue-200 mb-3" aria-hidden="true" />
      <p className="text-[13px] text-gray-600 leading-relaxed flex-1">{quote}</p>
      <footer className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
        <div className="h-8 w-8 bg-blue-100 flex items-center justify-center" aria-hidden="true">
          <span className="text-[11px] font-bold text-blue-600">{name.split(" ").map(n => n[0]).join("")}</span>
        </div>
        <div>
          <cite className="text-[12px] font-semibold text-gray-900 not-italic">{name}</cite>
          <p className="text-[10px] text-gray-500">{role} · {company}</p>
        </div>
      </footer>
    </blockquote>
  );
}

export function TrustCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border border-gray-200 bg-white p-5 text-center">
      <div className="flex justify-center mb-3 text-blue-600" aria-hidden="true">{icon}</div>
      <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-gray-200 bg-white p-5" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
      <h3 className="text-[13px] font-bold text-gray-900" itemProp="name">{q}</h3>
      <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        <p className="mt-2 text-[12px] text-gray-500 leading-relaxed" itemProp="text">{a}</p>
      </div>
    </div>
  );
}
