import { jsonError, jsonOk } from "@/lib/server/http";
import { listPublicProducts } from "@/lib/server/services/catalogue";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const take = Number(url.searchParams.get("limit") ?? 24);
    const result = await listPublicProducts({
      category: url.searchParams.get("category") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      take,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
