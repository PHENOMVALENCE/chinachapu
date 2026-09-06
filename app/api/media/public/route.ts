import { AppError } from "@/lib/server/errors";
import { jsonError } from "@/lib/server/http";
import { getStorage } from "@/lib/server/storage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || key.includes("..") || !key.startsWith("catalogue/")) {
      throw new AppError(404, "NOT_FOUND", "Image not found.");
    }
    const bytes = await getStorage().get("public", key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
