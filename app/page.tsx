import Catalogue from "@/components/home/Catalogue";
import ContactForm from "@/components/request/ContactForm";
import CustomRequest from "@/components/request/CustomRequest";
import RequestReview from "@/components/request/RequestReview";
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
            Browse categories, add catalogue items or describe something else, then send
            your name, email, and phone. Staff will contact you. There are no prices,
            payments, or customer accounts on this site.
          </p>
        </section>
        <Catalogue
          categories={categories}
          products={catalogue.products}
          initialQuery={params.q ?? ""}
          selectedProductId={selected?.id}
          unavailable={Boolean(params.product && !selected)}
        />
        <CustomRequest categories={categories} />
        <RequestReview />
        <ContactForm />
      </div>
    </div>
  );
}
