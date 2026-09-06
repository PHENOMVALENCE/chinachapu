import { AppError } from "../errors";
import { SNIPPE_ACCOUNT_LIMIT_PER_MINUTE } from "./config";

const stamps: number[] = [];

export function consumeSnippeBudget(now = Date.now()) {
  const windowStart = now - 60_000;
  while (stamps.length && stamps[0]! < windowStart) {
    stamps.shift();
  }
  if (stamps.length >= SNIPPE_ACCOUNT_LIMIT_PER_MINUTE) {
    throw new AppError(429, "RATE_LIMITED", "Payment provider rate limit reached. Try again shortly.");
  }
  stamps.push(now);
}

export function resetSnippeBudget() {
  stamps.length = 0;
}
