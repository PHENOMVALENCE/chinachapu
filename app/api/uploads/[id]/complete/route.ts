import { getDraftOwnerHash } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { completeUpload } from "@/lib/server/services/uploads";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const draft = await getDraftOwnerHash(false);
    const bytes = Buffer.from(await request.arrayBuffer());
    const upload = await completeUpload(id, draft, bytes, "reference");
    return jsonOk({ id: upload.id, state: upload.state });
  } catch (error) {
    return jsonError(error);
  }
}
