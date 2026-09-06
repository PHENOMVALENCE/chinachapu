import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/server/adapters/prisma-store";
import { cleanupExpiredUploads } from "@/lib/server/services/uploads";
import { sweepPayments } from "@/lib/server/payments/webhooks";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cleaned = await cleanupExpiredUploads();
  if (process.env.APP_PERSISTENCE === "postgres") {
    await prisma().$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < NOW()`;
  }
  if (process.env.SNIPPE_WEBHOOK_SECRET) await sweepPayments();
  return Response.json({ cleaned }, { headers: { "Cache-Control": "no-store" } });
}
