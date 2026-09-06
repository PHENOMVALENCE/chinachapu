import { uploadAuthoriseSchema } from "@/lib/validation/fields";
import { LIMITS } from "@/lib/validation/limits";
import { getRepository } from "../db";
import { AppError } from "../errors";
import { createId, sha256 } from "../ids";
import { processImage } from "../images";
import { getStorage, newStorageKey } from "../storage";
import type { UploadPurpose } from "../types";

export async function authoriseUpload(
  body: unknown,
  ownerToken: string,
  purpose: UploadPurpose
) {
  const parsed = uploadAuthoriseSchema.parse(body);
  const ext = parsed.type === "image/jpeg" ? "jpg" : parsed.type === "image/png" ? "png" : "webp";
  const id = createId();
  const storageKey = newStorageKey(purpose, ext);
  const expiresAt = new Date(Date.now() + LIMITS.uploadAuthTtlMs).toISOString();
  await getRepository().createUpload({
    id,
    storageKey,
    purpose,
    ownerHash: sha256(ownerToken),
    mime: parsed.type,
    bytes: parsed.size,
    width: null,
    height: null,
    state: "pending",
    expiresAt,
    orderItemId: null,
    createdAt: new Date().toISOString(),
  });
  return {
    id,
    expiresAt,
    upload: {
      method: "POST",
      url: purpose === "catalogue" ? `/api/admin/uploads/${id}/complete` : `/api/uploads/${id}/complete`,
      headers: { "content-type": parsed.type },
    },
  };
}

export async function completeUpload(
  id: string,
  ownerToken: string,
  bytes: Buffer,
  purpose: UploadPurpose
) {
  const repo = getRepository();
  const upload = await repo.getUpload(id);
  if (!upload) {
    throw new AppError(404, "NOT_FOUND", "Upload not found.");
  }
  if (upload.purpose !== purpose || upload.ownerHash !== sha256(ownerToken)) {
    throw new AppError(403, "FORBIDDEN", "This photo cannot be completed.");
  }
  if (upload.state !== "pending") {
    throw new AppError(409, "CONFLICT", "This upload is no longer pending.");
  }
  if (upload.expiresAt && new Date(upload.expiresAt).getTime() < Date.now()) {
    throw new AppError(409, "CONFLICT", "This upload expired. Start again.");
  }
  const processed = await processImage(bytes);
  const bucket = purpose === "catalogue" ? "public" : "private";
  const key = newStorageKey(purpose, "webp");
  await getStorage().put(bucket, key, processed.bytes, processed.mime);
  return repo.updateUpload(id, {
    storageKey: key,
    mime: processed.mime,
    bytes: processed.bytes.byteLength,
    width: processed.width,
    height: processed.height,
    state: "ready",
    expiresAt: new Date(Date.now() + LIMITS.unclaimedUploadTtlMs).toISOString(),
  });
}

export async function cleanupExpiredUploads(now = new Date()) {
  const repo = getRepository();
  const expired = await repo.listExpiredUnclaimed(now);
  const storage = getStorage();
  for (const upload of expired) {
    if (upload.state === "ready") {
      await storage.remove(upload.purpose === "catalogue" ? "public" : "private", upload.storageKey);
    }
  }
  if (expired.length > 0) {
    await repo.deleteUploads(expired.map((item) => item.id));
  }
  return expired.length;
}
