import Link from "next/link";
import {
  Key,
  Code,
  ShieldCheck,
  Lightning,
  ArrowsClockwise,
  CheckCircle,
  FileCode,
  Copy,
  Terminal,
} from "@phosphor-icons/react/dist/ssr";
import { moduleOrder, moduleConfigs } from "@/lib/modules";

export const metadata = {
  title: "REST API & Webhooks Documentation | Aksora",
  description: "Comprehensive developer documentation for Aksora Public REST API v1, Outbound Webhooks, and TypeScript SDK.",
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Code size={14} weight="bold" />
          Aksora Developer Platform
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          REST API &amp; Webhooks Reference
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Integrate Aksora into your CI/CD pipelines, automated test suites, and internal tools. Query and mutate tasks, test cases, bugs, sprints, and meeting notes programmatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileCode size={16} weight="bold" />
            OpenAPI 3.0 Spec (JSON)
          </a>
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center gap-1.5 bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Key size={16} weight="bold" />
            Get API Keys
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-4">
        {/* Navigation Sticky Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 space-y-6 text-xs">
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Overview</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600">
                <li><a href="#authentication" className="hover:text-blue-600">Authentication</a></li>
                <li><a href="#scopes" className="hover:text-blue-600">Granular Scopes</a></li>
                <li><a href="#rate-limits" className="hover:text-blue-600">Rate Limiting</a></li>
                <li><a href="#sdk" className="hover:text-blue-600">TypeScript SDK</a></li>
              </ul>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Modules (CRUD)</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600">
                {moduleOrder.map((mod) => (
                  <li key={mod}>
                    <a href={`#module-${mod}`} className="capitalize hover:text-blue-600">
                      {mod.replace(/-/g, " ")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400">Webhooks</div>
              <ul className="mt-2 space-y-1.5 font-medium text-slate-600">
                <li><a href="#webhooks-overview" className="hover:text-blue-600">Outbound Webhooks</a></li>
                <li><a href="#webhooks-security" className="hover:text-blue-600">HMAC Verification</a></li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <div className="space-y-14 lg:col-span-3">
          {/* Section: Authentication */}
          <section id="authentication" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900">Authentication</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              All requests to the Aksora REST API must include your API key in the <code className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">Authorization</code> header using the Bearer token scheme.
            </p>
            <div className="mt-4 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100">
              <code>Authorization: Bearer aksora_live_xxxxxxxxxxxxxxxxxxxx</code>
            </div>
          </section>

          {/* Section: Granular Scopes */}
          <section id="scopes" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900">Granular Scopes &amp; Module Isolation</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              When creating an API key, you can configure both permission scopes and module restrictions to enforce least privilege:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <ShieldCheck size={18} className="text-emerald-600" weight="bold" />
                  Access Level Scope
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li><strong className="text-slate-800">Read &amp; Write:</strong> Allows GET, POST, PATCH, and DELETE.</li>
                  <li><strong className="text-slate-800">Read-only:</strong> Allows GET only. Mutating endpoints return 403 Forbidden.</li>
                </ul>
              </div>
              <div className="rounded border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Lightning size={18} className="text-blue-600" weight="bold" />
                  Module Whitelist
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Restrict keys to specific entities (e.g. only <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">bugs</code> and <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">test-cases</code>). Requests to omitted modules return 403.
                </p>
              </div>
            </div>
          </section>

          {/* Section: TypeScript SDK */}
          <section id="sdk" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900">TypeScript SDK</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Use our zero-dependency official TypeScript client to integrate directly into Node.js, Deno, Bun, or Cloudflare Workers:
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

          {/* Section: Module Endpoints */}
          <section className="space-y-10">
            <h2 className="text-xl font-bold text-slate-900">Core REST Endpoints</h2>

            {moduleOrder.map((mod) => {
              const cfg = moduleConfigs[mod];
              return (
                <div key={mod} id={`module-${mod}`} className="scroll-mt-20 rounded border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold capitalize text-slate-900">
                      {cfg?.nameSingular || mod} API
                    </h3>
                    <span className="font-mono text-xs text-slate-400">/api/public/v1/{mod}</span>
                  </div>

                  <div className="mt-4 space-y-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">GET</span>
                        <span className="text-slate-800">/api/public/v1/{mod}</span>
                      </div>
                      <p className="mt-1 text-slate-500">List items with pagination (?page=1&amp;limit=50&amp;search=keyword).</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800">POST</span>
                        <span className="text-slate-800">/api/public/v1/{mod}</span>
                      </div>
                      <p className="mt-1 text-slate-500">Create a new {cfg?.nameSingular?.toLowerCase() || mod}. Requires write scope.</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">PATCH</span>
                        <span className="text-slate-800">/api/public/v1/{mod}?id=:id</span>
                      </div>
                      <p className="mt-1 text-slate-500">Update specific fields of an existing item.</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800">DELETE</span>
                        <span className="text-slate-800">/api/public/v1/{mod}?id=:id</span>
                      </div>
                      <p className="mt-1 text-slate-500">Soft-delete or permanently remove an item.</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

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
