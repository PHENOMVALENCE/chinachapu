import { randomBytes } from "node:crypto";
import { SNIPPE_MIN_AMOUNT } from "../snippe/config";
import { getRepository } from "../db";
import { AppError } from "../errors";
import { createId, sha256 } from "../ids";
import type { QuoteRecord } from "../types";

const QUOTE_MS = 7 * 24 * 60 * 60 * 1000;

export async function createAndPublishQuote(input: {
  orderId: string;
  orderVersion: number;
  total: number;
  explanation: string;
  expiresAt?: string;
  actorId: string;
}) {
  if (!Number.isInteger(input.total) || input.total < SNIPPE_MIN_AMOUNT) {
    throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      total: `Enter a whole TZS amount of at least ${SNIPPE_MIN_AMOUNT}.`,
    });
  }
  const explanation = input.explanation.trim();
  if (explanation.length < 2 || explanation.length > 500) {
    throw new AppError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      explanation: "Enter a short customer-visible explanation.",
    });
  }
  const repo = getRepository();
  const order = await repo.getOrder(input.orderId);
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found.");
  if (order.status === "cancelled" || order.status === "completed") {
    throw new AppError(409, "CONFLICT", "Quotes cannot be created for a terminal order.");
  }
  if (order.version !== input.orderVersion) {
    throw new AppError(409, "CONFLICT", "This order was updated by someone else. Refresh and try again.");
  }
  const unresolved = await repo.getUnresolvedAttempt(order.id);
  if (unresolved) {
    throw new AppError(409, "CONFLICT", "Reconcile the outstanding payment attempt before changing the quote.");
  }
  const existing = await repo.listQuotesForOrder(order.id);
  for (const quote of existing.filter((item) => item.state === "published")) {
    await repo.updateQuote(quote.id, { state: "superseded" });
  }
  const now = new Date();
  const quote = await repo.createQuote({
    id: createId(),
    orderId: order.id,
    revision: existing.length + 1,
    total: input.total,
    currency: "TZS",
    explanation,
    state: "published",
    expiresAt: input.expiresAt ?? new Date(now.getTime() + QUOTE_MS).toISOString(),
    actorId: input.actorId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  await repo.addPaymentAudit({
    id: createId(),
    actorId: input.actorId,
    action: "quote.published",
    orderId: order.id,
    quoteId: quote.id,
    attemptId: null,
    createdAt: now.toISOString(),
  });
  return quote;
}

export async function rotateQuoteAccess(quoteId: string, actorId: string) {
  const repo = getRepository();
  const quote = await requirePublishedQuote(quoteId);
  const current = await repo.listPaymentAccess(quote.id);
  for (const item of current.filter((entry) => !entry.revokedAt)) {
    await repo.revokePaymentAccess(item.id);
  }
  const raw = randomBytes(24).toString("base64url");
  const access = await repo.createPaymentAccess({
    id: createId(),
    quoteId: quote.id,
    tokenHash: sha256(raw),
    expiresAt: quote.expiresAt,
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });
  await repo.addPaymentAudit({
    id: createId(),
    actorId,
    action: "quote.access_rotated",
    orderId: quote.orderId,
    quoteId: quote.id,
    attemptId: null,
    createdAt: new Date().toISOString(),
  });
  return { quote, accessId: access.id, token: raw };
}

export async function revokeQuote(quoteId: string, actorId: string) {
  const repo = getRepository();
  const quote = await repo.getQuote(quoteId);
  if (!quote) throw new AppError(404, "NOT_FOUND", "Quote not found.");
  const unresolved = await repo.getUnresolvedAttempt(quote.orderId);
  if (unresolved) {
    throw new AppError(409, "CONFLICT", "Reconcile the outstanding payment attempt before revoking.");
  }
  await repo.updateQuote(quote.id, { state: "revoked" });
  const access = await repo.listPaymentAccess(quote.id);
  for (const item of access.filter((entry) => !entry.revokedAt)) {
    await repo.revokePaymentAccess(item.id);
  }
  await repo.addPaymentAudit({
    id: createId(),
    actorId,
    action: "quote.revoked",
    orderId: quote.orderId,
    quoteId: quote.id,
    attemptId: null,
    createdAt: new Date().toISOString(),
  });
}

export async function requirePublishedQuote(quoteId: string): Promise<QuoteRecord> {
  const quote = await getRepository().getQuote(quoteId);
  if (!quote || quote.state !== "published") {
    throw new AppError(404, "NOT_FOUND", "This payment link is invalid or has expired.");
  }
  if (new Date(quote.expiresAt).getTime() <= Date.now()) {
    throw new AppError(409, "CONFLICT", "This quote has expired.");
  }
  return quote;
}

export async function exchangeAccessToken(rawToken: string) {
  const repo = getRepository();
  const access = await repo.getPaymentAccessByHash(sha256(rawToken));
  if (!access || access.revokedAt || new Date(access.expiresAt).getTime() <= Date.now()) {
    throw new AppError(404, "NOT_FOUND", "This payment link is invalid or has expired.");
  }
  const quote = await requirePublishedQuote(access.quoteId);
  return { quote, access };
}
