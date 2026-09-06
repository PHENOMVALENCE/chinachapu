import Catalogue from "@/components/home/Catalogue";
import CustomRequest from "@/components/request/CustomRequest";
import SendRequest from "@/components/request/SendRequest";
import { listPublicCategories, listPublicProducts } from "@/lib/server/services/catalogue";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; q?: string }>;
}) {
  const params = await searchParams;
  const [categories, catalogue] = await Promise.all([
    listPublicCategories(),
    listPublicProducts({ q: params.q, take: 100 }),
  ]);
  const selected = params.product
    ? catalogue.products.find((item) => item.id === params.product)
    : undefined;

  return (
    <div className="bg-background px-4 py-8 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="mx-auto max-w-3xl space-y-3 text-center">
          <h1 className="text-4xl font-semibold tracking-tight xl:text-5xl">
            Request products from ChinaChapu
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Place order on what you want, send your name and phone, and we will contact
            you. No prices, payments, or accounts on this page.
          </p>
        </section>
        <Catalogue
          categories={categories}
          products={catalogue.products}
          initialQuery={params.q ?? ""}
          selectedProductId={selected?.id}
          unavailable={Boolean(params.product && !selected)}
        />
        <SendRequest />
        <CustomRequest categories={categories} />
      </div>
    </div>
  );
}
