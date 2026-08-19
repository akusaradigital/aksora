import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync(".env", "utf8");
const dbUrl = envText.match(/DATABASE_URL=(.+)/)[1].trim();

// Baca mentahan tables & indexes tanpa AST, ambil semua antara backticks (``)
const tablesText = fs.readFileSync("lib/db/db-schema-tables.ts", "utf8");
const idxText = fs.readFileSync("lib/db/db-schema-indexes.ts", "utf8");

const extract = (text) => {
  const matches = [...text.matchAll(/`([^`]+)`/g)];
  return matches.map(m => m[1]);
};

const statements = [...extract(tablesText), ...extract(idxText)];
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function init() {
  for(let sql of statements) {
    if (!sql.trim().toUpperCase().startsWith("CREATE")) continue;
    try {
      await pool.query(sql);
    } catch(e) {
      if (!e.message.includes("already exists") && !e.message.includes("does not exist")) {
         console.error("SQL Error:", e.message, "\nOn:", sql.slice(0, 50));
      }
    }
  }
  console.log("Schema injected.");
  await pool.end();
}
init();
