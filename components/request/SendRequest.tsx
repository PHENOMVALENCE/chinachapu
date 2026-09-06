"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequest } from "@/context/RequestContext";
import { useRef, useState } from "react";

export default function SendRequest() {
  const { lines, updateLine, removeLine, unitCount, clearLines } = useRequest();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});
    if (lines.length === 0) {
      setError("Add at least one item from the list above.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          customer: { name, email, phone },
          items: lines.map((line) =>
            line.kind === "catalogue"
              ? {
                  kind: "catalogue",
                  productId: line.productId,
                  quantity: line.quantity,
                  description: line.description || undefined,
                  uploadId: line.uploadId,
                }
              : {
                  kind: "custom",
                  name: line.name,
                  quantity: line.quantity,
                  description: line.description || undefined,
                  categoryId: line.categoryId,
                  uploadId: line.uploadId,
                }
          ),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setFields(payload.error?.fields ?? {});
        setError(payload.error?.message ?? "Request could not be sent.");
        return;
      }
      setReference(payload.reference);
      clearLines();
      setName("");
      setEmail("");
      setPhone("");
      idempotencyKey.current = crypto.randomUUID();
    } catch {
      setError("The request did not go through. Your details are still here. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="request" className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-semibold">Send your request</h2>
        <p className="mt-1 text-muted-foreground">
          {lines.length === 0
            ? "Tap Place order on an item, then leave your name, email, and phone."
            : `${unitCount} item${unitCount === 1 ? "" : "s"} ready. Send your contact details and we will call you.`}
        </p>
      </div>

      {reference ? (
        <div className="space-y-2" role="status">
          <p className="text-lg font-semibold">Request received</p>
          <p>
            Reference <strong>{reference}</strong>. Staff will contact you about availability.
            This is not a payment.
          </p>
        </div>
      ) : (
        <>
          {lines.length > 0 ? (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.clientId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2"
                >
                  <p className="min-w-0 flex-1 font-medium">
                    {line.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ×{line.quantity}
                    </span>
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    Qty
                    <Input
                      className="h-9 w-16"
                      inputMode="numeric"
                      value={String(line.quantity)}
                      onChange={(event) =>
                        updateLine(line.clientId, { quantity: Number(event.target.value) || 1 })
                      }
                      aria-label={`Quantity for ${line.name}`}
                    />
                  </label>
                  <Button type="button" variant="ghost" onClick={() => removeLine(line.clientId)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Name
              <Input
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
              {fields["customer.name"] ? (
                <span className="text-sm text-destructive">{fields["customer.name"]}</span>
              ) : null}
            </label>
            <label className="block text-sm font-medium">
              Phone
              <Input
                className="mt-1"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                required
              />
              {fields["customer.phone"] ? (
                <span className="text-sm text-destructive">{fields["customer.phone"]}</span>
              ) : null}
            </label>
            <label className="block text-sm font-medium">
              Email
              <Input
                className="mt-1"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              {fields["customer.email"] ? (
                <span className="text-sm text-destructive">{fields["customer.email"]}</span>
              ) : null}
            </label>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              We use these details only to follow up. No payment on this page.
            </p>
            {error ? (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="min-h-11 sm:col-span-2" disabled={pending}>
              {pending ? "Sending…" : "Send request"}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
