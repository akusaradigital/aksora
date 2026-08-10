// ─── Mock UI Components for Feature Page ─────────────────────────────────────

export function MockTestPlan() {
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-700">Sprint 24 — Regression Plan</span>
        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 font-bold">IN PROGRESS</span>
      </div>
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Coverage</span>
          <span className="text-[10px] font-bold text-gray-800">87%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: "87%" }} />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-emerald-50 px-2.5 py-2 text-center"><p className="text-sm font-bold text-emerald-700">42</p><p className="text-[9px] text-emerald-600">Passed</p></div>
          <div className="bg-rose-50 px-2.5 py-2 text-center"><p className="text-sm font-bold text-rose-700">3</p><p className="text-[9px] text-rose-600">Failed</p></div>
          <div className="bg-gray-50 px-2.5 py-2 text-center"><p className="text-sm font-bold text-gray-700">7</p><p className="text-[9px] text-gray-600">Pending</p></div>
        </div>
        <div className="pt-2 space-y-1.5">
          {["Login & Authentication", "Payment Flow", "User Profile"].map((s) => (
            <div key={s} className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
              <span className="text-[10px] text-gray-700">{s}</span>
              <span className="text-[9px] font-bold text-emerald-600">✓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MockTestCase() {
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-700">TC-0142: Verify checkout flow</span>
        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 font-bold">FUNCTIONAL</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[9px] font-semibold uppercase text-gray-400 mb-1">Precondition</p>
          <p className="text-[11px] text-gray-600">User is logged in with items in cart</p>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[9px] font-semibold uppercase text-gray-400 mb-2">Steps</p>
          <div className="space-y-1.5">
            {["Click 'Checkout' button", "Fill shipping address", "Select payment method", "Confirm order"].map((step, i) => (
              <div key={step} className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-blue-50 text-[8px] font-bold text-blue-600">{i + 1}</span>
                <span className="text-[10px] text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[9px] font-semibold uppercase text-gray-400 mb-1">Expected Result</p>
          <p className="text-[11px] text-gray-600">Order confirmation page displayed with order ID</p>
        </div>
      </div>
    </div>
  );
}

export function MockExecution() {
  const items = [
    { name: "Login with valid credentials", status: "pass" },
    { name: "Login with invalid password", status: "pass" },
    { name: "Forgot password flow", status: "fail" },
    { name: "Session timeout handling", status: "blocked" },
    { name: "Remember me checkbox", status: "pending" },
  ];
  const statusStyles: Record<string, string> = {
    pass: "bg-emerald-100 text-emerald-700",
    fail: "bg-rose-100 text-rose-700",
    blocked: "bg-amber-100 text-amber-700",
    pending: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-700">Session: Auth Module v2.1</span>
        <span className="text-[10px] text-gray-500">Pass rate: <span className="font-bold text-emerald-600">40%</span></span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] text-gray-700">{item.name}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase ${statusStyles[item.status]}`}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockBugTracker() {
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-700">BUG-0089: Payment fails on Safari</span>
        <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 font-bold">CRITICAL</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase text-gray-400">Priority</p>
            <p className="text-[11px] font-bold text-rose-600">High</p>
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase text-gray-400">Assignee</p>
            <p className="text-[11px] font-bold text-gray-700">@sarah</p>
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase text-gray-400">Status</p>
            <p className="text-[11px] font-bold text-amber-600">In Progress</p>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[9px] font-semibold uppercase text-gray-400 mb-1">Steps to Reproduce</p>
          <p className="text-[10px] text-gray-600 leading-relaxed">1. Open checkout on Safari 17<br />2. Enter card details<br />3. Click &quot;Pay Now&quot; → Error 500</p>
        </div>
        <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 font-medium">Linked: TC-0142</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 font-medium">Sprint 24</span>
        </div>
      </div>
    </div>
  );
}

export function MockKanban() {
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-[11px] font-bold text-gray-700">Sprint 24 — Kanban Board</span>
      </div>
      <div className="p-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase text-gray-400 mb-2 px-1">To Do (3)</p>
          <div className="space-y-1.5">
            {["Fix Safari bug", "Write API docs", "Update seed data"].map((t) => (
              <div key={t} className="border border-gray-200 bg-gray-50 px-2.5 py-2">
                <p className="text-[9px] font-medium text-gray-700">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase text-amber-500 mb-2 px-1">In Progress (2)</p>
          <div className="space-y-1.5">
            {["Payment refactor", "Auth tests"].map((t) => (
              <div key={t} className="border border-amber-200 bg-amber-50 px-2.5 py-2">
                <p className="text-[9px] font-medium text-amber-800">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase text-emerald-500 mb-2 px-1">Done (4)</p>
          <div className="space-y-1.5">
            {["Login flow", "DB migration"].map((t) => (
              <div key={t} className="border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                <p className="text-[9px] font-medium text-emerald-800">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockDashboard() {
  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-[11px] font-bold text-gray-700">Quality Dashboard — This Week</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-emerald-50 py-2 px-1"><p className="text-lg font-bold text-emerald-700">92</p><p className="text-[8px] text-emerald-600">Quality Score</p></div>
          <div className="text-center bg-blue-50 py-2 px-1"><p className="text-lg font-bold text-blue-700">156</p><p className="text-[8px] text-blue-600">Cases Run</p></div>
          <div className="text-center bg-rose-50 py-2 px-1"><p className="text-lg font-bold text-rose-700">4</p><p className="text-[8px] text-rose-600">Open Bugs</p></div>
        </div>
        {/* Mini bar chart */}
        <div>
          <p className="text-[9px] font-semibold text-gray-400 mb-2">Pass Rate Trend (7 days)</p>
          <div className="flex items-end gap-1 h-12">
            {[75, 82, 78, 88, 91, 85, 92].map((v, i) => (
              <div key={i} className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${v}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-gray-400">Mon</span>
            <span className="text-[7px] text-gray-400">Sun</span>
          </div>
        </div>
      </div>
    </div>
  );
}
