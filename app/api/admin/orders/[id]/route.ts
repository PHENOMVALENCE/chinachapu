import { requireStaff } from "@/lib/server/auth";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { getAdminOrder, patchAdminOrder } from "@/lib/server/services/admin";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await context.params;
    return jsonOk(await getAdminOrder(id), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    const body = await request.json();
    guardUnexpectedMoney(body);
    return jsonOk(await patchAdminOrder(id, body, staff.staffId), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
