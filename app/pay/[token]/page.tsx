import { createPayCookie } from "@/lib/server/payments/access";
import { exchangeAccessToken } from "@/lib/server/payments/quotes";
import { limitPayAccess } from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PayTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    limitPayAccess(ip);
    const { quote, access } = await exchangeAccessToken(token);
    await createPayCookie({ quoteId: quote.id, accessId: access.id }, new Date(quote.expiresAt));
  } catch {
    redirect("/pay?invalid=1");
  }
  redirect("/pay");
}
