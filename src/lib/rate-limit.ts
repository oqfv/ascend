import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fixed-window limiter backed by Postgres, so it holds across serverless instances.
 * Returns false when the caller is over the limit for this window.
 *
 * Keys often hold an IP address or an email, so only a SHA-256 of the key is stored, and
 * counters untouched for a day are cleared (Better Auth's own counters share the table).
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = BigInt(now - windowSeconds * 1000);
  const hashed = createHash("sha256").update(key).digest("hex");
  const rows = await db.$queryRaw<{ count: number }[]>`
    insert into rate_limit (id, key, count, "lastRequest")
    values (${randomUUID()}, ${hashed}, 1, ${BigInt(now)})
    on conflict (key) do update set
      count = case when rate_limit."lastRequest" < ${windowStart} then 1 else rate_limit.count + 1 end,
      "lastRequest" = case when rate_limit."lastRequest" < ${windowStart} then ${BigInt(now)} else rate_limit."lastRequest" end
    returning count`;
  // Roughly one call in fifty sweeps out stale counters; cheap, and no scheduled job needed.
  if (Math.random() < 0.02) await db.$executeRaw`delete from rate_limit where "lastRequest" < ${BigInt(now - DAY_MS)}`;
  return (rows[0]?.count ?? 1) <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
