import { SESSION_COOKIE } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    return jsonOk({ ok: true }, 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
