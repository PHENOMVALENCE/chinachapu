import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getAdminSummary } from "@/lib/server/services/admin";

export async function GET() {
  try {
    await requireStaff();
    return jsonOk(await getAdminSummary(), 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
