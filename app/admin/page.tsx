import { guardAdminPage } from "@/lib/server/admin-guard";
import { getAdminSummary } from "@/lib/server/services/admin";
import Link from "next/link";

export default async function AdminHomePage() {
  await guardAdminPage();
  const summary = await getAdminSummary();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Operations</h1>
      <p className="text-sm text-muted-foreground">Dates shown in {summary.timezone}.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["All orders", summary.totals.orders],
          ["New", summary.totals.new],
          ["In progress", summary.totals.inProgress],
          ["Completed", summary.totals.completed],
          ["Active products", summary.totals.activeProducts],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent requests</h2>
        <ul className="space-y-2">
          {summary.recent.map((order) => (
            <li key={order.id} className="rounded-lg border bg-background p-3">
              <Link href={`/admin/orders/${order.id}`} className="font-medium underline">
                {order.reference}
              </Link>
              <p className="text-sm text-muted-foreground">
                {order.name} · {order.status} · {order.createdAt}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
