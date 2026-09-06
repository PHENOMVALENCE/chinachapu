import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { listAdminOrders } from "@/lib/server/services/admin";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const url = new URL(request.url);
    return jsonOk(
      await listAdminOrders({
        status: url.searchParams.get("status") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        q: url.searchParams.get("q") ?? undefined,
        cursor: url.searchParams.get("cursor") ?? undefined,
        take: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      }),
      200,
      true
    );
  } catch (error) {
    return jsonError(error);
  }
}
