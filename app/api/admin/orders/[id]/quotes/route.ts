import { requireStaff } from "@/lib/server/auth";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { createAndPublishQuote } from "@/lib/server/payments/quotes";
import { z } from "zod";

const schema = z
  .object({
    version: z.number().int().min(1),
    total: z.number().int(),
    explanation: z.string(),
    expiresAt: z.string().optional(),
  })
  .strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    guardUnexpectedMoney(body);
    const quote = await createAndPublishQuote({
      orderId: id,
      orderVersion: body.version,
      total: body.total,
      explanation: body.explanation,
      expiresAt: body.expiresAt,
      actorId: staff.staffId,
    });
    return jsonOk(quote, 201, true);
  } catch (error) {
    return jsonError(error);
  }
}
