import { LIMITS } from "@/lib/validation/limits";
import { AppError } from "./errors";
import { prisma } from "./adapters/prisma-store";
import { sha256 } from "./ids";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

async function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (process.env.APP_PERSISTENCE === "postgres" && !process.env.VITEST) {
    const hashedKey = sha256(key);
    const resetAt = new Date(now + windowMs);
    const rows = await prisma().$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${hashedKey}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN ${resetAt} ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    if (rows[0].count > limit) {
      throw new AppError(429, "RATE_LIMITED", "Too many attempts. Wait and try again.");
    }
    return;
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new AppError(429, "RATE_LIMITED", "Too many attempts. Wait and try again.");
  }
}

export function limitOrders(ip: string) {
  return hit(`orders:${ip}`, LIMITS.ordersPerIpHour, 60 * 60 * 1000);
}

export function limitUploads(ip: string) {
  return hit(`uploads:${ip}`, LIMITS.uploadsPerIpHour, 60 * 60 * 1000);
}

export function limitLogin(ip: string) {
  return hit(`login:${ip}`, LIMITS.loginAttemptsMax, LIMITS.loginAttemptsWindowMs);
}

export function limitPayAccess(ip: string) {
  return hit(`pay-access:${ip}`, 20, 60 * 60 * 1000);
}

export function limitPaySession(ip: string) {
  return hit(`pay-session:${ip}`, 10, 60 * 60 * 1000);
}

export function resetRateLimits() {
  buckets.clear();
}
