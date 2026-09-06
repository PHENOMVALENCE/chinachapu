import { jsonError } from "@/lib/server/http";
import { acceptWebhook, processInboxRecord } from "@/lib/server/payments/webhooks";
import { requireWebhookSecret } from "@/lib/server/snippe/config";
import { verifySnippeSignature } from "@/lib/server/snippe/webhook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    verifySnippeSignature({
      rawBody: raw,
      timestamp: request.headers.get("x-webhook-timestamp"),
      signature: request.headers.get("x-webhook-signature"),
      secret: requireWebhookSecret(),
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON." } }, { status: 400 });
    }
    const accepted = await acceptWebhook(raw, parsed);
    if (accepted.created) {
      // Process after durable insert. Failures stay in the inbox for sweep.
      const pending = await (await import("@/lib/server/db")).getRepository().listPendingInbox();
      const latest = pending.find((item) => item.eventId === accepted.event.id);
      if (latest) {
        try {
          await processInboxRecord(latest.id);
        } catch {
          // already marked failed
        }
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}
