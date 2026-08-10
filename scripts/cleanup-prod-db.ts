// Use relative imports for the script
import { db, tables } from "../lib/db";

async function cleanup() {
  console.log("🚀 Starting database cleanup...");

  for (const t of tables) {
    const lowerName = t.name.toLowerCase();
    
    // 1. Drop the lowercase version (e.g., testplan)
    if (lowerName !== t.name) {
      console.log(`\u{1F5D1}\u{FE0F}  Dropping lowercase table: ${lowerName}`);
      try {
        await db.run(`DROP TABLE IF EXISTS ${lowerName} CASCADE`);
      } catch {
        // console.log(`   (Skip) ${lowerName}`);
      }
    }

    // 2. Drop the camelCase version (e.g., "TestPlan") to reset it with quoted columns
    console.log(`\u{267B}\u{FE0F}  Resetting camelCase table: "${t.name}"`);
    try {
      await db.run(`DROP TABLE IF EXISTS "${t.name}" CASCADE`);
    } catch {
      console.log(`   (Skip) "${t.name}" error`);
    }
  }

  // Also clean up any other known lowercase names
  const extras = ["testcase", "testplan", "testsession", "testsuite", "bug", "task", "meetingnote", "activitylog", "sprint"];
  for (const extra of extras) {
    try {
      await db.run(`DROP TABLE IF EXISTS ${extra} CASCADE`);
    } catch {}
  }

  console.log("\u{2705} Cleanup complete. The schema will be recreated correctly on the next page load.");
  process.exit(0);
}

cleanup().catch(err => {
  console.error("\u{274C} Cleanup failed:", err);
  process.exit(1);
});
