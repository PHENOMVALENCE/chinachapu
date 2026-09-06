import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, LIMITS } from "./limits";

export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[^\d+]/g, "");
  const plus = compact.startsWith("+") ? "+" : "";
  const digits = compact.replace(/\D/g, "");
  return `${plus}${digits}`;
}

export const nameSchema = z
  .string()
  .trim()
  .min(LIMITS.name.min, "Enter a name between 2 and 100 characters.")
  .max(LIMITS.name.max, "Enter a name between 2 and 100 characters.");

export const emailSchema = z
  .string()
  .trim()
  .max(LIMITS.email.max, "Enter a valid email address.")
  .email("Enter a valid email address.");

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return (
      digits.length >= LIMITS.phoneDigits.min &&
      digits.length <= LIMITS.phoneDigits.max &&
      (value.startsWith("+") ? value.slice(1) === digits : value === digits)
    );
  }, "Enter a phone number with 7 to 15 digits.");

export const quantitySchema = z.coerce
  .number({ error: "Enter a whole number from 1 to 999." })
  .int("Enter a whole number from 1 to 999.")
  .min(LIMITS.quantity.min, "Enter a whole number from 1 to 999.")
  .max(LIMITS.quantity.max, "Enter a whole number from 1 to 999.");

export const customNameSchema = z
  .string()
  .trim()
  .min(LIMITS.customName.min, "Enter a product name between 2 and 150 characters.")
  .max(LIMITS.customName.max, "Enter a product name between 2 and 150 characters.");

export const descriptionSchema = z
  .string()
  .trim()
  .max(LIMITS.description.max, "Keep notes to 2,000 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const uuidSchema = z.string().uuid("Enter a valid identifier.");

const forbiddenMoneyKeys = [
  "price",
  "currency",
  "subtotal",
  "tax",
  "shipping",
  "discount",
  "total",
  "payment",
] as const;

export function rejectMonetaryFields(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const errors: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (forbiddenMoneyKeys.includes(key as (typeof forbiddenMoneyKeys)[number])) {
      errors.push(nextPath);
    }
    if (nested && typeof nested === "object") {
      errors.push(...rejectMonetaryFields(nested, nextPath));
    }
  }
  return errors;
}

export const customerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const catalogueItemSchema = z
  .object({
    kind: z.literal("catalogue"),
    productId: uuidSchema,
    quantity: quantitySchema,
    description: descriptionSchema,
    uploadId: uuidSchema.optional(),
  })
  .strict();

export const customItemSchema = z
  .object({
    kind: z.literal("custom"),
    name: customNameSchema,
    quantity: quantitySchema,
    description: descriptionSchema,
    categoryId: uuidSchema.optional(),
    uploadId: uuidSchema.optional(),
  })
  .strict();

export const orderItemSchema = z.discriminatedUnion("kind", [
  catalogueItemSchema,
  customItemSchema,
]);

export const createOrderSchema = z
  .object({
    idempotencyKey: uuidSchema,
    customer: customerSchema,
    items: z
      .array(orderItemSchema)
      .min(LIMITS.requestLines.min, "Add at least one item.")
      .max(LIMITS.requestLines.max, "Requests can include at most 20 items."),
  })
  .strict();

export const staffNoteSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Enter a note.")
      .max(LIMITS.description.max, "Keep notes to 2,000 characters or fewer."),
  })
  .strict();

export const orderStatusSchema = z.enum([
  "new",
  "contacted",
  "sourcing",
  "completed",
  "cancelled",
]);

export const patchOrderSchema = z
  .object({
    status: orderStatusSchema,
    version: z.number().int().min(1),
  })
  .strict();

export const productStateSchema = z.enum(["draft", "active", "archived"]);

export const upsertProductSchema = z
  .object({
    name: customNameSchema.optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(150)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase hyphenated slug.")
      .optional(),
    categoryId: uuidSchema.optional(),
    description: descriptionSchema,
    imageAssetId: uuidSchema.optional().nullable(),
    altText: z.string().trim().max(200).optional(),
    state: productStateSchema.optional(),
    version: z.number().int().min(1).optional(),
  })
  .strict();

export const uploadAuthoriseSchema = z
  .object({
    filename: z.string().trim().min(1).max(200),
    type: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
    size: z
      .number()
      .int()
      .positive()
      .max(LIMITS.imageBytes, "Images must be 4 MiB or smaller."),
  })
  .strict();

export function flattenZodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}
