import { getDraftOwnerHash } from "@/lib/server/auth";
import { getClientIp, guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { limitUploads } from "@/lib/server/rate-limit";
import { authoriseUpload } from "@/lib/server/services/uploads";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    limitUploads(getClientIp(request));
    const body = await request.json();
    guardUnexpectedMoney(body);
    const draft = await getDraftOwnerHash(true);
    const result = await authoriseUpload(body, draft, "reference");
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
