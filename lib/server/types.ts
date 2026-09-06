export type ProductState = "draft" | "active" | "archived";
export type OrderStatus = "new" | "contacted" | "sourcing" | "completed" | "cancelled";
export type OrderItemKind = "catalogue" | "custom";
export type UploadPurpose = "reference" | "catalogue";
export type UploadState = "pending" | "ready" | "claimed";
export type QuoteState = "draft" | "published" | "superseded" | "revoked";
export type PaymentAttemptStatus =
  | "creating"
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "cancelled"
  | "unknown"
  | "review";
export type WebhookInboxStatus = "received" | "processed" | "failed";

export const UNRESOLVED_ATTEMPT_STATUSES: PaymentAttemptStatus[] = [
  "creating",
  "pending",
  "unknown",
];

export type QuoteRecord = {
  id: string;
  orderId: string;
  revision: number;
  total: number;
  currency: "TZS";
  explanation: string;
  state: QuoteState;
  expiresAt: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentAccessRecord = {
  id: string;
  quoteId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type PaymentAttemptRecord = {
  id: string;
  orderId: string;
  quoteId: string;
  amount: number;
  currency: "TZS";
  status: PaymentAttemptStatus;
  providerSessionRef: string | null;
  providerPaymentRef: string | null;
  providerKey: string;
  requestHash: string;
  checkoutUrl: string | null;
  expiresAt: string | null;
  providerStatus: string | null;
  reconciliationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebhookInboxRecord = {
  id: string;
  eventId: string;
  payloadHash: string;
  eventType: string;
  payload: string;
  status: WebhookInboxStatus;
  error: string | null;
  attempts: number;
  receivedAt: string;
  processedAt: string | null;
};

export type PaymentLedgerRecord = {
  id: string;
  providerPaymentRef: string;
  attemptId: string;
  quoteId: string;
  orderId: string;
  amount: number;
  currency: "TZS";
  completedAt: string;
  createdAt: string;
};

export type PaymentAuditRecord = {
  id: string;
  actorId: string;
  action: string;
  orderId: string | null;
  quoteId: string | null;
  attemptId: string | null;
  createdAt: string;
};

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
