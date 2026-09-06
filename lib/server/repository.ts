import type {
  CategoryRecord,
  OrderEventRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  ProductRecord,
  ProductState,
  StaffNoteRecord,
  StaffUserRecord,
  UploadRecord,
} from "./types";

export type CreateOrderInput = {
  order: Omit<OrderRecord, "createdAt" | "updatedAt">;
  items: Array<Omit<OrderItemRecord, "id" | "orderId"> & { id: string; uploadId?: string }>;
};

export type ListOrdersQuery = {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  q?: string;
  cursor?: string;
  take: number;
};

export type ListProductsQuery = {
  categorySlug?: string;
  q?: string;
  states?: ProductState[];
  cursor?: string;
  take: number;
};

export interface Repository {
  listCategories(): Promise<CategoryRecord[]>;
  getCategory(id: string): Promise<CategoryRecord | null>;
  upsertCategories(categories: CategoryRecord[]): Promise<void>;

  listProducts(query: ListProductsQuery): Promise<{ items: ProductRecord[]; nextCursor: string | null }>;
  getProduct(id: string): Promise<ProductRecord | null>;
  getProductBySlug(slug: string): Promise<ProductRecord | null>;
  createProduct(product: ProductRecord): Promise<ProductRecord>;
  updateProduct(id: string, expectedVersion: number, patch: Partial<ProductRecord>): Promise<ProductRecord>;

  createOrder(input: CreateOrderInput): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  getOrderByIdempotencyKey(key: string): Promise<OrderRecord | null>;
  listOrders(query: ListOrdersQuery): Promise<{ items: OrderRecord[]; nextCursor: string | null }>;
  updateOrderStatus(
    id: string,
    expectedVersion: number,
    status: OrderStatus,
    event: Omit<OrderEventRecord, "id" | "createdAt">
  ): Promise<OrderRecord>;
  listOrderItems(orderId: string): Promise<OrderItemRecord[]>;
  listOrderEvents(orderId: string): Promise<OrderEventRecord[]>;
  addStaffNote(note: Omit<StaffNoteRecord, "id" | "createdAt">): Promise<StaffNoteRecord>;
  listStaffNotes(orderId: string): Promise<StaffNoteRecord[]>;
  countOrders(): Promise<{ total: number; byStatus: Record<OrderStatus, number> }>;
  countActiveProducts(): Promise<number>;
  recentOrders(take: number): Promise<OrderRecord[]>;

  createUpload(upload: UploadRecord): Promise<UploadRecord>;
  getUpload(id: string): Promise<UploadRecord | null>;
  getUploadByOrderItem(orderItemId: string): Promise<UploadRecord | null>;
  updateUpload(id: string, patch: Partial<UploadRecord>): Promise<UploadRecord>;
  listExpiredUnclaimed(now: Date): Promise<UploadRecord[]>;
  deleteUploads(ids: string[]): Promise<void>;

  getStaffByEmail(email: string): Promise<StaffUserRecord | null>;
  upsertStaff(staff: StaffUserRecord): Promise<StaffUserRecord>;

  resetForTests(): Promise<void>;
}
