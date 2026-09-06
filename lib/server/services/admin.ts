import { patchOrderSchema, staffNoteSchema, upsertProductSchema } from "@/lib/validation/fields";
import { LIMITS } from "@/lib/validation/limits";
import { canTransition } from "@/lib/validation/status";
import { getRepository } from "../db";
import { AppError } from "../errors";
import { createId } from "../ids";
import { getStorage } from "../storage";
import type { OrderStatus, ProductState } from "../types";
import { formatStaffDate } from "../timezone";

export async function getAdminSummary() {
  const repo = getRepository();
  const counts = await repo.countOrders();
  const activeProducts = await repo.countActiveProducts();
  const recent = await repo.recentOrders(8);
  return {
    totals: {
      orders: counts.total,
      new: counts.byStatus.new,
      inProgress: counts.byStatus.contacted + counts.byStatus.sourcing,
      completed: counts.byStatus.completed,
      activeProducts,
    },
    recent: recent.map((order) => ({
      id: order.id,
      reference: order.reference,
      name: order.name,
      status: order.status,
      createdAt: formatStaffDate(order.createdAt),
    })),
    timezone: "Africa/Dar_es_Salaam",
  };
}

export async function listAdminOrders(query: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  take?: number;
}) {
  const take = Math.min(Number(query.take ?? 20), LIMITS.pageSize.max);
  const status = query.status as OrderStatus | undefined;
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields.", {
      from: "Enter a valid date.",
    });
  }
  if (to && Number.isNaN(to.getTime())) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields.", {
      to: "Enter a valid date.",
    });
  }
  return getRepository().listOrders({
    status,
    from,
    to,
    q: query.q,
    cursor: query.cursor,
    take,
  });
}

export async function getAdminOrder(id: string) {
  const repo = getRepository();
  const order = await repo.getOrder(id);
  if (!order) {
    throw new AppError(404, "NOT_FOUND", "Order not found.");
  }
  const [items, events, notes] = await Promise.all([
    repo.listOrderItems(id),
    repo.listOrderEvents(id),
    repo.listStaffNotes(id),
  ]);
    const storage = getStorage();
  const detailedItems = [];
  for (const item of items) {
    const attachment = await repo.getUploadByOrderItem(item.id);
    detailedItems.push({
      ...item,
      imageUrl: attachment ? await storage.signedReadUrl(attachment.storageKey) : null,
    });
  }
  return {
    ...order,
    createdAtLabel: formatStaffDate(order.createdAt),
    updatedAtLabel: formatStaffDate(order.updatedAt),
    items: detailedItems,
    events: events.map((event) => ({
      ...event,
      createdAtLabel: formatStaffDate(event.createdAt),
    })),
    notes: notes.map((note) => ({
      ...note,
      createdAtLabel: formatStaffDate(note.createdAt),
    })),
  };
}

export async function patchAdminOrder(id: string, body: unknown, staffId: string) {
  const parsed = patchOrderSchema.parse(body);
  const repo = getRepository();
  const current = await repo.getOrder(id);
  if (!current) {
    throw new AppError(404, "NOT_FOUND", "Order not found.");
  }
  if (!canTransition(current.status, parsed.status)) {
    throw new AppError(409, "CONFLICT", "That status change is not allowed.");
  }
  return repo.updateOrderStatus(id, parsed.version, parsed.status, {
    orderId: id,
    oldStatus: current.status,
    newStatus: parsed.status,
    staffId,
  });
}

export async function addAdminNote(id: string, body: unknown, staffId: string) {
  const parsed = staffNoteSchema.parse(body);
  const order = await getRepository().getOrder(id);
  if (!order) {
    throw new AppError(404, "NOT_FOUND", "Order not found.");
  }
  return getRepository().addStaffNote({
    orderId: id,
    staffId,
    text: parsed.text,
  });
}

export async function createAdminProduct(body: unknown) {
  const parsed = upsertProductSchema.parse(body);
  if (!parsed.name || !parsed.categoryId) {
    const fields: Record<string, string> = {};
    if (!parsed.name) fields.name = "Enter a product name.";
    if (!parsed.categoryId) fields.categoryId = "Choose a category.";
    throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", fields);
  }
  const category = await getRepository().getCategory(parsed.categoryId);
  if (!category) {
    throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      categoryId: "Choose a valid category.",
    });
  }
  const now = new Date().toISOString();
  const slug =
    parsed.slug ??
    parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return getRepository().createProduct({
    id: createId(),
    slug,
    name: parsed.name,
    categoryId: parsed.categoryId,
    description: parsed.description ?? null,
    imageAssetId: parsed.imageAssetId ?? null,
    altText: parsed.altText ?? null,
    state: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchAdminProduct(id: string, body: unknown) {
  const parsed = upsertProductSchema.parse(body);
  const current = await getRepository().getProduct(id);
  if (!current) {
    throw new AppError(404, "NOT_FOUND", "Product not found.");
  }
  const nextState = parsed.state ?? current.state;
  const nextImage = parsed.imageAssetId === undefined ? current.imageAssetId : parsed.imageAssetId;
  const nextAlt = parsed.altText === undefined ? current.altText : parsed.altText;
  const nextName = parsed.name ?? current.name;
  const nextCategory = parsed.categoryId ?? current.categoryId;
  if (nextState === "active") {
    if (!nextImage || !nextAlt || !nextName || !nextCategory) {
      throw new AppError(422, "VALIDATION_ERROR", "Publishing needs a name, category, image, and alt text.");
    }
    const upload = await getRepository().getUpload(nextImage);
    if (!upload || upload.purpose !== "catalogue" || upload.state === "pending") {
      throw new AppError(422, "VALIDATION_ERROR", "Publish using a staff catalogue image.");
    }
  }
  return getRepository().updateProduct(id, parsed.version ?? current.version, {
    name: nextName,
    slug: parsed.slug ?? current.slug,
    categoryId: nextCategory,
    description: parsed.description === undefined ? current.description : parsed.description ?? null,
    imageAssetId: nextImage,
    altText: nextAlt,
    state: nextState as ProductState,
  });
}

export async function listAdminProducts(query: { q?: string; cursor?: string; take?: number }) {
  return getRepository().listProducts({
    q: query.q,
    cursor: query.cursor,
    take: Math.min(Number(query.take ?? 24), LIMITS.pageSize.max),
  });
}
