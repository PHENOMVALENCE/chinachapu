import { requireStaff } from "@/lib/server/auth";
import { guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { authoriseUpload } from "@/lib/server/services/uploads";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const body = await request.json();
    guardUnexpectedMoney(body);
    return jsonOk(await authoriseUpload(body, staff.staffId, "catalogue"), 201, true);
  } catch (error) {
    return jsonError(error);
  }
}
