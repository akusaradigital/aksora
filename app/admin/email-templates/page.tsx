"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Envelope,
  DeviceMobile,
  Desktop,
  Copy,
  Check,
  PaperPlaneTilt,
  ArrowLeft,
  Eye,
  Code
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

const TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome / Onboarding",
    description: "Sent after account activation or invitation acceptance.",
    defaults: { workspaceName: "Acme QA Team", name: "Alex" },
  },
  {
    id: "otp",
    name: "Email Confirmation OTP",
    description: "Sent during user sign up to verify email inbox ownership.",
    defaults: { code: "739201", name: "Alex" },
  },
  {
    id: "reset-password",
    name: "Password Reset Request",
    description: "Sent when user clicks 'Forgot password' with 1-hour secure token link.",
    defaults: { resetUrl: "https://aksora.akusaraproject.my.id/reset-password?token=sample-reset-token-12345", name: "Alex" },
  },
  {
    id: "reset-success",
    name: "Password Changed Confirmation",
    description: "Security notice dispatched right after password is reset.",
    defaults: { name: "Alex" },
  },
  {
    id: "invite-accepted",
    name: "Invite Accepted Notification",
    description: "Sent to workspace owner/inviter when a teammate accepts an invitation.",
    defaults: { inviterEmail: "lead@company.com", acceptedEmail: "teammate@company.com", workspaceName: "Engineering Core" },
  },
  {
    id: "assigned",
    name: "Task / Bug Assigned",
    description: "Real-time notification when user is assigned to a defect or task.",
    defaults: { entityType: "Bug", title: "Auth token session expiration crash on reload", assignedBy: "Sarah Jenkins (PM)" },
  },
  {
    id: "sprint-deadline",
    name: "Sprint Deadline Alert",
    description: "Automated alert for active sprint end dates and remaining tasks.",
    defaults: { sprintName: "Sprint 14 - Performance & Auth", endDate: "August 28, 2026", taskCount: 4 },
  },
  {
    id: "daily-standup",
    name: "Daily Standup Summary",
    description: "Personalized morning digest of active tasks, blockers, and standup quick links.",
    defaults: { date: "2026-08-20", taskCount: 3, blockerCount: 1, name: "Alex" },
  },
] as const;

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("welcome");
  const [locale, setLocale] = useState<"en" | "id">("en");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [params, setParams] = useState<Record<string, any>>({
    workspaceName: "Acme QA Team",
    name: "Alex Morgan",
    code: "849204",
    resetUrl: "https://aksora.akusaraproject.my.id/reset-password?token=sample-token-preview",
    inviterEmail: "lead@company.com",
    acceptedEmail: "alex@company.com",
    entityType: "Bug",
    title: "Auth token session expiration crash on reload",
    assignedBy: "Sarah Jenkins (PM)",
    sprintName: "Sprint 14 - Performance & Auth",
    endDate: "August 28, 2026",
    taskCount: 4,
    date: "2026-08-20",
    blockerCount: 1,
  });

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  // We can fetch or construct the HTML dynamically via client preview or server API
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [renderedSubject, setRenderedSubject] = useState<string>("");

  const updateParam = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch rendered template from API
  const loadPreview = async (templateId: string, customParams: Record<string, any>, currentLocale: "en" | "id" = locale) => {
    try {
      const res = await fetch("/api/admin/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: templateId, params: customParams, locale: currentLocale }),
      });
      if (res.ok) {
        const data = await res.json();
        setRenderedHtml(data.html || "");
        setRenderedSubject(data.subject || "");
      }
    } catch {
      // Fallback
    }
  };

  // Initial load & when template/params change
  useState(() => {
    loadPreview(selectedTemplate, params, locale);
  });

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    loadPreview(id, params, locale);
  };

  const handleLocaleChange = (newLocale: "en" | "id") => {
    setLocale(newLocale);
    loadPreview(selectedTemplate, params, newLocale);
  };

  const handleCopyHtml = () => {
    if (!renderedHtml) return;
    navigator.clipboard.writeText(renderedHtml);
    setCopied(true);
    toast("HTML copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast("Please enter a recipient email address", "error");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/email-preview/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          type: selectedTemplate,
          params,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch test email");
      toast(`Test email sent to ${testEmail}!`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to send email. Check API key settings.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/overview"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Back to Admin Overview"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Envelope size={20} weight="bold" className="text-blue-600" />
              <h1 className="text-base font-bold text-slate-900">Email Template Playground</h1>
              <span className="bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                Aksora Branded
              </span>
            </div>
            <p className="text-xs text-slate-500">Live preview, responsive inspection, and direct test dispatch.</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language / Locale Selector */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => handleLocaleChange("en")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                locale === "en" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLocaleChange("id")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                locale === "id" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ID
            </button>
          </div>

          {/* Viewport Toggles */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition ${
                viewport === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Desktop size={14} weight="bold" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition ${
                viewport === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DeviceMobile size={14} weight="bold" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Preview vs Source */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition ${
                viewMode === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye size={14} weight="bold" />
              <span>Visual</span>
            </button>
            <button
              onClick={() => setViewMode("html")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition ${
                viewMode === "html" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code size={14} weight="bold" />
              <span>HTML Source</span>
            </button>
          </div>

          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {copied ? <Check size={14} weight="bold" className="text-emerald-600" /> : <Copy size={14} weight="bold" />}
            <span>{copied ? "Copied" : "Copy HTML"}</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Sidebar + Preview Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Template Selector & Test Dispatch */}
        <aside className="lg:col-span-4 bg-white border-r border-slate-200 p-6 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-65px)]">
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Select Template
              </label>
              <div className="space-y-1.5">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = tmpl.id === selectedTemplate;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplateSelect(tmpl.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-300 shadow-sm text-slate-950"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                          {tmpl.name}
                        </span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{tmpl.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Test Email Dispatch */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <PaperPlaneTilt size={14} weight="bold" className="text-blue-600" />
                Dispatch Test Email
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">Send this exact rendered template to your inbox.</p>
              <form onSubmit={handleSendTest} className="space-y-2">
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sendingTest ? "Sending..." : "Send Test Email"}
                </button>
              </form>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-6 border-t border-slate-100">
            Aksora Transactional Email System • Resend / SMTP API
          </div>
        </aside>

        {/* Right Preview Viewport */}
        <main className="lg:col-span-8 bg-slate-100 p-6 flex flex-col items-center justify-start overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Email Subject Bar */}
          <div className="w-full max-w-3xl mb-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-slate-400 shrink-0">Subject:</span>
              <span className="font-semibold text-slate-800 truncate">{renderedSubject || activeTemplate.name}</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
              From: Aksora &lt;support@akusaradigital.com&gt;
            </span>
          </div>

          {/* Render Area */}
          {viewMode === "preview" ? (
            <div
              className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300 ${
                viewport === "desktop" ? "w-full max-w-2xl" : "w-[380px]"
              }`}
            >
              {/* Browser/Client Header Bar */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {viewport === "desktop" ? "600px Responsive Container" : "380px Mobile Viewport"}
                </span>
              </div>

              {/* Iframe with HTML content */}
              <iframe
                title="Email Preview"
                srcDoc={renderedHtml}
                className="w-full h-[620px] border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="w-full max-w-3xl bg-slate-900 text-slate-100 rounded-xl shadow-xl p-4 overflow-x-auto font-mono text-xs leading-relaxed max-h-[620px]">
              <pre>{renderedHtml}</pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
