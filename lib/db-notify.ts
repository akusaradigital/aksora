import { acquireListenClient, db } from "@/lib/db";

export const ACTIVITY_NOTIFY_CHANNEL = "aksora_activity";
export const ADMIN_NOTIFY_CHANNEL = "aksora_admin_notification";

// Postgres LISTEN/NOTIFY helpers so SSE routes can react to events instead of
// polling the DB on a timer. Payloads must stay well under Postgres's 8000-byte
// NOTIFY limit — keep them to ids/small identifiers, not full row data.

export async function notifyChannel(channel: string, payload: unknown): Promise<void> {
  try {
    await db.run(`SELECT pg_notify(?, ?)`, [channel, JSON.stringify(payload ?? {}).slice(0, 7000)]);
  } catch (e) {
    console.error(`[db-notify] Failed to notify "${channel}":`, e);
  }
}

/**
 * Opens a dedicated connection and LISTENs on `channel`. Returns a cleanup
 * function that UNLISTENs and releases the connection — callers MUST invoke it
 * (e.g. on SSE `cancel()`/abort) or the connection leaks from the pool.
 */
export async function listenChannel(
  channel: string,
  onNotify: (payload: string) => void,
): Promise<() => Promise<void>> {
  const client = await acquireListenClient();

  const listener = (msg: { channel: string; payload?: string }) => {
    if (msg.channel === channel) onNotify(msg.payload ?? "");
  };

  client.on("notification", listener);
  await client.query(`LISTEN "${channel}"`);

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    try {
      client.removeListener("notification", listener);
      await client.query(`UNLISTEN "${channel}"`);
    } catch {
      // best effort — connection may already be dead
    } finally {
      client.release();
    }
  };
}
