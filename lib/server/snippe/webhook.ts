import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors";
import { WEBHOOK_SKEW_SECONDS } from "./config";

export function verifySnippeSignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}) {
  if (!input.timestamp || !/^\d+$/.test(input.timestamp)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook timestamp.");
  }
  if (!input.signature || !/^[0-9a-f]{64}$/i.test(input.signature)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook signature.");
  }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const eventTime = Number(input.timestamp);
  if (Math.abs(now - eventTime) > WEBHOOK_SKEW_SECONDS) {
    throw new AppError(400, "VALIDATION_ERROR", "Webhook timestamp is outside the allowed window.");
  }
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(input.signature, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook signature.");
  }
}

export type SnippeWebhookEvent = {
  id: string;
  type: string;
  apiVersion?: string;
  data: {
    reference?: string;
    sessionReference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    gross?: number;
    completedAt?: string;
    metadata?: Record<string, unknown>;
  };
};

export function parseSnippeEvent(body: unknown): SnippeWebhookEvent {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook payload.");
  }
  const root = body as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>;
  const amount = data.amount && typeof data.amount === "object" ? (data.amount as Record<string, unknown>) : {};
  const settlement = data.settlement && typeof data.settlement === "object" ? (data.settlement as Record<string, unknown>) : {};
  const gross = settlement.gross && typeof settlement.gross === "object" ? (settlement.gross as Record<string, unknown>) : {};
  const id = typeof root.id === "string" ? root.id : "";
  const type = typeof root.type === "string" ? root.type : "";
  if (!id || !type) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook payload.");
  }
  return {
    id,
    type,
    apiVersion: typeof root.api_version === "string" ? root.api_version : undefined,
    data: {
      reference: typeof data.reference === "string" ? data.reference : undefined,
      sessionReference: typeof data.session_reference === "string" ? data.session_reference : undefined,
      status: typeof data.status === "string" ? data.status : undefined,
      amount: typeof amount.value === "number" ? amount.value : undefined,
      currency: typeof amount.currency === "string" ? amount.currency : undefined,
      gross: typeof gross.value === "number" ? gross.value : undefined,
      completedAt: typeof data.completed_at === "string" ? data.completed_at : undefined,
      metadata: data.metadata && typeof data.metadata === "object" ? (data.metadata as Record<string, unknown>) : undefined,
    },
  };
}
