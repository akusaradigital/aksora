export function EcosystemLogos() {
  const partners = [
    { name: "Next.js 16", label: "NEXT.JS" },
    { name: "TypeScript", label: "TYPESCRIPT" },
    { name: "Playwright", label: "PLAYWRIGHT" },
    { name: "Cypress", label: "CYPRESS" },
    { name: "PostgreSQL", label: "POSTGRESQL" },
    { name: "Neon Serverless", label: "NEON DB" },
    { name: "Docker", label: "DOCKER" },
    { name: "GitHub Actions", label: "GITHUB" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-36 pb-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {partners.map((partner) => (
          <div
            key={partner.name}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-2 font-mono text-xs font-bold tracking-wider text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            <span>{partner.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
