"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequest } from "@/context/RequestContext";
import { useRef, useState } from "react";

export default function ContactForm() {
  const { lines, clearLines } = useRequest();
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
      setError("Add at least one item before submitting.");
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
    <section id="contact" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-2xl font-semibold">Contact details</h2>
      {reference ? (
        <div className="space-y-2" role="status">
          <p className="text-lg font-semibold">Request received</p>
          <p>
            Reference <strong>{reference}</strong>. Staff will contact you to discuss
            availability and arrangements. This is not a payment or availability guarantee.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Name
            <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
            {fields["customer.name"] ? (
              <span className="text-sm text-destructive">{fields["customer.name"]}</span>
            ) : null}
          </label>
          <label className="block text-sm font-medium">
            Email
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {fields["customer.email"] ? (
              <span className="text-sm text-destructive">{fields["customer.email"]}</span>
            ) : null}
          </label>
          <label className="block text-sm font-medium">
            Phone
            <Input className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            {fields["customer.phone"] ? (
              <span className="text-sm text-destructive">{fields["customer.phone"]}</span>
            ) : null}
          </label>
          <p className="text-sm text-muted-foreground">
            We use your name, email, and phone only to follow up on this request. Do not
            include payment details.
          </p>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Submit request"}
          </Button>
        </form>
      )}
    </section>
  );
}
