import { afterEach, describe, expect, it } from "vitest";
import { getRepository } from "@/lib/server/db";
import { createId } from "@/lib/server/ids";
import { createGuestOrder } from "@/lib/server/services/orders";
import { patchAdminOrder } from "@/lib/server/services/admin";

const draft = "draft-owner-token";

async function seedProduct() {
  const repo = getRepository();
  const categoryId = createId();
  await repo.upsertCategories([
    { id: categoryId, slug: "shoes", name: "Shoes", sortOrder: 1 },
  ]);
  const now = new Date().toISOString();
  const product = await repo.createProduct({
    id: createId(),
    slug: `sneakers-${createId()}`,
    name: "Everyday sneakers",
    categoryId,
    description: null,
    imageAssetId: null,
    altText: "White sneakers",
    state: "active",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  return product;
}

afterEach(async () => {
  await getRepository().resetForTests();
});

describe("order creation", () => {
  it("creates a durable catalogue request", async () => {
    const product = await seedProduct();
    const key = createId();
    const result = await createGuestOrder(
      {
        idempotencyKey: key,
        customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
        items: [{ kind: "catalogue", productId: product.id, quantity: 2 }],
      },
      draft
    );
    expect(result.reference).toMatch(/^CC-/);
    const stored = await getRepository().getOrderByIdempotencyKey(key);
    expect(stored?.name).toBe("Ada Lovelace");
    const items = await getRepository().listOrderItems(stored!.id);
    expect(items[0]?.quantity).toBe(2);
    expect(items[0]?.nameSnapshot).toBe("Everyday sneakers");
  });

  it("accepts a custom-only request", async () => {
    const result = await createGuestOrder(
      {
        idempotencyKey: createId(),
        customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "0700000000" },
        items: [{ kind: "custom", name: "Travel bag", quantity: 1 }],
      },
      draft
    );
    expect(result.status).toBe("new");
  });

  it("replays identical idempotency keys and conflicts on changes", async () => {
    const payload = {
      customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
      items: [{ kind: "custom" as const, name: "Travel bag", quantity: 1 }],
    };
    const key = createId();
    const first = await createGuestOrder({ idempotencyKey: key, ...payload }, draft);
    const second = await createGuestOrder({ idempotencyKey: key, ...payload }, draft);
    expect(second.reference).toBe(first.reference);
    await expect(
      createGuestOrder(
        { idempotencyKey: key, ...payload, items: [{ kind: "custom", name: "Other bag", quantity: 1 }] },
        draft
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects archived catalogue products", async () => {
    const product = await seedProduct();
    await getRepository().updateProduct(product.id, 1, { state: "archived" });
    await expect(
      createGuestOrder(
        {
          idempotencyKey: createId(),
          customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
          items: [{ kind: "catalogue", productId: product.id, quantity: 1 }],
        },
        draft
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("records valid status changes and rejects invalid or stale versions", async () => {
    const created = await createGuestOrder(
      {
        idempotencyKey: createId(),
        customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
        items: [{ kind: "custom", name: "Travel bag", quantity: 1 }],
      },
      draft
    );
    const order = await getRepository().getOrderByIdempotencyKey(
      (await getRepository().listOrders({ take: 1 })).items[0]!.idempotencyKey
    );
    expect(order?.reference).toBe(created.reference);
    const updated = await patchAdminOrder(order!.id, { status: "contacted", version: 1 }, "staff-1");
    expect(updated.status).toBe("contacted");
    await expect(patchAdminOrder(order!.id, { status: "completed", version: 2 }, "staff-1")).rejects.toMatchObject({
      status: 409,
    });
    await expect(patchAdminOrder(order!.id, { status: "contacted", version: 1 }, "staff-1")).rejects.toMatchObject({
      status: 409,
    });
  });
});
