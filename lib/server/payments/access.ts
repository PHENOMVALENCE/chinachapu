import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cookieSecure, getConfig } from "../config";
import { AppError } from "../errors";

export const PAY_COOKIE = "cc_pay";

export type PayScope = {
  quoteId: string;
  accessId: string;
};

function secret() {
  return new TextEncoder().encode(getConfig().authSecret);
}

export async function createPayCookie(scope: PayScope, expiresAt: Date) {
  const token = await new SignJWT(scope)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(secret());
  const jar = await cookies();
  jar.set(PAY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export async function requirePayScope(): Promise<PayScope> {
  const jar = await cookies();
  const token = jar.get(PAY_COOKIE)?.value;
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "This payment link is invalid or has expired.");
  }
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.quoteId !== "string" || typeof payload.accessId !== "string") {
      throw new Error("bad");
    }
    return { quoteId: payload.quoteId, accessId: payload.accessId };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "This payment link is invalid or has expired.");
  }
}
