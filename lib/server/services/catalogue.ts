import { LIMITS } from "@/lib/validation/limits";
import { getRepository } from "../db";
import { getStorage } from "../storage";
import type { PublicCategory, PublicProduct } from "../types";
import seedImages from "@/data/image-manifest.json";

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const categories = await getRepository().listCategories();
  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    order: category.sortOrder,
  }));
}

export async function listPublicProducts(options: {
  category?: string;
  q?: string;
  cursor?: string;
  take?: number;
}) {
  const take = Math.min(options.take ?? LIMITS.pageSize.default, LIMITS.pageSize.max);
  const { items, nextCursor } = await getRepository().listProducts({
    categorySlug: options.category || undefined,
    q: options.q?.trim() || undefined,
    states: ["active"],
    cursor: options.cursor,
    take,
  });
  const categories = await getRepository().listCategories();
  const byId = new Map(categories.map((item) => [item.id, item]));
  const storage = getStorage();

  const products: PublicProduct[] = [];
  for (const product of items) {
    const category = byId.get(product.categoryId);
    if (!category) continue;
    const upload = product.imageAssetId
      ? await getRepository().getUpload(product.imageAssetId)
      : null;
    products.push({
      id: product.id,
      name: product.name,
      category: { id: category.id, slug: category.slug, name: category.name },
      description: product.description,
      image: upload
        ? { url: publicImageUrl(upload.storageKey, storage.publicUrl(upload.storageKey)), alt: upload.storageKey.startsWith("seed/") ? seedImages.find((image) => image.slug === product.slug)?.alt ?? product.name : product.altText ?? product.name }
        : null,
    });
  }

  return { products, nextCursor };
}

function publicImageUrl(storageKey: string, storedUrl: string) {
  if (storageKey.startsWith("seed/")) {
    const slug = storageKey.slice("seed/".length).replace(/\.(svg|jpg|webp|png)$/, "");
    const photo = seedImages.find((image) => image.slug === slug);
    if (photo) return `/catalogue/${photo.filename}`;
    return `/catalogue/${storageKey.slice("seed/".length)}`;
  }
  return storedUrl;
}

export async function getActiveProduct(id: string) {
  const product = await getRepository().getProduct(id);
  if (!product || product.state !== "active") {
    return null;
  }
  return product;
}
