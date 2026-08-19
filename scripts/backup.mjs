/**
 * DEV-ONLY backup script.
 * This only works against the local Docker Postgres container named `aksora-db`.
 * It does NOT apply to production, which uses Neon Postgres and Neon PITR instead.
 * Usage: node scripts/backup.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const backupDir = path.resolve(".", "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const filename = `aksora_backup_${timestamp}.sql`;
const filepath = path.join(backupDir, filename);

function assertLocalDockerContainer() {
  try {
    const state = execSync('docker inspect -f "{{.State.Running}}" aksora-db', {
      encoding: "utf-8",
      maxBuffer: 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    if (state !== "true") {
      throw new Error("Docker container 'aksora-db' is not running.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Local backup failed: this script only supports the dev Docker container 'aksora-db'. ${message}`,
    );
  }
}

console.log(`Backing up local database to ${filename}...`);

try {
  assertLocalDockerContainer();

  const output = execSync(
    `docker exec aksora-db pg_dump -U admin --no-owner --no-acl aksora`,
    { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
  );
  fs.writeFileSync(filepath, output);

  const sizeMb = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
  console.log(`Backup saved: ${filepath} (${sizeMb} MB)`);

  const backups = fs.readdirSync(backupDir)
    .filter((file) => file.startsWith("aksora_backup_") && file.endsWith(".sql"))
    .sort()
    .reverse();

  if (backups.length > 3) {
    for (const old of backups.slice(3)) {
      fs.unlinkSync(path.join(backupDir, old));
      console.log(`Removed old backup: ${old}`);
    }
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Backup failed:", message);
  console.error("This script is dev-only and requires the local Docker container 'aksora-db'.");
  process.exit(1);
}
