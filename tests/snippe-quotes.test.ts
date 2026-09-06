import { afterEach, describe, expect, it } from "vitest";
import { getRepository } from "@/lib/server/db";
import { createId } from "@/lib/server/ids";
import { createGuestOrder } from "@/lib/server/services/orders";
import { createAndPublishQuote, exchangeAccessToken, revokeQuote, rotateQuoteAccess } from "@/lib/server/payments/quotes";

async function seedOrder() {
  const result = await createGuestOrder(
    {
      idempotencyKey: createId(),
      customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
      items: [{ kind: "custom", name: "Travel bag", quantity: 1 }],
    },
    "draft"
  );
  const order = (await getRepository().listOrders({ take: 1 })).items[0]!;
  return { result, order };
}

afterEach(async () => {
  await getRepository().resetForTests();
});

describe("quotes", () => {
  it("publishes a TZS quote and exchanges a private token", async () => {
    const { order } = await seedOrder();
    const quote = await createAndPublishQuote({
      orderId: order.id,
      orderVersion: order.version,
      total: 5000,
      explanation: "Agreed tote bag sourcing",
      actorId: "staff-1",
    });
    expect(quote.currency).toBe("TZS");
    const rotated = await rotateQuoteAccess(quote.id, "staff-1");
    const exchanged = await exchangeAccessToken(rotated.token);
    expect(exchanged.quote.id).toBe(quote.id);
  });

  it("rejects low amounts and revoked tokens", async () => {
    const { order } = await seedOrder();
    await expect(
      createAndPublishQuote({
        orderId: order.id,
        orderVersion: order.version,
        total: 100,
        explanation: "Too small",
        actorId: "staff-1",
      })
    ).rejects.toMatchObject({ status: 422 });
    const quote = await createAndPublishQuote({
      orderId: order.id,
      orderVersion: 1,
      total: 5000,
      explanation: "Agreed tote bag sourcing",
      actorId: "staff-1",
    });
    const rotated = await rotateQuoteAccess(quote.id, "staff-1");
    await revokeQuote(quote.id, "staff-1");
    await expect(exchangeAccessToken(rotated.token)).rejects.toMatchObject({ status: 404 });
  });
});
