import { guardAdminPage } from "@/lib/server/admin-guard";
import { listAdminProducts } from "@/lib/server/services/admin";
import Link from "next/link";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await guardAdminPage();
  const params = await searchParams;
  const { items } = await listAdminProducts(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          New product
        </Link>
      </div>
      <form>
        <input name="q" defaultValue={params.q} placeholder="Search products" className="h-9 w-full max-w-md rounded-md border px-3 text-sm" />
      </form>
      <ul className="space-y-2">
        {items.map((product) => (
          <li key={product.id} className="rounded-lg border bg-background p-3">
            <Link href={`/admin/products/${product.id}`} className="font-medium underline">
              {product.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {product.slug} · {product.state}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
