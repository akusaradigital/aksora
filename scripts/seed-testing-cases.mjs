/**
 * One-off: insert 30 generated TestCase rows (5 per module) into the
 * dedicated Neon "aksora-testing" project (DATABASE_URL in .env.local).
 * Suite ids come from scripts/seed-testing-workspace.mjs output.
 */
import pg from "pg";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";

const envPath = path.resolve(".", ".env.local");
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
  console.error("DATABASE_URL must be a postgres:// URL in .env.local");
  process.exit(1);
}
if (!DATABASE_URL.includes("ep-snowy-cherry-ay8fsof3")) {
  console.error("Refusing to run: DATABASE_URL doesn't look like the aksora-testing project. Aborting.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function token() {
  return randomBytes(12).toString("hex");
}

const WORKSPACE_ID = 2;

// suiteId per module, from scripts/seed-testing-workspace.mjs output
const SUITE_ID = {
  "Auth & Login": 1,
  "Tasks & Kanban": 2,
  "Bug Tracking": 3,
  "Test Suites & Plans": 4,
  "Sprint & Execution Runs": 5,
  "Standup & Reports": 6,
};

const CASES = {
  "Auth & Login": [
    { tcId: "TC-AUTH-01", typeCase: "Positive", preCondition: "User has an active account with a verified password (scrypt hash stored) and an existing WorkspaceMembership; no active lockout", caseName: "Successful login with valid credentials", testStep: "1. Navigate to login page. 2. Enter registered email and correct password. 3. Click Login. 4. Observe redirect target", expectedResult: "Login succeeds, JWT session cookie is set, user is redirected to their workspace dashboard, and WorkspaceMembership is loaded for the active workspace", priority: "High" },
    { tcId: "TC-AUTH-02", typeCase: "Negative", preCondition: "User account exists but attempt uses a wrong password; RateLimitAttempt count below lockout threshold", caseName: "Login rejected with invalid credentials", testStep: "1. Navigate to login page. 2. Enter registered email with an incorrect password. 3. Click Login. 4. Check response and RateLimitAttempt table", expectedResult: "Login is rejected with a generic invalid-credentials error (no user-enumeration detail), no session cookie is set, and a failed attempt is recorded in RateLimitAttempt", priority: "High" },
    { tcId: "TC-AUTH-03", typeCase: "Edge Case", preCondition: "RateLimitAttempt already has N-1 recent failed attempts for this account/IP, one below the configured lockout threshold", caseName: "Account locked out after repeated failed login attempts", testStep: "1. Submit one more login request with an incorrect password, reaching the lockout threshold. 2. Immediately retry login with the correct password. 3. Inspect lockout error and expiry timestamp", expectedResult: "Account/IP is locked out, correct-password attempt is also rejected with a lockout message until the lockout window expires, and no session cookie is issued", priority: "High" },
    { tcId: "TC-AUTH-04", typeCase: "Negative", preCondition: "An Invite record exists whose token has either expired (past expiry timestamp) or does not match any stored token", caseName: "Signup rejected with expired or invalid invite token", testStep: "1. Open the invite signup link containing the expired/invalid token. 2. Fill in signup form (name, password). 3. Submit the signup request. 4. Observe API response", expectedResult: "Signup is rejected with an invalid-or-expired-invite error, no user or WorkspaceMembership record is created, and the Invite record is not marked as used", priority: "Medium" },
    { tcId: "TC-AUTH-05", typeCase: "Edge Case", preCondition: "Google OAuth flow initiated but the callback to app/api/auth/google/route.ts returns with an invalid, tampered, or expired state/code parameter", caseName: "Google OAuth login fails on invalid callback", testStep: "1. Start Google sign-in from login page. 2. Simulate callback to /api/auth/google with an invalid or expired state/code. 3. Observe server response and cookie state. 4. Attempt to access a protected route afterward", expectedResult: "OAuth callback is rejected, no JWT session cookie is created, user is redirected back to login with an auth error, and protected routes remain inaccessible", priority: "Medium" },
  ],
  "Tasks & Kanban": [
    { tcId: "TC-TASK-01", typeCase: "Positive", preCondition: "User is logged in with a role that has create/edit access to Tasks; a Kanban board with columns To Do, In Progress, Done exists for the workspace", caseName: "Create a task and move it across kanban columns", testStep: "1. Navigate to Tasks module and click Create Task. 2. Fill title, project, relatedFeature, category, priority, startDate/endDate, description, acceptanceCriteria, and assignee, then save. 3. Verify the task card appears in the To Do column with correct fields. 4. Drag the card into In Progress column. 5. Drag the card into Done column.", expectedResult: "Task is created with status 'To Do' and correct sortOrder; each drag updates status via API call and activity log records each status change; card reflects Done status after the final move without page reload", priority: "High" },
    { tcId: "TC-TASK-02", typeCase: "Negative", preCondition: "User is logged in with create access to Tasks; Task create form is open", caseName: "Attempt to create task with missing required title field", testStep: "1. Open Create Task form. 2. Leave the title field empty and fill remaining fields (project, status, priority). 3. Click Save. 4. Observe form/API response.", expectedResult: "API rejects the request via Zod validation with 400 status and error message referencing title as required; no row is inserted into Task table; no activity log entry is created", priority: "High" },
    { tcId: "TC-TASK-03", typeCase: "Edge Case", preCondition: "Kanban board has a column with at least 3 existing tasks with distinct sortOrder values", caseName: "Drag-reorder task within column persists sortOrder after refresh", testStep: "1. Drag the 3rd task card to the 1st position within the same column. 2. Confirm UI reflects new order immediately. 3. Refresh the page (router.refresh, not window.location.reload). 4. Re-check column order.", expectedResult: "sortOrder values for affected tasks are updated in the database in a single batch update; order persists identically after refresh; activity log records the reorder if configured", priority: "Medium" },
    { tcId: "TC-TASK-04", typeCase: "Negative", preCondition: "A Sprint exists with status 'Completed'; a Task exists unassigned to any sprint", caseName: "Assign a task to an already-completed sprint", testStep: "1. Open the task's edit form. 2. Select the completed sprint in the Sprint field. 3. Save the task.", expectedResult: "System either blocks the assignment with a clear error stating the sprint is completed, or allows it but visibly flags the task/sprint mismatch in the UI (per business rule); no silent success that hides the sprint's completed state; workspaceId scoping still enforced on the sprint lookup", priority: "Medium" },
    { tcId: "TC-TASK-05", typeCase: "Edge Case", preCondition: "A task exists and is referenced by related items (e.g., linked bug or test case via relatedItems/relatedFeature) in another module", caseName: "Delete a task that has related items referenced elsewhere", testStep: "1. Navigate to the task with existing references from another module. 2. Trigger delete via items API (DELETE app/api/items/[module]). 3. Confirm the delete action. 4. Check the referencing module's record for the linked task.", expectedResult: "Task is soft-deleted (deletedAt set) rather than hard-deleted so referencing records don't orphan or break; referencing module still displays the task reference gracefully (e.g., 'deleted task' label) instead of erroring; deletion is logged via logActivity()", priority: "High" },
  ],
  "Bug Tracking": [
    { tcId: "TC-BUG-01", typeCase: "Positive", preCondition: "User is logged in with QA role, assigned to an active workspace/project with at least one sprint available", caseName: "Report a new bug end to end with all required fields and evidence", testStep: "1. Navigate to Bug Tracking module and click 'Report Bug'. 2. Select project and module. 3. Select bugType (e.g. Functional). 4. Enter title, preconditions, stepsToReproduce, expectedResult, actualResult. 5. Set severity (High) and priority (High). 6. Upload evidence screenshot. 7. Optionally set suggestedDev and link relatedItems (test case). 8. Assign sprintId. 9. Click Submit.", expectedResult: "Bug is created with status 'Open', all entered fields persisted correctly, evidence file attached and viewable, activity log records creation, and bug appears in the bug list filtered by workspaceId", priority: "High" },
    { tcId: "TC-BUG-02", typeCase: "Negative", preCondition: "User is on the 'Report Bug' form with title and expectedResult already filled in", caseName: "Attempt to submit bug report without stepsToReproduce", testStep: "1. Fill in title, preconditions, expectedResult, actualResult. 2. Leave stepsToReproduce field empty. 3. Click Submit.", expectedResult: "Form submission is blocked, validation error is shown on the stepsToReproduce field, and no bug record is created in the database", priority: "Medium" },
    { tcId: "TC-BUG-03", typeCase: "Edge Case", preCondition: "An existing bug has status 'Closed' after being verified as fixed", caseName: "Reopen a closed bug when the defect resurfaces", testStep: "1. Open the closed bug detail view. 2. Click 'Reopen'. 3. Add a comment describing how the issue resurfaced and update actualResult if needed. 4. Confirm status change.", expectedResult: "Bug status transitions from 'Closed' to 'Reopened' (not silently back to 'Open'), status change and comment are recorded in activity log with timestamp, and assigned dev/QA receives a notification", priority: "High" },
    { tcId: "TC-BUG-04", typeCase: "Edge Case", preCondition: "An open bug already exists in the same project/module with an identical or highly similar title and stepsToReproduce", caseName: "Detect and warn on duplicate bug report before creation", testStep: "1. Start creating a new bug in the same project/module. 2. Enter a title and steps to reproduce matching an existing open bug. 3. Attempt to submit the form.", expectedResult: "System displays a duplicate-bug warning referencing the existing bugId before allowing submission, and user can either link to the existing bug or explicitly confirm creating a new one", priority: "Medium" },
    { tcId: "TC-BUG-05", typeCase: "Negative", preCondition: "A bug exists with relatedItems linked to a test case that has since been soft-deleted (deletedAt set)", caseName: "View bug detail when linked test case has been deleted", testStep: "1. Open the bug detail page for the bug linked to the deleted test case. 2. Locate the relatedItems section. 3. Click on the linked test case reference.", expectedResult: "Bug detail page loads without error, relatedItems shows the test case as 'Deleted/Unavailable' instead of a broken link, and clicking it does not navigate to a 404 or crash the page", priority: "Medium" },
  ],
  "Test Suites & Plans": [
    { tcId: "TC-PLAN-01", typeCase: "Positive", preCondition: "User logged in as PM/QA with an active workspace, no existing test plan named 'Sprint 24 Regression'", caseName: "Create test plan, add suite, verify plan-suite hierarchy", testStep: "1. Navigate to Test Plans module 2. Click 'New Test Plan', enter title 'Sprint 24 Regression', project, sprint, scope, status 'draft', start/end dates, assignee 3. Save plan 4. Open the created plan and click 'New Test Suite' 5. Enter suite title, assignee, status 'draft', notes, save 6. Reload the plan detail page", expectedResult: "Plan is created and listed with correct fields; suite is created with testPlanId referencing the plan; plan detail page shows the suite nested under it after reload", priority: "High" },
    { tcId: "TC-PLAN-02", typeCase: "Negative", preCondition: "An existing test plan has at least one test suite, and that suite has at least one test case", caseName: "Delete test plan that still has suites and cases attached", testStep: "1. Open the test plan with existing suites/cases 2. Click 'Delete Plan' 3. Confirm deletion in the dialog", expectedResult: "System blocks deletion or shows a warning listing dependent suites/cases (e.g. 'Cannot delete: 2 suites, 5 cases attached'); no orphaned suites/cases remain in DB; if cascade is allowed, all child suites and cases are removed and activity log records the cascade", priority: "High" },
    { tcId: "TC-PLAN-03", typeCase: "Edge Case", preCondition: "Two test plans exist in the same workspace (Plan A active, Plan B draft); Suite X currently belongs to Plan A", caseName: "Move a test suite from one test plan to another", testStep: "1. Open Suite X under Plan A 2. Use 'Move to Plan' action and select Plan B 3. Confirm the move 4. Open Plan A detail page 5. Open Plan B detail page", expectedResult: "Suite X's testPlanId is updated to Plan B; Suite X no longer appears under Plan A but appears under Plan B along with all its existing test cases intact; activity log records the move on both plans", priority: "Medium" },
    { tcId: "TC-PLAN-04", typeCase: "Negative", preCondition: "User is on the 'New Test Suite' form without having selected or created any test plan", caseName: "Attempt to create a test suite with no test plan assigned", testStep: "1. Navigate directly to suite creation without a testPlanId context (e.g. via API or direct URL) 2. Fill in title, assignee, status 3. Submit without selecting a parent plan", expectedResult: "API/UI rejects the submission with a validation error (testPlanId is required, FK constraint); no orphaned test suite row is created in the database", priority: "High" },
    { tcId: "TC-PLAN-05", typeCase: "Edge Case", preCondition: "Test plan exists with status 'draft' and has zero test suites created", caseName: "Attempt to transition plan status from draft to active with no suites defined", testStep: "1. Open the draft test plan with no suites 2. Change status field to 'active' 3. Save the plan", expectedResult: "System either warns the user that an active plan has no test suites yet (soft warning, save allowed) or blocks the transition until at least one suite exists, per defined business rule; status change is logged via logActivity() if allowed", priority: "Medium" },
  ],
  "Sprint & Execution Runs": [
    { tcId: "TC-EXEC-01", typeCase: "Positive", preCondition: "A TestSuite exists with at least 3 TestCases; user is logged in as QA role with an active Sprint", caseName: "Start execution run, record verdicts for all cases, and complete the run", testStep: "1. Navigate to the TestSuite and start a new ExecutionRun, assigning a tester. 2. Verify ExecutionRun is created with status in-progress, runNumber auto-incremented, totalCases equal to suite's case count, and startedAt set. 3. Record a CaseVerdict for each TestCase in the suite (mix of Pass and Fail) with actualResult and duration. 4. Mark the ExecutionRun as completed. 5. Verify run status changes to completed, completedAt is set, and passed/failed counts match the recorded verdicts.", expectedResult: "ExecutionRun completes with passed/failed totals matching CaseVerdict records, completedAt timestamp is set, and status is completed", priority: "High" },
    { tcId: "TC-EXEC-02", typeCase: "Edge Case", preCondition: "A TestSuite exists with zero TestCases assigned", caseName: "Start execution run against an empty test suite", testStep: "1. Select the empty TestSuite and attempt to start a new ExecutionRun. 2. Observe system response — either block creation with a validation error, or allow creation with totalCases = 0. 3. If allowed, attempt to mark the run as completed immediately with no verdicts recorded.", expectedResult: "System either prevents run creation with a clear error message (\"Test suite has no test cases\") or creates a run with totalCases = 0 and allows completion with passed/failed/blocked all at 0 — no crash or negative/NaN stats", priority: "Medium" },
    { tcId: "TC-EXEC-03", typeCase: "Edge Case", preCondition: "An ExecutionRun is in-progress with 5 TestCases pending verdicts", caseName: "Mark a case as Blocked and verify its effect on completion stats", testStep: "1. Record a CaseVerdict of Blocked for one TestCase, with actualResult noting the blocking reason. 2. Record Pass/Fail verdicts for the remaining 4 cases. 3. Attempt to complete the ExecutionRun. 4. Check the run's summary stats (passed, failed, blocked, totalCases).", expectedResult: "Run completes successfully with blocked count = 1, and blocked cases are excluded from pass/fail totals but included in totalCases; run is not forced to stay in-progress due to the Blocked verdict", priority: "High" },
    { tcId: "TC-EXEC-04", typeCase: "Negative", preCondition: "An ExecutionRun already has status completed with all verdicts recorded", caseName: "Attempt to re-run or modify an already-completed execution run", testStep: "1. Open the completed ExecutionRun. 2. Attempt to add or edit a CaseVerdict for one of its TestCases. 3. Attempt to trigger \"start\" or re-run action on the same completed run. 4. Observe API/UI response.", expectedResult: "System rejects verdict edits and re-run attempts on a completed run with a clear error (e.g. 403/400 \"Run already completed\"); a new run must be started instead, and the original run's data remains unchanged", priority: "Medium" },
    { tcId: "TC-EXEC-05", typeCase: "Negative", preCondition: "A Sprint is active and linked to a TestPlan with an in-progress ExecutionRun that has unrecorded verdicts", caseName: "Sprint end date passes while its execution run is still in-progress", testStep: "1. Let the Sprint reach its endDate (or manually mark Sprint status as completed) while the linked ExecutionRun remains in-progress. 2. Verify the ExecutionRun is not auto-completed or auto-deleted by the sprint status change. 3. Attempt to continue recording CaseVerdicts on the still in-progress run. 4. Check dashboard/reports for how the orphaned in-progress run is surfaced.", expectedResult: "ExecutionRun keeps its in-progress status independent of Sprint completion, verdicts can still be recorded, and the run appears flagged (e.g. \"run active in closed sprint\") in reports rather than silently disappearing or corrupting stats", priority: "Medium" },
  ],
  "Standup & Reports": [
    { tcId: "TC-RPT-01", typeCase: "Positive", preCondition: "User is logged in with an active workspace membership and has at least one Task/Bug/TestCase/WorkLog activity recorded in the current week", caseName: "Submit daily standup note and generate weekly report", testStep: "1. Navigate to /standup and create a new MeetingNote with date, project, title, attendees, content, and actionItems 2. Save the standup note and verify it appears in the standup list 3. Navigate to the weekly report page and trigger report generation for the current week 4. Verify the report aggregates data from Task, Bug, TestCase, and WorkLog for the period", expectedResult: "Standup note is saved with all fields persisted correctly; weekly report generates successfully showing aggregated activity counts and summaries matching underlying Task/Bug/TestCase/WorkLog records for the workspace", priority: "High" },
    { tcId: "TC-RPT-02", typeCase: "Edge Case", preCondition: "User is logged in with permission to create a MeetingNote for the current workspace", caseName: "Create standup note with no attendees selected", testStep: "1. Navigate to /standup and open the new standup form 2. Fill in date, project, title, and content but leave the attendees field empty 3. Submit the form 4. Verify the record is saved and check the standup detail view", expectedResult: "System accepts the standup note with an empty attendees list (or shows validation message if attendees is required); no server error occurs, and the note displays correctly with 'No attendees' or blank attendee section in the UI", priority: "Medium" },
    { tcId: "TC-RPT-03", typeCase: "Negative", preCondition: "A standup note from a previous day exists with actionItems containing at least one unresolved item assigned to a team member", caseName: "Action item not carried forward or closed in following day's standup", testStep: "1. Open yesterday's standup note and note an actionItem marked as pending 2. Create today's standup note without referencing or resolving that actionItem 3. Save today's note 4. Check if the system flags or surfaces the stale actionItem from the prior day", expectedResult: "System should surface the unresolved actionItem as outstanding/overdue (e.g., in a follow-up list or report), not silently drop it; if no follow-through mechanism exists, the actionItem should still remain visible/queryable from the original standup record rather than being lost", priority: "High" },
    { tcId: "TC-RPT-04", typeCase: "Negative", preCondition: "User is logged in and has permission to log WorkLog entries for a given date", caseName: "Create WorkLog entry with overlapping start/end times against an existing entry", testStep: "1. Create a WorkLog entry for a date with startTime 09:00 and endTime 11:00 2. Attempt to create a second WorkLog entry for the same date and assignee with startTime 10:00 and endTime 12:00 (overlapping the first) 3. Submit the second entry 4. Observe system response", expectedResult: "System either rejects the overlapping entry with a clear validation error (e.g., 'Time overlaps with existing work log') or allows it but visibly flags the overlap in the daily view; data integrity is preserved and no silent double-counting of hours occurs in reports", priority: "Medium" },
    { tcId: "TC-RPT-05", typeCase: "Edge Case", preCondition: "User is logged in with access to a workspace that has no recorded activity for the selected past week", caseName: "Generate weekly report for a period with zero activity", testStep: "1. Select a past week where no Task, Bug, TestCase, or WorkLog records exist for the workspace 2. Trigger weekly report generation for that period 3. Attempt to export the report (PDF/CSV) 4. Verify the report content and export file", expectedResult: "Report generates without error showing zero counts/empty sections (e.g., 'No activity recorded this week') instead of crashing or showing null/undefined; export completes successfully producing a valid file with the same zero-activity messaging", priority: "Low" },
  ],
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const [moduleName, cases] of Object.entries(CASES)) {
      const testSuiteId = String(SUITE_ID[moduleName]);
      for (const c of cases) {
        await client.query(
          `INSERT INTO "TestCase" ("workspaceId", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "testStep", "expectedResult", "status", "priority")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [WORKSPACE_ID, token(), testSuiteId, c.tcId, c.typeCase, c.preCondition, c.caseName, c.testStep, c.expectedResult, "Pending", c.priority],
        );
        inserted++;
      }
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ inserted }, null, 2));
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
