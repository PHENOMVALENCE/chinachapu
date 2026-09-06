import { getDraftOwnerHash } from "@/lib/server/auth";
import { getClientIp, guardUnexpectedMoney, jsonError, jsonOk } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/origin";
import { limitOrders } from "@/lib/server/rate-limit";
import { createGuestOrder } from "@/lib/server/services/orders";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await limitOrders(getClientIp(request));
    const body = await request.json();
    guardUnexpectedMoney(body);
    const draft = await getDraftOwnerHash(true);
    const result = await createGuestOrder(body, draft);
    return jsonOk(
      { reference: result.reference, status: result.status },
      result.replay ? 200 : 201
    );
  } catch (error) {
    return jsonError(error);
  }
}
