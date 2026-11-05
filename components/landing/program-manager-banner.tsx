import Link from "next/link";
import { Check, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export function ProgramManagerBanner() {
  const teamMembers = [
    { name: "Alexander Wright", role: "Lead QA Engineer", avatar: "A", bg: "bg-blue-600 text-white", status: "Testing Sprint 42", statusColor: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
    { name: "Marcus Vance", role: "Senior Backend Dev", avatar: "M", bg: "bg-indigo-600 text-white", status: "SFTP & DPD Deployed", statusColor: "text-blue-700 bg-blue-50 border border-blue-200" },
    { name: "Felix Scott", role: "Frontend Engineer", avatar: "F", bg: "bg-teal-600 text-white", status: "UI Polish Complete", statusColor: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
    { name: "Emily Watson", role: "Engineering Lead", avatar: "E", bg: "bg-violet-600 text-white", status: "Signoff Review", statusColor: "text-amber-700 bg-amber-50 border border-amber-200" },
  ];

  return (
    <section id="platform" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 bg-white dark:bg-slate-950 transition-colors">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-8 sm:p-12 lg:p-16 shadow-sm relative overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 transition-colors">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16 relative z-10 text-left">
          {/* Left Column: Heading & Feature Details (6 cols) */}
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <ShieldCheck size={14} weight="bold" />
              <span>Release &amp; Quality Intelligence</span>
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl leading-tight">
              Orchestrate Sprints &amp; Milestones With Confidence
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Say goodbye to fragmented spreadsheets and status check-ins. Aksora automates burndown velocity, sprint lifecycle transitions, and end-of-week executive summaries so your team focuses on building.
            </p>

            <div className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <Check size={12} weight="bold" />
                </div>
                <span>Automated weekly executive digest generated directly from daily work logs</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <Check size={12} weight="bold" />
                </div>
                <span>Instant defect triage with suggested developers and reproducible logs</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <Check size={12} weight="bold" />
                </div>
                <span>Multi-tenant isolation and role-based permissions (QA, Dev, PM, Admin)</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-full bg-[#a3e635] px-7 py-3 text-xs font-bold text-slate-950 transition-all hover:bg-[#bef264] hover:shadow-md"
              >
                Start Free Trial
              </Link>
              <Link
                href="/demo"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                View Live Demo
              </Link>
            </div>
          </div>

          {/* Right Column: Program Manager Card Mockup (6 cols) */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-md dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Program Manager — Squad Velocity</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Sprint 42 Release Window • In Progress</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  94.8% Quality Health
                </span>
              </div>

              {/* Progress Tracker */}
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sprint Target Completion</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">84% (42/50 Tasks)</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: "84%" }} />
                </div>
              </div>

              {/* Team Members List */}
              <div className="mt-4 space-y-2.5">
                {teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${member.bg}`}>
                        {member.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{member.name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{member.role}</p>
                      </div>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${member.statusColor}`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
