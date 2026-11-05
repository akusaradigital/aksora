import Link from "next/link";
import {
  Key,
  ShieldCheck,
  Lightning,
  FileCode,
} from "@phosphor-icons/react/dist/ssr";
import { moduleOrder, moduleConfigs } from "@/lib/modules";
import { DocsEndpointsAccordion } from "@/components/landing/docs-endpoints-accordion";

export const metadata = {
  title: "REST API & Webhooks Documentation | Aksora",
  description: "Comprehensive developer documentation for Aksora Public REST API v1, Outbound Webhooks, and TypeScript SDK.",
};

export default function ApiDocsPage() {
  const apiModules = moduleOrder.map((mod) => ({
    key: mod,
    title: moduleConfigs[mod]?.title || mod,
    shortTitle: moduleConfigs[mod]?.shortTitle || mod,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 transition-colors">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          REST API &amp; Webhooks Reference
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          Integrate Aksora into your CI/CD pipelines, automated test suites, and internal tools. Query and mutate tasks, test cases, bugs, sprints, and meeting notes programmatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileCode size={16} weight="bold" />
            OpenAPI 3.0 Spec (JSON)
          </a>
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#a3e635] px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-[#bef264]"
          >
            <Key size={16} weight="bold" />
            Get API Keys
          </Link>
        </div>
      </div>

      {/* Mobile Table of Contents */}
      <div className="mt-6 block lg:hidden">
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <summary className="cursor-pointer font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            On this page
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <a href="#authentication" className="text-blue-600 dark:text-blue-400 hover:underline">Authentication</a>
            <a href="#scopes" className="text-blue-600 dark:text-blue-400 hover:underline">Granular Scopes</a>
            <a href="#rate-limits" className="text-blue-600 dark:text-blue-400 hover:underline">Rate Limiting</a>
            <a href="#sdk" className="text-blue-600 dark:text-blue-400 hover:underline">TypeScript SDK</a>
            <a href="#webhooks-overview" className="text-blue-600 dark:text-blue-400 hover:underline">Webhooks</a>
          </div>
        </details>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-4">
        {/* Navigation Sticky Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 space-y-6 text-xs">
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Overview</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600 dark:text-slate-300">
                <li><a href="#authentication" className="hover:text-blue-600 dark:hover:text-blue-400">Authentication</a></li>
                <li><a href="#scopes" className="hover:text-blue-600 dark:hover:text-blue-400">Granular Scopes</a></li>
                <li><a href="#rate-limits" className="hover:text-blue-600 dark:hover:text-blue-400">Rate Limiting</a></li>
                <li><a href="#sdk" className="hover:text-blue-600 dark:hover:text-blue-400">TypeScript SDK</a></li>
              </ul>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Modules (CRUD)</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600 dark:text-slate-300">
                {moduleOrder.map((mod) => (
                  <li key={mod}>
                    <a href={`#module-${mod}`} className="capitalize hover:text-blue-600 dark:hover:text-blue-400">
                      {mod.replace(/-/g, " ")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Webhooks</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600 dark:text-slate-300">
                <li><a href="#webhooks-overview" className="hover:text-blue-600 dark:hover:text-blue-400">Outbound Webhooks</a></li>
                <li><a href="#webhooks-security" className="hover:text-blue-600 dark:hover:text-blue-400">HMAC Verification</a></li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <div className="space-y-14 lg:col-span-3">
          {/* Section: Authentication */}
          <section id="authentication" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Authentication</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
              All requests to the Aksora REST API must include your API key in the <code className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-1 py-0.5 font-mono text-xs text-slate-800">Authorization</code> header using the Bearer token scheme.
            </p>
            <div className="mt-4 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100">
              <code>Authorization: Bearer aksora_live_xxxxxxxxxxxxxxxxxxxx</code>
            </div>
          </section>

          {/* Section: Granular Scopes */}
          <section id="scopes" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Granular Scopes &amp; Module Isolation</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" weight="bold" />
                  Access Level Scope
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong className="text-slate-800 dark:text-slate-100">Read &amp; Write:</strong> Allows GET, POST, PATCH, and DELETE.</li>
                  <li><strong className="text-slate-800 dark:text-slate-100">Read-only:</strong> Allows GET only. Mutating endpoints return 403 Forbidden.</li>
                </ul>
              </div>
              <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Lightning size={18} className="text-blue-600 dark:text-blue-400" weight="bold" />
                  Module Whitelist
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Restrict keys to specific entities (e.g. only <code className="rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-1 py-0.5 font-mono text-[11px]">bugs</code> and <code className="rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-1 py-0.5 font-mono text-[11px]">test-cases</code>). Requests to omitted modules return 403.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Rate Limiting */}
          <section id="rate-limits" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rate Limiting</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
              To protect system availability and prevent abuse, all public REST API endpoints enforce a rate limit of 120 requests per minute per IP address.
            </p>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              When an application exceeds this quota, the API responds with HTTP <code>429 Too Many Requests</code> along with a <code>Retry-After</code> header specifying the number of seconds to back off before retrying.
            </div>
          </section>

          {/* Section: TypeScript SDK */}
          <section id="sdk" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">TypeScript SDK</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
            </p>
            <div className="mt-4 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100 leading-relaxed">
              <pre>{`import { AksoraClient } from "./sdk/aksora-client";

const aksora = new AksoraClient({
  baseUrl: "https://your-domain.com",
  apiKey: process.env.AKSORA_API_KEY!,
});

// List bugs
const { data: bugs } = await aksora.list("bugs", { limit: 20 });

// Create a test case
const { data: newCase } = await aksora.create("test-cases", {
  title: "Validate OAuth Callback with Expired State",
  priority: "High",
  typeCase: "Functional",
  status: "Draft",
});`}</pre>
            </div>
          </section>

          {/* Section: Module Endpoints (Collapsible Dropdowns) */}
          <DocsEndpointsAccordion modules={apiModules} />

          {/* Section: Webhooks */}
          <section id="webhooks-overview" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900">Outbound Webhooks</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Subscribe to real-time events triggered inside Aksora. Every time an entity is created, updated, or deleted, a cryptographically signed HTTP POST request is dispatched to your registered endpoint.
            </p>

            <div id="webhooks-security" className="mt-6 scroll-mt-20 rounded border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Verifying Webhook Signatures</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Aksora attaches an <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800">X-Aksora-Signature</code> header containing the HMAC-SHA256 hex digest of the raw payload computed with your webhook secret.
              </p>

              <div className="mt-4 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100">
                <pre>{`import { createHmac } from "crypto";

function verifyAksoraWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}`}</pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
