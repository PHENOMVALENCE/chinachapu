"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuotePanel({
  orderId,
  version,
  quotes,
  attempts,
}: {
  orderId: string;
  version: number;
  quotes: Array<{ id: string; revision: number; total: number; state: string; explanation: string }>;
  attempts: Array<{ id: string; status: string; amount: number; reconciliationReason: string | null }>;
}) {
  const router = useRouter();
  const [total, setTotal] = useState("500");
  const [explanation, setExplanation] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    const response = await fetch(`/api/admin/orders/${orderId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, total: Number(total), explanation }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Quote failed.");
      return;
    }
    router.refresh();
  }

  async function rotate(id: string) {
    const response = await fetch(`/api/admin/quotes/${id}/access`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Link failed.");
      return;
    }
    setLink(`${window.location.origin}${payload.path}`);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4">
      <h2 className="text-xl font-semibold">Quote and payment</h2>
      <p className="text-sm text-muted-foreground">
        Public catalogue stays price-free. Publish an agreed TZS quote, then copy a private link.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Total TZS
          <Input className="mt-1" value={total} onChange={(event) => setTotal(event.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Customer explanation
          <Textarea className="mt-1" value={explanation} onChange={(event) => setExplanation(event.target.value)} />
        </label>
      </div>
      <Button type="button" onClick={publish}>
        Publish quote
      </Button>
      <ul className="text-sm space-y-2">
        {quotes.map((quote) => (
          <li key={quote.id} className="rounded border p-2">
            Rev {quote.revision} · {quote.total} TZS · {quote.state}
            {quote.state === "published" ? (
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" onClick={() => rotate(quote.id)}>
                  Copy private link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await fetch(`/api/admin/quotes/${quote.id}/revoke`, { method: "POST" });
                    router.refresh();
                  }}
                >
                  Revoke
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {link ? <p className="break-all text-sm">Private link (copy now): {link}</p> : null}
      <h3 className="font-medium">Attempts</h3>
      <ul className="text-sm space-y-2">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="rounded border p-2">
            {attempt.status} · {attempt.amount} TZS
            {attempt.reconciliationReason ? <p>{attempt.reconciliationReason}</p> : null}
            {attempt.status === "unknown" || attempt.status === "review" || attempt.status === "pending" ? (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  await fetch(`/api/admin/payments/${attempt.id}/reconcile`, { method: "POST" });
                  router.refresh();
                }}
              >
                Reconcile
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
