"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OrderStatus } from "@/lib/server/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  new: ["contacted", "cancelled"],
  contacted: ["sourcing", "cancelled"],
  sourcing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function OrderActions({
  orderId,
  version,
  status,
}: {
  orderId: string;
  version: number;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: OrderStatus) {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, version }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  async function addNote() {
    const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: note }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Note failed.");
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap gap-2">
        {nextStatuses[status].map((next) => (
          <Button key={next} type="button" onClick={() => changeStatus(next)}>
            Mark {next}
          </Button>
        ))}
      </div>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal note" />
      <Button type="button" variant="outline" onClick={addNote}>
        Add note
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
