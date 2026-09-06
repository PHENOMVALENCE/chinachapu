import PayActions from "@/components/pay/PayActions";
import { getRepository } from "@/lib/server/db";
import { requirePayScope } from "@/lib/server/payments/access";
import { formatTzs } from "@/lib/server/payments/money";
import { publicAttemptView } from "@/lib/server/payments/sessions";
import { formatStaffDate } from "@/lib/server/timezone";

export const dynamic = "force-dynamic";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const params = await searchParams;
  if (params.invalid) {
    return <p>This payment link is invalid or has expired.</p>;
  }
  let scope;
  try {
    scope = await requirePayScope();
  } catch {
    return <p>This payment link is invalid or has expired.</p>;
  }
  const repo = getRepository();
  const quote = await repo.getQuote(scope.quoteId);
  if (!quote || quote.state !== "published") {
    return <p>This payment link is invalid or has expired.</p>;
  }
  const items = await repo.listOrderItems(quote.orderId);
  const attempts = await repo.listAttemptsForOrder(quote.orderId);
  const paid = attempts.find((item) => item.status === "succeeded");
  const unresolved = await repo.getUnresolvedAttempt(quote.orderId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pay this quote</h1>
      <p className="text-3xl font-semibold">{formatTzs(quote.total)}</p>
      <p className="text-sm text-muted-foreground">Expires {formatStaffDate(quote.expiresAt)}</p>
      <p>{quote.explanation}</p>
      <ul className="text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.id}>
            {item.nameSnapshot} × {item.quantity}
          </li>
        ))}
      </ul>
      <PayActions
        amountLabel={formatTzs(quote.total)}
        paid={Boolean(paid)}
        attempt={paid ? publicAttemptView(paid) : unresolved ? publicAttemptView(unresolved) : null}
      />
    </div>
  );
}
