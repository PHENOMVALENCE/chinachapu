import { AppError } from "./errors";

export type PersistenceMode = "postgres" | "isolated";
export type StorageMode = "blob" | "s3" | "isolated";

function read(name: string, fallback?: string): string | undefined {
  const value = process.env[name] ?? fallback;
  return value && value.length > 0 ? value : undefined;
}

export function isTestRuntime() {
  return Boolean(process.env.VITEST);
}

export function isHostedRuntime() {
  return Boolean(process.env.VERCEL) || read("APP_REQUIRE_HOSTED") === "true";
}

function fail(message = "Service is unavailable."): never {
  throw new AppError(500, "INTERNAL_ERROR", message);
}

function requireHttpsAppUrl(appUrl: string) {
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:") {
      fail("APP_URL must be the public HTTPS origin.");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    fail("APP_URL must be the public HTTPS origin.");
  }
}

export function getConfig() {
  const persistence = (read("APP_PERSISTENCE", "isolated") ?? "isolated") as PersistenceMode;
  const storage = (read("STORAGE_ADAPTER", "isolated") ?? "isolated") as StorageMode;
  const appUrl = read("APP_URL", "http://localhost:3000") ?? "http://localhost:3000";
  const authSecret = read("AUTH_SECRET");
  const allowlist = (read("STAFF_ALLOWLIST", "") ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const hosted = isHostedRuntime();

  if (persistence !== "postgres" && persistence !== "isolated") {
    fail();
  }
  if (storage !== "blob" && storage !== "s3" && storage !== "isolated") {
    fail();
  }
  if (!authSecret || authSecret.length < 32) {
    fail();
  }

  if (persistence === "postgres" && !read("DATABASE_URL")) {
    fail();
  }
  if (storage === "blob" && !read("BLOB_READ_WRITE_TOKEN")) {
    fail("Media storage is not configured.");
  }

  if (hosted) {
    if (persistence !== "postgres") {
      fail("Hosted persistence is not configured.");
    }
    if (process.env.VERCEL && storage !== "blob") {
      fail("Hosted persistence is not configured.");
    }
    if (!process.env.VERCEL && storage === "isolated") {
      fail("Hosted persistence is not configured.");
    }
    if (storage === "s3") {
      if (!read("STORAGE_ENDPOINT") || !read("STORAGE_ACCESS_KEY_ID") || !read("STORAGE_SECRET_ACCESS_KEY")) {
        fail("Media storage is not configured.");
      }
    }
    requireHttpsAppUrl(appUrl);
    if (allowlist.length === 0) {
      fail("STAFF_ALLOWLIST is required.");
    }
    if (!read("CRON_SECRET") || (read("CRON_SECRET") ?? "").length < 32) {
      fail("CRON_SECRET is required.");
    }
  }

  return {
    persistence,
    storage,
    appUrl,
    authSecret,
    allowlist,
    hosted,
    databaseUrl: read("DATABASE_URL"),
    storageEndpoint: read("STORAGE_ENDPOINT"),
    storageRegion: read("STORAGE_REGION", "auto") ?? "auto",
    storageAccessKey: read("STORAGE_ACCESS_KEY_ID"),
    storageSecretKey: read("STORAGE_SECRET_ACCESS_KEY"),
    publicBucket: read("STORAGE_PUBLIC_BUCKET", "chinachapu-public") ?? "chinachapu-public",
    privateBucket: read("STORAGE_PRIVATE_BUCKET", "chinachapu-private") ?? "chinachapu-private",
    publicBaseUrl: read("STORAGE_PUBLIC_BASE_URL"),
    blobToken: read("BLOB_READ_WRITE_TOKEN"),
    cronSecret: read("CRON_SECRET"),
  };
}

export function cookieSecure() {
  if (isTestRuntime()) return false;
  if (process.env.NODE_ENV === "production") return true;
  try {
    return new URL(getConfig().appUrl).protocol === "https:";
  } catch {
    return false;
  }
}

export function assertProductionReady(): string[] {
  const warnings: string[] = [];
  const config = getConfig();
  if (config.persistence === "isolated") {
    warnings.push("APP_PERSISTENCE=isolated is not production persistence.");
  }
  if (config.storage === "isolated") {
    warnings.push("STORAGE_ADAPTER=isolated is not a production object store.");
  }
  return warnings;
}
