import { getActiveProduct } from "@/lib/server/services/catalogue";
import { redirect } from "next/navigation";

export default async function ProductRedirect({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getActiveProduct(productId);
  if (product) {
    redirect(`/?product=${product.id}`);
  }
  redirect(`/?product=${encodeURIComponent(productId)}`);
}
