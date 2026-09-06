export type ProductState = "draft" | "active" | "archived";
export type OrderStatus = "new" | "contacted" | "sourcing" | "completed" | "cancelled";
export type OrderItemKind = "catalogue" | "custom";
export type UploadPurpose = "reference" | "catalogue";
export type UploadState = "pending" | "ready" | "claimed";

export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type ProductRecord = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  description: string | null;
  imageAssetId: string | null;
  altText: string | null;
  state: ProductState;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderRecord = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  status: OrderStatus;
  idempotencyKey: string;
  requestHash: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemRecord = {
  id: string;
  orderId: string;
  kind: OrderItemKind;
  productId: string | null;
  nameSnapshot: string;
  categorySnapshot: string | null;
  quantity: number;
  description: string | null;
};

export type UploadRecord = {
  id: string;
  storageKey: string;
  purpose: UploadPurpose;
  ownerHash: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  state: UploadState;
  expiresAt: string | null;
  orderItemId: string | null;
  createdAt: string;
};

export type OrderEventRecord = {
  id: string;
  orderId: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  staffId: string;
  createdAt: string;
};

export type StaffNoteRecord = {
  id: string;
  orderId: string;
  staffId: string;
  text: string;
  createdAt: string;
};

export type StaffUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type PublicProduct = {
  id: string;
  name: string;
  category: { id: string; slug: string; name: string };
  description: string | null;
  image: { url: string; alt: string } | null;
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  order: number;
};
