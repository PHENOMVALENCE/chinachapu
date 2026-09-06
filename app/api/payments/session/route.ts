import { getClientIp, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { requirePayScope } from "@/lib/server/payments/access";
import { publicAttemptView, startOrResumePayment } from "@/lib/server/payments/sessions";
import { limitPaySession } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await limitPaySession(getClientIp(request));
    const scope = await requirePayScope();
    const attempt = await startOrResumePayment(scope.quoteId);
    return jsonOk(publicAttemptView(attempt), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
