import { AppError } from "./errors";

export type PersistenceMode = "postgres" | "isolated";
export type StorageMode = "s3" | "isolated";

function read(name: string, fallback?: string): string | undefined {
  const value = process.env[name] ?? fallback;
  return value && value.length > 0 ? value : undefined;
}

export function getConfig() {
  const persistence = (read("APP_PERSISTENCE", "isolated") ??
    "isolated") as PersistenceMode;
  const storage = (read("STORAGE_ADAPTER", "isolated") ?? "isolated") as StorageMode;
  const appUrl = read("APP_URL", "http://localhost:3000") ?? "http://localhost:3000";
  const authSecret = read("AUTH_SECRET");
  const allowlist = (read("STAFF_ALLOWLIST", "") ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (persistence !== "postgres" && persistence !== "isolated") {
    throw new AppError(500, "INTERNAL_ERROR", "Service is unavailable.");
  }
  if (storage !== "s3" && storage !== "isolated") {
    throw new AppError(500, "INTERNAL_ERROR", "Service is unavailable.");
  }
  if (persistence === "postgres" && !read("DATABASE_URL")) {
    throw new AppError(500, "INTERNAL_ERROR", "Service is unavailable.");
  }
  if (!authSecret || authSecret.length < 32) {
    throw new AppError(500, "INTERNAL_ERROR", "Service is unavailable.");
  }

  return {
    persistence,
    storage,
    appUrl,
    authSecret,
    allowlist,
    databaseUrl: read("DATABASE_URL"),
    storageEndpoint: read("STORAGE_ENDPOINT"),
    storageRegion: read("STORAGE_REGION", "auto") ?? "auto",
    storageAccessKey: read("STORAGE_ACCESS_KEY_ID"),
    storageSecretKey: read("STORAGE_SECRET_ACCESS_KEY"),
    publicBucket: read("STORAGE_PUBLIC_BUCKET", "chinachapu-public") ?? "chinachapu-public",
    privateBucket: read("STORAGE_PRIVATE_BUCKET", "chinachapu-private") ?? "chinachapu-private",
    publicBaseUrl: read("STORAGE_PUBLIC_BASE_URL"),
  };
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
