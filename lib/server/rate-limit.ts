import { LIMITS } from "@/lib/validation/limits";
import { AppError } from "./errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
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
  hit(`orders:${ip}`, LIMITS.ordersPerIpHour, 60 * 60 * 1000);
}

export function limitUploads(ip: string) {
  hit(`uploads:${ip}`, LIMITS.uploadsPerIpHour, 60 * 60 * 1000);
}

export function limitLogin(ip: string) {
  hit(`login:${ip}`, LIMITS.loginAttemptsMax, LIMITS.loginAttemptsWindowMs);
}

export function resetRateLimits() {
  buckets.clear();
}
