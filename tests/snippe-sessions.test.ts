import { afterEach, describe, expect, it, vi } from "vitest";
import { getRepository } from "@/lib/server/db";
import { createId } from "@/lib/server/ids";
import { createAndPublishQuote } from "@/lib/server/payments/quotes";
import { startOrResumePayment } from "@/lib/server/payments/sessions";
import { acceptWebhook, processPendingInbox } from "@/lib/server/payments/webhooks";
import { createGuestOrder } from "@/lib/server/services/orders";
import { createSnippeAdapter, setSnippeAdapterForTests } from "@/lib/server/snippe/adapter";
import { SnippeTransportError, type SnippeTransport } from "@/lib/server/snippe/types";

async function seedQuote() {
  await createGuestOrder(
    {
      idempotencyKey: createId(),
      customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
      items: [{ kind: "custom", name: "Travel bag", quantity: 1 }],
    },
    "draft"
  );
  const order = (await getRepository().listOrders({ take: 1 })).items[0]!;
  const quote = await createAndPublishQuote({
    orderId: order.id,
    orderVersion: order.version,
    total: 5000,
    explanation: "Agreed tote",
    actorId: "staff-1",
  });
  return { order, quote };
}

afterEach(async () => {
  setSnippeAdapterForTests(undefined);
  await getRepository().resetForTests();
  delete process.env.SNIPPE_ENABLED;
});

describe("payment attempts", () => {
  it("blocks initiation when the feature flag is off", async () => {
    process.env.SNIPPE_ENABLED = "false";
    const { quote } = await seedQuote();
    await expect(startOrResumePayment(quote.id)).rejects.toMatchObject({ status: 409 });
  });

  it("reuses an unresolved attempt and does not recreate after an unknown create", async () => {
    process.env.SNIPPE_ENABLED = "true";
    process.env.SNIPPE_API_KEY = "snp_test";
    const transport: SnippeTransport = {
      request: vi.fn(async () => {
        throw new SnippeTransportError(503, "timeout");
      }),
    };
    setSnippeAdapterForTests(createSnippeAdapter(transport));
    const { quote, order } = await seedQuote();
    const first = await startOrResumePayment(quote.id);
    expect(first.status).toBe("unknown");
    const second = await startOrResumePayment(quote.id);
    expect(second.id).toBe(first.id);
    expect(transport.request).toHaveBeenCalledTimes(1);
    const unresolved = await getRepository().getUnresolvedAttempt(order.id);
    expect(unresolved?.id).toBe(first.id);
  });

  it("credits only after authenticated lookup matches session, gross, and TZS", async () => {
    process.env.SNIPPE_ENABLED = "true";
    process.env.SNIPPE_API_KEY = "snp_test";
    const { quote } = await seedQuote();
    const transport: SnippeTransport = {
      async request({ method, path }) {
        if (method === "POST" && path === "/api/v1/sessions") {
          return {
            status: 201,
            headers: {},
            body: {
              data: {
                reference: "sess_1",
                status: "pending",
                amount: 5000,
                currency: "TZS",
                checkout_url: "https://snippe.me/checkout/abc",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
            },
          };
        }
        if (path === "/api/v1/sessions/sess_1") {
          return {
            status: 200,
            headers: {},
            body: { data: { reference: "sess_1", status: "completed", amount: 5000, currency: "TZS", checkout_url: "https://snippe.me/checkout/abc", payment_reference: "pi_1" } },
          };
        }
        if (path === "/v1/payments/pi_1") {
          return {
            status: 200,
            headers: {},
            body: {
              data: {
                reference: "pi_1",
                status: "completed",
                session_reference: "sess_1",
                amount: { value: 5000, currency: "TZS" },
                settlement: { gross: { value: 5000, currency: "TZS" }, net: { value: 4900, currency: "TZS" } },
                completed_at: new Date().toISOString(),
              },
            },
          };
        }
        throw new Error(path);
      },
    };
    setSnippeAdapterForTests(createSnippeAdapter(transport));
    const attempt = await startOrResumePayment(quote.id);
    expect(attempt.checkoutUrl).toBe("https://snippe.me/checkout/abc");
    const payload = {
      id: "evt_ok",
      type: "payment.completed",
      data: {
        reference: "pi_1",
        session_reference: "sess_1",
        status: "completed",
        amount: { value: 5000, currency: "TZS" },
      },
    };
    await acceptWebhook(JSON.stringify(payload), payload);
    await processPendingInbox();
    const ledger = await getRepository().listLedgerForOrder(attempt.orderId);
    expect(ledger).toHaveLength(1);
    const updated = await getRepository().getAttempt(attempt.id);
    expect(updated?.status).toBe("succeeded");
  });

  it("sends wrong-amount events to review and does not mark paid", async () => {
    process.env.SNIPPE_ENABLED = "true";
    process.env.SNIPPE_API_KEY = "snp_test";
    const { quote } = await seedQuote();
    setSnippeAdapterForTests(
      createSnippeAdapter({
        async request({ method, path }) {
          if (method === "POST") {
            return {
              status: 201,
              headers: {},
              body: {
                data: {
                  reference: "sess_2",
                  status: "pending",
                  amount: 5000,
                  currency: "TZS",
                  checkout_url: "https://snippe.me/checkout/xyz",
                },
              },
            };
          }
          if (path.includes("/sessions/")) {
            return { status: 200, headers: {}, body: { data: { reference: "sess_2", status: "completed", amount: 5000, currency: "TZS", checkout_url: "https://snippe.me/checkout/xyz" } } };
          }
          return {
            status: 200,
            headers: {},
            body: {
              data: {
                reference: "pi_wrong",
                status: "completed",
                session_reference: "sess_2",
                amount: { value: 1000, currency: "TZS" },
                settlement: { gross: { value: 1000, currency: "TZS" } },
              },
            },
          };
        },
      })
    );
    const attempt = await startOrResumePayment(quote.id);
    const payload = {
      id: "evt_wrong",
      type: "payment.completed",
      data: { reference: "pi_wrong", session_reference: "sess_2", status: "completed", amount: { value: 1000, currency: "TZS" } },
    };
    await acceptWebhook(JSON.stringify(payload), payload);
    await processPendingInbox();
    expect((await getRepository().getAttempt(attempt.id))?.status).toBe("review");
    expect(await getRepository().listLedgerForOrder(attempt.orderId)).toHaveLength(0);
  });
});
