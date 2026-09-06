import { requireStaff } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import { applyPrivacyHeaders, jsonError } from "@/lib/server/http";
import { getStorage } from "@/lib/server/storage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const key = new URL(request.url).searchParams.get("key");
    if (!key || key.includes("..")) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid media key.");
    }
    const bytes = await getStorage().get("private", key);
    const response = new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/webp" },
    });
    applyPrivacyHeaders(response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
