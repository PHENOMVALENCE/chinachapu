import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  normalizePhone,
  quantitySchema,
  rejectMonetaryFields,
} from "@/lib/validation/fields";
import { canTransition } from "@/lib/validation/status";

describe("guest validation", () => {
  it("accepts a valid catalogue request", () => {
    const parsed = createOrderSchema.parse({
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      customer: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+255 700 000 000",
      },
      items: [
        {
          kind: "catalogue",
          productId: "22222222-2222-4222-8222-222222222222",
          quantity: 2,
        },
      ],
    });
    expect(parsed.customer.phone).toBe("+255700000000");
  });

  it("rejects blank, fractional, negative, and oversized quantities", () => {
    expect(() => quantitySchema.parse("")).toThrow();
    expect(() => quantitySchema.parse(1.5)).toThrow();
    expect(() => quantitySchema.parse(0)).toThrow();
    expect(() => quantitySchema.parse(-1)).toThrow();
    expect(() => quantitySchema.parse(1000)).toThrow();
  });

  it("normalises phone punctuation", () => {
    expect(normalizePhone("(+255) 700-000-000")).toBe("+255700000000");
  });

  it("rejects monetary fields", () => {
    expect(rejectMonetaryFields({ items: [{ price: 12 }] })).toEqual(["items.0.price"]);
  });
});

describe("status transitions", () => {
  it("allows the documented path and rejects terminal changes", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("contacted", "sourcing")).toBe(true);
    expect(canTransition("sourcing", "completed")).toBe(true);
    expect(canTransition("new", "completed")).toBe(false);
    expect(canTransition("completed", "new")).toBe(false);
    expect(canTransition("cancelled", "new")).toBe(false);
  });
});
