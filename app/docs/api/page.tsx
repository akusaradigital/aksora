import { PageShell } from "@/components/layout/page-shell";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-slate-900 p-3.5 text-[11px] font-mono text-slate-100 leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 border border-slate-200">
      {children}
    </code>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
      {children}
    </h2>
  );
}

const MODULES: { key: string; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "bugs", label: "Bugs" },
  { key: "test-cases", label: "Test Cases" },
  { key: "test-plans", label: "Test Plans" },
  { key: "test-sessions", label: "Test Sessions" },
  { key: "test-suites", label: "Test Suites" },
  { key: "meeting-notes", label: "Meeting Notes" },
  { key: "assignees", label: "Assignees" },
  { key: "sprints", label: "Sprints" },
  { key: "users", label: "Users" },
  { key: "deployments", label: "Deployment Log" },
  { key: "work-logs", label: "Work Log" },
];

export default function ApiDocsPage() {
  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "API Keys", href: "/settings/api-keys" },
    { label: "API Docs" },
  ];

  return (
    <PageShell
      icon={<BookOpen size={22} weight="bold" />}
      title="API Documentation"
      description="Reference for integrating external tools, CI/CD pipelines, and scripts with the Aksora REST API."
      crumbs={crumbs}
    >
      <div className="w-full space-y-8">
        {/* Intro */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>Introduction</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            The Aksora REST API lets external systems read and write data in your Aksora workspace over plain HTTP with
            JSON requests and responses. It is meant for integrations such as CI/CD pipelines that file bugs on a failed
            build, automation scripts that log work, or other internal tools that need to push or pull data from Aksora
            without a human clicking through the UI.
          </p>
        </div>

        {/* Auth */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>Authentication</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Every request must be authenticated with a personal API key, sent in the <InlineCode>Authorization</InlineCode>{" "}
            header using the <InlineCode>Bearer</InlineCode> scheme:
          </p>
          <Code>{`Authorization: Bearer <API_KEY_AKSORA>`}</Code>
          <p className="text-xs leading-relaxed text-slate-600">
            Generate a key on the{" "}
            <Link href="/settings/api-keys" className="font-semibold text-blue-600 hover:text-blue-800">
              Settings &gt; API Keys
            </Link>{" "}
            page. In every example below, <InlineCode>&lt;API_KEY_AKSORA&gt;</InlineCode> (also written as{" "}
            <InlineCode>YOUR_AKSORA_API_KEY</InlineCode>) is a placeholder.
          </p>
          <div className="border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-800">
            Replace this with your real API key generated from the Settings &gt; API Keys page. Never share your API
            key with anyone.
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            An API key acts on behalf of the user who created it, with that user&apos;s role and permissions. It is
            shown in full only once, right after creation &mdash; Aksora stores only a hash of it afterwards. If you lose
            it, revoke it on the API Keys page and generate a new one.
          </p>
        </div>

        {/* Base URL */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>Base URL</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            All endpoints follow this pattern, where <InlineCode>{"{module}"}</InlineCode> is one of the module keys
            listed below:
          </p>
          <Code>{`https://your-domain.com/api/public/v1/{module}`}</Code>
        </div>

        {/* OpenAPI spec */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>OpenAPI Specification</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            A machine-readable OpenAPI 3.0 document is generated live from the same module registry this API runs on
            — every field, required-ness, and enum value stays in sync automatically. Import it into Postman, Insomnia,
            or any OpenAPI-compatible client.
          </p>
          <Link
            href="/api/openapi.json"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            View /api/openapi.json &rarr;
          </Link>
        </div>

        {/* SDK */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>TypeScript / JavaScript SDK</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            No package to install — copy <InlineCode>sdk/aksora-client.ts</InlineCode> from the{" "}
            <a
              href="https://github.com/akusaradigital/aksora/blob/main/sdk/aksora-client.ts"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              Aksora repository
            </a>{" "}
            into your project. It wraps every request with the <InlineCode>Authorization</InlineCode> header for you.
          </p>
          <Code>{`import { AksoraClient } from "./aksora-client";

const aksora = new AksoraClient({
  baseUrl: "https://your-domain.com",
  apiKey: process.env.AKSORA_API_KEY!,
});

const { data: bugs } = await aksora.list("bugs");
await aksora.create("bugs", { title: "Login button unresponsive", severity: "high" /* ... */ });
await aksora.update("tasks", 12, { status: "done" });
await aksora.remove("bugs", 12);`}</Code>
        </div>

        {/* SnapTest Integration */}
        <div className="border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm space-y-3">
          <SectionTitle>SnapTest Integration</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-700">
            You can sync AI-generated bugs, test cases, and tasks from <strong>SnapTest</strong> directly into your Aksora workspace:
          </p>
          <ol className="list-decimal pl-5 text-xs leading-relaxed text-slate-700 space-y-1.5">
            <li>Generate an API key in Aksora under <Link href="/settings/api-keys" className="font-semibold text-blue-600 hover:text-blue-800">Settings &gt; API Keys</Link>.</li>
            <li>In SnapTest, go to <strong>Settings &gt; Integrations &gt; Aksora Integration</strong>.</li>
            <li>Paste your <strong>Aksora Base URL</strong> and <strong>API Key</strong>, then click <strong>Test Connection</strong>.</li>
            <li>Once saved, you can push tickets or generated test suites from SnapTest directly to Aksora with a single click.</li>
          </ol>
        </div>

        {/* Modules table */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>Available Modules</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Module Key</th>
                  <th className="px-4 py-2">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {MODULES.map((m) => (
                  <tr key={m.key}>
                    <td className="px-4 py-2 font-mono text-[11px]">{m.key}</td>
                    <td className="px-4 py-2">{m.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            Requesting any other module key returns a 404 <InlineCode>Unknown module.</InlineCode> error. The{" "}
            <InlineCode>users</InlineCode> module is restricted &mdash; only company/management admin accounts can call
            it; other users get a 403 <InlineCode>Unauthorized</InlineCode> response.
          </p>
        </div>

        {/* GET */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionTitle>GET &mdash; List records</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Returns all records for a module. No request body.
          </p>
          <Code>{`curl -X GET https://your-domain.com/api/public/v1/bugs \\
  -H "Authorization: Bearer <API_KEY_AKSORA>"`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Success response (200)</p>
          <Code>{`{
  "data": [
    {
      "ID": "BUG-0001",
      "Project": "Mobile App",
      "Module": "Checkout",
      "Bug Type": "Functional",
      "Title": "Payment button disabled after retry",
      "Preconditions": "User has an item in cart",
      "Steps to Reproduce": "1. Go to checkout\\n2. Fail payment once\\n3. Retry",
      "Expected Result": "Retry succeeds",
      "Actual Result": "Pay button stays disabled",
      "Severity": "high",
      "Priority": "P1",
      "Status": "open",
      "Suggested Dev": "",
      "Related Items": "",
      "Evidence": "https://example.com/log-file"
    }
  ]
}`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Error responses</p>
          <Code>{`// 401 Unauthorized - missing/invalid API key
{ "error": "Unauthorized" }

// 404 Not Found - unknown module key
{ "error": "Unknown module." }

// 429 Too Many Requests - rate limit hit
{ "error": "Too many requests. Please try again later." }`}</Code>
        </div>

        {/* POST */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionTitle>POST &mdash; Create a record</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Creates a new record. Send the fields as a flat JSON body, or nested under a <InlineCode>data</InlineCode>{" "}
            key &mdash; both are accepted.
          </p>
          <Code>{`curl -X POST https://your-domain.com/api/public/v1/bugs \\
  -H "Authorization: Bearer <API_KEY_AKSORA>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project": "Mobile App",
    "module": "Checkout",
    "bugType": "Functional",
    "title": "Payment button disabled after retry",
    "preconditions": "User has an item in cart",
    "stepsToReproduce": "1. Go to checkout\\n2. Fail payment once\\n3. Retry",
    "expectedResult": "Retry succeeds",
    "actualResult": "Pay button stays disabled",
    "severity": "high",
    "priority": "P1",
    "status": "open",
    "evidence": "https://example.com/log-file"
  }'`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Success response (200)</p>
          <Code>{`{ "message": "Bugs added successfully." }`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Error responses</p>
          <Code>{`// 401 Unauthorized
{ "error": "Unauthorized" }

// 400 Bad Request - body missing/not an object
{ "error": "Invalid data provided." }

// 400 Bad Request - schema validation failed (first failing field)
{ "error": "Title is required" }

// 404 Not Found - unknown module key
{ "error": "Unknown module." }

// 429 Too Many Requests
{ "error": "Too many requests. Please try again later." }`}</Code>
        </div>

        {/* PATCH */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionTitle>PATCH &mdash; Update a record</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Updates an existing record. The record <InlineCode>id</InlineCode> is required in the body; the remaining
            fields go in <InlineCode>data</InlineCode> (or flat, alongside <InlineCode>id</InlineCode>) and must satisfy
            the same validation as POST.
          </p>
          <Code>{`curl -X PATCH https://your-domain.com/api/public/v1/tasks \\
  -H "Authorization: Bearer <API_KEY_AKSORA>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": 12,
    "data": {
      "title": "Add export button",
      "project": "Mobile App",
      "relatedFeature": "Reports",
      "category": "Feature",
      "status": "doing",
      "priority": "P2",
      "description": "Add a CSV export button to the reports page.",
      "acceptanceCriteria": "Export produces a valid CSV file."
    }
  }'`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Success response (200)</p>
          <Code>{`{ "message": "Tasks updated successfully." }`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Error responses</p>
          <Code>{`// 401 Unauthorized
{ "error": "Unauthorized" }

// 400 Bad Request - missing/empty id
{ "error": "Invalid ID." }

// 400 Bad Request - schema validation failed (first failing field)
{ "error": "Description is required" }

// 404 Not Found - unknown module key
{ "error": "Unknown module." }

// 429 Too Many Requests
{ "error": "Too many requests. Please try again later." }`}</Code>
        </div>

        {/* DELETE */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionTitle>DELETE &mdash; Remove a record</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Deletes a single record. The record id is passed as an <InlineCode>id</InlineCode> query parameter, not in
            the body.
          </p>
          <Code>{`curl -X DELETE "https://your-domain.com/api/public/v1/bugs?id=12" \\
  -H "Authorization: Bearer <API_KEY_AKSORA>"`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Success response (200)</p>
          <Code>{`{ "message": "Bugs deleted successfully." }`}</Code>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Error responses</p>
          <Code>{`// 401 Unauthorized
{ "error": "Unauthorized" }

// 400 Bad Request - missing id query param
{ "error": "Invalid ID." }

// 404 Not Found - unknown module key
{ "error": "Unknown module." }

// 429 Too Many Requests
{ "error": "Too many requests. Please try again later." }`}</Code>
        </div>

        {/* Rate limiting */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <SectionTitle>Rate Limiting</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Each API key is limited to <strong>100 requests per 60-second window</strong>. Every request against{" "}
            <InlineCode>{"/api/public/v1/{module}"}</InlineCode> counts toward this limit, regardless of the HTTP
            method or whether it succeeds. Once the limit is hit, the key is locked out for another 60 seconds and every
            request in that window returns:
          </p>
          <Code>{`HTTP/1.1 429 Too Many Requests
{ "error": "Too many requests. Please try again later." }`}</Code>
        </div>

        {/* Validation */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionTitle>Field Validation Per Module</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-600">
            Each module has its own required fields and value types for POST and PATCH. Sending a field with an
            unexpected type or missing a required field returns a 400 error naming the first invalid field. Two
            examples:
          </p>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">bugs</p>
            <table className="w-full text-left text-xs mb-2">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Field</th>
                  <th className="px-3 py-1.5">Required</th>
                  <th className="px-3 py-1.5">Type / Allowed values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr><td className="px-3 py-1.5">project</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">module</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">bugType</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">Functional | UI/UX | Performance | Validation | API | Security | Compatibility</td></tr>
                <tr><td className="px-3 py-1.5">title</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">preconditions</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">stepsToReproduce</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">expectedResult</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">actualResult</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">severity</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">low | medium | high | critical</td></tr>
                <tr><td className="px-3 py-1.5">priority</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">P0 | P1 | P2 | P3</td></tr>
                <tr><td className="px-3 py-1.5">status</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">open | in_progress | ready_to_retest | closed | rejected</td></tr>
                <tr><td className="px-3 py-1.5">suggestedDev</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">string</td></tr>
                <tr><td className="px-3 py-1.5">relatedItems</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">string</td></tr>
                <tr><td className="px-3 py-1.5">evidence</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">http(s) URL or local path starting with /</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">tasks</p>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Field</th>
                  <th className="px-3 py-1.5">Required</th>
                  <th className="px-3 py-1.5">Type / Allowed values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr><td className="px-3 py-1.5">title</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">project</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">relatedFeature</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">category</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">Feature | Enhancement | Bug Fix | Tech Debt | Research | Support | Refactor | Documentation | Improvement</td></tr>
                <tr><td className="px-3 py-1.5">status</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">todo | doing | review | done | blocked</td></tr>
                <tr><td className="px-3 py-1.5">priority</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">P0 | P1 | P2 | P3</td></tr>
                <tr><td className="px-3 py-1.5">description</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">acceptanceCriteria</td><td className="px-3 py-1.5">Yes</td><td className="px-3 py-1.5">non-empty string</td></tr>
                <tr><td className="px-3 py-1.5">startDate</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">date string</td></tr>
                <tr><td className="px-3 py-1.5">endDate</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">date string</td></tr>
                <tr><td className="px-3 py-1.5">assignee</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">string</td></tr>
                <tr><td className="px-3 py-1.5">evidence</td><td className="px-3 py-1.5">No</td><td className="px-3 py-1.5">http(s) URL or local path starting with /</td></tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500">
            The other modules (test-cases, test-plans, test-sessions, test-suites, meeting-notes, assignees, sprints,
            users, deployments, work-logs) each follow the same pattern &mdash; their own required fields and enum
            values, validated the same way on POST and PATCH.
          </p>
        </div>

        {/* Security */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <SectionTitle>Security</SectionTitle>
          <ul className="list-disc pl-5 text-xs leading-relaxed text-slate-600 space-y-1.5">
            <li>An API key grants the same access as signing in as the user who created it &mdash; treat it like a password.</li>
            <li>Store keys in an environment variable or secret manager. Never hardcode a key in source code or commit it to a repository.</li>
            <li>If a key is ever exposed (committed, logged, pasted somewhere public), revoke it immediately on the API Keys page and generate a new one.</li>
            <li>The full key is shown only once, at creation time. It cannot be viewed again afterwards &mdash; if you lose it, revoke the old key and generate a new one.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
