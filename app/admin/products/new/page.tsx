import ProductForm from "@/components/admin/ProductForm";
import { guardAdminPage } from "@/lib/server/admin-guard";
import { getRepository } from "@/lib/server/db";

export default async function NewProductPage() {
  await guardAdminPage();
  const categories = await getRepository().listCategories();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
