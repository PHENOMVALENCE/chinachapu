"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequest } from "@/context/RequestContext";
import type { PublicCategory } from "@/lib/server/types";
import { useState } from "react";

export default function CustomRequest({ categories }: { categories: PublicCategory[] }) {
  const { addLine } = useRequest();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 150) {
      setError("Enter a product name between 2 and 150 characters.");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      setError("Enter a whole number from 1 to 999.");
      return;
    }
    let uploadId: string | undefined;
    let imagePreview: string | undefined;
    if (photo) {
      const auth = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: photo.name, type: photo.type, size: photo.size }),
      });
      const payload = await auth.json();
      if (!auth.ok) {
        setError(payload.error?.message ?? "Upload failed. Remove the photo to continue.");
        return;
      }
      const complete = await fetch(payload.upload.url, {
        method: "POST",
        headers: payload.upload.headers,
        body: photo,
      });
      const completed = await complete.json();
      if (!complete.ok) {
        setError(completed.error?.message ?? "Upload failed. Remove the photo to continue.");
        return;
      }
      uploadId = completed.id;
      imagePreview = URL.createObjectURL(photo);
    }
    addLine({
      kind: "custom",
      name: trimmed,
      quantity: qty,
      categoryId: categoryId || undefined,
      categoryName: categories.find((item) => item.id === categoryId)?.name,
      description: description.trim() || undefined,
      imageName: photo?.name,
      imagePreview,
      uploadId,
    });
    setName("");
    setQuantity("1");
    setCategoryId("");
    setDescription("");
    setPhoto(null);
    setError(null);
    setStatus("Custom item added to your request.");
  }

  return (
    <section id="custom" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-2xl font-semibold">Request something else</h2>
      <p className="text-muted-foreground">
        Works even if the catalogue is empty. A product name and quantity are required.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Product name
          <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
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
          Category (optional)
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">No category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Description (optional)
          <Textarea
            className="mt-1"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Reference photo (optional, one JPEG/PNG/WebP, 5 MiB max)
          <Input
            className="mt-1"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm" role="status">
            {status}
          </p>
        ) : null}
        <Button type="submit">Add custom item</Button>
      </form>
    </section>
  );
}
