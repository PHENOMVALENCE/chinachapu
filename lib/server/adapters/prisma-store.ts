import { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../errors";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  ListProductsQuery,
  Repository,
} from "../repository";
import type {
  OrderRecord,
  ProductRecord,
  StaffUserRecord,
  UploadRecord,
} from "../types";

let client: PrismaClient | undefined;

function prisma() {
  client ??= new PrismaClient();
  return client;
}

function mapProduct(row: {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  description: string | null;
  imageAssetId: string | null;
  altText: string | null;
  state: ProductRecord["state"];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ProductRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapOrder(row: {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  status: OrderRecord["status"];
  idempotencyKey: string;
  requestHash: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): OrderRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapUpload(row: {
  id: string;
  storageKey: string;
  purpose: UploadRecord["purpose"];
  ownerHash: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  state: UploadRecord["state"];
  expiresAt: Date | null;
  orderItemId: string | null;
  createdAt: Date;
}): UploadRecord {
  return {
    ...row,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createPrismaRepository(): Repository {
  const db = prisma();

  return {
    async listCategories() {
      return db.category.findMany({ orderBy: { sortOrder: "asc" } });
    },
    async getCategory(id) {
      return db.category.findUnique({ where: { id } });
    },
    async upsertCategories(categories) {
      await db.$transaction(
        categories.map((category) =>
          db.category.upsert({
            where: { slug: category.slug },
            update: { name: category.name, sortOrder: category.sortOrder },
            create: category,
          })
        )
      );
    },
    async listProducts(query: ListProductsQuery) {
      const where: Prisma.ProductWhereInput = {};
      if (query.states) where.state = { in: query.states };
      if (query.categorySlug) where.category = { slug: query.categorySlug };
      if (query.q) {
        where.OR = [
          { name: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
        ];
      }
      const rows = await db.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: query.take + 1,
        ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      });
      const hasMore = rows.length > query.take;
      const page = hasMore ? rows.slice(0, query.take) : rows;
      return {
        items: page.map(mapProduct),
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      };
    },
    async getProduct(id) {
      const row = await db.product.findUnique({ where: { id } });
      return row ? mapProduct(row) : null;
    },
    async getProductBySlug(slug) {
      const row = await db.product.findUnique({ where: { slug } });
      return row ? mapProduct(row) : null;
    },
    async createProduct(product) {
      const row = await db.product.create({
        data: {
          ...product,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt),
        },
      });
      return mapProduct(row);
    },
    async updateProduct(id, expectedVersion, patch) {
      const updated = await db.product.updateMany({
        where: { id, version: expectedVersion },
        data: {
          name: patch.name,
          slug: patch.slug,
          categoryId: patch.categoryId,
          description: patch.description,
          imageAssetId: patch.imageAssetId,
          altText: patch.altText,
          state: patch.state,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new AppError(409, "CONFLICT", "This product was updated by someone else. Refresh and try again.");
      }
      const row = await db.product.findUniqueOrThrow({ where: { id } });
      return mapProduct(row);
    },
    async createOrder(input: CreateOrderInput) {
      const row = await db.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            id: input.order.id,
            reference: input.order.reference,
            name: input.order.name,
            email: input.order.email,
            phone: input.order.phone,
            status: input.order.status,
            idempotencyKey: input.order.idempotencyKey,
            requestHash: input.order.requestHash,
            version: input.order.version,
          },
        });
        for (const item of input.items) {
          await tx.orderItem.create({
            data: {
              id: item.id,
              orderId: order.id,
              kind: item.kind,
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              categorySnapshot: item.categorySnapshot,
              quantity: item.quantity,
              description: item.description,
            },
          });
          if (item.uploadId) {
            await tx.upload.update({
              where: { id: item.uploadId },
              data: { state: "claimed", orderItemId: item.id, expiresAt: null },
            });
          }
        }
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            oldStatus: null,
            newStatus: "new",
            staffId: "system",
          },
        });
        return order;
      });
      return mapOrder(row);
    },
    async getOrder(id) {
      const row = await db.order.findUnique({ where: { id } });
      return row ? mapOrder(row) : null;
    },
    async getOrderByIdempotencyKey(key) {
      const row = await db.order.findUnique({ where: { idempotencyKey: key } });
      return row ? mapOrder(row) : null;
    },
    async listOrders(query: ListOrdersQuery) {
      const where: Prisma.OrderWhereInput = {};
      if (query.status) where.status = query.status;
      if (query.from || query.to) {
        where.createdAt = {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        };
      }
      if (query.q) {
        where.OR = [
          { reference: { contains: query.q, mode: "insensitive" } },
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
          { phone: { contains: query.q, mode: "insensitive" } },
        ];
      }
      const rows = await db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.take + 1,
        ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      });
      const hasMore = rows.length > query.take;
      const page = hasMore ? rows.slice(0, query.take) : rows;
      return {
        items: page.map(mapOrder),
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      };
    },
    async updateOrderStatus(id, expectedVersion, status, event) {
      const row = await db.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id, version: expectedVersion },
          data: { status, version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new AppError(409, "CONFLICT", "This order was updated by someone else. Refresh and try again.");
        }
        await tx.orderEvent.create({
          data: {
            orderId: id,
            oldStatus: event.oldStatus,
            newStatus: event.newStatus,
            staffId: event.staffId,
          },
        });
        return tx.order.findUniqueOrThrow({ where: { id } });
      });
      return mapOrder(row);
    },
    async listOrderItems(orderId) {
      return db.orderItem.findMany({ where: { orderId } });
    },
    async listOrderEvents(orderId) {
      const rows = await db.orderEvent.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((row) => ({
        id: row.id,
        orderId: row.orderId,
        oldStatus: row.oldStatus,
        newStatus: row.newStatus,
        staffId: row.staffId,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    async addStaffNote(note) {
      const row = await db.staffNote.create({ data: note });
      return { ...row, createdAt: row.createdAt.toISOString() };
    },
    async listStaffNotes(orderId) {
      const rows = await db.staffNote.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((row) => ({
        id: row.id,
        orderId: row.orderId,
        staffId: row.staffId,
        text: row.text,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    async countOrders() {
      const grouped = await db.order.groupBy({ by: ["status"], _count: true });
      const byStatus = {
        new: 0,
        contacted: 0,
        sourcing: 0,
        completed: 0,
        cancelled: 0,
      };
      for (const row of grouped) {
        byStatus[row.status] = row._count;
      }
      const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
      return { total, byStatus };
    },
    async countActiveProducts() {
      return db.product.count({ where: { state: "active" } });
    },
    async recentOrders(take) {
      const rows = await db.order.findMany({ orderBy: { createdAt: "desc" }, take });
      return rows.map(mapOrder);
    },
    async createUpload(upload) {
      const row = await db.upload.create({
        data: {
          ...upload,
          expiresAt: upload.expiresAt ? new Date(upload.expiresAt) : null,
          createdAt: new Date(upload.createdAt),
        },
      });
      return mapUpload(row);
    },
    async getUpload(id) {
      const row = await db.upload.findUnique({ where: { id } });
      return row ? mapUpload(row) : null;
    },
    async getUploadByOrderItem(orderItemId) {
      const row = await db.upload.findUnique({ where: { orderItemId } });
      return row ? mapUpload(row) : null;
    },
    async updateUpload(id, patch) {
      const row = await db.upload.update({
        where: { id },
        data: {
          ...patch,
          expiresAt:
            patch.expiresAt === undefined
              ? undefined
              : patch.expiresAt
                ? new Date(patch.expiresAt)
                : null,
        },
      });
      return mapUpload(row);
    },
    async listExpiredUnclaimed(now) {
      const rows = await db.upload.findMany({
        where: {
          state: { not: "claimed" },
          expiresAt: { lte: now },
        },
      });
      return rows.map(mapUpload);
    },
    async deleteUploads(ids) {
      await db.upload.deleteMany({ where: { id: { in: ids } } });
    },
    async getStaffByEmail(email) {
      return db.staffUser.findUnique({ where: { email: email.toLowerCase() } }) as Promise<StaffUserRecord | null>;
    },
    async upsertStaff(staff) {
      const row = await db.staffUser.upsert({
        where: { email: staff.email },
        update: { passwordHash: staff.passwordHash },
        create: {
          id: staff.id,
          email: staff.email,
          passwordHash: staff.passwordHash,
        },
      });
      return { ...row, createdAt: row.createdAt.toISOString() };
    },
    async resetForTests() {
      throw new AppError(500, "INTERNAL_ERROR", "Postgres reset is not available in application code.");
    },
  };
}
