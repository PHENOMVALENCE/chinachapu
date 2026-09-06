import ProductForm from "@/components/admin/ProductForm";
import { guardAdminPage } from "@/lib/server/admin-guard";
import { getRepository } from "@/lib/server/db";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardAdminPage();
  const { id } = await params;
  const repo = getRepository();
  const [product, categories] = await Promise.all([repo.getProduct(id), repo.listCategories()]);
  if (!product) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Edit product</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
