import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeDir = path.join(root, "app", "api");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === "route.ts") files.push(full);
  }
}
walk(routeDir);

const allowedPublic = new Set([
  "app/api/auth/login/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/auth/register/route.ts",
  "app/api/invites/[token]/accept/route.ts",
]);

const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const mutating = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/.test(text);
  if (!mutating) continue;
  if (allowedPublic.has(rel)) continue;
  const hasAuth = /(getCurrentUser\(|validateApiSession\(|requireAuth)/.test(text);
  if (!hasAuth) violations.push(rel);
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("ok");
