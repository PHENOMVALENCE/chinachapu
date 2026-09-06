import { afterEach, describe, expect, it } from "vitest";
import { getRepository } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { createId, sha256 } from "@/lib/server/ids";
import { completeUpload } from "@/lib/server/services/uploads";
import { createGuestOrder } from "@/lib/server/services/orders";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

afterEach(async () => {
  await getRepository().resetForTests();
});

describe("upload ownership", () => {
  it("rejects another draft's upload id", async () => {
    const repo = getRepository();
    await repo.createUpload({
      id: "33333333-3333-4333-8333-333333333333",
      storageKey: "reference/test.webp",
      purpose: "reference",
      ownerHash: sha256("other-draft"),
      mime: "image/webp",
      bytes: 100,
      width: 1,
      height: 1,
      state: "ready",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      orderItemId: null,
      createdAt: new Date().toISOString(),
    });
    await expect(
      createGuestOrder(
        {
          idempotencyKey: createId(),
          customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+255700000000" },
          items: [
            {
              kind: "custom",
              name: "Travel bag",
              quantity: 1,
              uploadId: "33333333-3333-4333-8333-333333333333",
            },
          ],
        },
        "my-draft"
      )
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects SVG content", async () => {
    const repo = getRepository();
    const id = createId();
    await repo.createUpload({
      id,
      storageKey: "reference/pending.svg",
      purpose: "reference",
      ownerHash: sha256("draft"),
      mime: "image/png",
      bytes: 20,
      width: null,
      height: null,
      state: "pending",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      orderItemId: null,
      createdAt: new Date().toISOString(),
    });
    await expect(
      completeUpload(id, "draft", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), "reference")
    ).rejects.toMatchObject({ status: 415 });
  });

  it("accepts a tiny PNG", async () => {
    const repo = getRepository();
    const id = createId();
    await repo.createUpload({
      id,
      storageKey: "reference/pending.png",
      purpose: "reference",
      ownerHash: sha256("draft"),
      mime: "image/png",
      bytes: png.byteLength,
      width: null,
      height: null,
      state: "pending",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      orderItemId: null,
      createdAt: new Date().toISOString(),
    });
    const completed = await completeUpload(id, "draft", png, "reference");
    expect(completed.state).toBe("ready");
    expect(completed.mime).toBe("image/webp");
  });
});
