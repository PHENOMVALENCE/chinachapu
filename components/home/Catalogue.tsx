"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequest } from "@/context/RequestContext";
import type { PublicCategory, PublicProduct } from "@/lib/server/types";
import { LIMITS } from "@/lib/validation/limits";
import { useMemo, useState } from "react";
import ProductPhoto from "./ProductPhoto";

type Props = {
  categories: PublicCategory[];
  products: PublicProduct[];
  initialQuery: string;
  selectedProductId?: string;
  unavailable?: boolean;
};

function scrollToSend() {
  document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Catalogue({
  categories,
  products,
  initialQuery,
  selectedProductId,
  unavailable,
}: Props) {
  const { addLine } = useRequest();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [detailId, setDetailId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return products.filter((product) => {
      const categoryOk = category === "all" || product.category.slug === category;
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.description ?? "").toLowerCase().includes(q);
      return categoryOk && queryOk;
    });
  }, [products, category, query]);

  async function uploadPhoto(): Promise<{ uploadId?: string; imagePreview?: string }> {
    if (!photo) return {};
    const auth = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: photo.name,
        type: photo.type,
        size: photo.size,
      }),
    });
    const payload = await auth.json();
    if (!auth.ok) {
      throw new Error(payload.error?.message ?? "Upload failed");
    }
    const complete = await fetch(payload.upload.url, {
      method: "POST",
      headers: payload.upload.headers,
      body: photo,
    });
    const completed = await complete.json();
    if (!complete.ok) {
      throw new Error(completed.error?.message ?? "Upload failed");
    }
    return { uploadId: completed.id, imagePreview: URL.createObjectURL(photo) };
  }

  function addProduct(
    product: PublicProduct,
    qty: number,
    extras?: { description?: string; uploadId?: string; imagePreview?: string; imageName?: string }
  ) {
    addLine({
      kind: "catalogue",
      productId: product.id,
      name: product.name,
      categoryId: product.category.id,
      categoryName: product.category.name,
      quantity: qty,
      description: extras?.description,
      imageName: extras?.imageName,
      imagePreview: extras?.imagePreview,
      uploadId: extras?.uploadId,
    });
    setNotice(`${product.name} added. Send your details below.`);
    setNotes("");
    setPhoto(null);
    setQuantity("1");
    setDetailId(undefined);
    setPhotoError(null);
    window.setTimeout(scrollToSend, 50);
  }

  function handleQuickAdd(product: PublicProduct) {
    setNotice(null);
    addProduct(product, 1);
  }

  async function handleDetailedAdd(event: React.FormEvent, product: PublicProduct) {
    event.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      setNotice("Enter a whole number from 1 to 999.");
      return;
    }
    setBusyId(product.id);
    try {
      const uploaded = await uploadPhoto();
      addProduct(product, qty, {
        description: notes.trim() || undefined,
        imageName: photo?.name,
        ...uploaded,
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="catalogue" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Catalogue</h2>
        <p className="text-muted-foreground">
          Tap Place order to add an item, then send your contact details. Photos show example styles.
        </p>
        {unavailable ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm" role="status">
            That product is not currently available. Choose another item or request something else.
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm" role="status">
            {notice}
          </p>
        ) : null}
        <label className="block text-sm font-medium">
          Search
          <Input
            className="mt-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          <Button
            type="button"
            variant={category === "all" ? "default" : "outline"}
            onClick={() => setCategory("all")}
          >
            All
          </Button>
          {categories.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={category === item.slug ? "default" : "outline"}
              onClick={() => setCategory(item.slug)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          The catalogue is empty. You can still request something else below.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No products match that search. Try another term or category.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((product, index) => (
            <li key={product.id}>
              <article
                className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                  selectedProductId === product.id ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start gap-4 sm:gap-5">
                  <ProductPhoto
                    url={product.image?.url}
                    alt={product.image?.alt ?? product.name}
                    priority={index < 2}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {product.category.name}
                    </p>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    {product.description ? (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:self-center">
                    <Button
                      type="button"
                      className="min-h-11 w-full px-5 sm:w-auto"
                      disabled={busyId === product.id}
                      onClick={() => handleQuickAdd(product)}
                      aria-label={`Place order for ${product.name}`}
                    >
                      Place order
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => {
                        setDetailId((current) => (current === product.id ? undefined : product.id));
                        setNotice(null);
                      }}
                    >
                      {detailId === product.id ? "Hide options" : "Quantity or note"}
                    </button>
                  </div>
                </div>
                {detailId === product.id ? (
                  <form
                    onSubmit={(event) => handleDetailedAdd(event, product)}
                    className="mt-4 space-y-3 border-t border-border pt-4"
                  >
                    <label className="block text-sm font-medium">
                      Quantity
                      <Input
                        className="mt-1 max-w-32"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Notes (optional)
                      <Textarea
                        className="mt-1"
                        maxLength={LIMITS.description.max}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Reference photo (optional, {LIMITS.imageBytes / (1024 * 1024)} MiB max)
                      <Input
                        className="mt-1"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          if (file && file.size > LIMITS.imageBytes) {
                            setPhotoError(
                              `Images must be ${LIMITS.imageBytes / (1024 * 1024)} MiB or smaller.`
                            );
                            setPhoto(null);
                            return;
                          }
                          setPhotoError(null);
                          setPhoto(file);
                        }}
                      />
                    </label>
                    {photoError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {photoError}
                      </p>
                    ) : null}
                    <Button type="submit" className="min-h-11" disabled={busyId === product.id}>
                      Add with these details
                    </Button>
                  </form>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
