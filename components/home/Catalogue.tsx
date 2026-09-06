"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequest } from "@/context/RequestContext";
import type { PublicCategory, PublicProduct } from "@/lib/server/types";
import { useMemo, useState } from "react";

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
  const { addLine } = useRequest();
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
    setNotice(`${selected.name} added to your request.`);
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
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                {product.image ? (
                  // Seed assets are local SVGs; reserve square space.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image.url}
                    alt={product.image.alt}
                    width={800}
                    height={800}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Image unavailable
                  </div>
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {product.category.name}
                </p>
                <h3 className="text-lg font-semibold">{product.name}</h3>
                {product.description ? (
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                ) : null}
                <Button type="button" className="w-full" onClick={() => setPickedId(product.id)}>
                  Add to request
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected ? (
        <form onSubmit={handleAdd} className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="text-lg font-semibold">Add {selected.name}</h3>
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
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Reference photo (optional, one JPEG/PNG/WebP, 4 MiB max)
            <Input
              className="mt-1"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  setPhotoError("Images must be 4 MiB or smaller.");
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
          <div className="flex gap-2">
            <Button type="submit">Add item</Button>
            <Button type="button" variant="outline" onClick={() => setPickedId(undefined)}>
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
    </section>
  );
}
