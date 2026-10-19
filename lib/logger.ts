/**
 * Structured logger for production observability.
 * Outputs JSON in production for easy parsing by log aggregators.
 * Falls back to console in development for readability.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  route?: string;
  company?: string;
  userId?: string | number;
  duration?: number;
  error?: string;
  stack?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

const isDev = process.env.NODE_ENV === "development";

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const parts = [`[${entry.level.toUpperCase()}] ${entry.message}`];
    if (entry.route) parts.push(`route=${entry.route}`);
    if (entry.duration != null) parts.push(`${entry.duration}ms`);
    if (entry.error) parts.push(`err=${entry.error}`);
    return parts.join(" | ");
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info(message: string, context?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("info", message, context);
  },

  warn(message: string, context?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("warn", message, context);
  },

  error(message: string, err?: unknown, context?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    const errorMessage = err instanceof Error ? err.message : String(err ?? "");
    const stack = err instanceof Error ? err.stack : undefined;
    log("error", message, { ...context, error: errorMessage, stack });
  },

  /** Log an API route error with standard context */
  apiError(route: string, err: unknown, context?: { company?: string; userId?: string | number }) {
    logger.error(`API error: ${route}`, err, { route, ...context });
  },

  /** Log a slow query warning */
  slowQuery(route: string, duration: number, context?: { company?: string }) {
    logger.warn(`Slow query detected`, { route, duration, ...context });
  },
};

// --- Legacy exports (used by existing API routes) ---

// Substrings that only ever show up in raw driver/database error text, never
// in an app-authored `throw new Error("...")` validation message. If any of
// these appear, treat the message as an internal leak and use the fallback
// instead of exposing schema/constraint details to the client.
const DB_INTERNAL_MARKERS = [
  "syntax",
  "constraint",
  "column",
  "relation",
  "duplicate key",
  "violates",
  "econnrefused",
  "password authentication",
  "sqlite_",
];

/**
 * Extract a user-friendly error message from an unknown error.
 * Returns the fallback if the error looks like it leaked raw database/driver
 * internals rather than an app-authored validation message.
 */
export function friendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const msg = error.message;
    const lower = msg.toLowerCase();
    const looksInternal = DB_INTERNAL_MARKERS.some((marker) => lower.includes(marker));
    if (msg && !looksInternal && msg.length < 200) {
      return msg;
    }
  }
  return fallback;
}

/**
 * Log an error with route context (legacy helper).
 */
export function logError(error: unknown, context?: string): void {
  logger.error(context || "Unhandled error", error, { route: context });
}
