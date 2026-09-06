import { listPublicCategories } from "@/lib/server/services/catalogue";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET() {
  try {
    return jsonOk({ categories: await listPublicCategories() });
  } catch (error) {
    return jsonError(error);
  }
}
