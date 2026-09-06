import { afterEach, describe, expect, it } from "vitest";
import { cookieSecure, getConfig, isHostedRuntime } from "@/lib/server/config";

const keys = [
  "VERCEL",
  "APP_REQUIRE_HOSTED",
  "APP_PERSISTENCE",
  "STORAGE_ADAPTER",
  "APP_URL",
  "AUTH_SECRET",
  "STAFF_ALLOWLIST",
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "CRON_SECRET",
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
] as const;

const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function hostedEnv() {
  process.env.VERCEL = "1";
  process.env.APP_PERSISTENCE = "postgres";
  process.env.STORAGE_ADAPTER = "blob";
  process.env.APP_URL = "https://chinachapu.example";
  process.env.AUTH_SECRET = "production-auth-secret-at-least-32-chars";
  process.env.STAFF_ALLOWLIST = "owner@example.com";
  process.env.DATABASE_URL = "postgresql://ci:ci@127.0.0.1:5432/ci";
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
  process.env.CRON_SECRET = "production-cron-secret-at-least-32-chars";
}

describe("hosted configuration", () => {
  it("treats isolated adapters as local-only", () => {
    expect(isHostedRuntime()).toBe(false);
    const config = getConfig();
    expect(config.persistence).toBe("isolated");
    expect(config.storage).toBe("isolated");
    expect(cookieSecure()).toBe(false);
  });

  it("accepts a complete Vercel configuration", () => {
    hostedEnv();
    const config = getConfig();
    expect(config.hosted).toBe(true);
    expect(config.persistence).toBe("postgres");
    expect(config.storage).toBe("blob");
  });

  it("rejects isolated persistence on Vercel", () => {
    hostedEnv();
    process.env.APP_PERSISTENCE = "isolated";
    expect(() => getConfig()).toThrow(/Hosted persistence is not configured/);
  });

  it("rejects http APP_URL on a hosted runtime", () => {
    hostedEnv();
    process.env.APP_URL = "http://chinachapu.example";
    expect(() => getConfig()).toThrow(/HTTPS/);
  });
});
