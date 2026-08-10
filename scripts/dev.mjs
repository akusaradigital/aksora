import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

// Load .env and validate DATABASE_URL
const envPath = resolve(".", ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl.startsWith("postgres")) {
  console.error("\x1b[31m✗ DATABASE_URL is missing or invalid in .env\x1b[0m");
  console.error("  Expected: postgresql://user:password@host:port/database");
  console.error("  Run Docker: docker start aksora-db");
  process.exit(1);
}

const basePort = Number(process.env.PORT || 3000);
const maxPort = basePort + 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tryHosts = ["127.0.0.1", "::"];
    let index = 0;

    const tryNext = () => {
      if (index >= tryHosts.length) {
        resolve(true);
        return;
      }

      const host = tryHosts[index++];
      const server = net.createServer();
      server.unref();
      server.once("error", () => {
        server.close(() => resolve(false));
      });
      server.listen({ host, port }, () => {
        server.close(() => tryNext());
      });
    };

    tryNext();
  });
}

async function findPort() {
  for (let port = basePort; port <= maxPort; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found between ${basePort} and ${maxPort}`);
}

async function getOpenPorts() {
  const ports = [];
  for (let port = basePort; port <= maxPort; port += 1) {
    if (!(await isPortFree(port))) ports.push(port);
  }
  return ports;
}

const occupiedPorts = await getOpenPorts();
if (occupiedPorts.length > 0) {
  console.log(`Next.js dev server already running on port(s): ${occupiedPorts.join(", ")}`);
  console.log(`Open http://localhost:${occupiedPorts[0]}`);
  process.exit(0);
}

const port = await findPort();
console.log(`Starting Next.js dev server on port ${port}`);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(port)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ""}--no-warnings`,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
