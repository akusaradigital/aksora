/**
 * One-off: seed a workspace + login user + TestPlan + one TestSuite per module
 * into the dedicated Neon "aksora-testing" project (DATABASE_URL in .env.local).
 * Prints the suite ids so test cases can be inserted against them next.
 */
import pg from "pg";
import { scryptSync, randomBytes } from "crypto";
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

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function token() {
  return randomBytes(12).toString("hex");
}

const MODULES = [
  "Auth & Login",
  "Tasks & Kanban",
  "Bug Tracking",
  "Test Suites & Plans",
  "Sprint & Execution Runs",
  "Standup & Reports",
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `INSERT INTO "User" ("name", "email", "password", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
      ["QA Test Runner", "qa-test@aksora.local", hashPassword("Testing123!"), "qa"],
    );
    const userId = userRes.rows[0].id;

    const wsRes = await client.query(
      `INSERT INTO "Workspace" ("name", "slug", "createdByUserId") VALUES ($1, $2, $3) RETURNING "id"`,
      ["QA Testing", "qa-testing", userId],
    );
    const workspaceId = wsRes.rows[0].id;

    await client.query(`UPDATE "User" SET "workspaceId" = $1 WHERE "id" = $2`, [workspaceId, userId]);
    await client.query(
      `INSERT INTO "WorkspaceMembership" ("workspaceId", "userId", "role", "status") VALUES ($1, $2, $3, $4)`,
      [workspaceId, userId, "admin", "active"],
    );

    const planRes = await client.query(
      `INSERT INTO "TestPlan" ("workspaceId", "publicToken", "title", "project", "sprint", "scope", "status", "assignee")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING "id"`,
      [workspaceId, token(), "Full App Regression", "Aksora", "Sprint 1", "All modules", "active", "QA Test Runner"],
    );
    const testPlanId = planRes.rows[0].id;

    const suiteIds = {};
    for (const moduleName of MODULES) {
      const suiteRes = await client.query(
        `INSERT INTO "TestSuite" ("workspaceId", "publicToken", "testPlanId", "title", "assignee", "status")
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"`,
        [workspaceId, token(), String(testPlanId), moduleName, "QA Test Runner", "active"],
      );
      suiteIds[moduleName] = suiteRes.rows[0].id;
    }

    await client.query("COMMIT");

    console.log(JSON.stringify({ workspaceId, testPlanId, suiteIds, loginEmail: "qa-test@aksora.local", loginPassword: "Testing123!" }, null, 2));
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
