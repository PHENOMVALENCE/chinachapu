CREATE TYPE "QuoteState" AS ENUM ('draft', 'published', 'superseded', 'revoked');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('creating', 'pending', 'succeeded', 'failed', 'expired', 'cancelled', 'unknown', 'review');
CREATE TYPE "WebhookInboxStatus" AS ENUM ('received', 'processed', 'failed');

CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "explanation" TEXT NOT NULL,
    "state" "QuoteState" NOT NULL DEFAULT 'draft',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Quote_total_min" CHECK ("total" >= 500),
    CONSTRAINT "Quote_currency_tzs" CHECK ("currency" = 'TZS')
);

CREATE TABLE "PaymentAccess" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" "PaymentAttemptStatus" NOT NULL,
    "providerSessionRef" TEXT,
    "providerPaymentRef" TEXT,
    "providerKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "providerStatus" TEXT,
    "reconciliationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentAttempt_amount_frozen" CHECK ("amount" >= 500 AND "currency" = 'TZS')
);

CREATE TABLE "WebhookInbox" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "WebhookInboxStatus" NOT NULL DEFAULT 'received',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "WebhookInbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLedger" (
    "id" UUID NOT NULL,
    "providerPaymentRef" TEXT NOT NULL,
    "attemptId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAudit" (
    "id" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "orderId" TEXT,
    "quoteId" TEXT,
    "attemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quote_orderId_revision_key" ON "Quote"("orderId", "revision");
CREATE INDEX "Quote_orderId_state_idx" ON "Quote"("orderId", "state");
CREATE UNIQUE INDEX "PaymentAccess_tokenHash_key" ON "PaymentAccess"("tokenHash");
CREATE INDEX "PaymentAccess_quoteId_idx" ON "PaymentAccess"("quoteId");
CREATE UNIQUE INDEX "PaymentAttempt_providerSessionRef_key" ON "PaymentAttempt"("providerSessionRef");
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentRef_key" ON "PaymentAttempt"("providerPaymentRef");
CREATE UNIQUE INDEX "PaymentAttempt_providerKey_key" ON "PaymentAttempt"("providerKey");
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");
CREATE UNIQUE INDEX "PaymentAttempt_unresolved_order" ON "PaymentAttempt"("orderId") WHERE "status" IN ('creating', 'pending', 'unknown');
CREATE UNIQUE INDEX "WebhookInbox_eventId_key" ON "WebhookInbox"("eventId");
CREATE UNIQUE INDEX "PaymentLedger_providerPaymentRef_key" ON "PaymentLedger"("providerPaymentRef");
CREATE INDEX "PaymentAudit_orderId_idx" ON "PaymentAudit"("orderId");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAccess" ADD CONSTRAINT "PaymentAccess_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
