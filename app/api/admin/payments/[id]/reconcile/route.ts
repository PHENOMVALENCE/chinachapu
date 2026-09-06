import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { reconcileAttempt } from "@/lib/server/payments/webhooks";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    return jsonOk(await reconcileAttempt(id, staff.staffId), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
