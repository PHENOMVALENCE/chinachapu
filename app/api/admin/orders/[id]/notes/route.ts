import { requireStaff } from "@/lib/server/auth";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { addAdminNote } from "@/lib/server/services/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    const body = await request.json();
    guardUnexpectedMoney(body);
    return jsonOk(await addAdminNote(id, body, staff.staffId), 201, true);
  } catch (error) {
    return jsonError(error);
  }
}
