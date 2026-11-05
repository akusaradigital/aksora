import type { Metadata } from "next";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  Database,
  Eye,
  Key,
  Users,
  CloudArrowUp,
  Timer,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { SecurityArchitectureGraphic } from "@/components/landing/security-architecture-graphic";

export const metadata: Metadata = {
  title: "Security — Enterprise-Grade Protection for Your QA Data",
  description:
    "Learn about Aksora's security architecture including encryption, access controls, data isolation, audit logging, and infrastructure security.",
  alternates: { canonical: "/security" },
};

export const revalidate = 3600;

export default function SecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-visible bg-gradient-to-b from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] pt-20 pb-24 text-white px-5 sm:px-8 border-b border-blue-900/60 shadow-inner">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200 border border-blue-400/30 mb-3">
                Security
              </span>
              <h1 className="text-3xl font-extrabold sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight">
                Your QA data deserves enterprise-grade security
              </h1>
              <p className="mt-5 text-sm sm:text-base text-blue-100 leading-relaxed max-w-xl">
                Test plans, bug reports, and quality metrics are sensitive intellectual property. We protect them with the same rigor that enterprise organizations expect — encryption, isolation, access controls, and full auditability.
              </p>
            </div>

            <div className="lg:col-span-5">
              <SecurityArchitectureGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Security Architecture</p>
            <h2 className="text-2xl font-bold text-gray-900">Defense in depth at every layer</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityCard
              icon={<Lock size={22} weight="bold" />}
              title="Encryption Everywhere"
              items={["TLS 1.3 for all data in transit", "AES-256 encryption at rest", "HMAC-signed session tokens", "Scrypt password hashing with unique salts"]}
            />
            <SecurityCard
              icon={<Database size={22} weight="bold" />}
              title="Data Isolation"
              items={["Logical tenant isolation per workspace", "Workspace-scoped queries on every request", "No cross-workspace data leakage possible", "Independent data export per organization"]}
            />
            <SecurityCard
              icon={<Users size={22} weight="bold" />}
              title="Access Control"
              items={["8 granular roles with scoped permissions", "Role-based UI and API access", "Admin-controlled team membership", "Session expiry with configurable TTL"]}
            />
            <SecurityCard
              icon={<Eye size={22} weight="bold" />}
              title="Audit & Compliance"
              items={["Complete activity audit trail", "Every CRUD operation logged with user and timestamp", "Filterable audit log for compliance reviews", "12-month retention for audit records"]}
            />
            <SecurityCard
              icon={<Key size={22} weight="bold" />}
              title="Authentication"
              items={["Secure session-based authentication", "Automatic session expiry (configurable)", "Password change invalidates all sessions", "Rate limiting on auth endpoints"]}
            />
            <SecurityCard
              icon={<CloudArrowUp size={22} weight="bold" />}
              title="Infrastructure"
              items={["Enterprise-grade cloud hosting", "Automated daily backups", "99.9% uptime SLA", "Global CDN for static assets"]}
            />
          </div>
        </div>
      </section>

      {/* Security Practices */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Development Practices</p>
            <h2 className="text-2xl font-bold text-gray-900">Security built into our development process</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <PracticeCard
              icon={<ShieldCheck size={18} weight="bold" />}
              title="Secure Coding Standards"
              desc="All database queries use parameterized statements. Input validation via Zod schemas. No string interpolation in SQL. Content Security Policy headers on all responses."
            />
            <PracticeCard
              icon={<Timer size={18} weight="bold" />}
              title="Dependency Management"
              desc="Dependencies are pinned to exact versions. Automated vulnerability scanning on every build. Critical patches applied within 24 hours of disclosure."
            />
            <PracticeCard
              icon={<CloudArrowUp size={18} weight="bold" />}
              title="Backup & Recovery"
              desc="Automated daily backups with point-in-time recovery capability. Backup integrity verified regularly. Recovery procedures tested quarterly."
            />
            <PracticeCard
              icon={<Warning size={18} weight="bold" />}
              title="Incident Response"
              desc="Documented incident response procedures. Affected users notified within 72 hours of confirmed breach. Post-incident reviews with published findings."
            />
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Security commitments</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <CommitmentItem text="No third-party advertising trackers or pixels" />
            <CommitmentItem text="No selling or sharing of customer data" />
            <CommitmentItem text="Data export available at any time, in standard formats" />
            <CommitmentItem text="Account deletion with complete data removal within 30 days" />
            <CommitmentItem text="Minimal cookie usage (session auth only)" />
            <CommitmentItem text="Rate limiting and brute-force protection on all endpoints" />
            <CommitmentItem text="Security headers (CSP, X-Frame-Options, HSTS) on all responses" />
            <CommitmentItem text="Regular security reviews and code audits" />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white dark:bg-slate-950 py-16 px-5 sm:px-8 transition-colors">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-8 py-16 text-center text-white shadow-xl">
          <h2 className="text-2xl font-extrabold sm:text-4xl">Security questions or vulnerability reports?</h2>
          <p className="mt-4 text-sm text-blue-100 max-w-lg mx-auto">
            We take security seriously. If you&apos;ve found a vulnerability or have security-related questions about our platform, please reach out.
          </p>
          <p className="mt-6">
            <a href="mailto:security@akusaradigital.com" className="rounded-full bg-[#a3e635] px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-[#bef264]">
              security@akusaradigital.com
            </a>
          </p>
          <p className="mt-8 text-xs text-blue-200">
            See also: <Link href="/privacy" className="text-white font-semibold underline hover:text-blue-100">Privacy Policy</Link>
          </p>
        </div>
      </section>
    </>
  );
}

function SecurityCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <article className="border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="mb-4 text-blue-600" aria-hidden="true">{icon}</div>
      <h3 className="text-[14px] font-bold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12px] text-gray-600">
            <CheckCircle size={13} weight="bold" className="shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PracticeCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border border-gray-200 bg-white p-6 flex items-start gap-4">
      <div className="shrink-0 text-blue-600 mt-0.5" aria-hidden="true">{icon}</div>
      <div>
        <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function CommitmentItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 bg-white p-4">
      <CheckCircle size={16} weight="bold" className="shrink-0 text-emerald-500" aria-hidden="true" />
      <p className="text-[12px] text-gray-700">{text}</p>
    </div>
  );
}
