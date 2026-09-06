import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { rotateQuoteAccess } from "@/lib/server/payments/quotes";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    const result = await rotateQuoteAccess(id, staff.staffId);
    return jsonOk(
      {
        quoteId: result.quote.id,
        path: `/pay/${result.token}`,
      },
      201,
      true
    );
  } catch (error) {
    return jsonError(error);
  }
}
