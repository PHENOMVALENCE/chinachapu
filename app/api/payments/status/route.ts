import { getRepository } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requirePayScope } from "@/lib/server/payments/access";
import { publicAttemptView } from "@/lib/server/payments/sessions";

export async function GET() {
  try {
    const scope = await requirePayScope();
    const quote = await getRepository().getQuote(scope.quoteId);
    const attempt = quote ? await getRepository().getUnresolvedAttempt(quote.orderId) : null;
    const attempts = quote ? await getRepository().listAttemptsForOrder(quote.orderId) : [];
    const paid = attempts.find((item) => item.status === "succeeded");
    return jsonOk(
      {
        status: paid?.status ?? attempt?.status ?? "none",
        view: paid ? publicAttemptView(paid) : attempt ? publicAttemptView(attempt) : null,
      },
      200,
      true
    );
  } catch (error) {
    return jsonError(error);
  }
}
