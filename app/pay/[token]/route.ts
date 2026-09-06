import { createPayCookie } from "@/lib/server/payments/access";
import { exchangeAccessToken } from "@/lib/server/payments/quotes";
import { limitPayAccess } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/http";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  let destination = "/pay";
  try {
    await limitPayAccess(getClientIp(request));
    const { token } = await context.params;
    const { quote, access } = await exchangeAccessToken(token);
    await createPayCookie({ quoteId: quote.id, accessId: access.id }, new Date(quote.expiresAt));
  } catch {
    destination = "/pay?invalid=1";
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
