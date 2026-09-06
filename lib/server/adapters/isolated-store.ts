import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors";
import { createId } from "../ids";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  ListProductsQuery,
  Repository,
} from "../repository";
import type {
  CategoryRecord,
  OrderEventRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  PaymentAccessRecord,
  PaymentAttemptRecord,
  PaymentAuditRecord,
  PaymentLedgerRecord,
  ProductRecord,
  QuoteRecord,
  StaffNoteRecord,
  StaffUserRecord,
  UploadRecord,
  WebhookInboxRecord,
} from "../types";
import { UNRESOLVED_ATTEMPT_STATUSES } from "../types";

type StoreShape = {
  categories: CategoryRecord[];
  products: ProductRecord[];
  orders: OrderRecord[];
  items: OrderItemRecord[];
  uploads: UploadRecord[];
  events: OrderEventRecord[];
  notes: StaffNoteRecord[];
  staff: StaffUserRecord[];
  quotes: QuoteRecord[];
  access: PaymentAccessRecord[];
  attempts: PaymentAttemptRecord[];
  inbox: WebhookInboxRecord[];
  ledger: PaymentLedgerRecord[];
  audits: PaymentAuditRecord[];
};

const emptyStore = (): StoreShape => ({
  categories: [],
  products: [],
  orders: [],
  items: [],
  uploads: [],
  events: [],
  notes: [],
  staff: [],
  quotes: [],
  access: [],
  attempts: [],
  inbox: [],
  ledger: [],
  audits: [],
});

const memory = new Map<string, StoreShape>();

function filePath() {
  return path.join(process.cwd(), ".data", "isolated-store.json");
}

async function load(key: string): Promise<StoreShape> {
  if (memory.has(key)) {
    return memory.get(key)!;
  }
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = { ...emptyStore(), ...(JSON.parse(raw) as Partial<StoreShape>) };
    memory.set(key, parsed);
    return parsed;
  } catch {
    const store = emptyStore();
    memory.set(key, store);
    return store;
  }
}

async function persist(key: string, store: StoreShape) {
  memory.set(key, store);
  if (process.env.VITEST) {
    return;
  }
  await mkdir(path.dirname(filePath()), { recursive: true });
  await writeFile(filePath(), JSON.stringify(store, null, 2), "utf8");
}

function matchesQuery(order: OrderRecord, query: ListOrdersQuery): boolean {
  if (query.status && order.status !== query.status) return false;
  const created = new Date(order.createdAt);
  if (query.from && created < query.from) return false;
  if (query.to && created > query.to) return false;
  if (query.q) {
    const hay = `${order.reference} ${order.name} ${order.email} ${order.phone}`.toLowerCase();
    if (!hay.includes(query.q.toLowerCase())) return false;
  }
  return true;
}

