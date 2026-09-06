import { requireStaff } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { completeUpload } from "@/lib/server/services/uploads";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const staff = await requireStaff();
    const { id } = await context.params;
    const bytes = Buffer.from(await request.arrayBuffer());
    const upload = await completeUpload(id, staff.staffId, bytes, "catalogue");
    return jsonOk({ id: upload.id, state: upload.state }, 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
