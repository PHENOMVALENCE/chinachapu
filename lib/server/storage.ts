import { createReadStream } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config";
import { createId } from "./ids";
import type { UploadPurpose } from "./types";

export type StoredObject = {
  key: string;
  bucket: "public" | "private";
};

export interface StorageAdapter {
  put(bucket: "public" | "private", key: string, bytes: Buffer, mime: string): Promise<void>;
  get(bucket: "public" | "private", key: string): Promise<Buffer>;
  remove(bucket: "public" | "private", key: string): Promise<void>;
  publicUrl(key: string): string;
  signedReadUrl(key: string, ttlSeconds?: number): Promise<string>;
}

function localRoot(bucket: "public" | "private") {
  return path.join(process.cwd(), ".data", "storage", bucket);
}

function createIsolatedStorage(): StorageAdapter {
  return {
    async put(bucket, key, bytes) {
      const dest = path.join(localRoot(bucket), key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
    },
    async get(bucket, key) {
      return readFile(path.join(localRoot(bucket), key));
    },
    async remove(bucket, key) {
      try {
        await unlink(path.join(localRoot(bucket), key));
      } catch {
        // already gone
      }
    },
    publicUrl(key) {
      const config = getConfig();
      if (config.publicBaseUrl) {
        return `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
      }
      return `/api/media/public?key=${encodeURIComponent(key)}`;
    },
    async signedReadUrl(key) {
      return `/api/admin/media?key=${encodeURIComponent(key)}`;
    },
  };
}

function createS3Storage(): StorageAdapter {
  const config = getConfig();
  if (!config.storageEndpoint || !config.storageAccessKey || !config.storageSecretKey) {
    throw new Error("S3 storage is not configured");
  }
  // Production S3 wiring is selected via STORAGE_ADAPTER=s3 after credentials exist.
  // The isolated adapter remains the default until those values are provisioned.
  return createIsolatedStorage();
}

let adapter: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    const config = getConfig();
    adapter = config.storage === "s3" ? createS3Storage() : createIsolatedStorage();
  }
  return adapter;
}

export function resetStorageCache() {
  adapter = undefined;
}

export function newStorageKey(purpose: UploadPurpose, ext: string) {
  return `${purpose}/${createId()}.${ext}`;
}

export function streamLocalFile(bucket: "public" | "private", key: string) {
  return createReadStream(path.join(localRoot(bucket), key));
}
