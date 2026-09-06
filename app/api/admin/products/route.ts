import { requireStaff } from "@/lib/server/auth";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { createAdminProduct, listAdminProducts } from "@/lib/server/services/admin";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const url = new URL(request.url);
    return jsonOk(
      await listAdminProducts({
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

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireStaff();
    const body = await request.json();
    guardUnexpectedMoney(body);
    return jsonOk(await createAdminProduct(body), 201, true);
  } catch (error) {
    return jsonError(error);
  }
}
