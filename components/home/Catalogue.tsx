"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequest } from "@/context/RequestContext";
import type { PublicCategory, PublicProduct } from "@/lib/server/types";
import { LIMITS } from "@/lib/validation/limits";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductPhoto from "./ProductPhoto";

type Props = {
  categories: PublicCategory[];
  products: PublicProduct[];
  initialQuery: string;
  selectedProductId?: string;
  unavailable?: boolean;
};

export default function Catalogue({
  categories,
  products,
  initialQuery,
  selectedProductId,
  unavailable,
}: Props) {
  const { addLine, unitCount } = useRequest();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [pickedId, setPickedId] = useState<string | undefined>(selectedProductId);
  const selected =
    products.find((item) => item.id === (pickedId ?? selectedProductId)) ?? null;
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);

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

  useEffect(() => {
    if (!pickedId) return;
    editorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    quantityRef.current?.focus();
  }, [pickedId]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      setNotice("Enter a whole number from 1 to 999.");
      return;
    }
    let uploadId: string | undefined;
    let imagePreview: string | undefined;
    if (photo) {
      try {
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
        uploadId = completed.id;
        imagePreview = URL.createObjectURL(photo);
        setPhotoError(null);
      } catch (error) {
        setPhotoError(error instanceof Error ? error.message : "Upload failed");
        return;
      }
    }
    addLine({
      kind: "catalogue",
      productId: selected.id,
      name: selected.name,
      categoryId: selected.category.id,
      categoryName: selected.category.name,
      quantity: qty,
      description: notes.trim() || undefined,
      imageName: photo?.name,
      imagePreview,
      uploadId,
    });
    setNotice(`${selected.name} added to your request. ${unitCount + qty} units in your request.`);
    setNotes("");
    setPhoto(null);
    setQuantity("1");
  }

  return (
    <section id="catalogue" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Catalogue</h2>
        <p className="text-muted-foreground">
          Filter by category or search. Adding an item keeps you on this page.
        </p>
        <p className="text-sm text-muted-foreground">
          Photos show example styles. Tell us your preferred details.
        </p>
        {unavailable ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm" role="status">
            That product is not currently available. Choose another item or request something else.
          </p>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex-1 text-sm font-medium">
            Search
            <Input
              className="mt-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
            />
          </label>
        </div>
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
              <article className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
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
                  <div className="w-full sm:w-auto sm:self-center">
                    <Button
                      type="button"
                      className="min-h-11 w-full px-5 sm:w-auto"
                      onClick={() => {
                        setPickedId(product.id);
                        setNotice(null);
                      }}
                      aria-label={`Place order for ${product.name}`}
                    >
                      Place order
                    </Button>
                  </div>
                </div>
                {selected?.id === product.id ? (
                  <form
                    ref={editorRef}
                    onSubmit={handleAdd}
                    className="mt-4 space-y-4 border-t border-border pt-4"
                  >
                    <h4 className="text-base font-semibold">Add {selected.name}</h4>
                    <label className="block text-sm font-medium">
                      Quantity
                      <Input
                        ref={quantityRef}
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
                      Reference photo (optional, one JPEG/PNG/WebP, {LIMITS.imageBytes / (1024 * 1024)}{" "}
                      MiB max)
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
                        {photoError} You can remove the photo and continue.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" className="min-h-11">
                        Add item
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setPickedId(undefined)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {notice ? (
                      <p className="text-sm" role="status">
                        {notice}
                      </p>
                    ) : null}
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
