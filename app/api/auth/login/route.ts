import { createStaffSession, loginStaff, SESSION_COOKIE } from "@/lib/server/auth";
import { cookieSecure } from "@/lib/server/config";
import { getClientIp, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { limitLogin } from "@/lib/server/rate-limit";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await limitLogin(getClientIp(request));
    const body = schema.parse(await request.json());
    const staff = await loginStaff(body.email, body.password);
    const token = await createStaffSession(staff);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return jsonOk({ ok: true }, 200, true);
  } catch (error) {
    return jsonError(error);
  }
}
