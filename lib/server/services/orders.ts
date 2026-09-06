import { createOrderSchema } from "@/lib/validation/fields";
import { AppError } from "../errors";
import { createId, createReference, hashRequestPayload, sha256 } from "../ids";
import { getRepository } from "../db";
import type { CreateOrderInput } from "../repository";

export async function createGuestOrder(input: unknown, draftOwner: string) {
  const parsed = createOrderSchema.parse(input);
  const repo = getRepository();
  const requestHash = hashRequestPayload({
    customer: parsed.customer,
    items: parsed.items,
  });

  const existing = await repo.getOrderByIdempotencyKey(parsed.idempotencyKey);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new AppError(409, "CONFLICT", "This request key was already used with different details.");
    }
    return { replay: true, reference: existing.reference, status: "new" as const };
  }

  const items: CreateOrderInput["items"] = [];
  for (const line of parsed.items) {
    const itemId = createId();
    if (line.kind === "catalogue") {
      const product = await repo.getProduct(line.productId);
      if (!product || product.state !== "active") {
        throw new AppError(409, "CONFLICT", "A selected product is no longer available.", {
          [`items.${parsed.items.indexOf(line)}.productId`]: "Remove or replace this unavailable product.",
        });
      }
      const category = await repo.getCategory(product.categoryId);
      if (line.uploadId) {
        await claimReadyUpload(line.uploadId, draftOwner, "reference");
      }
      items.push({
        id: itemId,
        kind: "catalogue",
        productId: product.id,
        nameSnapshot: product.name,
        categorySnapshot: category?.name ?? null,
        quantity: line.quantity,
        description: line.description ?? null,
        uploadId: line.uploadId,
      });
    } else {
      const category = line.categoryId ? await repo.getCategory(line.categoryId) : null;
      if (line.categoryId && !category) {
        throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
          [`items.${parsed.items.indexOf(line)}.categoryId`]: "Choose a valid category or leave it blank.",
        });
      }
      if (line.uploadId) {
        await claimReadyUpload(line.uploadId, draftOwner, "reference");
      }
      items.push({
        id: itemId,
        kind: "custom",
        productId: null,
        nameSnapshot: line.name,
        categorySnapshot: category?.name ?? null,
        quantity: line.quantity,
        description: line.description ?? null,
        uploadId: line.uploadId,
      });
    }
  }

  try {
    const order = await repo.createOrder({
      order: {
        id: createId(),
        reference: createReference(),
        name: parsed.customer.name,
        email: parsed.customer.email,
        phone: parsed.customer.phone,
        status: "new",
        idempotencyKey: parsed.idempotencyKey,
        requestHash,
        version: 1,
      },
      items,
    });
    return { replay: false, reference: order.reference, status: "new" as const };
  } catch (error) {
    const raced = await repo.getOrderByIdempotencyKey(parsed.idempotencyKey);
    if (raced && raced.requestHash === requestHash) {
      return { replay: true, reference: raced.reference, status: "new" as const };
    }
    throw error;
  }
}

async function claimReadyUpload(uploadId: string, draftOwner: string, purpose: "reference") {
  const upload = await getRepository().getUpload(uploadId);
  if (!upload) {
    throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      uploadId: "Remove the photo and try again.",
    });
  }
  if (upload.purpose !== purpose || upload.ownerHash !== sha256(draftOwner) || upload.state !== "ready") {
    throw new AppError(403, "FORBIDDEN", "This photo cannot be attached.");
  }
  if (upload.orderItemId) {
    throw new AppError(409, "CONFLICT", "This photo was already used.");
  }
  if (upload.expiresAt && new Date(upload.expiresAt).getTime() < Date.now()) {
    throw new AppError(409, "CONFLICT", "This photo expired. Upload it again.");
  }
}
