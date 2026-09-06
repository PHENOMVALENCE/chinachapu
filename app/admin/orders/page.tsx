import { guardAdminPage } from "@/lib/server/admin-guard";
import { listAdminOrders } from "@/lib/server/services/admin";
import { formatStaffDate } from "@/lib/server/timezone";
import Link from "next/link";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  await guardAdminPage();
  const params = await searchParams;
  const { items } = await listAdminOrders(params);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Orders</h1>
      <form className="grid gap-3 sm:grid-cols-4">
        <input name="q" defaultValue={params.q} placeholder="Search reference, name, email, phone" className="h-9 rounded-md border px-3 text-sm" />
        <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border px-3 text-sm">
          <option value="">All statuses</option>
          {["new", "contacted", "sourcing", "completed", "cancelled"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={params.from} className="h-9 rounded-md border px-3 text-sm" />
        <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground">Filter</button>
      </form>
      <ul className="space-y-2">
        {items.map((order) => (
          <li key={order.id} className="rounded-lg border bg-background p-3">
            <Link href={`/admin/orders/${order.id}`} className="font-medium underline">
              {order.reference}
            </Link>
            <p className="text-sm text-muted-foreground">
              {order.name} · {order.email} · {order.phone} · {order.status} · {formatStaffDate(order.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
