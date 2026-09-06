import { randomBytes } from "node:crypto";
import { getRepository } from "../db";
import { AppError } from "../errors";
import { createId, hashRequestPayload } from "../ids";
import {
  assertAllowedCheckoutUrl,
  assertHttpsCallback,
  getSnippeConfig,
  isSnippeInitiationEnabled,
} from "../snippe/config";
import { getSnippeAdapter } from "../snippe/adapter";
import { consumeSnippeBudget } from "../snippe/budget";
import { SnippeTransportError } from "../snippe/types";
import { requirePublishedQuote } from "./quotes";
import type { PaymentAttemptRecord } from "../types";

function providerKey() {
  return `cc${randomBytes(10).toString("hex")}`.slice(0, 30);
}

export async function startOrResumePayment(quoteId: string) {
  const repo = getRepository();
  const quote = await requirePublishedQuote(quoteId);
  const order = await repo.getOrder(quote.orderId);
  if (!order || order.status === "cancelled") {
    throw new AppError(409, "CONFLICT", "This order can no longer be paid.");
  }
  const paid = await repo.listLedgerForOrder(order.id);
  if (paid.length > 0) {
    throw new AppError(409, "CONFLICT", "This quote has already been paid.");
  }
  const existing = await repo.getUnresolvedAttempt(order.id);
  if (existing) {
    return existing;
  }
  if (!isSnippeInitiationEnabled()) {
    throw new AppError(409, "CONFLICT", "Payment initiation is currently disabled.");
  }
  const config = getSnippeConfig();
  const allowLocal = process.env.NODE_ENV !== "production";
  assertHttpsCallback(config.webhookUrl, allowLocal);
  const request = {
    amount: quote.total,
    currency: "TZS" as const,
    description: `ChinaChapu quote ${quote.revision}`,
    customer: { name: order.name, phone: order.phone, email: order.email },
    redirectUrl: `${config.appUrl.replace(/\/$/, "")}/pay/return`,
    webhookUrl: config.webhookUrl,
    expiresIn: 3600,
    metadata: {
      orderId: order.id,
      quoteId: quote.id,
      revision: String(quote.revision),
    },
  };
  const now = new Date().toISOString();
  const attempt = await repo.createAttempt({
    id: createId(),
    orderId: order.id,
    quoteId: quote.id,
    amount: quote.total,
    currency: "TZS",
    status: "creating",
    providerSessionRef: null,
    providerPaymentRef: null,
    providerKey: providerKey(),
    requestHash: hashRequestPayload(request),
    checkoutUrl: null,
    expiresAt: null,
    providerStatus: null,
    reconciliationReason: null,
    createdAt: now,
    updatedAt: now,
  });
  try {
    consumeSnippeBudget();
    const session = await getSnippeAdapter().createSession(request);
    assertAllowedCheckoutUrl(session.checkoutUrl);
    return repo.updateAttempt(attempt.id, {
      status: "pending",
      providerSessionRef: session.reference,
      checkoutUrl: session.checkoutUrl,
      expiresAt: session.expiresAt,
      providerStatus: session.status,
    });
  } catch (error) {
    if (error instanceof SnippeTransportError && error.status >= 500) {
      return repo.updateAttempt(attempt.id, {
        status: "unknown",
        reconciliationReason: "Provider create timed out or returned a server error. Do not create another session.",
      });
    }
    if (error instanceof SnippeTransportError && error.status === 429) {
      return repo.updateAttempt(attempt.id, {
        status: "unknown",
        reconciliationReason: "Provider rate-limited session creation. Reconcile before retrying.",
      });
    }
    await repo.updateAttempt(attempt.id, {
      status: "failed",
      reconciliationReason: "Provider rejected session creation.",
    });
    throw error;
  }
}

export function publicAttemptView(attempt: PaymentAttemptRecord) {
  return {
    status: attempt.status,
    amount: attempt.amount,
    currency: attempt.currency,
    checkoutUrl: attempt.status === "pending" ? attempt.checkoutUrl : null,
    reason: attempt.status === "review" || attempt.status === "unknown" ? attempt.reconciliationReason : null,
  };
}
