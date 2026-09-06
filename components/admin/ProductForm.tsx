"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryRecord, ProductRecord } from "@/lib/server/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProductForm({
  product,
  categories,
}: {
  product?: ProductRecord;
  categories: CategoryRecord[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [imageAssetId, setImageAssetId] = useState(product?.imageAssetId ?? "");

  async function uploadImage(file: File) {
    const auth = await fetch("/api/admin/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, type: file.type, size: file.size }),
    });
    const payload = await auth.json();
    if (!auth.ok) throw new Error(payload.error?.message ?? "Upload failed");
    const complete = await fetch(payload.upload.url, {
      method: "POST",
      headers: payload.upload.headers,
      body: file,
    });
    const completed = await complete.json();
    if (!complete.ok) throw new Error(completed.error?.message ?? "Upload failed");
    setImageAssetId(completed.id);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get("name") ?? ""),
      slug: String(form.get("slug") ?? "") || undefined,
      categoryId: String(form.get("categoryId") ?? ""),
      description: String(form.get("description") ?? "") || undefined,
      altText: String(form.get("altText") ?? "") || undefined,
      imageAssetId: imageAssetId || undefined,
      state: String(form.get("state") ?? "draft"),
      version: product?.version,
    };
    const response = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Save failed.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <label className="block text-sm font-medium">
        Name
        <Input name="name" className="mt-1" defaultValue={product?.name} required />
      </label>
      <label className="block text-sm font-medium">
        Slug
        <Input name="slug" className="mt-1" defaultValue={product?.slug} />
      </label>
      <label className="block text-sm font-medium">
        Category
        <select name="categoryId" defaultValue={product?.categoryId} className="mt-1 h-9 w-full rounded-md border px-3 text-sm">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Description
        <Textarea name="description" className="mt-1" defaultValue={product?.description ?? ""} />
      </label>
      <label className="block text-sm font-medium">
        Alt text
        <Input name="altText" className="mt-1" defaultValue={product?.altText ?? ""} />
      </label>
      <label className="block text-sm font-medium">
        Catalogue image (JPEG/PNG/WebP, 5 MiB max)
        <Input
          className="mt-1"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await uploadImage(file);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            }
          }}
        />
      </label>
      <label className="block text-sm font-medium">
        State
        <select name="state" defaultValue={product?.state ?? "draft"} className="mt-1 h-9 w-full rounded-md border px-3 text-sm">
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="archived">archived</option>
        </select>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Save</Button>
    </form>
  );
}
