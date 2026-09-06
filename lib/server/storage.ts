import { createReadStream } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config";
import { createId } from "./ids";
import type { UploadPurpose } from "./types";
import { put, get, del } from "@vercel/blob";
import { AppError } from "./errors";

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
  throw new Error("S3 adapter is not implemented. Use STORAGE_ADAPTER=blob on Vercel.");
}

function blobPath(bucket: "public" | "private", key: string) {
  if (!/^(catalogue|reference)\/[a-zA-Z0-9-]+\.(webp|png|jpg)$/.test(key)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid media key.");
  }
  return `${bucket}/${key}`;
}

export function createBlobStorage(): StorageAdapter {
  // Both prefixes live in a private store. Public catalogue reads are proxied
  // through a route restricted to catalogue keys; reference reads require staff.
  return {
    async put(bucket, key, bytes, mime) {
      await put(blobPath(bucket, key), bytes, {
        access: "private", contentType: mime, addRandomSuffix: false,
      });
    },
    async get(bucket, key) {
      const result = await get(blobPath(bucket, key), { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) {
        throw new AppError(404, "NOT_FOUND", "Image not found.");
      }
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    },
    async remove(bucket, key) {
      await del(blobPath(bucket, key));
    },
    publicUrl(key) {
      return `/api/media/public?key=${encodeURIComponent(key)}`;
    },
    async signedReadUrl(key) {
      return `/api/admin/media?key=${encodeURIComponent(key)}`;
    },
  };
}

let adapter: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    const config = getConfig();
    adapter = config.storage === "blob" ? createBlobStorage()
      : config.storage === "s3" ? createS3Storage() : createIsolatedStorage();
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
