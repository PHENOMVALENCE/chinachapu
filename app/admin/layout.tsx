import LogoutButton from "@/components/admin/LogoutButton";
import { requireStaff } from "@/lib/server/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

async function AdminNav() {
  try {
    await requireStaff();
  } catch {
    return null;
  }

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex flex-wrap items-center gap-4 px-4 py-4 text-sm">
        <Link href="/admin" className="font-semibold">
          ChinaChapu staff
        </Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/products">Products</Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
