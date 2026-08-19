/**
 * Seed script for local Postgres development.
 * Clears all data and inserts fresh dummy data (15+ per module).
 * Values match production format.
 * Usage: node scripts/seed.mjs
 */
import pg from "pg";
import { scryptSync, randomBytes } from "crypto";
import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(".", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const DATABASE_URL = env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith("postgres")) {
  console.error("DATABASE_URL must be a postgres:// URL in .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function token() {
  return randomBytes(16).toString("base64url");
}

// ─── Clear all tables ────────────────────────────────────────────────────────
async function clearAll() {
  const tables = [
    "SearchToken", "ActivityLog", "CaseVerdict", "ExecutionRun",
    "TestCase", "TestSuite", "TestPlan", "TestSession",
    "Bug", "Task", "Sprint", "Deployment", "WorkLog",
    "MeetingNote", "DashboardComment", "DashboardFilter",
    "PresenceHeartbeat", "CollaborationPresence", "ModuleView",
    "NotificationPreference", "Invite", "Assignee", "User",
    "SupportTicket", "AdminNotification", "Announcement",
    "AdminAuditLog", "Company", "_migrations"
  ];
  await pool.query(`TRUNCATE ${tables.map(t => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);

  // Migrate: add startDate/endDate columns, drop dueDate
  await pool.query(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TEXT`);
  await pool.query(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "endDate" TEXT`);
  try { await pool.query(`ALTER TABLE "Task" DROP COLUMN IF EXISTS "dueDate"`); } catch {}
}

// ─── Seed data ───────────────────────────────────────────────────────────────
async function seed() {
  const company = "Akusara Project";
  const password = hashPassword(env.SEED_ADMIN_PASSWORD || "Lotus1919!");

  // ── Company ──
  await pool.query(
    `INSERT INTO "Company" ("name", "plan", "maxUsers", "status") VALUES ($1, $2, $3, $4)`,
    [company, "pro", 50, "active"]
  );

  // ── Users ──
  const users = [
    { name: env.SEED_ADMIN_NAME || "Admin", email: env.SEED_ADMIN_EMAIL || "admin@akusaradigital.com", role: "admin" },
    { name: "Wahyu Setiawan", email: "wahyu@akusara.dev", role: "qa" },
    { name: "Hendra Wijaya", email: "hendra@akusara.dev", role: "fe" },
    { name: "Rizky Pratama", email: "rizky@akusara.dev", role: "be" },
    { name: "Sari Dewi", email: "sari@akusara.dev", role: "pm" },
    { name: "Budi Santoso", email: "budi@akusara.dev", role: "fullstack" },
    { name: "Dian Permata", email: "dian@akusara.dev", role: "qa" },
    { name: "Andi Kurniawan", email: "andi@akusara.dev", role: "be" },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO "User" ("company", "name", "email", "password", "role") VALUES ($1, $2, $3, $4, $5)`,
      [company, u.name, u.email, password, u.role]
    );
    await pool.query(
      `INSERT INTO "Assignee" ("company", "name", "role", "email", "status") VALUES ($1, $2, $3, $4, $5)`,
      [company, u.name, u.role, u.email, "active"]
    );
  }

  // ── Sprints ──
  const sprints = [
    { name: "Sprint 1 - Foundation", status: "completed", goal: "Setup project infrastructure and core modules" },
    { name: "Sprint 2 - Core Features", status: "completed", goal: "Implement main CRUD and auth system" },
    { name: "Sprint 3 - Polish", status: "active", goal: "Bug fixes, UI polish, and performance" },
    { name: "Sprint 4 - Release", status: "planning", goal: "Final testing and production deployment" },
  ];
  for (let i = 0; i < sprints.length; i++) {
    const start = new Date();
    start.setDate(start.getDate() - (sprints.length - i) * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    await pool.query(
      `INSERT INTO "Sprint" ("company", "name", "startDate", "endDate", "status", "goal") VALUES ($1, $2, $3, $4, $5, $6)`,
      [company, sprints[i].name, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), sprints[i].status, sprints[i].goal]
    );
  }

  // ── Tasks (15+) ──
  const tasks = [
    { title: "Setup CI/CD pipeline", project: "Aksora", feature: "DevOps", category: "Feature", status: "done", priority: "P1", desc: "Configure GitHub Actions for automated build and deploy" },
    { title: "Implement login page", project: "Aksora", feature: "Auth", category: "Feature", status: "done", priority: "P0", desc: "Build login form with email/password authentication" },
    { title: "Add export to PDF", project: "Aksora", feature: "Reports", category: "Feature", status: "doing", priority: "P2", desc: "Generate PDF reports from test results" },
    { title: "Fix pagination bug", project: "Aksora", feature: "UI", category: "Bug Fix", status: "doing", priority: "P1", desc: "Pagination shows wrong page count on filtered results" },
    { title: "Write API documentation", project: "Aksora", feature: "Docs", category: "Documentation", status: "todo", priority: "P3", desc: "Document all REST API endpoints with examples" },
    { title: "Performance optimization", project: "Aksora", feature: "Backend", category: "Improvement", status: "todo", priority: "P2", desc: "Optimize slow database queries on dashboard" },
    { title: "Add dark mode", project: "Aksora", feature: "UI", category: "Feature", status: "todo", priority: "P3", desc: "Implement dark theme toggle with system preference detection" },
    { title: "Database migration tool", project: "Aksora", feature: "DevOps", category: "Feature", status: "done", priority: "P1", desc: "Build schema migration system for safe DB updates" },
    { title: "Implement role-based access", project: "Aksora", feature: "Auth", category: "Feature", status: "done", priority: "P0", desc: "Restrict features based on user roles" },
    { title: "Add bulk import CSV", project: "Aksora", feature: "Data", category: "Feature", status: "doing", priority: "P2", desc: "Allow importing test cases and tasks from CSV files" },
    { title: "Refactor data layer", project: "Aksora", feature: "Backend", category: "Refactor", status: "review", priority: "P2", desc: "Split monolithic data.ts into domain-specific modules" },
    { title: "Add keyboard shortcuts", project: "Aksora", feature: "UX", category: "Enhancement", status: "done", priority: "P3", desc: "Implement Cmd+K palette and navigation shortcuts" },
    { title: "Setup error monitoring", project: "Aksora", feature: "DevOps", category: "Feature", status: "todo", priority: "P1", desc: "Integrate error tracking for production issues" },
    { title: "Implement search indexing", project: "Aksora", feature: "Search", category: "Feature", status: "done", priority: "P1", desc: "Build full-text search across all modules" },
    { title: "Add notification system", project: "Aksora", feature: "UX", category: "Feature", status: "doing", priority: "P2", desc: "Real-time notifications for assignments and updates" },
    { title: "Create onboarding flow", project: "Aksora", feature: "UX", category: "Enhancement", status: "todo", priority: "P3", desc: "Guide new users through initial setup steps" },
  ];

  for (const t of tasks) {
    const startDate = t.status === "done" ? daysAgo(14) : t.status === "doing" ? daysAgo(3) : daysFromNow(1);
    const endDate = t.status === "done" ? daysAgo(7) : daysFromNow(7);
    await pool.query(
      `INSERT INTO "Task" ("company", "title", "project", "relatedFeature", "category", "status", "priority", "startDate", "endDate", "description", "acceptanceCriteria", "notes", "evidence", "assignee")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [company, t.title, t.project, t.feature, t.category, t.status, t.priority, startDate, endDate, t.desc, "Must pass all tests and code review", "", "", users[Math.floor(Math.random() * users.length)].name]
    );
  }

  // ── Bugs (15+) ──
  const bugs = [
    { title: "Login fails on Safari", module: "Auth", bugType: "Functional", severity: "high", status: "open", priority: "P0" },
    { title: "Chart tooltip overlaps sidebar", module: "Dashboard", bugType: "UI/UX", severity: "medium", status: "open", priority: "P2" },
    { title: "Export CSV missing headers", module: "Export", bugType: "Functional", severity: "low", status: "closed", priority: "P3" },
    { title: "Session timeout too short", module: "Auth", bugType: "Functional", severity: "medium", status: "in_progress", priority: "P1" },
    { title: "Search returns stale results", module: "Search", bugType: "Performance", severity: "high", status: "open", priority: "P1" },
    { title: "Date picker shows wrong month", module: "Forms", bugType: "UI/UX", severity: "medium", status: "open", priority: "P2" },
    { title: "API returns 500 on empty body", module: "API", bugType: "Validation", severity: "high", status: "in_progress", priority: "P1" },
    { title: "Mobile layout broken on tasks", module: "Tasks", bugType: "UI/UX", severity: "medium", status: "open", priority: "P2" },
    { title: "Duplicate entries on fast click", module: "Forms", bugType: "Functional", severity: "high", status: "ready_to_retest", priority: "P1" },
    { title: "Password reset email not sent", module: "Auth", bugType: "Functional", severity: "critical", status: "open", priority: "P0" },
    { title: "Filter not persisted on refresh", module: "UI", bugType: "Functional", severity: "low", status: "closed", priority: "P3" },
    { title: "Kanban drag drops to wrong col", module: "Tasks", bugType: "Functional", severity: "medium", status: "in_progress", priority: "P2" },
    { title: "Notification badge count wrong", module: "Notifications", bugType: "Functional", severity: "low", status: "open", priority: "P3" },
    { title: "XSS in comment field", module: "Security", bugType: "Security", severity: "critical", status: "in_progress", priority: "P0" },
    { title: "Slow load on large datasets", module: "Performance", bugType: "Performance", severity: "high", status: "open", priority: "P1" },
    { title: "Avatar upload fails > 2MB", module: "Profile", bugType: "Validation", severity: "low", status: "open", priority: "P3" },
  ];

  for (const b of bugs) {
    await pool.query(
      `INSERT INTO "Bug" ("company", "project", "module", "bugType", "title", "preconditions", "stepsToReproduce", "expectedResult", "actualResult", "severity", "priority", "status", "evidence", "suggestedDev")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [company, "Aksora", b.module, b.bugType, b.title, "User is logged in with valid session", "1. Navigate to the module\n2. Perform the action\n3. Observe the result", "Should work without errors", "Error or unexpected behavior occurs", b.severity, b.priority, b.status, "", users.filter(u => ["fe", "be", "fullstack"].includes(u.role))[Math.floor(Math.random() * 3)]?.name || ""]
    );
  }

  // ── Test Plans (4) ──
  const testPlans = [
    { title: "Regression Test - Sprint 3", sprint: "Sprint 3 - Polish", scope: "Full regression on core modules", status: "active" },
    { title: "Auth Module Verification", sprint: "Sprint 2 - Core Features", scope: "Login, register, password reset, session", status: "completed" },
    { title: "Performance Benchmark", sprint: "Sprint 3 - Polish", scope: "Load testing and response time validation", status: "draft" },
    { title: "Release Candidate Testing", sprint: "Sprint 4 - Release", scope: "End-to-end smoke tests before release", status: "draft" },
  ];

  for (const tp of testPlans) {
    await pool.query(
      `INSERT INTO "TestPlan" ("company", "publicToken", "title", "project", "sprint", "scope", "status", "startDate", "endDate", "assignee", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [company, token(), tp.title, "Aksora", tp.sprint, tp.scope, tp.status, daysAgo(7), daysFromNow(7), "Wahyu Setiawan", "Complete testing before sprint end"]
    );
  }

  // ── Test Suites (6) ──
  const testSuites = [
    { planId: "1", title: "Auth Module Tests", status: "active", notes: "All authentication and authorization tests" },
    { planId: "1", title: "Dashboard Tests", status: "active", notes: "Dashboard widgets and data display" },
    { planId: "1", title: "CRUD Operations", status: "active", notes: "Create, read, update, delete for all modules" },
    { planId: "2", title: "Login Flow Tests", status: "completed", notes: "Login scenarios including edge cases" },
    { planId: "3", title: "Load Test Suite", status: "draft", notes: "Performance under concurrent users" },
    { planId: "4", title: "Smoke Tests", status: "draft", notes: "Critical path verification" },
  ];

  for (const ts of testSuites) {
    await pool.query(
      `INSERT INTO "TestSuite" ("company", "publicToken", "testPlanId", "title", "assignee", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [company, token(), ts.planId, ts.title, "Wahyu Setiawan", ts.status, ts.notes]
    );
  }

  // ── Test Cases (15+) ──
  const testCases = [
    { suiteId: "1", tcId: "TC-001", name: "Login with valid credentials", type: "Positive", status: "Pass", priority: "High" },
    { suiteId: "1", tcId: "TC-002", name: "Login with invalid password", type: "Negative", status: "Pass", priority: "High" },
    { suiteId: "1", tcId: "TC-003", name: "Register new user", type: "Positive", status: "Pass", priority: "High" },
    { suiteId: "1", tcId: "TC-004", name: "Password reset flow", type: "Positive", status: "Fail", priority: "High" },
    { suiteId: "1", tcId: "TC-005", name: "Session expiry handling", type: "Edge Case", status: "Pending", priority: "Medium" },
    { suiteId: "2", tcId: "TC-006", name: "Dashboard loads within 2s", type: "Positive", status: "Pass", priority: "High" },
    { suiteId: "2", tcId: "TC-007", name: "Widget data accuracy", type: "Positive", status: "Pass", priority: "Medium" },
    { suiteId: "2", tcId: "TC-008", name: "Filter by project", type: "Positive", status: "Pending", priority: "Medium" },
    { suiteId: "3", tcId: "TC-009", name: "Create task with all fields", type: "Positive", status: "Pass", priority: "High" },
    { suiteId: "3", tcId: "TC-010", name: "Edit task inline", type: "Positive", status: "Pass", priority: "Medium" },
    { suiteId: "3", tcId: "TC-011", name: "Delete with confirmation", type: "Positive", status: "Pass", priority: "Medium" },
    { suiteId: "3", tcId: "TC-012", name: "Bulk delete items", type: "Positive", status: "Pending", priority: "Low" },
    { suiteId: "4", tcId: "TC-013", name: "Login with SSO", type: "Positive", status: "Pass", priority: "High" },
    { suiteId: "4", tcId: "TC-014", name: "Login rate limiting", type: "Negative", status: "Pass", priority: "Medium" },
    { suiteId: "4", tcId: "TC-015", name: "Remember me functionality", type: "Positive", status: "Fail", priority: "Low" },
    { suiteId: "5", tcId: "TC-016", name: "100 concurrent users", type: "Positive", status: "Pending", priority: "High" },
  ];

  for (const tc of testCases) {
    await pool.query(
      `INSERT INTO "TestCase" ("company", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "assignee", "testStep", "expectedResult", "actualResult", "status", "priority")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [company, token(), tc.suiteId, tc.tcId, tc.type, "Application is running and accessible", tc.name, "Wahyu Setiawan", "1. Open the application\n2. Navigate to the feature\n3. Execute the test steps\n4. Verify the result", "Feature works as expected without errors", tc.status === "Fail" ? "Unexpected error occurred" : "", tc.status, tc.priority]
    );
  }

  // ── Test Sessions (5) ──
  const testSessions = [
    { date: daysAgo(1), sprint: "Sprint 3 - Polish", tester: "Wahyu Setiawan", scope: "Auth regression", total: "12", passed: "10", failed: "1", blocked: "1", result: "Partial Pass" },
    { date: daysAgo(3), sprint: "Sprint 3 - Polish", tester: "Dian Permata", scope: "Dashboard smoke test", total: "8", passed: "8", failed: "0", blocked: "0", result: "Pass" },
    { date: daysAgo(5), sprint: "Sprint 2 - Core Features", tester: "Wahyu Setiawan", scope: "CRUD full test", total: "20", passed: "18", failed: "2", blocked: "0", result: "Partial Pass" },
    { date: daysAgo(7), sprint: "Sprint 2 - Core Features", tester: "Dian Permata", scope: "Login flow", total: "6", passed: "6", failed: "0", blocked: "0", result: "Pass" },
    { date: daysAgo(10), sprint: "Sprint 1 - Foundation", tester: "Wahyu Setiawan", scope: "Initial setup verification", total: "5", passed: "5", failed: "0", blocked: "0", result: "Pass" },
  ];

  for (const ts of testSessions) {
    await pool.query(
      `INSERT INTO "TestSession" ("company", "date", "project", "sprint", "tester", "scope", "totalCases", "passed", "failed", "blocked", "result", "notes", "evidence")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [company, ts.date, "Aksora", ts.sprint, ts.tester, ts.scope, ts.total, ts.passed, ts.failed, ts.blocked, ts.result, "Executed as planned", ""]
    );
  }

  // ── Deployments (5) ──
  const deployments = [
    { date: daysAgo(1), version: "0.8.0", env: "staging", dev: "Budi Santoso", status: "success", changelog: "- Add notification system\n- Fix pagination\n- Improve search" },
    { date: daysAgo(5), version: "0.7.2", env: "production", dev: "Rizky Pratama", status: "success", changelog: "- Hotfix: session timeout\n- Fix CSV export" },
    { date: daysAgo(10), version: "0.7.1", env: "staging", dev: "Hendra Wijaya", status: "success", changelog: "- Dark mode prep\n- UI polish\n- Keyboard shortcuts" },
    { date: daysAgo(15), version: "0.7.0", env: "production", dev: "Budi Santoso", status: "success", changelog: "- Role-based access\n- Search indexing\n- Bulk import" },
    { date: daysAgo(20), version: "0.6.0", env: "production", dev: "Rizky Pratama", status: "success", changelog: "- Initial Postgres migration\n- Core CRUD\n- Auth system" },
  ];

  for (const d of deployments) {
    await pool.query(
      `INSERT INTO "Deployment" ("company", "date", "version", "project", "environment", "developer", "changelog", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [company, d.date, d.version, "Aksora", d.env, d.dev, d.changelog, d.status, "Deployed without issues"]
    );
  }

  // ── Work Logs (15+) ──
  const workLogs = [
    { date: daysAgo(0), start: "09:00", end: "11:30", cat: "development", desc: "Implement notification bell component", assignee: "Hendra Wijaya" },
    { date: daysAgo(0), start: "13:00", end: "15:00", cat: "testing", desc: "Run regression tests on auth module", assignee: "Wahyu Setiawan" },
    { date: daysAgo(0), start: "15:30", end: "17:00", cat: "code-review", desc: "Review PR #42 - bulk import feature", assignee: "Rizky Pratama" },
    { date: daysAgo(1), start: "09:00", end: "12:00", cat: "development", desc: "Build PDF export with pdfkit", assignee: "Budi Santoso" },
    { date: daysAgo(1), start: "13:00", end: "14:30", cat: "meeting", desc: "Sprint 3 daily standup + planning", assignee: "Sari Dewi" },
    { date: daysAgo(1), start: "14:30", end: "17:00", cat: "bugfix", desc: "Fix pagination count on filtered views", assignee: "Hendra Wijaya" },
    { date: daysAgo(2), start: "09:00", end: "11:00", cat: "testing", desc: "Exploratory testing on dashboard widgets", assignee: "Dian Permata" },
    { date: daysAgo(2), start: "11:00", end: "12:30", cat: "documentation", desc: "Update API docs for new endpoints", assignee: "Rizky Pratama" },
    { date: daysAgo(2), start: "13:00", end: "16:00", cat: "development", desc: "Implement kanban drag-and-drop", assignee: "Hendra Wijaya" },
    { date: daysAgo(3), start: "09:00", end: "10:30", cat: "deployment", desc: "Deploy v0.8.0 to staging environment", assignee: "Budi Santoso" },
    { date: daysAgo(3), start: "10:30", end: "12:00", cat: "testing", desc: "Smoke test staging deployment", assignee: "Wahyu Setiawan" },
    { date: daysAgo(3), start: "13:00", end: "15:00", cat: "research", desc: "Evaluate real-time sync options (WebSocket vs SSE)", assignee: "Andi Kurniawan" },
    { date: daysAgo(4), start: "09:00", end: "12:00", cat: "development", desc: "Refactor data layer into domain modules", assignee: "Rizky Pratama" },
    { date: daysAgo(4), start: "13:00", end: "15:30", cat: "support", desc: "Help team debug Docker networking issue", assignee: "Budi Santoso" },
    { date: daysAgo(4), start: "15:30", end: "17:00", cat: "meeting", desc: "Sprint retrospective and demo", assignee: "Sari Dewi" },
    { date: daysAgo(5), start: "09:00", end: "11:00", cat: "development", desc: "Add search indexing for all modules", assignee: "Andi Kurniawan" },
  ];

  for (const w of workLogs) {
    await pool.query(
      `INSERT INTO "WorkLog" ("company", "date", "startTime", "endTime", "category", "project", "description", "output", "notes", "assignee")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [company, w.date, w.start, w.end, w.cat, "Aksora", w.desc, "", "", w.assignee]
    );
  }

  // ── Meeting Notes (5) ──
  const meetings = [
    { title: "Sprint 3 Planning", attendees: "Admin, Wahyu, Hendra, Sari, Budi", content: "Discussed sprint 3 goals:\n- Focus on bug fixes\n- UI polish\n- Performance improvements", summary: "Sprint 3 focuses on stability and polish", actions: "- Fix critical bugs by Wed\n- Complete UI review by Fri\n- Deploy to staging by end of sprint" },
    { title: "Architecture Review", attendees: "Rizky, Budi, Andi", content: "Reviewed current data layer architecture.\nDecided to split into domain modules.\nDiscussed caching strategy.", summary: "Agreed on domain-driven data layer refactor", actions: "- Rizky: split data.ts\n- Budi: implement caching\n- Andi: search optimization" },
    { title: "QA Sync - Week 20", attendees: "Wahyu, Dian, Sari", content: "Reviewed test coverage gaps.\nPrioritized auth and dashboard testing.\nPlanned regression schedule.", summary: "Test coverage needs improvement on auth flows", actions: "- Write 5 new auth test cases\n- Schedule regression for Friday\n- Update test plan status" },
    { title: "Bug Triage Session", attendees: "Admin, Wahyu, Hendra, Rizky", content: "Triaged 10 open bugs.\nPrioritized security issues.\nAssigned developers to critical bugs.", summary: "XSS and session bugs are top priority", actions: "- Rizky: fix XSS today\n- Hendra: session timeout\n- Wahyu: retest after fixes" },
    { title: "Release Planning", attendees: "Admin, Sari, Budi, Wahyu", content: "Planned v1.0 release timeline.\nDefined release criteria.\nAssigned release responsibilities.", summary: "Target v1.0 release in Sprint 4", actions: "- Complete all P0/P1 bugs\n- Full regression pass\n- Deploy to production\n- Prepare release notes" },
  ];

  for (let i = 0; i < meetings.length; i++) {
    const m = meetings[i];
    await pool.query(
      `INSERT INTO "MeetingNote" ("company", "publicToken", "date", "project", "title", "attendees", "content", "summary", "actionItems")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [company, token(), daysAgo(i * 3), "Aksora", m.title, m.attendees, m.content, m.summary, m.actions]
    );
  }

  // ── Activity Log (sample) ──
  const activities = [
    { type: "Task", id: "1", action: "Created", summary: "Task 'Setup CI/CD pipeline' created", actor: "Admin" },
    { type: "Task", id: "2", action: "Created", summary: "Task 'Implement login page' created", actor: "Admin" },
    { type: "Task", id: "1", action: "Updated", summary: "Task 'Setup CI/CD pipeline' marked as done", actor: "Budi Santoso" },
    { type: "Bug", id: "1", action: "Created", summary: "Bug 'Login fails on Safari' reported", actor: "Wahyu Setiawan" },
    { type: "Bug", id: "14", action: "Created", summary: "Bug 'XSS in comment field' reported", actor: "Dian Permata" },
    { type: "TestPlan", id: "1", action: "Created", summary: "Test plan 'Regression Test - Sprint 3' created", actor: "Wahyu Setiawan" },
    { type: "Deployment", id: "1", action: "Created", summary: "Deployed v0.8.0 to staging", actor: "Budi Santoso" },
    { type: "Task", id: "11", action: "Updated", summary: "Task 'Refactor data layer' moved to review", actor: "Rizky Pratama" },
  ];

  for (const a of activities) {
    await pool.query(
      `INSERT INTO "ActivityLog" ("company", "entityType", "entityId", "action", "summary", "actor")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [company, a.type, a.id, a.action, a.summary, a.actor]
    );
  }

  console.log("  ✓ Company, Users, Assignees");
  console.log("  ✓ Sprints (4)");
  console.log("  ✓ Tasks (16)");
  console.log("  ✓ Bugs (16)");
  console.log("  ✓ Test Plans (4)");
  console.log("  ✓ Test Suites (6)");
  console.log("  ✓ Test Cases (16)");
  console.log("  ✓ Test Sessions (5)");
  console.log("  ✓ Deployments (5)");
  console.log("  ✓ Work Logs (16)");
  console.log("  ✓ Meeting Notes (5)");
  console.log("  ✓ Activity Log (8)");
}

// ─── Run ─────────────────────────────────────────────────────────────────────
console.log("🗑️  Clearing all data...");
// await clearAll();
console.log("🌱 Seeding fresh data...");
await seed();
console.log("\n✅ Done! Login with:");
console.log(`   Email: ${env.SEED_ADMIN_EMAIL || "admin@akusaradigital.com"}`);
console.log(`   Password: ${env.SEED_ADMIN_PASSWORD || "Lotus1919!"}`);
await pool.end();
