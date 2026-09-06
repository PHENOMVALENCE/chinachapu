import { getConfig } from "@/lib/server/config";
import { prisma } from "@/lib/server/adapters/prisma-store";
import { isSnippeInitiationEnabled } from "@/lib/server/snippe/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  if (config.persistence === "postgres") {
    await prisma().$queryRaw`SELECT 1`;
  }
  return Response.json(
    {
      ok: true,
      persistence: config.persistence,
      storage: config.storage,
      payments: isSnippeInitiationEnabled() ? "enabled" : "disabled",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
