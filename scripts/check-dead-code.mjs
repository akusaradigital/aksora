/**
 * scripts/check-dead-code.mjs
 *
 * Scans components and hooks to ensure every module/component/hook is imported
 * or referenced somewhere in the codebase. Exits with 1 if orphaned files are found.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".claude",
  "logs",
  "backups",
  "scratch",
  ".playwright-cli",
  "graphify-out",
]);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (IGNORE_DIRS.has(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walk(fullPath));
    } else if (/\.(tsx|ts|js|mjs)$/.test(item)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walk(root);
const contentMap = new Map();

for (const file of allFiles) {
  contentMap.set(file, fs.readFileSync(file, "utf8"));
}

const candidates = allFiles.filter((file) => {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel.includes("__tests__") || rel.includes(".test.") || rel.includes(".spec.")) return false;
  return rel.startsWith("components/") || rel.startsWith("hooks/");
});

const orphaned = [];

for (const candidate of candidates) {
  const baseName = path.basename(candidate, path.extname(candidate));
  let isReferenced = false;

  for (const [file, content] of contentMap.entries()) {
    if (file === candidate) continue;
    if (content.includes(baseName)) {
      isReferenced = true;
      break;
    }
  }

  if (!isReferenced) {
    orphaned.push(path.relative(root, candidate).replace(/\\/g, "/"));
  }
}

if (orphaned.length > 0) {
  console.error("❌ Orphaned / Unused components or hooks detected:");
  for (const file of orphaned) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
} else {
  console.log("✅ No orphaned components or hooks found.");
  process.exit(0);
}
