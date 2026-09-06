"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type AttemptView = {
  status: string;
  checkoutUrl: string | null;
  reason: string | null;
};

export default function PayActions({
  amountLabel,
  paid,
  attempt,
}: {
  amountLabel: string;
  paid: boolean;
  attempt: AttemptView | null;
}) {
  const [current, setCurrent] = useState(attempt);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (paid || current?.status === "succeeded") {
    return <p role="status">Payment received. Staff will continue fulfilment separately.</p>;
  }

  async function pay() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/payments/session", { method: "POST" });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Payment could not start.");
      return;
    }
    setCurrent(payload);
    if (payload.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
    }
  }

  return (
    <div className="space-y-3">
      {current ? (
        <p role="status">
          Status: {current.status}
          {current.reason ? ` — ${current.reason}` : ""}
        </p>
      ) : null}
      {current?.status === "unknown" || current?.status === "review" ? (
        <p>This payment needs staff review. Do not start another checkout yet.</p>
      ) : current?.status === "pending" && current.checkoutUrl ? (
        <Button asChild>
          <a href={current.checkoutUrl}>Continue to checkout</a>
        </Button>
      ) : current?.status === "failed" || current?.status === "expired" || current?.status === "cancelled" ? (
        <p>That attempt did not complete. Ask staff to publish a new quote if you still want to pay.</p>
      ) : (
        <Button type="button" onClick={pay} disabled={pending}>
          {pending ? "Starting…" : `Pay ${amountLabel}`}
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
