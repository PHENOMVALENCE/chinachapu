import { getRepository } from "../db";
import { AppError } from "../errors";
import { createId, sha256 } from "../ids";
import { getSnippeAdapter } from "../snippe/adapter";
import { SNIPPE_CURRENCY } from "../snippe/config";
import { consumeSnippeBudget } from "../snippe/budget";
import { parseSnippeEvent, type SnippeWebhookEvent } from "../snippe/webhook";
import type { PaymentAttemptRecord } from "../types";

export async function acceptWebhook(rawBody: string, parsed: unknown) {
  const event = parseSnippeEvent(parsed);
  const inserted = await getRepository().insertInbox({
    id: createId(),
    eventId: event.id,
    payloadHash: sha256(rawBody),
    eventType: event.type,
    payload: rawBody,
    status: "received",
    error: null,
    attempts: 0,
    receivedAt: new Date().toISOString(),
    processedAt: null,
  });
  return { event, created: inserted.created };
}

export async function processInboxRecord(id: string) {
  const repo = getRepository();
  const pending = (await repo.listPendingInbox()).find((item) => item.id === id);
  if (!pending) return;
  try {
    const event = parseSnippeEvent(JSON.parse(pending.payload));
    await applyVerifiedEvent(event);
    await repo.updateInbox(id, { status: "processed", processedAt: new Date().toISOString(), error: null });
  } catch (error) {
    await repo.updateInbox(id, {
      status: "failed",
      attempts: pending.attempts + 1,
      error: error instanceof Error ? error.message : "processing failed",
    });
    throw error;
  }
}

export async function processPendingInbox() {
  const records = await getRepository().listPendingInbox();
  for (const record of records) {
    try {
      await processInboxRecord(record.id);
    } catch {
      // leave failed for later sweep
    }
  }
}

async function applyVerifiedEvent(event: SnippeWebhookEvent) {
  const repo = getRepository();
  const attempt = await findAttempt(event);
  if (!attempt) {
    return;
  }
  if (event.type === "payment.completed") {
    await creditIfVerified(attempt, event);
    return;
  }
  if (attempt.status === "succeeded") {
    return;
  }
  if (event.type === "payment.failed") {
    await repo.updateAttempt(attempt.id, { status: "failed", providerStatus: event.data.status ?? "failed" });
  } else if (event.type === "payment.voided") {
    await repo.updateAttempt(attempt.id, { status: "cancelled", providerStatus: event.data.status ?? "voided" });
  } else if (event.type === "payment.expired") {
    await repo.updateAttempt(attempt.id, { status: "expired", providerStatus: event.data.status ?? "expired" });
  }
}

async function findAttempt(event: SnippeWebhookEvent) {
  const repo = getRepository();
  if (event.data.sessionReference) {
    const bySession = await repo.getAttemptBySessionRef(event.data.sessionReference);
    if (bySession) return bySession;
  }
  if (event.data.reference) {
    const byPayment = await repo.getAttemptByPaymentRef(event.data.reference);
    if (byPayment) return byPayment;
  }
  return null;
}

export async function creditIfVerified(attempt: PaymentAttemptRecord, event?: SnippeWebhookEvent) {
  const repo = getRepository();
  const paymentRef = event?.data.reference ?? attempt.providerPaymentRef;
  const sessionRef = event?.data.sessionReference ?? attempt.providerSessionRef;
  if (!paymentRef) {
    await repo.updateAttempt(attempt.id, {
      status: "review",
      reconciliationReason: "Completed event had no payment reference.",
    });
    return;
  }
  consumeSnippeBudget();
  const payment = await getSnippeAdapter().getPayment(paymentRef);
  if (sessionRef) {
    consumeSnippeBudget();
    const session = await getSnippeAdapter().getSession(sessionRef);
    if (session.reference !== sessionRef) {
      await repo.updateAttempt(attempt.id, {
        status: "review",
        providerPaymentRef: paymentRef,
        reconciliationReason: "Session reference did not match the stored attempt.",
      });
      return;
    }
  } else if (!payment.sessionReference || payment.sessionReference !== attempt.providerSessionRef) {
    await repo.updateAttempt(attempt.id, {
      status: "review",
      providerPaymentRef: paymentRef,
      reconciliationReason: "Payment is not linked to the stored session.",
    });
    return;
  }
  const gross = payment.settlementGross ?? payment.amount;
  if (payment.status !== "completed" || payment.currency !== SNIPPE_CURRENCY || gross !== attempt.amount) {
    await repo.updateAttempt(attempt.id, {
      status: "review",
      providerPaymentRef: paymentRef,
      reconciliationReason: "Authenticated lookup did not match the stored TZS gross amount or completed state.",
    });
    return;
  }
  if (attempt.status === "succeeded") {
    await repo.insertLedger({
      id: createId(),
      providerPaymentRef: paymentRef,
      attemptId: attempt.id,
      quoteId: attempt.quoteId,
      orderId: attempt.orderId,
      amount: attempt.amount,
      currency: "TZS",
      completedAt: payment.completedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    return;
  }
  const alreadyPaid = await repo.listLedgerForOrder(attempt.orderId);
  if (alreadyPaid.length > 0 && alreadyPaid[0]?.providerPaymentRef !== paymentRef) {
    await repo.updateAttempt(attempt.id, {
      status: "review",
      providerPaymentRef: paymentRef,
      reconciliationReason: "A later successful payment arrived after the order was already paid.",
    });
    return;
  }
  await repo.insertLedger({
    id: createId(),
    providerPaymentRef: paymentRef,
    attemptId: attempt.id,
    quoteId: attempt.quoteId,
    orderId: attempt.orderId,
    amount: attempt.amount,
    currency: "TZS",
    completedAt: payment.completedAt ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  await repo.updateAttempt(attempt.id, {
    status: "succeeded",
    providerPaymentRef: paymentRef,
    providerStatus: payment.status,
    reconciliationReason: null,
  });
}

export async function reconcileAttempt(attemptId: string, actorId: string) {
  const repo = getRepository();
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt) throw new AppError(404, "NOT_FOUND", "Payment attempt not found.");
  if (attempt.providerSessionRef) {
    consumeSnippeBudget();
    const session = await getSnippeAdapter().getSession(attempt.providerSessionRef);
    await repo.updateAttempt(attempt.id, { providerStatus: session.status, providerSessionRef: session.reference });
    if (session.status === "completed" && session.paymentReference) {
      await creditIfVerified(
        { ...attempt, providerPaymentRef: session.paymentReference },
        { id: "reconcile", type: "payment.completed", data: { reference: session.paymentReference, sessionReference: session.reference } }
      );
    }
  } else if (attempt.status === "unknown") {
    await repo.updateAttempt(attempt.id, {
      reconciliationReason: "Session create result is unknown. Session idempotency is not documented; do not create another session automatically.",
    });
  }
  await repo.addPaymentAudit({
    id: createId(),
    actorId,
    action: "payment.reconciled",
    orderId: attempt.orderId,
    quoteId: attempt.quoteId,
    attemptId: attempt.id,
    createdAt: new Date().toISOString(),
  });
  return repo.getAttempt(attemptId);
}

export async function sweepPayments() {
  await processPendingInbox();
  const attempts = await getRepository().listSweepAttempts();
  for (const attempt of attempts) {
    if (attempt.providerSessionRef) {
      try {
        await reconcileAttempt(attempt.id, "system");
      } catch {
        // keep unresolved
      }
    }
  }
}
