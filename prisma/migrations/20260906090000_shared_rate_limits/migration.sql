CREATE TABLE "RateLimit" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit" ("resetAt");
