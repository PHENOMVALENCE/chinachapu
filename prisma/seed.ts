import { stat } from "node:fs/promises";
import path from "node:path";
import manifest from "../data/image-manifest.json";
import { createIsolatedRepository } from "../lib/server/adapters/isolated-store";
import { createId } from "../lib/server/ids";
import { createPrismaRepository } from "../lib/server/adapters/prisma-store";
import type { Repository } from "../lib/server/repository";

const categories = [
  { slug: "shoes", name: "Shoes", sortOrder: 1 },
  { slug: "purses", name: "Purses", sortOrder: 2 },
  { slug: "clothes", name: "Clothes", sortOrder: 3 },
  { slug: "perfumes", name: "Perfumes", sortOrder: 4 },
  { slug: "accessories", name: "Accessories", sortOrder: 5 },
  { slug: "home-essentials", name: "Home essentials", sortOrder: 6 },
];

const products = [
  { slug: "everyday-sneakers", name: "Everyday sneakers", category: "shoes", description: "Comfortable low-tops for daily wear. Mention size, colour, and material." },
  { slug: "formal-loafers", name: "Formal loafers", category: "shoes", description: "Smart loafers. Mention size, colour, and material." },
  { slug: "casual-sandals", name: "Casual sandals", category: "shoes", description: "Open sandals. Mention size, colour, and material." },
  { slug: "crossbody-purse", name: "Crossbody purse", category: "purses", description: "Hands-free purse. Mention colour, dimensions, and strap." },
  { slug: "tote-bag", name: "Tote bag", category: "purses", description: "Everyday tote. Mention colour, dimensions, and strap." },
  { slug: "evening-clutch", name: "Evening clutch", category: "purses", description: "Compact clutch. Mention colour and dimensions." },
  { slug: "casual-tshirt", name: "Casual T-shirt", category: "clothes", description: "Soft everyday T-shirt. Mention size, fit, and colour." },
  { slug: "summer-dress", name: "Summer dress", category: "clothes", description: "Light summer dress. Mention size, fit, and colour." },
  { slug: "denim-trousers", name: "Denim trousers", category: "clothes", description: "Classic denim. Mention size, fit, and colour." },
  { slug: "floral-fragrance", name: "Floral fragrance", category: "perfumes", description: "Floral scent. Mention bottle size if you have a preference." },
  { slug: "woody-fragrance", name: "Woody fragrance", category: "perfumes", description: "Woody scent. Mention bottle size if you have a preference." },
  { slug: "citrus-fragrance", name: "Citrus fragrance", category: "perfumes", description: "Citrus scent. Mention bottle size if you have a preference." },
  { slug: "sunglasses", name: "Sunglasses", category: "accessories", description: "Everyday sunglasses. Mention style and dimensions." },
  { slug: "wristwatch", name: "Wristwatch", category: "accessories", description: "Analog wristwatch. Mention style and strap preference." },
  { slug: "belt", name: "Belt", category: "accessories", description: "Casual belt. Mention size and colour." },
  { slug: "insulated-bottle", name: "Insulated bottle", category: "home-essentials", description: "Insulated bottle. Mention capacity and colour." },
  { slug: "travel-organiser", name: "Travel organiser", category: "home-essentials", description: "Packing organiser. Mention colour and size." },
  { slug: "cushion-cover", name: "Cushion cover", category: "home-essentials", description: "Square cushion cover. Mention colour and size." },
];

async function seed(repo: Repository) {
  const now = new Date().toISOString();
  const categoryRecords = categories.map((category) => ({
    id: createId(),
    ...category,
  }));
  await repo.upsertCategories(categoryRecords);
  const bySlug = new Map((await repo.listCategories()).map((item) => [item.slug, item]));

  for (const product of products) {
    const existing = await repo.getProductBySlug(product.slug);
    if (existing) continue;
    const asset = manifest.find((item) => item.slug === product.slug);
    if (!asset) throw new Error(`Missing photo manifest: ${product.slug}`);
    const imageInfo = await stat(path.join(process.cwd(), "public", "catalogue", asset.filename));
    const uploadId = createId();
    await repo.createUpload({
      id: uploadId,
      storageKey: `seed/${asset?.filename ?? "fallback.svg"}`,
      purpose: "catalogue",
      ownerHash: "seed",
      mime: "image/jpeg",
      bytes: imageInfo.size,
      width: 800,
      height: 800,
      state: "claimed",
      expiresAt: null,
      orderItemId: null,
      createdAt: now,
    });
    await repo.createProduct({
      id: createId(),
      slug: product.slug,
      name: product.name,
      categoryId: bySlug.get(product.category)!.id,
      description: product.description,
      imageAssetId: uploadId,
      altText: asset?.alt ?? product.name,
      state: "active",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function main() {
  const persistence = process.env.APP_PERSISTENCE ?? "isolated";
  if (persistence === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for postgres seed");
    }
    await seed(createPrismaRepository());
  } else {
    await seed(createIsolatedRepository("default"));
  }
  console.log("Seed complete. Isolated adapter is not production persistence.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
