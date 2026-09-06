import { requireStaff } from "@/lib/server/auth";
import { getRepository } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { patchAdminProduct } from "@/lib/server/services/admin";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await context.params;
    const product = await getRepository().getProduct(id);
    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Product not found.");
    }
    return jsonOk(product, 200, true);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireStaff();
    const { id } = await context.params;
    const body = await request.json();
    guardUnexpectedMoney(body);
    return jsonOk(await patchAdminProduct(id, body), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
