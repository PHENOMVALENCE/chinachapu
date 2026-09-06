import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { revokeQuote } from "@/lib/server/payments/quotes";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    await revokeQuote(id, staff.staffId);
    return jsonOk({ ok: true }, 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
