import { describe, expect, it } from "vitest";
import { rejectMonetaryFields } from "@/lib/validation/fields";
import type { PublicProduct } from "@/lib/server/types";

describe("public catalogue DTO", () => {
  it("has no monetary fields", () => {
    const product: PublicProduct = {
      id: "1",
      name: "Everyday sneakers",
      category: { id: "2", slug: "shoes", name: "Shoes" },
      description: "Size note",
      image: { url: "/catalogue/everyday-sneakers.svg", alt: "White low-top everyday sneakers" },
    };
    expect(rejectMonetaryFields(product)).toEqual([]);
    expect(JSON.stringify(product)).not.toMatch(/price|currency|subtotal|tax|shipping|discount|payment/i);
  });
});
