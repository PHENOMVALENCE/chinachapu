import OrderActions from "@/components/admin/OrderActions";
import { guardAdminPage } from "@/lib/server/admin-guard";
import { getAdminOrder } from "@/lib/server/services/admin";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardAdminPage();
  const { id } = await params;
  const order = await getAdminOrder(id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{order.reference}</h1>
      <p className="text-sm text-muted-foreground">
        Created {order.createdAtLabel}. Updated {order.updatedAtLabel}.
      </p>
      <section className="rounded-xl border bg-background p-4 space-y-1">
        <p><strong>Name:</strong> {order.name}</p>
        <p><strong>Email:</strong> {order.email}</p>
        <p><strong>Phone:</strong> {order.phone}</p>
        <p><strong>Status:</strong> {order.status}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Items</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-background p-3">
              <p className="font-medium">{item.nameSnapshot}</p>
              <p className="text-sm text-muted-foreground">
                {item.kind} · {item.quantity} units
                {item.categorySnapshot ? ` · ${item.categorySnapshot}` : ""}
              </p>
              {item.description ? <p className="text-sm">{item.description}</p> : null}
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="Customer reference" className="mt-2 h-32 w-32 object-cover" />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <OrderActions orderId={order.id} version={order.version} status={order.status} />
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Status history</h2>
        <ul className="text-sm">
          {order.events.map((event) => (
            <li key={event.id}>
              {event.oldStatus ?? "—"} → {event.newStatus} · {event.createdAtLabel} · {event.staffId}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Internal notes</h2>
        <ul className="text-sm space-y-2">
          {order.notes.map((note) => (
            <li key={note.id} className="rounded border p-2">
              {note.text}
              <p className="text-muted-foreground">{note.createdAtLabel}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