export function createIsolatedRepository(namespace = "default"): Repository {
  const key = namespace;

  return {
    async listCategories() {
      const store = await load(key);
      return [...store.categories].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getCategory(id) {
      const store = await load(key);
      return store.categories.find((item) => item.id === id) ?? null;
    },
    async upsertCategories(categories) {
      const store = await load(key);
      for (const category of categories) {
        const index = store.categories.findIndex((item) => item.slug === category.slug);
        if (index >= 0) {
          store.categories[index] = { ...store.categories[index], name: category.name, sortOrder: category.sortOrder };
        } else {
          store.categories.push(category);
        }
      }
      await persist(key, store);
    },
    async listProducts(query: ListProductsQuery) {
      const store = await load(key);
      const categories = new Map(store.categories.map((item) => [item.id, item]));
      let items = [...store.products].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      if (query.states) {
        items = items.filter((item) => query.states!.includes(item.state));
      }
      if (query.categorySlug) {
        items = items.filter((item) => categories.get(item.categoryId)?.slug === query.categorySlug);
      }
      if (query.q) {
        const q = query.q.toLowerCase();
        items = items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.description ?? "").toLowerCase().includes(q)
        );
      }
      if (query.cursor) {
        const index = items.findIndex((item) => item.id === query.cursor);
        items = index >= 0 ? items.slice(index + 1) : items;
      }
      const page = items.slice(0, query.take);
      return {
        items: page,
        nextCursor: items.length > query.take ? page[page.length - 1]?.id ?? null : null,
      };
    },
    async getProduct(id) {
      const store = await load(key);
      return store.products.find((item) => item.id === id) ?? null;
    },
    async getProductBySlug(slug) {
      const store = await load(key);
      return store.products.find((item) => item.slug === slug) ?? null;
    },
    async createProduct(product) {
      const store = await load(key);
      if (store.products.some((item) => item.slug === product.slug)) {
        throw new AppError(409, "CONFLICT", "A product with this slug already exists.");
      }
      store.products.push(product);
      await persist(key, store);
      return product;
    },
    async updateProduct(id, expectedVersion, patch) {
      const store = await load(key);
      const index = store.products.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Product not found.");
      const current = store.products[index];
      if (current.version !== expectedVersion) {
        throw new AppError(409, "CONFLICT", "This product was updated by someone else. Refresh and try again.");
      }
      const next = {
        ...current,
        ...patch,
        id: current.id,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.products[index] = next;
      await persist(key, store);
      return next;
    },
    async createOrder(input: CreateOrderInput) {
      const store = await load(key);
      if (store.orders.some((item) => item.idempotencyKey === input.order.idempotencyKey)) {
        throw new AppError(409, "CONFLICT", "This request key was already used.");
      }
      const now = new Date().toISOString();
      const order: OrderRecord = { ...input.order, createdAt: now, updatedAt: now };
      store.orders.push(order);
      for (const item of input.items) {
        const { uploadId, ...rest } = item;
        store.items.push({ ...rest, orderId: order.id });
        if (uploadId) {
          const upload = store.uploads.find((entry) => entry.id === uploadId);
          if (upload) {
            upload.state = "claimed";
            upload.orderItemId = rest.id;
            upload.expiresAt = null;
          }
        }
      }
      store.events.push({
        id: createId(),
        orderId: order.id,
        oldStatus: null,
        newStatus: "new",
        staffId: "system",
        createdAt: now,
      });
      await persist(key, store);
      return order;
    },
    async getOrder(id) {
      const store = await load(key);
      return store.orders.find((item) => item.id === id) ?? null;
    },
    async getOrderByIdempotencyKey(idempotencyKey) {
      const store = await load(key);
      return store.orders.find((item) => item.idempotencyKey === idempotencyKey) ?? null;
    },
    async listOrders(query) {
      const store = await load(key);
      let items = [...store.orders]
        .filter((item) => matchesQuery(item, query))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (query.cursor) {
        const index = items.findIndex((item) => item.id === query.cursor);
        items = index >= 0 ? items.slice(index + 1) : items;
      }
      const page = items.slice(0, query.take);
      return {
        items: page,
        nextCursor: items.length > query.take ? page[page.length - 1]?.id ?? null : null,
      };
    },
    async updateOrderStatus(id, expectedVersion, status, event) {
      const store = await load(key);
      const index = store.orders.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Order not found.");
      const current = store.orders[index];
      if (current.version !== expectedVersion) {
        throw new AppError(409, "CONFLICT", "This order was updated by someone else. Refresh and try again.");
      }
      const now = new Date().toISOString();
      const next = { ...current, status, version: current.version + 1, updatedAt: now };
      store.orders[index] = next;
      store.events.push({ ...event, id: createId(), createdAt: now });
      await persist(key, store);
      return next;
    },
    async listOrderItems(orderId) {
      const store = await load(key);
      return store.items.filter((item) => item.orderId === orderId);
    },
    async listOrderEvents(orderId) {
      const store = await load(key);
      return store.events
        .filter((item) => item.orderId === orderId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async addStaffNote(note) {
      const store = await load(key);
      const record: StaffNoteRecord = { ...note, id: createId(), createdAt: new Date().toISOString() };
      store.notes.push(record);
      await persist(key, store);
      return record;
    },
    async listStaffNotes(orderId) {
      const store = await load(key);
      return store.notes
        .filter((item) => item.orderId === orderId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async countOrders() {
      const store = await load(key);
      const byStatus: Record<OrderStatus, number> = {
        new: 0,
        contacted: 0,
        sourcing: 0,
        completed: 0,
        cancelled: 0,
      };
      for (const order of store.orders) {
        byStatus[order.status] += 1;
      }
      return { total: store.orders.length, byStatus };
    },
    async countActiveProducts() {
      const store = await load(key);
      return store.products.filter((item) => item.state === "active").length;
    },
    async recentOrders(take) {
      const store = await load(key);
      return [...store.orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, take);
    },
    async createUpload(upload) {
      const store = await load(key);
      store.uploads.push(upload);
      await persist(key, store);
      return upload;
    },
    async getUpload(id) {
      const store = await load(key);
      return store.uploads.find((item) => item.id === id) ?? null;
    },
    async getUploadByOrderItem(orderItemId) {
      const store = await load(key);
      return store.uploads.find((item) => item.orderItemId === orderItemId) ?? null;
    },
    async updateUpload(id, patch) {
      const store = await load(key);
      const index = store.uploads.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Upload not found.");
      store.uploads[index] = { ...store.uploads[index], ...patch, id };
      await persist(key, store);
      return store.uploads[index];
    },
    async listExpiredUnclaimed(now) {
      const store = await load(key);
      return store.uploads.filter(
        (item) =>
          item.state !== "claimed" &&
          item.expiresAt !== null &&
          new Date(item.expiresAt).getTime() <= now.getTime()
      );
    },
    async deleteUploads(ids) {
      const store = await load(key);
      store.uploads = store.uploads.filter((item) => !ids.includes(item.id));
      await persist(key, store);
    },
    async getStaffByEmail(email) {
      const store = await load(key);
      return store.staff.find((item) => item.email === email.toLowerCase()) ?? null;
    },
    async upsertStaff(staff) {
      const store = await load(key);
      const index = store.staff.findIndex((item) => item.email === staff.email);
      if (index >= 0) store.staff[index] = staff;
      else store.staff.push(staff);
      await persist(key, store);
      return staff;
    },
    async createQuote(quote) {
      const store = await load(key);
      if (store.quotes.some((item) => item.orderId === quote.orderId && item.revision === quote.revision)) {
        throw new AppError(409, "CONFLICT", "That quote revision already exists.");
      }
      store.quotes.push(quote);
      await persist(key, store);
      return quote;
    },
    async getQuote(id) {
      const store = await load(key);
      return store.quotes.find((item) => item.id === id) ?? null;
    },
    async listQuotesForOrder(orderId) {
      const store = await load(key);
      return store.quotes
        .filter((item) => item.orderId === orderId)
        .sort((a, b) => b.revision - a.revision);
    },
    async updateQuote(id, patch) {
      const store = await load(key);
      const index = store.quotes.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Quote not found.");
      store.quotes[index] = { ...store.quotes[index], ...patch, id, updatedAt: new Date().toISOString() };
      await persist(key, store);
      return store.quotes[index];
    },
    async createPaymentAccess(access) {
      const store = await load(key);
      store.access.push(access);
      await persist(key, store);
      return access;
    },
    async getPaymentAccessByHash(tokenHash) {
      const store = await load(key);
      return store.access.find((item) => item.tokenHash === tokenHash) ?? null;
    },
    async listPaymentAccess(quoteId) {
      const store = await load(key);
      return store.access.filter((item) => item.quoteId === quoteId);
    },
    async revokePaymentAccess(id) {
      const store = await load(key);
      const item = store.access.find((entry) => entry.id === id);
      if (item) item.revokedAt = new Date().toISOString();
      await persist(key, store);
    },
    async createAttempt(attempt) {
      const store = await load(key);
      const unresolved = store.attempts.find(
        (item) => item.orderId === attempt.orderId && UNRESOLVED_ATTEMPT_STATUSES.includes(item.status)
      );
      if (unresolved) {
        throw new AppError(409, "CONFLICT", "This order already has an unresolved payment attempt.");
      }
      store.attempts.push(attempt);
      await persist(key, store);
      return attempt;
    },
    async getAttempt(id) {
      const store = await load(key);
      return store.attempts.find((item) => item.id === id) ?? null;
    },
    async getUnresolvedAttempt(orderId) {
      const store = await load(key);
      return (
        store.attempts.find(
          (item) => item.orderId === orderId && UNRESOLVED_ATTEMPT_STATUSES.includes(item.status)
        ) ?? null
      );
    },
    async getAttemptBySessionRef(reference) {
      const store = await load(key);
      return store.attempts.find((item) => item.providerSessionRef === reference) ?? null;
    },
    async getAttemptByPaymentRef(reference) {
      const store = await load(key);
      return store.attempts.find((item) => item.providerPaymentRef === reference) ?? null;
    },
    async listAttemptsForOrder(orderId) {
      const store = await load(key);
      return store.attempts
        .filter((item) => item.orderId === orderId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async listSweepAttempts() {
      const store = await load(key);
      return store.attempts.filter((item) => UNRESOLVED_ATTEMPT_STATUSES.includes(item.status));
    },
    async updateAttempt(id, patch) {
      const store = await load(key);
      const index = store.attempts.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Payment attempt not found.");
      store.attempts[index] = { ...store.attempts[index], ...patch, id, updatedAt: new Date().toISOString() };
      await persist(key, store);
      return store.attempts[index];
    },
    async insertInbox(record) {
      const store = await load(key);
      const existing = store.inbox.find((item) => item.eventId === record.eventId);
      if (existing) {
        if (existing.payloadHash !== record.payloadHash) {
          throw new AppError(409, "CONFLICT", "Duplicate webhook id with a different payload.");
        }
        return { record: existing, created: false };
      }
      store.inbox.push(record);
      await persist(key, store);
      return { record, created: true };
    },
    async listPendingInbox() {
      const store = await load(key);
      return store.inbox.filter((item) => item.status !== "processed");
    },
    async updateInbox(id, patch) {
      const store = await load(key);
      const index = store.inbox.findIndex((item) => item.id === id);
      if (index < 0) throw new AppError(404, "NOT_FOUND", "Inbox record not found.");
      store.inbox[index] = { ...store.inbox[index], ...patch, id };
      await persist(key, store);
      return store.inbox[index];
    },
    async insertLedger(record) {
      const store = await load(key);
      if (store.ledger.some((item) => item.providerPaymentRef === record.providerPaymentRef)) {
        return store.ledger.find((item) => item.providerPaymentRef === record.providerPaymentRef)!;
      }
      store.ledger.push(record);
      await persist(key, store);
      return record;
    },
    async listLedgerForOrder(orderId) {
      const store = await load(key);
      return store.ledger.filter((item) => item.orderId === orderId);
    },
    async addPaymentAudit(record) {
      const store = await load(key);
      store.audits.push(record);
      await persist(key, store);
      return record;
    },
    async resetForTests() {
      memory.set(key, emptyStore());
    },
  };
}
